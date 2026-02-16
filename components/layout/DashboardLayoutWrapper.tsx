/**
 * DashboardLayoutWrapper
 * Wrapper que ajusta el margen del contenido según el estado del sidebar
 */

'use client'

import { useUIStore } from '@/stores/ui.store'
import { cn } from '@/lib/utils'

interface Props {
  children: React.ReactNode
}

export function DashboardLayoutWrapper({ children }: Props) {
  const sidebarExpanded = useUIStore((state) => state.sidebarExpanded)

  return (
    <div
      className={cn(
        'transition-all duration-300 ease-in-out',
        'min-h-screen',
        // Ajustar margen según estado del sidebar
        // En mobile: sin margen (sidebar es drawer)
        'lg:ml-16',
        sidebarExpanded && 'lg:ml-64'
      )}
    >
      {children}
    </div>
  )
}
