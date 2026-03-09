/**
 * EstudiosBandejaTabs - HP-331
 * Tabs con contadores por estado y KPI cards para estudios
 */

'use client'

import { ESTADOS_ESTUDIO, type EstadoEstudioType } from '@/lib/constants'
import type { IEstudiosMeta } from '@/types/estudio'
import type { EstadoEstudio } from '@/types/estudio'
import { cn } from '@/lib/utils'

const BANDEJAS: Array<{
  id: EstadoEstudio | null
  label: string
  estado: EstadoEstudio | null
}> = [
  { id: null, label: 'Todos', estado: null },
  { id: 'solicitado', label: 'Solicitados', estado: 'solicitado' },
  { id: 'en_proceso', label: 'En proceso', estado: 'en_proceso' },
  { id: 'completado', label: 'Completados', estado: 'completado' },
  { id: 'fallido', label: 'Fallidos', estado: 'fallido' },
  { id: 'cancelado', label: 'Cancelados', estado: 'cancelado' },
]

export interface EstudiosBandejaTabsProps {
  activeBandeja: EstadoEstudio | null
  meta: IEstudiosMeta | null
  onBandejaChange: (bandeja: EstadoEstudio | null) => void
}

export function EstudiosBandejaTabs({
  activeBandeja,
  meta,
  onBandejaChange,
}: EstudiosBandejaTabsProps) {
  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPIMini label="Total estudios" value={meta?.total ?? 0} color="bg-primary-600" />
        <KPIMini label="En proceso" value={0} color="bg-amber-500" />
        <KPIMini label="Completados" value={0} color="bg-green-500" />
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto">
        <nav className="flex gap-1 min-w-max" aria-label="Bandejas de estudios">
          {BANDEJAS.map((bandeja) => {
            const isActive = activeBandeja === bandeja.estado
            const config = bandeja.estado
              ? ESTADOS_ESTUDIO[bandeja.estado as EstadoEstudioType]
              : null

            return (
              <button
                key={bandeja.label}
                onClick={() => onBandejaChange(bandeja.estado)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                  isActive
                    ? config
                      ? `${config.bgColor} ${config.textColor} ${config.borderColor} border`
                      : 'bg-primary-100 text-primary-700 border border-primary-300'
                    : 'text-gray-600 hover:bg-gray-100 border border-transparent'
                )}
              >
                {bandeja.estado && (
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      isActive && config
                        ? config.textColor.replace('text-', 'bg-')
                        : 'bg-gray-400'
                    )}
                  />
                )}
                {bandeja.label}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

function KPIMini({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 relative overflow-hidden">
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', color)} />
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
