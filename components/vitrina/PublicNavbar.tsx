/**
 * PublicNavbar — Navbar reutilizable para paginas publicas
 * Muestra avatar+link al dashboard si hay sesion activa
 */

'use client'

import Link from 'next/link'
import { useAuthStore } from '@/stores/auth.store'
import { IconUser } from '@/components/icons'

export function PublicNavbar() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-xl font-bold text-gray-900">Cofianza</span>
        </Link>

        {isAuthenticated && user ? (
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary-700">
                {user.email?.[0]?.toUpperCase() || <IconUser size={16} />}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:inline">
              Ir al panel
            </span>
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Iniciar Sesion
            </Link>
            <Link
              href="/registro"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Registrarse
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
