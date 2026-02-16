/**
 * Sidebar - Navegación principal del dashboard
 * Con soporte para modo expandido/colapsado y drawer en mobile
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { useUIStore } from '@/stores/ui.store'
import { NAV_ITEMS } from '@/lib/constants'
import { ICON_MAP } from '@/components/icons'
import { IconChevronRight, IconChevronDown, IconX } from '@/components/icons'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarExpanded, sidebarOpen, toggleSidebar, closeSidebar } = useUIStore()

  // Cerrar sidebar en mobile al navegar
  useEffect(() => {
    closeSidebar()
  }, [pathname, closeSidebar])

  // Detectar tamaño de pantalla y ajustar estado inicial
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        // Desktop: expandido
        useUIStore.setState({ sidebarExpanded: true })
      } else if (window.innerWidth >= 768) {
        // Tablet: colapsado
        useUIStore.setState({ sidebarExpanded: false })
      }
      // Mobile: mantener estado pero cerrar drawer
      if (window.innerWidth < 768) {
        closeSidebar()
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [closeSidebar])

  // Verificar si una ruta está activa
  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 flex flex-col',
          'transition-all duration-300 ease-in-out',
          // Width states
          sidebarExpanded ? 'w-64' : 'w-16',
          // Mobile: drawer behavior
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header del sidebar */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {sidebarExpanded ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                HP
              </div>
              <span className="font-semibold text-gray-900">
                Habitar Propiedades
              </span>
            </div>
          ) : (
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-sm mx-auto">
              HP
            </div>
          )}

          {/* Botón cerrar (solo mobile) */}
          <button
            onClick={closeSidebar}
            className="lg:hidden p-1 hover:bg-gray-100 rounded"
          >
            <IconX size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Items de navegación */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP]
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  'group relative',
                  active
                    ? 'bg-teal-700 text-white hover:bg-teal-800'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
                title={!sidebarExpanded ? item.label : undefined}
              >
                {Icon && (
                  <Icon
                    size={20}
                    className={cn(
                      'flex-shrink-0',
                      active ? 'text-white' : 'text-gray-600 group-hover:text-gray-900'
                    )}
                  />
                )}

                {sidebarExpanded && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}

                {/* Tooltip para modo colapsado */}
                {!sidebarExpanded && (
                  <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Botón de colapsar/expandir (solo desktop/tablet) */}
        <div className="hidden lg:block border-t border-gray-200 p-2">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={sidebarExpanded ? 'Colapsar sidebar' : 'Expandir sidebar'}
          >
            {sidebarExpanded ? (
              <>
                <IconChevronDown size={18} className="rotate-90" />
                <span className="text-sm font-medium">Colapsar</span>
              </>
            ) : (
              <IconChevronRight size={18} />
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
