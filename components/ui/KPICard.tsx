/**
 * KPICard - Tarjeta de métrica/indicador con cambio porcentual
 * Server Component - no requiere interactividad
 */

import { cn } from '@/lib/utils'
import type { IconProps } from '@/components/icons'

// Mapa estático de variantes de color para que Tailwind detecte las clases en build
const ACCENT_VARIANTS: Record<string, { border: string; iconBg: string; iconText: string }> = {
  'bg-primary-600': {
    border: 'bg-primary-600',
    iconBg: 'bg-primary-100',
    iconText: 'text-primary-600',
  },
  'bg-green-600': {
    border: 'bg-green-600',
    iconBg: 'bg-green-100',
    iconText: 'text-green-600',
  },
  'bg-amber-600': {
    border: 'bg-amber-600',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
  },
  'bg-blue-600': {
    border: 'bg-blue-600',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
  },
  'bg-red-600': {
    border: 'bg-red-600',
    iconBg: 'bg-red-100',
    iconText: 'text-red-600',
  },
  'bg-purple-600': {
    border: 'bg-purple-600',
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
  },
  'bg-teal-600': {
    border: 'bg-teal-600',
    iconBg: 'bg-teal-100',
    iconText: 'text-teal-600',
  },
}

export interface KPICardProps {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ComponentType<IconProps>
  accentColor?: keyof typeof ACCENT_VARIANTS
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

  // Obtener variantes del mapa estático o usar valores por defecto
  const variants = ACCENT_VARIANTS[accentColor] || ACCENT_VARIANTS['bg-primary-600']

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-sm border border-gray-200',
        'p-5 relative overflow-hidden',
        className
      )}
    >
      {/* Borde de acento izquierdo */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', variants.border)} />

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
          <div className={cn('p-3 rounded-lg', variants.iconBg)}>
            <Icon size={24} className={variants.iconText} />
          </div>
        )}
      </div>
    </div>
  )
}
