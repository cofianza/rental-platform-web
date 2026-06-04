/**
 * PublicNavbar — Navbar reutilizable para paginas publicas (landing + vitrina).
 * Muestra links de navegacion (Vitrina, Como funciona, Para quien, Preguntas)
 * y avatar+link al dashboard si hay sesion activa.
 *
 * Los links a secciones (#como-funciona, #para-quien, #preguntas) funcionan
 * como anclas dentro de la landing. Si el usuario ya esta en otra pagina (eg.
 * /vitrina), redirigen a la home con la ancla.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { IconUser, IconHome } from '@/components/icons'
import { CofianzaLogo } from '@/components/ui/CofianzaLogo'

interface PublicNavbarProps {
  /** Cuando es true, los links a secciones envian a la home (#anchor); cuando es false, los renderiza como anclas locales (#anchor). */
  forceHomeLinks?: boolean
}

export function PublicNavbar({ forceHomeLinks }: PublicNavbarProps = {}) {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const pathname = usePathname()
  const isHome = pathname === '/'
  const useHomePrefix = forceHomeLinks ?? !isHome

  const sectionLink = (anchor: string) => (useHomePrefix ? `/${anchor}` : anchor)

  return (
    <header className="bg-white/97 backdrop-blur-xl border-b border-black/5 sticky top-0 z-50">
      {/* Full-width con padding 40px (mockup 01_*: nav padding 12px 40px),
          no se constriñe a un contenedor centrado. */}
      <div className="px-5 sm:px-8 lg:px-10 py-3 flex justify-between items-center gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <CofianzaLogo size={32} withText textClassName="text-xl" />
        </Link>

        {/* Nav links — desktop only (orden del mockup 01_*) */}
        <nav className="hidden md:flex items-center gap-7">
          <Link
            href={sectionLink('#como-funciona')}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cómo funciona
          </Link>
          <Link
            href={sectionLink('#para-quien')}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Para quién
          </Link>
          <Link
            href={sectionLink('#vitrina')}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Inmuebles
          </Link>
          <Link
            href={sectionLink('#preguntas')}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Preguntas
          </Link>
        </nav>

        {/* CTA */}
        {isAuthenticated && user ? (
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
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
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/vitrina"
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                pathname === '/vitrina'
                  ? 'text-primary-700 bg-primary-50'
                  : 'text-primary-600 hover:bg-primary-50'
              }`}
            >
              <IconHome size={16} /> Ver inmuebles
            </Link>
            <Link
              href="/login"
              className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Ingresar
            </Link>
            <Link
              href="/registro"
              className="px-3 sm:px-5 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
            >
              Registrarme
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
