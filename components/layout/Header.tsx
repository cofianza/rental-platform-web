/**
 * Header - Barra superior del dashboard
 * Con breadcrumbs automáticos, notificaciones y avatar de usuario
 */

'use client'

import Link from 'next/link'
import { useUIStore } from '@/stores/ui.store'
import { useAuthStore } from '@/stores/auth.store'
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs'
import { ROLES } from '@/lib/constants'
import { IconMenu, IconBell, IconChevronRight } from '@/components/icons'
import { cn } from '@/lib/utils'

const ROLE_DISPLAY: Record<string, string> = {
  administrador: ROLES.ADMINISTRADOR,
  operador_analista: ROLES.OPERADOR,
  gerencia_consulta: ROLES.GERENCIA,
}

export function Header() {
  const { openSidebar } = useUIStore()
  const user = useAuthStore((state) => state.user)
  const breadcrumbs = useBreadcrumbs()

  const nombre = user?.nombre_completo || user?.email || 'Usuario'
  const iniciales = nombre
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const rolDisplay = user?.rol ? ROLE_DISPLAY[user.rol] ?? user.rol : ''

  const notificationCount = 3 // Placeholder

  return (
    <header
      className={cn(
        'sticky top-0 z-30 bg-white border-b border-gray-200',
        'transition-all duration-300 ease-in-out',
        'h-16 flex items-center px-4 lg:px-6 gap-4'
      )}
    >
      {/* Botón hamburguesa (solo mobile) */}
      <button
        onClick={openSidebar}
        className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Abrir menú"
      >
        <IconMenu size={20} className="text-gray-700" />
      </button>

      {/* Breadcrumbs */}
      <div className="flex-1 flex items-center gap-2 overflow-x-auto">
        {breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="flex items-center gap-2">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center gap-2">
                {index > 0 && (
                  <IconChevronRight size={16} className="text-gray-400" />
                )}
                {crumb.isLast ? (
                  <span className="text-sm font-medium text-gray-900">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        ) : (
          <span className="text-sm font-medium text-gray-900">
            Bienvenido
          </span>
        )}
      </div>

      {/* Zona derecha: Notificaciones + Avatar */}
      <div className="flex items-center gap-3">
        {/* Notificaciones */}
        <button
          className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Notificaciones"
        >
          <IconBell size={20} className="text-gray-700" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </button>

        {/* Divisor */}
        <div className="hidden sm:block w-px h-6 bg-gray-300" />

        {/* Avatar + Nombre */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-gray-900">
              {nombre}
            </span>
            <span className="text-xs text-gray-500">{rolDisplay}</span>
          </div>
          <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {iniciales}
          </div>
        </div>
      </div>
    </header>
  )
}
