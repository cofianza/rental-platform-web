/**
 * Indicador de Estrato - HP-180
 * Visualiza el estrato socioeconómico (1-7) con barra de segmentos
 */

import { cn } from '@/lib/utils'

interface EstratoIndicatorProps {
  estrato: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const ESTRATO_COLORS: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-orange-500',
  3: 'bg-yellow-500',
  4: 'bg-lime-500',
  5: 'bg-green-500',
  6: 'bg-emerald-500',
  7: 'bg-teal-500',
}

// Mantener en sync con ESTRATO_OPTIONS (constants.ts), inmuebles.schema.ts
// (max 7) y el CHECK de la migración 20260706000001.
const ESTRATO_MAX = 7

const SIZE_CONFIG = {
  sm: { height: 'h-1.5', gap: 'gap-0.5', text: 'text-xs' },
  md: { height: 'h-2', gap: 'gap-1', text: 'text-sm' },
  lg: { height: 'h-3', gap: 'gap-1', text: 'text-base' },
}

export function EstratoIndicator({
  estrato,
  size = 'md',
  showLabel = true
}: EstratoIndicatorProps) {
  const validEstrato = Math.min(Math.max(estrato, 1), ESTRATO_MAX)
  const config = SIZE_CONFIG[size]

  return (
    <div className="flex flex-col gap-1">
      {showLabel && (
        <span className={cn('text-gray-600', config.text)}>
          Estrato {validEstrato}
        </span>
      )}
      <div className={cn('flex w-full', config.gap)}>
        {Array.from({ length: ESTRATO_MAX }, (_, i) => i + 1).map((level) => (
          <div
            key={level}
            className={cn(
              'flex-1 rounded-full transition-colors',
              config.height,
              level <= validEstrato
                ? ESTRATO_COLORS[level]
                : 'bg-gray-200'
            )}
          />
        ))}
      </div>
    </div>
  )
}
