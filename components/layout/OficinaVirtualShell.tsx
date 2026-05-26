/**
 * Shell de layout para propietario/inmobiliaria — reemplaza Sidebar+Header
 * por una barra superior con logo, breadcrumb mínimo, notificaciones y
 * avatar, seguida del tab bar de 7 secciones de la Oficina Virtual.
 *
 * (Mario 12-may-2026, mockups 13_*propietario.html y 13_*_v2.html.)
 */

'use client'

import Link from 'next/link'
import { useAuthStore } from '@/stores/auth.store'
import { CofianzaLogo } from '@/components/ui/CofianzaLogo'
import { IconLogOut } from '@/components/icons'
import { useAuth } from '@/hooks/useAuth'
import { NotificationBell } from './NotificationBell'
import { OficinaVirtualNav } from './OficinaVirtualNav'

interface Props {
  rol: 'propietario' | 'inmobiliaria'
  children: React.ReactNode
}

export function OficinaVirtualShell({ rol, children }: Props) {
  const user = useAuthStore((s) => s.user)
  const { logout } = useAuth()

  const nombre = user?.nombre_completo || user?.email || 'Usuario'
  const iniciales = nombre
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const subtitulo = rol === 'inmobiliaria' ? 'Inmobiliaria activa' : 'Cuenta propietario'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top brand bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <CofianzaLogo size={32} withText textClassName="text-xl" />
          </Link>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="hidden sm:flex flex-col text-right leading-tight">
              <span className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">
                {nombre}
              </span>
              <span className="text-[11px] text-gray-500">{subtitulo}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
              {iniciales || '?'}
            </div>
            <button
              type="button"
              onClick={logout}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-gray-500 hover:text-coral-600 hover:bg-gray-50 rounded-lg transition-colors"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <IconLogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <OficinaVirtualNav rol={rol} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  )
}
