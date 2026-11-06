/**
 * TimelineSection - HP-270
 * Historial unificado del estudio: lista ordenada por día, filtros por tipo y paginación
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  IconLoader,
  IconRefresh,
  IconPlus,
  IconFileText,
  IconCheck,
  IconEdit,
  IconUser,
  IconClock,
  IconDollarSign,
  IconPencil,
  IconSearch,
  IconX,
  IconAlertTriangle,
  IconArrowRight,
  IconCheckCircle,
} from '@/components/icons'
import { formatDateTime } from '@/lib/constants'
import { expedienteService } from '@/services/expedienteService'
import type { ITimelineEvento, ITimelinePagination } from '@/types/expediente'
import { cn } from '@/lib/utils'
import { useRefrescoExpediente } from '@/components/expedientes/ExpedienteRefresco'
import { textoVisible } from './textoVisible'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'

export interface TimelineSectionProps {
  expedienteId: string
}

// ============================================
// Helpers
// ============================================

const ESTADO_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  en_revision: 'En revisión',
  informacion_incompleta: 'Info. incompleta',
  aprobado: 'Aprobado',
  rechazado: 'No aprobable',
  condicionado: 'Condicionado',
  cerrado: 'Finalizado',
}

function estadoLabel(estado: string): string {
  return ESTADO_LABELS[estado] || estado.replace(/_/g, ' ')
}

/**
 * El cierre según de dónde viene: solo desde «Aprobado» puede ser el cierre
 * natural; desde un estado activo es una cancelación y desde «No aprobable»,
 * el archivo de un no aprobable. «Finalizado» para todos engañaba.
 */
function estadoNuevoLabel(anterior: string, nuevo: string): string {
  if (nuevo !== 'cerrado') return estadoLabel(nuevo)
  if (anterior === 'rechazado') return 'No aprobable (cerrado)'
  if (anterior === 'aprobado') return 'Finalizado'
  return 'Cancelado'
}

// ============================================
// Config
// ============================================

type TipoEvento = ITimelineEvento['tipo']

const EVENTO_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ size?: number; className?: string }>; color: string; bgColor: string }
> = {
  creacion: { icon: IconPlus, color: 'text-green-600', bgColor: 'bg-green-100' },
  transicion: { icon: IconEdit, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  documento: { icon: IconFileText, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  comentario: { icon: IconFileText, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  asignacion: { icon: IconUser, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  estudio: { icon: IconCheck, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  contrato: { icon: IconFileText, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  firma: { icon: IconPencil, color: 'text-green-600', bgColor: 'bg-green-100' },
  pago: { icon: IconDollarSign, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  // Eventos de cita (agendada/realizada/omitida — 3.2).
  cita: { icon: IconClock, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
}

type ConfigEvento = (typeof EVENTO_CONFIG)[string]
const ESTUDIO_NEGATIVO: ConfigEvento = { icon: IconX, color: 'text-red-600', bgColor: 'bg-red-100' }
const ESTUDIO_POSITIVO: ConfigEvento = { icon: IconCheck, color: 'text-green-600', bgColor: 'bg-green-100' }
const ESTUDIO_NEUTRO: ConfigEvento = { icon: IconSearch, color: 'text-amber-600', bgColor: 'bg-amber-100' }

/** El ícono de un evento de evaluación dice cómo salió: un ✓ en un rechazo engañaba. */
function configEvento(evento: ITimelineEvento): ConfigEvento {
  if (evento.tipo !== 'estudio') return EVENTO_CONFIG[evento.tipo] || EVENTO_CONFIG.comentario
  const d = evento.descripcion.toLowerCase()
  if (/no aprobad|rechazad|sin efecto|no califica/.test(d)) return ESTUDIO_NEGATIVO
  if (/aprobad|autoriz/.test(d)) return ESTUDIO_POSITIVO
  return ESTUDIO_NEUTRO
}

/** Filas viejas del orquestador: «Estado cambiado automaticamente: "a" → "b"» (el detalle ya trae los estados). */
function descripcionEvento(descripcion: string): string {
  return /^Estado cambiado automaticamente/.test(descripcion) ? 'Cambio automático de estado' : textoVisible(descripcion)
}

/**
 * «Resultado de estudio registrado: x» (lo escribe la base) repite el evento de
 * la evaluación que llega en el mismo segundo; solo se muestra si va solo.
 */
function esResultadoRepetido(evento: ITimelineEvento, eventos: ITimelineEvento[]): boolean {
  if (!evento.descripcion.startsWith('Resultado de estudio registrado')) return false
  const t = new Date(evento.created_at).getTime()
  return eventos.some(
    (o) => o.id !== evento.id && o.tipo === 'estudio' && !o.descripcion.startsWith('Resultado de estudio registrado') &&
      Math.abs(new Date(o.created_at).getTime() - t) < 10_000,
  )
}

/**
 * «X indicó que el número de documento de su invitación está mal… corrija el
 * documento y reenvíela» pide una acción. Si después autorizó con ese
 * documento, la API deja un evento de resolución (más nuevo, así que llega en
 * la misma página o antes): el aviso se pinta como resuelto.
 */
function reportesDocumentoResueltos(eventos: ITimelineEvento[]): Set<string> {
  const resueltos = new Set<string>()
  const resoluciones = eventos.filter((e) => e.detalle?.origen === 'coarrendatario_documento_resuelto')
  if (resoluciones.length === 0) return resueltos
  for (const ev of eventos) {
    if (ev.detalle?.origen !== 'coarrendatario_documento_incorrecto') continue
    const t = new Date(ev.created_at).getTime()
    const resuelto = resoluciones.some(
      (r) =>
        r.detalle?.reporte_evento_id === ev.id ||
        (r.detalle?.coarrendatario_id === ev.detalle?.coarrendatario_id && new Date(r.created_at).getTime() >= t),
    )
    if (resuelto) resueltos.add(ev.id)
  }
  return resueltos
}

const FILTROS: { value: TipoEvento | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'transicion', label: 'Cambios de estado' },
  // La API ya filtraba por evaluación y firma; la pantalla no los ofrecía.
  { value: 'estudio', label: 'Evaluación' },
  { value: 'comentario', label: 'Comentarios' },
  { value: 'asignacion', label: 'Asignaciones' },
  { value: 'cita', label: 'Citas' },
  // Eventos del contrato (activado / finalizado / cancelado).
  { value: 'contrato', label: 'Contrato' },
  { value: 'firma', label: 'Firmas' },
  { value: 'pago', label: 'Pagos' },
  { value: 'creacion', label: 'Creación' },
]

/** Nombre del tipo en la línea de cada evento: el color y el ícono no lo dicen solos. */
const TIPO_LABEL: Record<TipoEvento, string> = {
  creacion: 'Creación',
  transicion: 'Cambio de estado',
  documento: 'Documento',
  comentario: 'Comentario',
  asignacion: 'Asignación',
  estudio: 'Evaluación',
  contrato: 'Contrato',
  firma: 'Firma',
  pago: 'Pago',
  cita: 'Cita',
}

const PAGE_SIZE = 10

// El mismo botón de fila que Documentos, Contratos y Pagos: 40 px de alto, con texto.
const BOTON_FILA =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50'
const BOTON_SECUNDARIO = 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'

// ---- Fechas en hora de Colombia (como formatDateTime) ----

const ZONA = 'America/Bogota'
const claveDia = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(d)
const fmtDia = new Intl.DateTimeFormat('es-CO', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const fmtHora = new Intl.DateTimeFormat('es-CO', { timeZone: ZONA, hour: 'numeric', minute: '2-digit' })

/** «Hoy», «Ayer» o «lunes, 3 de noviembre de 2026». */
function etiquetaDia(clave: string, fecha: Date): string {
  const hoy = new Date()
  if (clave === claveDia(hoy)) return 'Hoy'
  if (clave === claveDia(new Date(hoy.getTime() - 86_400_000))) return 'Ayer'
  const texto = fmtDia.format(fecha)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Agrupa por día sin cambiar el orden que manda la API (del más reciente al más antiguo). */
function agruparPorDia(eventos: ITimelineEvento[]) {
  const grupos: { clave: string; etiqueta: string; eventos: ITimelineEvento[] }[] = []
  for (const evento of eventos) {
    const fecha = new Date(evento.created_at)
    const clave = Number.isNaN(fecha.getTime()) ? 'sin-fecha' : claveDia(fecha)
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.clave === clave) ultimo.eventos.push(evento)
    else grupos.push({ clave, etiqueta: clave === 'sin-fecha' ? 'Sin fecha' : etiquetaDia(clave, fecha), eventos: [evento] })
  }
  return grupos
}

function horaEvento(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : fmtHora.format(d)
}

// ============================================
// Component
// ============================================

export function TimelineSection({ expedienteId }: TimelineSectionProps) {
  // Refresco en sitio cuando el detalle del estudio recarga.
  const version = useRefrescoExpediente()
  const [eventos, setEventos] = useState<ITimelineEvento[]>([])
  const [pagination, setPagination] = useState<ITimelinePagination | null>(null)
  const [filtro, setFiltro] = useState<TipoEvento | 'todos'>('todos')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTimeline = useCallback(
    async (page: number, append: boolean = false) => {
      if (page === 1) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }
      setError(null)

      try {
        const params: { page: number; limit: number; tipo?: string } = {
          page,
          limit: PAGE_SIZE,
        }
        if (filtro !== 'todos') {
          params.tipo = filtro
        }

        const result = await expedienteService.getTimeline(expedienteId, params)

        if (append) {
          setEventos((prev) => [...prev, ...result.data])
        } else {
          setEventos(result.data)
        }
        setPagination(result.pagination)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cargar historial'
        setError(message)
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [expedienteId, filtro]
  )

  useEffect(() => {
    fetchTimeline(1)
  }, [fetchTimeline, version])

  const handleFiltroChange = (nuevoFiltro: TipoEvento | 'todos') => {
    setFiltro(nuevoFiltro)
  }

  const handleLoadMore = () => {
    if (isLoadingMore) return
    if (pagination && pagination.page < pagination.totalPages) {
      fetchTimeline(pagination.page + 1, true)
    }
  }

  const hasMore = pagination ? pagination.page < pagination.totalPages : false
  const filtroLabel = FILTROS.find((f) => f.value === filtro)?.label ?? ''

  const encabezado = (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Historial del estudio</h3>
        <p className="mt-1 text-sm text-gray-600">
          {pagination && !error && !(isLoading && eventos.length === 0)
            ? `${pagination.total} ${pagination.total === 1 ? 'evento' : 'eventos'}${filtro !== 'todos' ? ` de tipo «${filtroLabel}»` : ''} · del más reciente al más antiguo`
            : 'Cambios de estado, evaluaciones, pagos, firmas y comentarios, del más reciente al más antiguo.'}
        </p>
      </div>
      <FilterChips filtro={filtro} onChange={handleFiltroChange} />
    </div>
  )

  // ---- Renders ----

  // Solo la primera carga: al cambiar el filtro se siguen viendo los eventos de antes.
  if (isLoading && eventos.length === 0) {
    return (
      <div className="space-y-5">
        {encabezado}
        <div role="status" className="space-y-5">
          <span className="sr-only">Cargando historial…</span>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <SkeletonText lineas={2} className="flex-1" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-5">
        {encabezado}
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-red-700"><IconAlertTriangle size={18} /></span>
            <div>
              <p className="text-sm font-medium text-red-900">No pudimos cargar el historial de este estudio.</p>
              <p className="mt-0.5 text-sm text-red-800">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchTimeline(1)}
            disabled={isLoading}
            className={cn(BOTON_FILA, 'shrink-0 border border-red-300 bg-white text-red-800 hover:bg-red-100')}
          >
            {isLoading ? <IconLoader size={16} className="animate-spin" /> : <IconRefresh size={16} />}
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (eventos.length === 0) {
    return (
      <div className="space-y-5">
        {encabezado}
        <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <IconClock size={20} />
          </span>
          {filtro === 'todos' ? (
            <>
              <p className="mt-3 text-sm font-semibold text-gray-900">Sin actividad registrada</p>
              <p className="mt-1 max-w-md text-sm text-gray-600">
                Aquí aparecerán los cambios de estado, las evaluaciones, los pagos, las firmas y los comentarios del estudio.
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm font-semibold text-gray-900">No hay eventos de tipo «{filtroLabel}»</p>
              <p className="mt-1 max-w-md text-sm text-gray-600">Pruebe con otro tipo o vea todo el historial.</p>
              <button type="button" onClick={() => handleFiltroChange('todos')} className={cn(BOTON_FILA, BOTON_SECUNDARIO, 'mt-5')}>
                Ver todos los eventos
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  const visibles = eventos.filter((e) => !esResultadoRepetido(e, eventos))
  const grupos = agruparPorDia(visibles)
  const reportesResueltos = reportesDocumentoResueltos(eventos)
  const ultimoId = visibles[visibles.length - 1]?.id

  return (
    <div className="space-y-5">
      {encabezado}

      <ol
        aria-label="Eventos del estudio"
        aria-busy={isLoading}
        className={cn('space-y-6', isLoading && 'opacity-60 pointer-events-none')}
      >
        {grupos.map((grupo) => (
          <li key={grupo.clave}>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {grupo.etiqueta}
            </h4>
            <ol>
              {grupo.eventos.map((evento) => {
                const config = configEvento(evento)
                const Icon = config.icon
                const nombreCompleto = `${evento.usuario.nombre} ${evento.usuario.apellido}`.trim() || 'Sistema'
                const esUltimo = evento.id === ultimoId

                return (
                  <li key={evento.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {/* Riel: une cada evento con el siguiente, también entre días */}
                    {!esUltimo && (
                      <span aria-hidden="true" className="absolute left-4 top-9 -bottom-1 w-px -translate-x-1/2 bg-gray-200" />
                    )}
                    <span
                      aria-hidden="true"
                      className={cn('relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full', config.bgColor)}
                    >
                      <Icon size={16} className={config.color} />
                    </span>

                    <div className="min-w-0 flex-1 pt-1">
                      <p className="break-words text-sm font-medium text-gray-900">
                        {descripcionEvento(evento.descripcion)}
                      </p>
                      {reportesResueltos.has(evento.id) && (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-800">
                          <IconCheckCircle size={14} className="text-primary-700" />
                          Resuelto: después autorizó con ese documento
                        </p>
                      )}
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-gray-600">
                        <span>{TIPO_LABEL[evento.tipo] ?? 'Evento'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-gray-700">{nombreCompleto}</span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={evento.created_at} title={formatDateTime(evento.created_at)} className="tabular-nums">
                          {horaEvento(evento.created_at)}
                        </time>
                      </p>

                      {/* Detalle por tipo */}
                      <EventoDetalle evento={evento} />
                    </div>
                  </li>
                )
              })}
            </ol>
          </li>
        ))}
      </ol>

      {/* Ver más + cuántos se ven */}
      {pagination && (
        <div className="flex flex-col items-center gap-2 border-t border-gray-100 pt-4">
          {hasMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className={cn(BOTON_FILA, BOTON_SECUNDARIO)}
            >
              {isLoadingMore && <IconLoader size={16} className="animate-spin" />}
              {isLoadingMore ? 'Cargando eventos…' : 'Ver más eventos'}
            </button>
          )}
          <p className="text-xs text-gray-600" aria-live="polite">
            Mostrando {eventos.length} de {pagination.total} eventos
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================
// Sub-components
// ============================================

function FilterChips({
  filtro,
  onChange,
}: {
  filtro: TipoEvento | 'todos'
  onChange: (f: TipoEvento | 'todos') => void
}) {
  return (
    <div
      role="group"
      aria-label="Filtrar por tipo de evento"
      className="flex flex-wrap gap-2"
    >
      {FILTROS.map((f) => {
        const activo = filtro === f.value
        return (
          <button
            key={f.value}
            type="button"
            aria-pressed={activo}
            onClick={() => onChange(f.value)}
            className={cn(
              'inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full border px-3 text-sm font-medium transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
              activo
                ? 'border-primary-300 bg-primary-50 text-primary-800'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            {activo && <IconCheck size={14} />}
            {f.label}
          </button>
        )
      })}
    </div>
  )
}

/** Flecha entre dos estados: el lector de pantalla oye «a». */
function Flecha() {
  return (
    <>
      <span aria-hidden="true" className="inline-flex text-gray-400"><IconArrowRight size={14} /></span>
      <span className="sr-only"> a </span>
    </>
  )
}

const DETALLE = 'mt-2 max-w-3xl space-y-1 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600'

function EventoDetalle({ evento }: { evento: ITimelineEvento }) {
  const { tipo, detalle } = evento

  if (!detalle || Object.keys(detalle).length === 0) return null

  if (tipo === 'transicion') {
    const anterior = detalle.estado_anterior as string | null
    const nuevo = detalle.estado_nuevo as string | null
    const comentario = detalle.comentario as string | null
    const documentos = Array.isArray(detalle.documentos_consultados)
      ? (detalle.documentos_consultados as string[])
      : []
    // La API guarda el recálculo completo ({ puntaje_normalizado, denominador, … });
    // filas viejas pueden traer solo el número.
    const recalculo = detalle.puntaje_revision_manual as number | { puntaje_normalizado?: number | null } | null | undefined
    const puntaje = typeof recalculo === 'number' ? recalculo : recalculo?.puntaje_normalizado

    if (!(anterior && nuevo) && !comentario && documentos.length === 0 && typeof puntaje !== 'number') return null

    return (
      <div className={DETALLE}>
        {anterior && nuevo && (
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-gray-800">{estadoLabel(anterior)}</span>
            <Flecha />
            <span className="font-medium text-gray-800">{estadoNuevoLabel(anterior, nuevo)}</span>
          </p>
        )}
        {comentario && (
          <p className="whitespace-pre-line break-words italic">«{textoVisible(comentario)}»</p>
        )}
        {/* Adenda 2 §5.1: el analista registra fundamento, documentos
            consultados y puntaje recalculado. El API los guardaba y ninguna
            pantalla los mostraba — ni la bitácora, que está cerrada a
            'administrador'. */}
        {documentos.length > 0 && (
          <p className="break-words">
            <span className="font-medium text-gray-800">Documentos consultados:</span>{' '}
            {documentos.join(', ')}
          </p>
        )}
        {typeof puntaje === 'number' && (
          <p>
            <span className="font-medium text-gray-800">Puntaje recalculado:</span>{' '}
            <span className="tabular-nums">{puntaje.toLocaleString('es-CO', { maximumFractionDigits: 1 })} de 100</span>
          </p>
        )}
      </div>
    )
  }

  if (tipo === 'comentario') {
    const contenido = detalle.contenido as string | null
    if (!contenido) return null

    return (
      <div className={DETALLE}>
        <p className="line-clamp-3 break-words">{contenido}</p>
      </div>
    )
  }

  if (tipo === 'asignacion') {
    const anterior = detalle.analista_anterior as string | null
    const nuevo = detalle.analista_nuevo as string | null

    if (!anterior && !nuevo) return null

    return (
      <div className={DETALLE}>
        {anterior ? (
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-gray-800">{anterior}</span>
            <Flecha />
            <span className="font-medium text-gray-800">{nuevo}</span>
          </p>
        ) : (
          <p>
            Asignado a: <span className="font-medium text-gray-800">{nuevo}</span>
          </p>
        )}
      </div>
    )
  }

  // Fundamento interno del analista (P33, P34): este timeline es solo de Cofianza.
  if (tipo === 'estudio' && typeof detalle.fundamento === 'string') {
    return (
      <div className={DETALLE}>
        <p className="font-medium text-gray-800">Fundamento</p>
        <p className="whitespace-pre-line break-words">
          {textoVisible(detalle.fundamento.replace(/(^|\n)[ARC]\d+ · /g, '$1'))}
        </p>
      </div>
    )
  }

  if (tipo === 'firma') {
    const firmadoEn = detalle.firmado_en as string | null
    const nombreFirmante = detalle.nombre_firmante as string | null

    if (!nombreFirmante && !firmadoEn) return null

    return (
      <div className={DETALLE}>
        {nombreFirmante && (
          <p>
            Firmante: <span className="font-medium text-gray-800">{nombreFirmante}</span>
          </p>
        )}
        {firmadoEn && (
          <p>
            Firmado el <time dateTime={firmadoEn} className="tabular-nums">{formatDateTime(firmadoEn)}</time>
          </p>
        )}
      </div>
    )
  }

  return null
}
