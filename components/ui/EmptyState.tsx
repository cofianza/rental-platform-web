/**
 * EmptyState - Estado vacío con icono, título y acción opcional
 * Client Component - usa onClick en acción opcional
 */

'use client'

import { cn } from '@/lib/utils'
import type { IconProps } from '@/components/icons'

export interface EmptyStateProps {
  icon?: React.ComponentType<IconProps>
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {/* Icono */}
      {Icon && (
        <div className="mb-4">
          <Icon size={64} className="text-gray-400" />
        </div>
      )}

      {/* Título */}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>

      {/* Descripción */}
      {description && (
        <p className="text-sm text-gray-600 mb-6 max-w-md">{description}</p>
      )}

      {/* Acción opcional */}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
