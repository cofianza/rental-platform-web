/**
 * TimelineSection - HP-270
 * Sección de historial de eventos del expediente
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
} from '@/components/icons'
import { formatDateTime } from '@/lib/constants'
import { expedienteService } from '@/services/expedienteService'
import type { ITimelineEvento } from '@/types/expediente'
import { cn } from '@/lib/utils'

export interface TimelineSectionProps {
  expedienteId: string
}

type TipoEvento = ITimelineEvento['tipo']

const EVENTO_CONFIG: Record<
  TipoEvento,
  { icon: React.ComponentType<{ size?: number; className?: string }>; color: string; bgColor: string }
> = {
  creacion: { icon: IconPlus, color: 'text-green-600', bgColor: 'bg-green-100' },
  transicion: { icon: IconEdit, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  documento: { icon: IconFileText, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  comentario: { icon: IconEdit, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  asignacion: { icon: IconUser, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  estudio: { icon: IconCheck, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  contrato: { icon: IconFileText, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  pago: { icon: IconDollarSign, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
}

export function TimelineSection({ expedienteId }: TimelineSectionProps) {
  const [eventos, setEventos] = useState<ITimelineEvento[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTimeline = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await expedienteService.getTimeline(expedienteId)
      setEventos(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar historial'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [expedienteId])

  useEffect(() => {
    fetchTimeline()
  }, [fetchTimeline])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <IconLoader size={24} className="text-gray-400 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchTimeline}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <IconRefresh size={16} />
          Reintentar
        </button>
      </div>
    )
  }

  if (eventos.length === 0) {
    return (
      <div className="text-center py-12">
        <IconClock size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-sm text-gray-500">No hay eventos registrados</p>
      </div>
    )
  }

  return (
    <div className="relative">
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
              {/* Icono del evento */}
              <div
                className={cn(
                  'relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                  config.bgColor,
                  isFirst && 'ring-4 ring-white'
                )}
              >
                <Icon size={16} className={config.color} />
              </div>

              {/* Contenido del evento */}
              <div className="flex-1 min-w-0 pb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-gray-900">
                      {evento.descripcion}
                    </p>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDateTime(evento.created_at)}
                    </span>
                  </div>

                  {/* Usuario */}
                  <div className="flex items-center gap-2">
                    <Avatar name={nombreCompleto} size="sm" />
                    <span className="text-xs text-gray-600">{nombreCompleto}</span>
                  </div>

                  {/* Detalle adicional si existe */}
                  {evento.detalle && Object.keys(evento.detalle).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        {evento.tipo === 'transicion' &&
                          'estado_anterior' in evento.detalle &&
                          evento.detalle.estado_anterior != null && (
                            <span>
                              Estado anterior:{' '}
                              <span className="font-medium">
                                {String(evento.detalle.estado_anterior)}
                              </span>
                            </span>
                          )}
                        {evento.tipo === 'asignacion' &&
                          'analista_anterior' in evento.detalle &&
                          evento.detalle.analista_anterior != null && (
                            <span>
                              Responsable anterior:{' '}
                              <span className="font-medium">
                                {String(evento.detalle.analista_anterior)}
                              </span>
                            </span>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
