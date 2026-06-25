/**
 * Shell de layout para propietario/inmobiliaria — reemplaza Sidebar+Header
 * por una barra superior con logo, breadcrumb mínimo, notificaciones y
 * avatar, seguida del tab bar de 7 secciones de la Oficina Virtual.
 *
 * (Mario 12-may-2026, mockups 13_*propietario.html y 13_*_v2.html.)
 *
 * El bloque de usuario (arriba a la derecha) muestra el nombre de la
 * inmobiliaria (razón social) + su logo si lo subió, y es un menú desplegable
 * con accesos a Configuración / Mi Inmobiliaria / Mi cuenta / Cerrar sesión.
 * El logo y la razón social se leen del perfil arrendador (que ya resuelve al
 * perfil canónico de la organización), no del usuario logueado.
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth.store'
import { CofianzaLogo } from '@/components/ui/CofianzaLogo'
import { IconLogOut, IconChevronDown, IconSettings, IconBuilding2, IconUser } from '@/components/icons'
import { useAuth } from '@/hooks/useAuth'
import { perfilArrendadorService } from '@/services/perfilArrendadorService'
import { NotificationBell } from './NotificationBell'
import { OficinaVirtualNav } from './OficinaVirtualNav'
import { OficinaVirtualHero } from '@/components/dashboard/OficinaVirtualHero'

interface Props {
  rol: 'propietario' | 'inmobiliaria'
  children: React.ReactNode
}

export function OficinaVirtualShell({ rol, children }: Props) {
  const user = useAuthStore((s) => s.user)
  const { logout } = useAuth()

  // Logo + razón social de la organización (perfil arrendador canónico).
  // Fail-silent: si no hay datos (perfil sin completar), caemos al nombre del
  // usuario + iniciales.
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [razonSocial, setRazonSocial] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelado = false
    perfilArrendadorService
      .getMe()
      .then((p) => {
        if (cancelado) return
        setLogoUrl(p.logo_url)
        setRazonSocial(p.razon_social)
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [])

  // Cerrar el menú al hacer click fuera o con Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onClickFuera = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickFuera)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClickFuera)
      document.removeEventListener('keydown', onEsc)
    }
  }, [menuOpen])

  const nombreUsuario = user?.nombre_completo || user?.email || 'Usuario'
  // Para inmobiliaria preferimos la razón social (el nombre de la empresa).
  const displayName = (razonSocial && razonSocial.trim()) || nombreUsuario
  const iniciales = displayName
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

          {/* Breadcrumb (mockup 13_v2): Dashboard / Tu Oficina Virtual */}
          <nav
            aria-label="Ruta de navegación"
            className="hidden md:flex items-center gap-1.5 text-xs text-gray-500"
          >
            <Link href="/dashboard" className="hover:text-primary-700 transition-colors">
              Dashboard
            </Link>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-900">Tu Oficina Virtual</span>
          </nav>

          <div className="flex items-center gap-3">
            <NotificationBell />

            {/* Menú de cuenta/organización: nombre + logo, clickable */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2.5 rounded-full sm:rounded-xl p-0.5 sm:pl-3 sm:pr-1.5 sm:py-1 hover:bg-gray-50 transition-colors"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Menú de la cuenta"
              >
                <span className="hidden sm:flex flex-col text-right leading-tight">
                  <span className="text-sm font-semibold text-gray-900 truncate max-w-45">
                    {displayName}
                  </span>
                  <span className="text-[11px] text-gray-500">{subtitulo}</span>
                </span>
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={displayName}
                    className="w-9 h-9 rounded-full object-cover border border-gray-200 bg-white"
                  />
                ) : (
                  <span className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                    {iniciales || '?'}
                  </span>
                )}
                <IconChevronDown
                  size={16}
                  className={`hidden sm:block text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-40"
                >
                  {/* Encabezado del menú: nombre + subtítulo (útil en móvil donde se oculta al lado del avatar) */}
                  <div className="px-3 py-2 border-b border-gray-100 mb-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                    <p className="text-[11px] text-gray-500">{subtitulo}</p>
                  </div>

                  <MenuLink href="/configuracion" onClick={() => setMenuOpen(false)} icon={<IconSettings size={16} />}>
                    Configuración
                  </MenuLink>
                  {rol === 'inmobiliaria' && (
                    <MenuLink
                      href="/configuracion/mi-inmobiliaria"
                      onClick={() => setMenuOpen(false)}
                      icon={<IconBuilding2 size={16} />}
                    >
                      Mi Inmobiliaria
                    </MenuLink>
                  )}
                  <MenuLink href="/configuracion/cuenta" onClick={() => setMenuOpen(false)} icon={<IconUser size={16} />}>
                    Mi cuenta
                  </MenuLink>

                  <div className="my-1 border-t border-gray-100" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false)
                      logout()
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-coral-50 hover:text-coral-600 transition-colors"
                  >
                    <IconLogOut size={16} />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero persistente full-width — sobre los tabs, igual al mockup 13_v2 */}
      <OficinaVirtualHero />

      {/* Tab bar */}
      <OficinaVirtualNav rol={rol} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  )
}

function MenuLink({
  href,
  onClick,
  icon,
  children,
}: {
  href: string
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-700 transition-colors"
    >
      <span className="text-gray-400">{icon}</span>
      {children}
    </Link>
  )
}
