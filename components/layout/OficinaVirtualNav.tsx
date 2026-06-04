/**
 * OficinaVirtualNav — Tab bar horizontal con las 7 secciones de la nueva
 * propuesta UI (Mario 12-may-2026, mockup 13_*propietario.html y
 * 13_*_v2.html). Reemplaza al sidebar para roles propietario/inmobiliaria.
 *
 * Cada tab apunta a una ruta existente — no se mueven las páginas, sólo se
 * cambia el "chrome" del shell. El tab activo se detecta por pathname.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  IconBuilding2,
  IconSearch,
  IconFileText,
  IconAlertTriangle,
  IconReceipt,
  IconBarChart3,
  IconFolderOpen,
} from '@/components/icons'

interface TabDef {
  label: string
  href: string
  icon: typeof IconBuilding2
  // Si el pathname empieza por alguno de los matchers, este tab queda activo.
  matchers: string[]
  // Tabs sólo visibles para inmobiliaria (no propietario individual).
  onlyInmobiliaria?: boolean
}

const TABS: TabDef[] = [
  {
    label: 'Propiedades y Vitrina',
    href: '/inmuebles',
    icon: IconBuilding2,
    matchers: ['/inmuebles', '/vitrina', '/disponibilidad'],
  },
  {
    label: 'Estudios',
    href: '/estudios',
    icon: IconSearch,
    matchers: ['/estudios'],
  },
  {
    label: 'Contratos',
    href: '/contratos',
    icon: IconFileText,
    matchers: ['/contratos', '/expedientes'],
  },
  {
    label: 'Reportar Mora',
    href: '/moras',
    icon: IconAlertTriangle,
    matchers: ['/moras'],
  },
  {
    label: 'Pagos a Cofianza',
    href: '/facturacion',
    icon: IconReceipt,
    matchers: ['/facturacion'],
    onlyInmobiliaria: true,
  },
  {
    label: 'Analítica',
    href: '/reportes',
    icon: IconBarChart3,
    matchers: ['/reportes'],
  },
  {
    label: 'Mi Inmobiliaria',
    href: '/configuracion/mi-inmobiliaria',
    icon: IconFolderOpen,
    matchers: ['/configuracion'],
  },
]

interface Props {
  /** Rol del usuario actual — controla qué tabs se muestran. */
  rol: 'propietario' | 'inmobiliaria'
}

export function OficinaVirtualNav({ rol }: Props) {
  const pathname = usePathname()
  const isInmobiliaria = rol === 'inmobiliaria'

  const visibleTabs = TABS.filter((t) => !t.onlyInmobiliaria || isInmobiliaria)

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-16 z-20">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = tab.matchers.some((m) =>
              m === pathname ? true : pathname.startsWith(`${m}/`) || pathname === m,
            )
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={[
                  'inline-flex items-center gap-2 px-4 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors',
                  isActive
                    ? 'border-coral-500 text-coral-600'
                    : 'border-transparent text-gray-500 hover:text-coral-600 hover:bg-coral-50/40',
                ].join(' ')}
              >
                <Icon size={18} />
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
