/**
 * Hook useBreadcrumbs
 * Genera breadcrumbs automáticos basados en la ruta actual
 */

'use client'

import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

export interface Breadcrumb {
  label: string
  href: string
  isLast: boolean
}

/**
 * Mapeo de segmentos de ruta a etiquetas legibles
 */
const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Inicio',
  inmuebles: 'Inmuebles',
  expedientes: 'Expedientes',
  usuarios: 'Usuarios',
  reportes: 'Reportes',
  configuracion: 'Configuración',
  nuevo: 'Nuevo',
  editar: 'Editar',
}

/**
 * Hook que genera breadcrumbs automáticamente desde la ruta actual
 *
 * @returns Array de breadcrumbs con label, href y isLast
 *
 * @example
 * // Ruta: /dashboard/expedientes/123
 * // Retorna: [
 * //   { label: 'Inicio', href: '/dashboard', isLast: false },
 * //   { label: 'Expedientes', href: '/dashboard/expedientes', isLast: false },
 * //   { label: 'Detalle', href: '/dashboard/expedientes/123', isLast: true },
 * // ]
 */
export function useBreadcrumbs(): Breadcrumb[] {
  const pathname = usePathname()

  const breadcrumbs = useMemo(() => {
    // Si estamos en la raíz del dashboard, no mostrar breadcrumbs
    if (pathname === '/dashboard') {
      return []
    }

    // Dividir la ruta en segmentos
    const segments = pathname.split('/').filter(Boolean)

    // Construir breadcrumbs acumulativos
    const crumbs: Breadcrumb[] = []
    let accumulatedPath = ''

    segments.forEach((segment, index) => {
      accumulatedPath += `/${segment}`

      // Determinar la etiqueta
      let label = ROUTE_LABELS[segment]

      // Si no hay mapeo, intentar detectar si es un ID (número o UUID)
      if (!label) {
        // Si parece un ID (número o UUID), usar "Detalle"
        if (/^\d+$/.test(segment) || /^[0-9a-f-]{36}$/.test(segment)) {
          label = 'Detalle'
        } else {
          // Capitalizar el segmento
          label = segment
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        }
      }

      crumbs.push({
        label,
        href: accumulatedPath,
        isLast: index === segments.length - 1,
      })
    })

    return crumbs
  }, [pathname])

  return breadcrumbs
}
