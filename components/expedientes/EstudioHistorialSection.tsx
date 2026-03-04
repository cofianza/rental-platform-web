/**
 * EstudioHistorialSection
 * Timeline visual de cadena de re-evaluaciones
 */

'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/Badge'
import { IconLoader, IconShield } from '@/components/icons'
import { cn } from '@/lib/utils'
import { estudioService } from '@/services/estudioService'
import type { IEstudioHistorial, IEstudioHistorialItem } from '@/types/estudio'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface EstudioHistorialSectionProps {
  estudioId: string
  historial: IEstudioHistorial | null
  isLoading: boolean
  onEstudioSelect?: (estudioId: string) => void
}

export function EstudioHistorialSection({
  estudioId,
  historial,
  isLoading,
  onEstudioSelect,
}: EstudioHistorialSectionProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <IconLoader size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (!historial || historial.total_en_cadena <= 1) {
    return null
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-3">
        Historial de evaluaciones ({historial.total_en_cadena})
      </h4>

      <div className="relative">
        {historial.historial.map((item, index) => {
          const isLast = index === historial.historial.length - 1
          const isCurrent = item.id === estudioId

          return (
            <div key={item.id} className="relative flex gap-3">
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-3 h-3 rounded-full border-2 shrink-0 mt-1.5',
                    isCurrent
                      ? 'bg-primary-600 border-primary-600'
                      : item.resultado === 'aprobado'
                        ? 'bg-green-500 border-green-500'
                        : item.resultado === 'rechazado'
                          ? 'bg-red-500 border-red-500'
                          : item.resultado === 'condicionado'
                            ? 'bg-yellow-500 border-yellow-500'
                            : 'bg-gray-300 border-gray-300',
                  )}
                />
                {!isLast && (
                  <div className="w-0.5 flex-1 bg-gray-200 min-h-[24px]" />
                )}
              </div>

              {/* Content */}
              <div
                className={cn(
                  'flex-1 pb-4',
                  !isLast && 'pb-4',
                )}
              >
                <button
                  onClick={() => onEstudioSelect?.(item.id)}
                  disabled={isCurrent}
                  className={cn(
                    'w-full text-left rounded-lg p-3 border transition-colors',
                    isCurrent
                      ? 'bg-primary-50 border-primary-200'
                      : 'bg-gray-50 border-gray-100 hover:border-primary-200 hover:bg-primary-50/50',
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {item.es_reevaluacion
                        ? `Re-evaluacion ${item.numero_en_cadena - 1}`
                        : 'Estudio original'}
                    </span>
                    <Badge estado={item.resultado} />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {item.score != null && (
                      <span className="font-semibold">Score: {item.score}</span>
                    )}
                    <span>{formatDate(item.created_at)}</span>
                    <Badge estado={item.estado} />
                  </div>

                  {item.observaciones && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {item.observaciones}
                    </p>
                  )}

                  {isCurrent && (
                    <span className="text-xs text-primary-600 font-medium mt-1 inline-block">
                      Estudio actual
                    </span>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
