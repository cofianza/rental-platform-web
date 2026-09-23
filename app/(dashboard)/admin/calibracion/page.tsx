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
 *
 * Adenda 1 del módulo de contratos, respuesta 17: los parámetros de riesgo
 * solo los cambia la Gerencia General; a otro administrador le llegan con
 * `editable: false` y se ven de solo lectura (el API igual responde 403).
 */

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuth } from '@/hooks/useAuth'
import {
  calibracionService,
  type IParametroCalibracion,
  type IHistorialCalibracion,
  type ICascadaCentrales,
  type IRevisionManual,
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
  CANON_MAX_TRANSITORIO: 'Canon máximo sin coafianzamiento — vivienda (COP)',
  TOPE_CANON_COMERCIAL: 'Canon máximo sin coafianzamiento — comercial (COP, sin IVA)',
  UMBRAL_APROBACION_AUTOMATICA: 'Umbral de aprobación automática',
  UMBRAL_ZONA_GRIS: 'Inicio de la zona gris',
  UMBRAL_SCORE_RECHAZO: 'Score mínimo de la central',
  UMBRAL_SCORE_REVISION: 'Tope de la banda de revisión por score',
  UMBRAL_SIMILITUD_BIOMETRICA: 'Similitud biométrica mínima en la firma (%)',
  TARIFA_IVA: 'Tarifa de IVA (%)',
  // Contratos V3 §14: rigen solo para el contrato (el motor y la reasignación no cambian).
  TOLERANCIA_CANON: 'Tolerancia del canon pactado sobre el evaluado (%)',
  TOPE_CANON_INGRESO_RECALCULO: 'Relación canon/ingreso máxima al pactar un canon mayor (%)',
  VIGENCIA_MESES_DEFECTO: 'Vigencia por defecto del contrato (meses)',
  // Contratos V3 Entrega 4: tope del paso 4 del asistente (máximo absoluto 25).
  MAX_CLAUSULAS_ADICIONALES: 'Máximo de cláusulas adicionales por contrato',
  // Contratos V3 Entrega 5: al vencer, el contrato pasa a «firma incompleta».
  DIAS_EXPIRACION_FIRMA: 'Días para firmar en Auco antes de «firma incompleta»',
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
  // El error queda junto al campo (antes solo en un toast) y el cambio se
  // confirma: un parámetro del modelo afecta desde ya a todos los estudios.
  const [error, setError] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState(false)

  const cambiado = Number(valor) !== p.valor

  function pedirConfirmacion() {
    const n = Number(valor)
    if (valor.trim() === '' || !Number.isFinite(n)) {
      setError('Escribe un número.')
      return
    }
    if (n < p.min || n > p.max) {
      setError(`Debe estar entre ${fmt(p.min, p.entero)} y ${fmt(p.max, p.entero)}.`)
      return
    }
    if (p.entero && !Number.isInteger(n)) {
      setError('Debe ser un número entero.')
      return
    }
    setError(null)
    setConfirmar(true)
  }

  async function guardar() {
    setGuardando(true)
    try {
      await calibracionService.actualizar(p.clave, Number(valor), motivo.trim() || undefined)
      toast.success(`${nombreDe(p.clave)} actualizado`)
      setEditando(false)
      setMotivo('')
      onGuardado()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
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
            {p.seccion} · <code>{p.clave}</code>
            {p.nivel && ` · ${p.nivel === 'riesgo' ? 'de riesgo' : 'operativo'}`} · rango {fmt(p.min, p.entero)} –{' '}
            {fmt(p.max, p.entero)} · default{' '}
            {fmt(p.valorDefault, p.entero)}
            {p.actualizado_en ? ` · último cambio ${formatDate(p.actualizado_en)}` : ' · sin cambios desde el despliegue'}
          </p>
        </div>

        {editando ? (
          <div className="flex w-full flex-col gap-2 sm:w-72">
            <label className="text-xs font-medium text-gray-700">
              Nuevo valor
              <input
                type="number"
                step={p.entero ? 1 : 0.01}
                min={p.min}
                max={p.max}
                value={valor}
                onChange={(e) => {
                  setValor(e.target.value)
                  setError(null)
                }}
                aria-invalid={!!error}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-right font-mono text-sm ${error ? 'border-red-400' : 'border-gray-300'}`}
              />
            </label>
            <label className="text-xs font-medium text-gray-700">
              Motivo (opcional, queda en el historial)
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={500}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            {error && (
              <p role="alert" className="text-xs text-red-600">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={pedirConfirmacion}
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
                  setError(null)
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
            {p.editable === false ? (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <IconLock size={14} />
                Solo Gerencia General
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Editar
              </button>
            )}
          </div>
        )}
      </div>
      <ConfirmDialog
        isOpen={confirmar}
        onClose={() => setConfirmar(false)}
        onConfirm={guardar}
        title={`Cambiar ${nombreDe(p.clave)}`}
        message={`Pasa de ${fmt(p.valor, p.entero)} a ${fmt(Number(valor), p.entero)}. Aplica desde ya a los estudios y contratos que se procesen de aquí en adelante.`}
        confirmLabel="Guardar cambio"
        isLoading={guardando}
      />
    </div>
  )
}

export default function AdminCalibracionPage() {
  const { user } = useAuth()
  const [params, setParams] = useState<IParametroCalibracion[]>([])
  const [historial, setHistorial] = useState<IHistorialCalibracion[]>([])
  // null = no se pudo cargar (la cascada es informativa: no tumba el panel).
  const [cascada, setCascada] = useState<ICascadaCentrales | null>(null)
  const [revision, setRevision] = useState<IRevisionManual | null>(null)
  const [loading, setLoading] = useState(true)
  // Un fallo de carga no es «sin cambios registrados»: se dice y se reintenta.
  const [errorCarga, setErrorCarga] = useState(false)

  const cargar = async () => {
    try {
      const [p, h, c, r] = await Promise.all([
        calibracionService.listar(),
        calibracionService.historial(),
        calibracionService.getCascada(30).catch(() => null),
        calibracionService.getRevisionManual(30).catch(() => null),
      ])
      setParams(p)
      setHistorial(h)
      setCascada(c)
      setRevision(r)
      setErrorCarga(false)
    } catch {
      setErrorCarga(true)
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
      ) : errorCarga ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm text-red-700">No se pudo cargar la calibración.</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              void cargar()
            }}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Reintentar
          </button>
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

          {/* Adenda 2 §5.1 y §8: revisión manual frente al SLA de la Política
              (2 horas hábiles), escalados por falta de ingreso y caídas de
              DataCrédito. Informativo: si falla no tumba el panel. */}
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-bold text-gray-900">Revisión manual y DataCrédito (últimos 30 días)</h2>
            {revision === null ? (
              <p className="mt-1 text-sm text-gray-400">No se pudo cargar el resumen.</p>
            ) : (
              <>
                <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <DatoCascada label="En revisión ahora" valor={revision.en_revision_ahora.toLocaleString('es-CO')} />
                  <DatoCascada
                    label="Resueltas"
                    valor={revision.resueltas.toLocaleString('es-CO')}
                    sub={revision.resueltas > 0 ? `${pct(revision.dentro_del_sla, revision.resueltas)} dentro del SLA` : undefined}
                  />
                  <DatoCascada
                    label="Tiempo promedio"
                    valor={revision.promedio_horas_habiles === null ? '—' : `${revision.promedio_horas_habiles} h`}
                    sub={`hábiles · SLA ${revision.sla_horas_habiles} h`}
                  />
                  <DatoCascada label="Escaladas sin ingreso" valor={revision.escaladas_sin_ingreso.toLocaleString('es-CO')} sub="Adenda 2 §3" />
                </dl>
                <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <DatoCascada label="Consultas a DataCrédito" valor={revision.datacredito.consultas.toLocaleString('es-CO')} />
                  <DatoCascada label="Caídas de DataCrédito" valor={revision.datacredito.caidas.toLocaleString('es-CO')} />
                  <DatoCascada
                    label="Tasa de caída"
                    valor={revision.datacredito.tasa_caida_pct === null ? '—' : `${revision.datacredito.tasa_caida_pct}%`}
                    sub="revisión a los 3 meses (Adenda 2 §8)"
                  />
                  <DatoCascada
                    label="Errores del dato"
                    valor={revision.datacredito.errores_de_dato.toLocaleString('es-CO')}
                    sub="documento o apellido, no la central"
                  />
                </dl>
                <p className="mt-2 text-xs text-gray-400">
                  Horas hábiles: lunes a viernes de 8:00 a 18:00 (sin descontar festivos). Las caídas se distinguen desde el 11 de septiembre de 2026.
                </p>
              </>
            )}
          </section>

          <div className="space-y-3">
            {params.some((p) => p.editable === false) && (
              <p className="flex items-start gap-1.5 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                <IconLock size={14} className="mt-0.5 shrink-0" />
                <span>
                  Los parámetros de riesgo (topes de canon, umbrales de score, vigencia del certificado, entre otros)
                  solo los cambia la Gerencia General. Tú puedes cambiar los operativos, y cada cambio queda en el
                  historial.
                </span>
              </p>
            )}
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
