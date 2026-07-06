/**
 * TimelineSection - HP-270
 * Timeline unificado del expediente con filtros por tipo, fechas relativas y paginación
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Avatar } from '@/components/ui/Avatar'
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
} from '@/components/icons'
import { expedienteService } from '@/services/expedienteService'
import type { ITimelineEvento, ITimelinePagination } from '@/types/expediente'
import { cn } from '@/lib/utils'

export interface TimelineSectionProps {
  expedienteId: string
}

// ============================================
// Helpers
// ============================================

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'hace un momento'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days}d`

  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const ESTADO_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  en_revision: 'En Revisión',
  informacion_incompleta: 'Info. Incompleta',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  condicionado: 'Condicionado',
  cerrado: 'Finalizado',
}

function estadoLabel(estado: string): string {
  return ESTADO_LABELS[estado] || estado.replace(/_/g, ' ')
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

const FILTROS: { value: TipoEvento | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'transicion', label: 'Transiciones' },
  { value: 'comentario', label: 'Comentarios' },
  { value: 'asignacion', label: 'Asignaciones' },
  { value: 'cita', label: 'Citas' },
  { value: 'creacion', label: 'Creación' },
]

const PAGE_SIZE = 10

// ============================================
// Component
// ============================================

export function TimelineSection({ expedienteId }: TimelineSectionProps) {
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
  }, [fetchTimeline])

  const handleFiltroChange = (nuevoFiltro: TipoEvento | 'todos') => {
    setFiltro(nuevoFiltro)
  }

  const handleLoadMore = () => {
    if (pagination && pagination.page < pagination.totalPages) {
      fetchTimeline(pagination.page + 1, true)
    }
  }

  const hasMore = pagination ? pagination.page < pagination.totalPages : false

  // ---- Renders ----

  if (isLoading) {
    return (
      <div>
        <FilterChips filtro={filtro} onChange={handleFiltroChange} />
        <div className="flex items-center justify-center py-12">
          <IconLoader size={24} className="text-gray-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <FilterChips filtro={filtro} onChange={handleFiltroChange} />
        <div className="text-center py-8">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={() => fetchTimeline(1)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            <IconRefresh size={16} />
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (eventos.length === 0) {
    return (
      <div>
        <FilterChips filtro={filtro} onChange={handleFiltroChange} />
        <div className="text-center py-12">
          <IconClock size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-sm text-gray-500">Sin actividad registrada</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <FilterChips filtro={filtro} onChange={handleFiltroChange} />

      <div className="relative mt-4">
        {/* Línea vertical */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

        {/* Eventos */}
        <div className="space-y-6">
          {eventos.map((evento, index) => {
            const config = EVENTO_CONFIG[evento.tipo] || EVENTO_CONFIG.comentario
            const Icon = config.icon
            const nombreCompleto = `${evento.usuario.nombre} ${evento.usuario.apellido}`.trim()
            const isFirst = index === 0

            return (
              <div key={evento.id} className="relative flex gap-4 pl-2">
                {/* Icono */}
                <div
                  className={cn(
                    'relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    config.bgColor,
                    isFirst && 'ring-4 ring-white'
                  )}
                >
                  <Icon size={16} className={config.color} />
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0 pb-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-gray-900">
                        {evento.descripcion}
                      </p>
                      <span
                        className="text-xs text-gray-500 whitespace-nowrap"
                        title={new Date(evento.created_at).toLocaleString('es-CO')}
                      >
                        {timeAgo(evento.created_at)}
                      </span>
                    </div>

                    {/* Usuario */}
                    <div className="flex items-center gap-2">
                      <Avatar name={nombreCompleto} size="sm" />
                      <span className="text-xs text-gray-600">{nombreCompleto}</span>
                    </div>

                    {/* Detalle por tipo */}
                    <EventoDetalle evento={evento} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Cargar más */}
      {hasMore && (
        <div className="text-center mt-4">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              'text-primary-600 hover:bg-primary-50 border border-primary-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLoadingMore ? (
              <>
                <IconLoader size={16} className="animate-spin" />
                Cargando...
              </>
            ) : (
              'Cargar más'
            )}
          </button>
        </div>
      )}

      {/* Total info */}
      {pagination && (
        <p className="text-xs text-gray-400 text-center mt-3">
          Mostrando {eventos.length} de {pagination.total} eventos
        </p>
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
    <div className="flex flex-wrap gap-2">
      {FILTROS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-full transition-colors',
            filtro === f.value
              ? 'bg-primary-100 text-primary-700 border border-primary-300'
              : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

function EventoDetalle({ evento }: { evento: ITimelineEvento }) {
  const { tipo, detalle } = evento

  if (!detalle || Object.keys(detalle).length === 0) return null

  if (tipo === 'transicion') {
    const anterior = detalle.estado_anterior as string | null
    const nuevo = detalle.estado_nuevo as string | null
    const comentario = detalle.comentario as string | null

    return (
      <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
        {anterior && nuevo && (
          <p className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">{estadoLabel(anterior)}</span>
            {' → '}
            <span className="font-medium text-gray-700">{estadoLabel(nuevo)}</span>
          </p>
        )}
        {comentario && (
          <p className="text-xs text-gray-500 italic">&quot;{comentario}&quot;</p>
        )}
      </div>
    )
  }

  if (tipo === 'comentario') {
    const contenido = detalle.contenido as string | null
    if (!contenido) return null

    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-600 line-clamp-3">{contenido}</p>
      </div>
    )
  }

  if (tipo === 'asignacion') {
    const anterior = detalle.analista_anterior as string | null
    const nuevo = detalle.analista_nuevo as string | null

    if (!anterior && !nuevo) return null

    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          {anterior ? (
            <>
              <span className="font-medium text-gray-700">{anterior}</span>
              {' → '}
              <span className="font-medium text-gray-700">{nuevo}</span>
            </>
          ) : (
            <>
              Asignado a:{' '}
              <span className="font-medium text-gray-700">{nuevo}</span>
            </>
          )}
        </p>
      </div>
    )
  }

  if (tipo === 'firma') {
    const firmadoEn = detalle.firmado_en as string | null
    const nombreFirmante = detalle.nombre_firmante as string | null

    return (
      <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
        {nombreFirmante && (
          <p className="text-xs text-gray-500">
            Firmante: <span className="font-medium text-gray-700">{nombreFirmante}</span>
          </p>
        )}
        {firmadoEn && (
          <p className="text-xs text-gray-500">
            {new Date(firmadoEn).toLocaleString('es-CO', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        )}
      </div>
    )
  }

  return null
}
