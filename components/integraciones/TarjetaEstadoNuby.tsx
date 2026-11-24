/**
 * Integración nuby: tarjeta de la conexión ya hecha. Dice a qué nuby está
 * conectada, cómo va (activa, con error, pausada), cuándo fue la última copia,
 * su resumen en cifras y las acciones del titular.
 */

'use client'

import { useId } from 'react'
import {
  IconAlertTriangle,
  IconCheck,
  IconCheckCircle,
  IconInfo,
  IconLoader,
  IconPencil,
  IconPlug,
  IconPower,
  IconRefresh,
} from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { formatDate, formatDateTime } from '@/lib/constants'
import { cifrasDeResumen, etiquetaEstadoNuby, etiquetaModoCopia } from '@/lib/integracionNuby'
import type { AccionNuby } from '@/hooks/useIntegracionNuby'
import type { EstadoConexionNuby, IntegracionNuby, TotalesNuby } from '@/types/integracionNuby'

interface Props {
  integracion: IntegracionNuby
  totales: TotalesNuby
  sincronizacionAutomatica: boolean
  /** Acción en curso (deshabilita las demás). */
  accion: AccionNuby | null
  /** Copia en curso: tampoco se cambian las credenciales ni se desconecta (la API responde 409). */
  sincronizando: boolean
  /** La copia lleva más de lo que la pantalla espera sola. */
  sondeoAgotado: boolean
  actualizando: boolean
  onSincronizar: () => void
  onProbar: () => void
  onCambiar: () => void
  onDesconectar: () => void
  onActualizar: () => void
}

const TONO_ESTADO: Record<EstadoConexionNuby, string> = {
  activa: 'bg-green-50 text-green-700',
  error: 'bg-red-50 text-red-700',
  pausada: 'bg-amber-50 text-amber-800',
}

function PastillaEstado({ estado }: { estado: EstadoConexionNuby }) {
  const Icono = estado === 'activa' ? IconCheck : estado === 'error' ? IconAlertTriangle : IconInfo
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        TONO_ESTADO[estado] ?? 'bg-gray-100 text-gray-700',
      )}
    >
      <Icono size={12} />
      {etiquetaEstadoNuby(estado)}
    </span>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-500">{etiqueta}</dt>
      <dd className="mt-0.5 break-words text-sm text-gray-900">{children}</dd>
    </div>
  )
}

function Aviso({ tono, titulo, children }: { tono: 'rojo' | 'ambar' | 'gris'; titulo: string; children?: React.ReactNode }) {
  const clases = {
    rojo: { caja: 'border-red-200 bg-red-50', icono: 'text-red-600', titulo: 'text-red-900', texto: 'text-red-800' },
    ambar: { caja: 'border-amber-200 bg-amber-50', icono: 'text-amber-600', titulo: 'text-amber-900', texto: 'text-amber-800' },
    gris: { caja: 'border-gray-200 bg-gray-50', icono: 'text-gray-500', titulo: 'text-gray-900', texto: 'text-gray-700' },
  }[tono]
  const Icono = tono === 'gris' ? IconInfo : IconAlertTriangle
  return (
    <div className={cn('flex items-start gap-2 rounded-lg border p-3', clases.caja)}>
      <Icono size={18} className={cn('mt-0.5 shrink-0', clases.icono)} />
      <div className="min-w-0 text-sm">
        <p className={cn('font-medium', clases.titulo)}>{titulo}</p>
        {children && <div className={cn('mt-1 space-y-1 break-words', clases.texto)}>{children}</div>}
      </div>
    </div>
  )
}

export function TarjetaEstadoNuby({
  integracion,
  totales,
  sincronizacionAutomatica,
  accion,
  sincronizando,
  sondeoAgotado,
  actualizando,
  onSincronizar,
  onProbar,
  onCambiar,
  onDesconectar,
  onActualizar,
}: Props) {
  const id = useId()
  const ocupado = accion !== null
  const { estado, resumen, ultimo_error: ultimoError } = integracion
  // «Último intento» solo aporta cuando no es la misma copia que terminó bien.
  const intentoFallido =
    integracion.ultimo_intento_en && integracion.ultimo_intento_en !== integracion.ultima_sincronizacion_en
      ? formatDateTime(integracion.ultimo_intento_en)
      : null

  return (
    <section aria-labelledby={`${id}-titulo`} className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 id={`${id}-titulo`} className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <IconPlug size={18} className="shrink-0 text-primary-700" />
            Conexión con nuby
          </h2>
          <PastillaEstado estado={estado} />
          {/* Región viva siempre montada: el lector anuncia cuando la copia empieza. */}
          <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-700">
            {sincronizando && (
              <>
                <IconLoader size={14} className="animate-spin" />
                Copiando inmuebles…
              </>
            )}
          </span>
        </div>

        {estado === 'error' && (
          <Aviso tono="rojo" titulo="La copia desde nuby está detenida">
            {ultimoError && <p>{ultimoError}</p>}
            {intentoFallido && <p>Último intento: {intentoFallido}</p>}
            <p>
              Cuando lo corrija en nuby, pulse «Probar conexión»: si la prueba pasa, la conexión vuelve a quedar
              activa. Si creó un cliente nuevo en nuby, regístrelo con «Cambiar credenciales».
            </p>
          </Aviso>
        )}
        {estado === 'pausada' && (
          <Aviso tono="ambar" titulo="La conexión con nuby está pausada">
            <p>
              Cofianza no copia sola mientras la conexión esté pausada. Si pulsa «Copiar ahora» y la copia termina
              bien, vuelve a quedar activa.
            </p>
            {ultimoError && <p>{ultimoError}</p>}
          </Aviso>
        )}
        {estado === 'activa' && ultimoError && (
          <Aviso tono="ambar" titulo="El último intento de copia no terminó">
            <p>{ultimoError}</p>
            {intentoFallido && <p>Último intento: {intentoFallido}</p>}
          </Aviso>
        )}
        {!sincronizacionAutomatica && (
          <Aviso tono="gris" titulo="La copia automática está apagada por ahora">
            <p>Los inmuebles solo se actualizan cuando se pulsa «Copiar ahora».</p>
          </Aviso>
        )}
        {sincronizando && sondeoAgotado && (
          <Aviso tono="gris" titulo="La copia sigue en curso">
            <p>Con un inventario grande puede tardar. Vuelva en unos minutos o actualice el estado.</p>
            <Button variante="secondary" tamano="sm" onClick={onActualizar} disabled={actualizando} className="mt-1 min-h-10">
              <IconRefresh size={14} className={actualizando ? 'animate-spin' : undefined} />
              Actualizar estado
            </Button>
          </Aviso>
        )}

        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Dato etiqueta="Dirección">
            <span className="break-all">{integracion.instancia}</span>
          </Dato>
          <Dato etiqueta="ID de cliente">
            <span className="sr-only">Termina en </span>
            <span className="font-mono">
              <span aria-hidden="true">••••</span>
              {integracion.client_id_final}
            </span>
          </Dato>
          <Dato etiqueta="Conectada">
            {formatDate(integracion.conectada_en)}
            {integracion.conectada_por_nombre && ` · ${integracion.conectada_por_nombre}`}
          </Dato>
          <Dato etiqueta="Inmuebles vinculados con nuby">{totales.vinculados.toLocaleString('es-CO')}</Dato>
          <Dato etiqueta="Última copia">
            {integracion.ultima_sincronizacion_en
              ? formatDateTime(integracion.ultima_sincronizacion_en)
              : 'Todavía no se ha hecho la primera copia'}
          </Dato>
          <Dato etiqueta="Última revisión completa">
            {integracion.ultima_revision_completa_en ? formatDateTime(integracion.ultima_revision_completa_en) : 'Todavía no'}
          </Dato>
          {totales.ausentes > 0 && (
            <Dato etiqueta="Ya no aparecen en nuby">
              {totales.ausentes.toLocaleString('es-CO')} · siguen en Cofianza, fuera de la vitrina
            </Dato>
          )}
        </dl>
      </div>

      {resumen && (
        <div className="border-t border-gray-100 p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-gray-900">La última copia en cifras</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {etiquetaModoCopia(resumen.modo)} · terminó el {formatDateTime(resumen.terminado_en)}
          </p>
          <dl className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            {cifrasDeResumen(resumen).map((cifra) => (
              <div key={cifra.clave} className="flex items-baseline justify-between gap-3 border-b border-gray-100 py-1.5 text-sm">
                <dt className="min-w-0 text-gray-600">{cifra.etiqueta}</dt>
                <dd className="shrink-0 font-semibold tabular-nums text-gray-900">{cifra.valor.toLocaleString('es-CO')}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-gray-100 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-6">
        <Button
          onClick={onSincronizar}
          disabled={ocupado || sincronizando}
          aria-busy={sincronizando || accion === 'sincronizar' || undefined}
          className="min-h-11 w-full sm:min-h-10 sm:w-auto"
        >
          {sincronizando || accion === 'sincronizar' ? <IconLoader size={16} className="animate-spin" /> : <IconRefresh size={16} />}
          {sincronizando ? 'Copiando…' : 'Copiar ahora'}
        </Button>
        <Button
          variante="secondary"
          onClick={onProbar}
          disabled={ocupado}
          aria-busy={accion === 'probar' || undefined}
          className="min-h-11 w-full sm:min-h-10 sm:w-auto"
        >
          {accion === 'probar' ? <IconLoader size={16} className="animate-spin" /> : <IconCheckCircle size={16} />}
          {accion === 'probar' ? 'Probando…' : 'Probar conexión'}
        </Button>
        <Button
          variante="secondary"
          onClick={onCambiar}
          disabled={ocupado || sincronizando}
          className="min-h-11 w-full sm:min-h-10 sm:w-auto"
        >
          <IconPencil size={16} />
          Cambiar credenciales
        </Button>
        <Button
          variante="secondary"
          onClick={onDesconectar}
          disabled={ocupado || sincronizando}
          className="min-h-11 w-full border-red-200 text-red-700 hover:bg-red-50 sm:ml-auto sm:min-h-10 sm:w-auto"
        >
          <IconPower size={16} />
          Desconectar
        </Button>
      </div>
    </section>
  )
}
