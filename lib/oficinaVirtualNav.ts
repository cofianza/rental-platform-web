/**
 * Las secciones de la Oficina Virtual de la inmobiliaria (reporte del 25-nov, punto 9): cinco en la barra y, en las
 * que tienen más de una pantalla, sus subsecciones. Cada una apunta a una ruta que ya existía (ninguna se movió: los
 * correos, WhatsApp y notificaciones enlazan a ellas); la activa se detecta por la ruta. Analítica (/reportes) y
 * Configuración (/configuracion) no están aquí: van en el menú de la cuenta. Pura (la usa OficinaVirtualNav).
 */

import { RUTA_CUPOS } from './constants'

export interface SubseccionOficinaVirtual {
  label: string
  href: string
  /** Rutas (y sus hijas) que dejan activa esta subsección. */
  matchers: string[]
}

export interface SeccionOficinaVirtual {
  clave: 'inicio' | 'inmuebles' | 'estudios' | 'contratos' | 'pagos'
  label: string
  href: string
  subsecciones?: SubseccionOficinaVirtual[]
  /** Sin subsecciones: las rutas que la dejan activa. Con ellas, las de sus subsecciones. */
  matchers?: string[]
}

export const SECCIONES_OFICINA: SeccionOficinaVirtual[] = [
  { clave: 'inicio', label: 'Inicio', href: '/dashboard', matchers: ['/dashboard'] },
  {
    clave: 'inmuebles',
    label: 'Inmuebles',
    href: '/inmuebles',
    subsecciones: [
      { label: 'Propiedades y vitrina', href: '/inmuebles', matchers: ['/inmuebles', '/vitrina'] },
      { label: 'Interesados', href: '/interesados', matchers: ['/interesados'] },
      // Antes Visitas estaba dentro de Configuración; sus horarios también viven aquí ahora.
      { label: 'Visitas', href: '/citas', matchers: ['/citas'] },
      { label: 'Horarios de visita', href: '/disponibilidad', matchers: ['/disponibilidad'] },
    ],
  },
  // «Estudios» ya tiene sus pestañas dentro de la pantalla; /expedientes es la misma lista y el detalle de cada estudio.
  { clave: 'estudios', label: 'Estudios', href: '/estudios', matchers: ['/estudios', '/expedientes'] },
  {
    clave: 'contratos',
    label: 'Contratos',
    href: '/contratos',
    subsecciones: [
      { label: 'Contratos', href: '/contratos', matchers: ['/contratos'] },
      { label: 'Reportar mora', href: '/moras', matchers: ['/moras'] },
    ],
  },
  {
    clave: 'pagos',
    label: 'Pagos',
    href: '/facturacion',
    subsecciones: [
      { label: 'Pagos a Cofianza', href: '/facturacion', matchers: ['/facturacion'] },
      // Los cupos se gestionan solo aquí (antes también en Inicio, Estudios y Configuración).
      { label: 'Cupos de estudios', href: RUTA_CUPOS, matchers: [RUTA_CUPOS] },
    ],
  },
]

const coincide = (pathname: string, m: string) => pathname === m || pathname.startsWith(`${m}/`)

const rutasDe = (s: SeccionOficinaVirtual) => s.matchers ?? (s.subsecciones ?? []).flatMap((x) => x.matchers)

/** La sección de la ruta; null fuera de la barra (Analítica, Configuración, notificaciones…). */
export function seccionActiva(pathname: string): SeccionOficinaVirtual | null {
  return SECCIONES_OFICINA.find((s) => rutasDe(s).some((m) => coincide(pathname, m))) ?? null
}

/** La subsección de la ruta dentro de su sección (null si la sección no tiene subsecciones). */
export function subseccionActiva(seccion: SeccionOficinaVirtual, pathname: string): SubseccionOficinaVirtual | null {
  return seccion.subsecciones?.find((x) => x.matchers.some((m) => coincide(pathname, m))) ?? null
}
