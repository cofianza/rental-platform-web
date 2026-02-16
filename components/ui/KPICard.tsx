/**
 * KPICard - Tarjeta de métrica/indicador con cambio porcentual
 * Server Component - no requiere interactividad
 */

import { cn } from '@/lib/utils'
import type { IconProps } from '@/components/icons'

export interface KPICardProps {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ComponentType<IconProps>
  accentColor?: string
  className?: string
}

export function KPICard({
  title,
  value,
  change,
  trend = 'neutral',
  icon: Icon,
  accentColor = 'bg-primary-600',
  className,
}: KPICardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-500',
  }

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  }

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-sm border border-gray-200',
        'p-5 relative overflow-hidden',
        className
      )}
    >
      {/* Borde de acento izquierdo */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', accentColor)} />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Título */}
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>

          {/* Valor */}
          <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>

          {/* Cambio porcentual */}
          {change !== undefined && (
            <div className="flex items-center gap-1">
              <span className={cn('text-sm font-medium', trendColors[trend])}>
                {trendIcons[trend]} {Math.abs(change)}%
              </span>
              <span className="text-xs text-gray-500">vs. período anterior</span>
            </div>
          )}
        </div>

        {/* Icono opcional */}
        {Icon && (
          <div className={cn('p-3 rounded-lg', accentColor.replace('bg-', 'bg-').replace('-600', '-100'))}>
            <Icon size={24} className={cn(accentColor.replace('bg-', 'text-'))} />
          </div>
        )}
      </div>
    </div>
  )
}
