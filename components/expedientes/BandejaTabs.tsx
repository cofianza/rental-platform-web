/**
 * BandejaTabs - Bandejas operativas de expedientes
 * Tabs con contadores por estado, toggle "Mis Expedientes" y KPI cards
 */

'use client'

import { ESTADOS_EXPEDIENTE, type EstadoExpediente } from '@/lib/constants'
import type { IExpedientesStats } from '@/types/expediente'
import { cn } from '@/lib/utils'

// Definición de bandejas en orden de prioridad operativa
const BANDEJAS: Array<{
  id: EstadoExpediente | null
  label: string
  estado: EstadoExpediente | null
}> = [
  { id: null, label: 'Todos', estado: null },
  { id: 'en_revision', label: 'En revisión', estado: 'en_revision' },
  { id: 'informacion_incompleta', label: 'Incompletos', estado: 'informacion_incompleta' },
  { id: 'aprobado', label: 'Aprobados', estado: 'aprobado' },
  { id: 'condicionado', label: 'Condicionados', estado: 'condicionado' },
  { id: 'rechazado', label: 'Rechazados', estado: 'rechazado' },
  { id: 'cerrado', label: 'Cerrados', estado: 'cerrado' },
  { id: 'borrador', label: 'Borradores', estado: 'borrador' },
]

export interface BandejaTabsProps {
  activeBandeja: EstadoExpediente | null
  misExpedientes: boolean
  stats: IExpedientesStats | null
  onBandejaChange: (bandeja: EstadoExpediente | null) => void
  onToggleMisExpedientes: () => void
}

export function BandejaTabs({
  activeBandeja,
  misExpedientes,
  stats,
  onBandejaChange,
  onToggleMisExpedientes,
}: BandejaTabsProps) {
  const getCount = (estado: EstadoExpediente | null): number => {
    if (!stats) return 0
    if (estado === null) return stats.total
    return stats.por_estado[estado] || 0
  }

  // KPIs derivados
  const enProceso = stats
    ? (stats.por_estado.en_revision || 0) +
      (stats.por_estado.informacion_incompleta || 0) +
      (stats.por_estado.condicionado || 0)
    : 0

  const requierenAccion = stats
    ? (stats.por_estado.informacion_incompleta || 0) +
      (stats.por_estado.condicionado || 0)
    : 0

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPIMini label="Total expedientes" value={stats?.total ?? 0} color="bg-primary-600" />
        <KPIMini label="En proceso" value={enProceso} color="bg-amber-500" />
        <KPIMini label="Requieren acción" value={requierenAccion} color="bg-orange-500" />
      </div>

      {/* Tabs + Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Bandeja tabs con scroll horizontal */}
        <div className="flex-1 overflow-x-auto">
          <nav className="flex gap-1 min-w-max" aria-label="Bandejas">
            {BANDEJAS.map((bandeja) => {
              const isActive = activeBandeja === bandeja.estado
              const count = getCount(bandeja.estado)
              const config = bandeja.estado ? ESTADOS_EXPEDIENTE[bandeja.estado] : null

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
                  <span
                    className={cn(
                      'inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-full text-xs font-semibold',
                      isActive
                        ? config
                          ? `${config.textColor} bg-white/60`
                          : 'text-primary-700 bg-white/60'
                        : 'text-gray-500 bg-gray-100'
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Toggle Mis Expedientes */}
        <button
          onClick={onToggleMisExpedientes}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border shrink-0',
            misExpedientes
              ? 'bg-primary-50 text-primary-700 border-primary-300'
              : 'text-gray-600 hover:bg-gray-100 border-gray-200'
          )}
        >
          <span
            className={cn(
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
              misExpedientes ? 'bg-primary-600' : 'bg-gray-300'
            )}
          >
            <span
              className={cn(
                'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                misExpedientes ? 'translate-x-4' : 'translate-x-1'
              )}
            />
          </span>
          Mis expedientes
        </button>
      </div>
    </div>
  )
}

/**
 * KPI mini card para métricas rápidas
 */
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
