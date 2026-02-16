/**
 * PageHeader - Encabezado de página con título y acciones
 * Server Component - no requiere interactividad
 */

import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6',
        className
      )}
    >
      <div className="flex-1">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
