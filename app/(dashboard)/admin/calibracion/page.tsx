/**
 * Panel de calibración del modelo — Adenda 1 a la Política V4.1, §11.
 *
 * "Todos estos valores deben poder modificarse desde el panel de calibración,
 * sin intervención de desarrollo, únicamente por la Gerencia General, y todo
 * cambio debe quedar registrado con fecha, valor anterior, valor nuevo y
 * usuario."
 *
 * Cada parámetro se edita en su fila; el backend valida rango/entero y
 * escribe el historial. La advertencia de la Adenda (p. ej. lo que el factor
 * de ingreso hace con las reglas duras) se muestra al lado del valor, no
 * escondida: es la parte del documento que Gerencia pidió "dejar registrada".
 */

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import {
  calibracionService,
  type IParametroCalibracion,
  type IHistorialCalibracion,
  type ICascadaCentrales,
} from '@/services/calibracionService'
import { IconLoader, IconLock, IconAlertTriangle, IconCheck } from '@/components/icons'
import { formatDate } from '@/lib/constants'

const fmt = (n: number, entero: boolean) => (entero ? n.toLocaleString('es-CO') : String(n))

/**
 * Nombre humano de cada parámetro. La pantalla los titulaba con su clave de
 * código (`FACTOR_AJUSTE_INGRESO`) y relegaba la descripción a gris pequeño:
 * Gerencia tenía que traducir mentalmente antes de decidir qué tocaba.
 */
const NOMBRE_PARAMETRO: Record<string, string> = {
  FACTOR_AJUSTE_INGRESO: 'Factor de ajuste del ingreso',
  UMBRAL_CASCADA_RECHAZO: 'Umbral de rechazo en cascada',
  UMBRAL_CASCADA_APROBACION: 'Umbral de aprobación en cascada',
  UMBRAL_DIFERENCIA_INGRESO: 'Diferencia máxima ingreso declarado vs. estimado',
  VIGENCIA_CRC_DIAS: 'Vigencia del CRC (días)',
  DIAS_EXPIRACION_ESTUDIO: 'Expiración del estudio (días)',
  UMBRAL_COARRENDATARIO: 'Puntaje mínimo del coarrendatario',
  CANON_MAX_TRANSITORIO: 'Canon máximo sin coafianzamiento',
  UMBRAL_APROBACION_AUTOMATICA: 'Umbral de aprobación automática',
  UMBRAL_ZONA_GRIS: 'Inicio de la zona gris',
}

const nombreDe = (clave: string) => NOMBRE_PARAMETRO[clave] ?? clave

const pct = (n: number, total: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : '—')

function DatoCascada({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 font-mono text-2xl font-extrabold text-gray-900">{valor}</dd>
      {sub && <dd className="text-xs text-gray-500">{sub}</dd>}
    </div>
  )
}

function FilaParametro({ p, onGuardado }: { p: IParametroCalibracion; onGuardado: () => void }) {
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(String(p.valor))
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cambiado = Number(valor) !== p.valor

  async function guardar() {
    const n = Number(valor)
    if (!Number.isFinite(n)) {
      toast.error('El valor debe ser numérico')
      return
    }
    setGuardando(true)
    try {
      await calibracionService.actualizar(p.clave, n, motivo.trim() || undefined)
      toast.success(`${nombreDe(p.clave)} actualizado`)
      setEditando(false)
      setMotivo('')
      onGuardado()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">{nombreDe(p.clave)}</p>
          <p className="text-xs text-gray-600">{p.descripcion}</p>
          {p.advertencia && (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              <IconAlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{p.advertencia}</span>
            </p>
          )}
          <p className="mt-1 text-[11px] text-gray-400">
            {p.seccion} · <code>{p.clave}</code> · rango {fmt(p.min, p.entero)} – {fmt(p.max, p.entero)} · default{' '}
            {fmt(p.valorDefault, p.entero)}
            {p.actualizado_en ? ` · último cambio ${formatDate(p.actualizado_en)}` : ' · sin cambios desde el despliegue'}
          </p>
        </div>

        {editando ? (
          <div className="flex w-full flex-col gap-2 sm:w-72">
            <input
              type="number"
              step={p.entero ? 1 : 0.01}
              min={p.min}
              max={p.max}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-right font-mono text-sm"
            />
            <input
              type="text"
              placeholder="Motivo (opcional, queda en el historial)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={500}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={guardar}
                disabled={guardando || !cambiado}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {guardando ? <IconLoader size={14} className="animate-spin" /> : <IconCheck size={14} />}
                Guardar
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditando(false)
                  setValor(String(p.valor))
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-extrabold text-gray-900">{fmt(p.valor, p.entero)}</span>
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Editar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminCalibracionPage() {
  const { user } = useAuth()
  const [params, setParams] = useState<IParametroCalibracion[]>([])
  const [historial, setHistorial] = useState<IHistorialCalibracion[]>([])
  // null = no se pudo cargar (la cascada es informativa: no tumba el panel).
  const [cascada, setCascada] = useState<ICascadaCentrales | null>(null)
  const [loading, setLoading] = useState(true)

  const cargar = async () => {
    try {
      const [p, h, c] = await Promise.all([
        calibracionService.listar(),
        calibracionService.historial(),
        calibracionService.getCascada(30).catch(() => null),
      ])
      setParams(p)
      setHistorial(h)
      setCascada(c)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando la calibración')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.rol === 'administrador') void cargar()
    else setLoading(false)
  }, [user])

  if (user?.rol !== 'administrador') {
    return (
      <div className="space-y-6">
        <PageHeader title="Calibración del modelo" />
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-6">
          <IconLock className="text-red-600" size={20} />
          <p className="text-sm text-red-800">Solo la Gerencia (administrador) puede acceder a esta sección.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calibración del modelo"
        subtitle="Parámetros de la Política V4.1 y su Adenda 1. Cada cambio queda registrado con fecha, valor anterior, valor nuevo y usuario."
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <IconLoader size={28} className="animate-spin text-primary-600" />
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            {/* Decía "debe correrse scripts/check-decision-adenda.ts", algo que
                Gerencia no puede hacer desde aquí: el aviso ahora pide lo que
                sí está en su mano. */}
            Adenda §11: antes de cambiar un parámetro en producción, pide a Tecnología que valide la matriz de
            casos de prueba y confirme que ningún caso crítico cambia de resultado.
          </div>

          {/* Cascada de centrales (Política V4.1 §8): cuántos estudios cerraron
              con una consulta y cuántos necesitaron la segunda central. Con el
              motor apagado no hay rastro, y se dice en vez de contar ceros. */}
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-bold text-gray-900">Cascada de centrales (últimos 30 días)</h2>
            {cascada === null ? (
              <p className="mt-1 text-sm text-gray-400">No se pudo cargar la cascada.</p>
            ) : cascada.total === 0 ? (
              <p className="mt-1 text-sm text-gray-400">
                Sin estudios ejecutados desde {formatDate(cascada.desde)}.
              </p>
            ) : (
              <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <DatoCascada label="Estudios" valor={cascada.total.toLocaleString('es-CO')} sub={`desde ${formatDate(cascada.desde)}`} />
                <DatoCascada
                  label="Resueltos con una central"
                  valor={pct(cascada.una_central, cascada.total)}
                  sub={`${cascada.una_central.toLocaleString('es-CO')} estudios`}
                />
                <DatoCascada
                  label="Con dos centrales"
                  valor={pct(cascada.dos_centrales, cascada.total)}
                  sub={`${cascada.dos_centrales.toLocaleString('es-CO')} estudios`}
                />
                <DatoCascada
                  label="Sin dato (motor apagado)"
                  valor={cascada.sin_dato.toLocaleString('es-CO')}
                  sub={cascada.sin_dato > 0 ? 'no cuentan en los porcentajes' : undefined}
                />
              </dl>
            )}
          </section>

          <div className="space-y-3">
            {params.map((p) => (
              <FilaParametro key={p.clave} p={p} onGuardado={cargar} />
            ))}
          </div>

          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">Historial de cambios</h2>
            {historial.length === 0 ? (
              <p className="text-sm text-gray-400">Sin cambios registrados.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Parámetro</th>
                      <th className="px-3 py-2 text-right">Anterior</th>
                      <th className="px-3 py-2 text-right">Nuevo</th>
                      <th className="px-3 py-2">Usuario</th>
                      <th className="px-3 py-2">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((h) => (
                      <tr key={h.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 whitespace-nowrap text-gray-600">{formatDate(h.created_at)}</td>
                        <td className="px-3 py-2" title={h.clave}>{nombreDe(h.clave)}</td>
                        <td className="px-3 py-2 text-right font-mono">{h.valor_anterior ?? '—'}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold">{h.valor_nuevo}</td>
                        <td className="px-3 py-2 text-gray-700">{h.usuario_nombre ?? h.usuario_id ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-500">{h.motivo ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
