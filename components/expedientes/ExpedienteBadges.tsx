/**
 * ExpedienteBadges - HP-229
 * Componentes de badge específicos para estados de expediente
 */

import { Badge } from '@/components/ui/Badge'
import { ESTADOS_EXPEDIENTE, type EstadoExpediente } from '@/lib/constants'
import { cn } from '@/lib/utils'

export interface ExpedienteBadgeProps {
  estado: EstadoExpediente
  className?: string
  size?: 'sm' | 'md'
}

/**
 * Badge de estado de expediente
 */
export function ExpedienteBadge({ estado, className, size = 'md' }: ExpedienteBadgeProps) {
  return (
    <Badge
      estado={estado}
      className={cn(size === 'sm' && 'text-[10px] px-2 py-0.5', className)}
    />
  )
}

export interface EstadoChipProps {
  estado: EstadoExpediente
  isSelected: boolean
  onClick: () => void
  count?: number
}

/**
 * Chip seleccionable para filtro multi-select de estados
 */
export function EstadoChip({ estado, isSelected, onClick, count }: EstadoChipProps) {
  const config = ESTADOS_EXPEDIENTE[estado]

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
        isSelected
          ? `${config.bgColor} ${config.textColor} ${config.borderColor}`
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          isSelected ? config.textColor.replace('text-', 'bg-') : 'bg-gray-400'
        )}
      />
      {config.label}
      {count !== undefined && (
        <span
          className={cn(
            'ml-1 px-1.5 py-0.5 rounded-full text-[10px]',
            isSelected ? 'bg-white/30' : 'bg-gray-100'
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}
