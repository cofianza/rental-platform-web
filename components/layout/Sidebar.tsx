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
import { IconChevronRight, IconChevronDown, IconX, IconLogOut } from '@/components/icons'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarExpanded, sidebarOpen, toggleSidebar, closeSidebar } = useUIStore()
  const { logout } = useAuth()

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
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 flex flex-col',
          'transition-all duration-300 ease-in-out',
          // Width responsive:
          // Mobile: w-64 (drawer completo)
          // Tablet (md:): w-16 (colapsado, solo iconos)
          // Desktop (lg:): w-16 colapsado o w-64 expandido
          'w-64 md:w-16',
          sidebarExpanded && 'lg:w-64',
          // Visibility:
          // Mobile: oculto por defecto, visible cuando sidebarOpen
          // Tablet+: siempre visible
          'md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header del sidebar */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {/* Logo - Completo en mobile y desktop expandido, solo icono en tablet y desktop colapsado */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              HP
            </div>
            <span
              className={cn(
                'font-semibold text-gray-900 truncate',
                // Mobile: siempre visible
                // Tablet (md:): oculto
                // Desktop (lg:): visible solo si expandido
                'md:hidden',
                sidebarExpanded && 'lg:block'
              )}
            >
              Habitar Propiedades
            </span>
          </div>

          {/* Botón cerrar (solo mobile) */}
          <button
            onClick={closeSidebar}
            className="md:hidden p-1 hover:bg-gray-100 rounded flex-shrink-0"
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
                    ? 'bg-primary-700 text-white hover:bg-primary-800'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
                aria-current={active ? 'page' : undefined}
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

                {/* Texto del item - visible en mobile y desktop expandido, oculto en tablet */}
                <span
                  className={cn(
                    'font-medium text-sm truncate',
                    // Mobile: siempre visible
                    // Tablet (md:): oculto
                    // Desktop (lg:): visible solo si expandido
                    'md:hidden',
                    sidebarExpanded && 'lg:inline'
                  )}
                >
                  {item.label}
                </span>

                {/* Tooltip para modo colapsado (tablet y desktop colapsado) */}
                <div
                  className={cn(
                    'absolute left-full ml-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md',
                    'opacity-0 invisible group-hover:opacity-100 group-hover:visible',
                    'transition-all whitespace-nowrap z-50 pointer-events-none',
                    // Mostrar tooltip solo en tablet o desktop colapsado
                    'hidden md:block',
                    sidebarExpanded && 'lg:hidden'
                  )}
                >
                  {item.label}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Botón de cerrar sesión */}
        <div className="border-t border-gray-200 p-2">
          <button
            onClick={logout}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
              'text-gray-700 hover:bg-red-50 hover:text-red-600 group relative'
            )}
            title="Cerrar sesión"
          >
            <IconLogOut size={20} className="flex-shrink-0 text-gray-600 group-hover:text-red-600" />
            <span
              className={cn(
                'font-medium text-sm',
                'md:hidden',
                sidebarExpanded && 'lg:inline'
              )}
            >
              Cerrar sesión
            </span>

            {/* Tooltip para modo colapsado */}
            <div
              className={cn(
                'absolute left-full ml-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md',
                'opacity-0 invisible group-hover:opacity-100 group-hover:visible',
                'transition-all whitespace-nowrap z-50 pointer-events-none',
                'hidden md:block',
                sidebarExpanded && 'lg:hidden'
              )}
            >
              Cerrar sesión
            </div>
          </button>
        </div>

        {/* Botón de colapsar/expandir (solo tablet y desktop, oculto en mobile) */}
        <div className="hidden md:block border-t border-gray-200 p-2">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={sidebarExpanded ? 'Colapsar sidebar' : 'Expandir sidebar'}
          >
            {sidebarExpanded ? (
              <>
                <IconChevronDown size={18} className="rotate-90" />
                <span className="hidden lg:inline text-sm font-medium">
                  Colapsar
                </span>
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
