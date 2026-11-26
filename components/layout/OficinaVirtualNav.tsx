/**
 * OficinaVirtualNav — la barra de la Oficina Virtual de la inmobiliaria (el propietario tiene su propio shell,
 * PropietarioShell).
 *
 * Reporte de la Oficina Virtual (25-nov), punto 9: cinco secciones (antes nueve): Inicio, Inmuebles (con Interesados
 * y Visitas), Estudios, Contratos (con Reportar mora) y Pagos (con los cupos de estudios, que se gestionan solo
 * allí). Analítica y Configuración van en el menú de la cuenta (OficinaVirtualShell). Las secciones con más de una
 * pantalla muestran debajo una segunda fila con sus subsecciones.
 *
 * Ninguna página se movió: cada pestaña apunta a una ruta que ya existía (los correos, WhatsApp y notificaciones
 * enlazan a ellas), y la pestaña activa se detecta por la ruta. En el celular las cinco caben a lo ancho (ícono
 * sobre el nombre); en pantallas mayores van en fila.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconHome, IconBuilding2, IconSearch, IconFileText, IconReceipt } from '@/components/icons'
import { useInteresadosNuevos } from '@/hooks/useInteresadosNuevos'
import { seccionActiva, subseccionActiva, SECCIONES_OFICINA, type SeccionOficinaVirtual } from '@/lib/oficinaVirtualNav'
import { cn } from '@/lib/utils'

const ICONOS: Record<SeccionOficinaVirtual['clave'], typeof IconHome> = {
  inicio: IconHome,
  inmuebles: IconBuilding2,
  estudios: IconSearch,
  contratos: IconFileText,
  pagos: IconReceipt,
}

function Contador({ n, etiqueta }: { n: number; etiqueta: string }) {
  return (
    <span className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-coral-500 px-1.5 text-[10px] font-bold text-ink-900">
      {n}
      <span className="sr-only"> {etiqueta}</span>
    </span>
  )
}

export function OficinaVirtualNav() {
  const pathname = usePathname()
  const interesadosNuevos = useInteresadosNuevos(true)
  const activa = seccionActiva(pathname)
  const subActiva = activa ? subseccionActiva(activa, pathname) : null
  const nuevos = interesadosNuevos > 0 ? interesadosNuevos : 0
  const etiquetaNuevos = nuevos === 1 ? 'interesado nuevo' : 'interesados nuevos'

  return (
    <>
      <nav aria-label="Secciones" className="sticky top-16 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-2 sm:px-4">
          <ul className="grid grid-cols-5 sm:flex">
            {SECCIONES_OFICINA.map((s) => {
              const Icono = ICONOS[s.clave]
              const esta = activa?.clave === s.clave
              return (
                <li key={s.clave} className="min-w-0">
                  <Link
                    href={s.href}
                    // «page» solo en la pantalla exacta; en una subsección, la sección es la actual («true») y la
                    // subpestaña es la página.
                    aria-current={esta ? (pathname === s.href ? 'page' : 'true') : undefined}
                    className={cn(
                      // Celular: ícono sobre el nombre, las cinco a lo ancho. Desde sm: en fila.
                      'flex min-h-14 flex-col items-center justify-center gap-0.5 border-b-2 px-1 py-2 text-[11px] font-bold whitespace-nowrap transition-colors',
                      'sm:min-h-0 sm:flex-row sm:gap-2 sm:px-3 sm:py-4 sm:text-sm',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-coral-500',
                      esta ? 'border-coral-500 text-coral-700' : 'border-transparent text-gray-500 hover:bg-coral-50/40 hover:text-coral-700',
                    )}
                  >
                    <span className="relative inline-flex">
                      <Icono size={18} />
                      {/* En el celular el contador va sobre el ícono (el nombre no cabe con él al lado). */}
                      {s.clave === 'inmuebles' && nuevos > 0 && (
                        <span className="absolute -top-1.5 -right-3 sm:hidden">
                          <Contador n={nuevos} etiqueta={etiquetaNuevos} />
                        </span>
                      )}
                    </span>
                    <span className="max-w-full truncate">{s.label}</span>
                    {s.clave === 'inmuebles' && nuevos > 0 && (
                      <span className="hidden sm:inline-flex">
                        <Contador n={nuevos} etiqueta={etiquetaNuevos} />
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      {/* Segundo nivel: las pantallas de la sección (no se queda fija arriba: en el celular robaría alto). */}
      {activa?.subsecciones && (
        <nav aria-label={`Subsecciones de ${activa.label}`} className="border-b border-gray-200 bg-gray-50">
          <ul className="mx-auto flex max-w-7xl flex-wrap gap-1.5 px-4 py-2 sm:px-6">
            {activa.subsecciones.map((sub) => {
              const esta = subActiva?.href === sub.href
              return (
                <li key={sub.href}>
                  <Link
                    href={sub.href}
                    aria-current={esta ? 'page' : undefined}
                    className={cn(
                      'inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500',
                      esta ? 'bg-white text-coral-700 shadow-sm ring-1 ring-coral-200' : 'text-gray-600 hover:bg-white hover:text-coral-700',
                    )}
                  >
                    {sub.label}
                    {sub.href === '/interesados' && nuevos > 0 && <Contador n={nuevos} etiqueta={etiquetaNuevos} />}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
    </>
  )
}
