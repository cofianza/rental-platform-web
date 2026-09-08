/**
 * Hook useBreadcrumbs
 * Genera breadcrumbs automáticos basados en la ruta actual
 */

'use client'

import { NAV_ITEMS } from '@/lib/constants'
import type { UserRole } from '@/types/auth'
import { useAuthStore } from '@/stores/auth.store'
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
  estudios: 'Evaluaciones crediticias',
  interesados: 'Interesados',
  'tipos-documento': 'Tipos de documento',
  'plantillas-contrato': 'Plantillas de contrato',
  nuevo: 'Nuevo',
  editar: 'Editar',
}

/**
 * El nombre del menú manda: antes la miga decía otra cosa que el sidebar.
 *
 * Dos entradas pueden compartir href con label distinto según el rol
 * (p.ej. /facturacion es "Pagos a Cofianza" para la inmobiliaria y
 * "Mis pagos y facturas" para el solicitante), así que el mapa se arma con
 * el rol actual: gana la primera entrada visible para ese rol.
 */
function buildNavLabels(rol?: UserRole): Record<string, string> {
  const map: Record<string, string> = {}
  for (const item of NAV_ITEMS) {
    if (rol && item.requiredRoles && !item.requiredRoles.includes(rol)) continue
    if (map[item.href]) continue
    map[item.href] = item.label
  }
  return map
}

/** Segmentos que no son una página: se acumulan en la ruta pero no se muestran. */
const NO_NAVEGABLES = new Set(['admin'])

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
  const rol = useAuthStore((state) => state.user?.rol)
  const navLabels = useMemo(() => buildNavLabels(rol), [rol])

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

      // /admin no tiene página propia: llevaba a un 404.
      if (NO_NAVEGABLES.has(segment)) return

      // Determinar la etiqueta (el menú tiene prioridad)
      let label = navLabels[accumulatedPath] ?? ROUTE_LABELS[segment]

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
  }, [pathname, navLabels])

  return breadcrumbs
}
