/**
 * Shell del propietario — sidebar (Gestión · Financiero) + barra superior,
 * según mockup htmls/14_COFIANZA_Oficina_Virtual_PROPIETARIOv2.html.
 * Reemplaza el shell de tabs (OficinaVirtualShell) solo para el propietario;
 * la inmobiliaria conserva su shell de tabs.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { IconProps } from '@/components/icons'
import {
  IconHome,
  IconUsers,
  IconSearch,
  IconFileText,
  IconAlertTriangle,
  IconBank,
  IconBarChart3,
  IconLogOut,
  IconSettings,
  IconClipboardList,
  IconCalendar,
} from '@/components/icons'
import { useAuthStore } from '@/stores/auth.store'
import { useAuth } from '@/hooks/useAuth'
import { CofianzaLogo } from '@/components/ui/CofianzaLogo'
import { NotificationBell } from './NotificationBell'

interface NavItem {
  label: string
  href: string
  Icon: React.ComponentType<IconProps>
  exact?: boolean
}
interface NavGroup {
  group: string
  items: NavItem[]
}

// "Mis inmuebles" es el home del propietario (vista de tarjetas en /dashboard).
// El resto enlaza a páginas existentes (decisión: reusar lo que ya hay).
const NAV: NavGroup[] = [
  {
    group: 'Gestión',
    items: [
      { label: 'Mis inmuebles', href: '/dashboard', Icon: IconHome, exact: true },
      // Interesados de la vitrina (leads sin cuenta) sobre sus inmuebles.
      { label: 'Interesados', href: '/interesados', Icon: IconUsers },
      // Lista scopeada en el backend: el propietario solo ve expedientes de
      // SUS inmuebles. Orden del flujo: inmueble → expediente → estudio → contrato.
      { label: 'Expedientes', href: '/expedientes', Icon: IconClipboardList },
      // Agenda de visitas (kanban). Antes solo se veía dentro de cada expediente.
      { label: 'Visitas', href: '/citas', Icon: IconCalendar },
      { label: 'Evaluar candidato', href: '/estudios', Icon: IconSearch },
      { label: 'Contratos', href: '/contratos', Icon: IconFileText },
    ],
  },
  {
    group: 'Financiero',
    items: [
      { label: 'Reportar mora', href: '/moras', Icon: IconAlertTriangle },
      { label: 'Mis pagos', href: '/facturacion', Icon: IconBank },
      { label: 'Mi rentabilidad', href: '/reportes', Icon: IconBarChart3 },
    ],
  },
  {
    group: 'Cuenta',
    items: [
      // Acceso a Mi cuenta (correo/teléfono donde llegan las notificaciones),
      // Datos para contrato y documentos legales — antes el propietario no
      // tenía cómo llegar a /configuracion desde su panel.
      { label: 'Configuración', href: '/configuracion', Icon: IconSettings },
    ],
  },
]

const FLAT = NAV.flatMap((g) => g.items)

export function PropietarioShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const { logout } = useAuth()
  const pathname = usePathname()

  const nombre = user?.nombre_completo || user?.email || 'Usuario'
  const iniciales = nombre
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const isActive = (it: NavItem) =>
    it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + '/')

  return (
    <div className="flex min-h-screen flex-col bg-ink-50/40">
      {/* Barra superior */}
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
            <CofianzaLogo size={32} withText textClassName="text-xl" />
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="hidden flex-col text-right leading-tight sm:flex">
              <span className="max-w-[180px] truncate text-sm font-semibold text-ink-900">{nombre}</span>
              <span className="text-[11px] font-medium text-primary-700">Propietario</span>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
              {iniciales || '?'}
            </div>
            <button
              type="button"
              onClick={logout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-ink-500 transition-colors hover:bg-ink-50 hover:text-coral-600"
            >
              <IconLogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Nav horizontal (móvil) */}
      <nav
        className="sticky top-16 z-20 flex gap-1 overflow-x-auto border-b border-ink-200 bg-white px-2 lg:hidden"
        aria-label="Navegación"
      >
        {FLAT.map((it) => {
          const Icon = it.Icon
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors ${
                isActive(it)
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-ink-500 hover:text-ink-800'
              }`}
            >
              <Icon size={14} /> {it.label}
            </Link>
          )
        })}
      </nav>

      <div className="flex flex-1">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-56 shrink-0 overflow-y-auto border-r border-ink-200 bg-white py-4 lg:block">
          {NAV.map((g) => (
            <div key={g.group} className="mb-2">
              <div className="mb-1.5 px-4 text-[10px] font-bold uppercase tracking-wider text-ink-500">
                {g.group}
              </div>
              {g.items.map((it) => {
                const Icon = it.Icon
                const active = isActive(it)
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={`flex items-center gap-2.5 border-l-[3px] px-4 py-2.5 text-sm transition-colors ${
                      active
                        ? 'border-primary-600 bg-primary-50 font-semibold text-primary-700'
                        : 'border-transparent font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                    }`}
                  >
                    <Icon size={17} /> {it.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </aside>

        {/* Contenido */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-7">
          <div className="mx-auto max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
