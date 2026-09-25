/**
 * OficinaVirtualNav — Tab bar horizontal con las 7 secciones de la nueva
 * propuesta UI (Mario 12-may-2026, mockup 13_*propietario.html y
 * 13_*_v2.html). Reemplaza al sidebar para roles propietario/inmobiliaria.
 *
 * Cada tab apunta a una ruta existente — no se mueven las páginas, sólo se
 * cambia el "chrome" del shell. El tab activo se detecta por pathname. Las
 * pestañas que no caben en el ancho de la pantalla van al menú «Más».
 */

'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  IconChevronDown,
  IconHome,
  IconBuilding2,
  IconUsers,
  IconSearch,
  IconFileText,
  IconAlertTriangle,
  IconReceipt,
  IconBarChart3,
  IconSettings,
} from '@/components/icons'
import { useInteresadosNuevos } from '@/hooks/useInteresadosNuevos'

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
    label: 'Inicio',
    href: '/dashboard',
    icon: IconHome,
    matchers: ['/dashboard'],
  },
  {
    label: 'Propiedades y Vitrina',
    href: '/inmuebles',
    icon: IconBuilding2,
    matchers: ['/inmuebles', '/vitrina'],
  },
  {
    label: 'Interesados',
    href: '/interesados',
    icon: IconUsers,
    matchers: ['/interesados'],
  },
  {
    // Pestaña UNIFICADA: "Estudios" engloba Estudios + Expedientes (sub-pestañas
    // internas en /estudios). Por eso "Expedientes" ya no es una pestaña aparte
    // y "Visitas" se movió a Configuración. Los matchers incluyen /expedientes
    // para que esta pestaña quede activa también en el listado/detalle de
    // expedientes. Las rutas /expedientes y /citas siguen vivas.
    label: 'Estudios',
    href: '/estudios',
    icon: IconSearch,
    matchers: ['/estudios', '/expedientes'],
  },
  {
    label: 'Contratos',
    href: '/contratos',
    icon: IconFileText,
    matchers: ['/contratos'],
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
    // Apunta al HUB de configuración (no directo a documentos): así la
    // inmobiliaria/propietario ve TODAS sus opciones (Mi cuenta, Datos para
    // contrato, Mi Inmobiliaria, Créditos, Disponibilidad, Notificaciones).
    label: 'Configuración',
    href: '/configuracion',
    icon: IconSettings,
    // /notificaciones cuelga de este hub ("Historial de notificaciones"): sin
    // el matcher, al entrar desde la campana ninguna pestaña quedaba activa y
    // la página parecía estar fuera del sistema.
    matchers: ['/configuracion', '/disponibilidad', '/notificaciones'],
  },
]

interface Props {
  /** Rol del usuario actual — controla qué tabs se muestran. */
  rol: 'propietario' | 'inmobiliaria'
}

const claseTab = (activa: boolean) =>
  [
    'inline-flex shrink-0 items-center gap-2 px-3 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors',
    activa
      ? 'border-coral-500 text-coral-700'
      : 'border-transparent text-gray-500 hover:text-coral-700 hover:bg-coral-50/40',
  ].join(' ')

function Contador({ n }: { n: number }) {
  return (
    <span className="ml-1 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-coral-500 px-1.5 text-[10px] font-bold text-ink-900">
      {n}
    </span>
  )
}

export function OficinaVirtualNav({ rol }: Props) {
  const pathname = usePathname()
  const isInmobiliaria = rol === 'inmobiliaria'
  const interesadosNuevos = useInteresadosNuevos(true)

  const visibleTabs = TABS.filter((t) => !t.onlyInmobiliaria || isInmobiliaria)
  const esActiva = (tab: TabDef) =>
    tab.matchers.some((m) => pathname === m || pathname.startsWith(`${m}/`))
  const contenido = (tab: TabDef) => (
    <>
      <tab.icon size={18} />
      {tab.label}
      {tab.href === '/interesados' && interesadosNuevos > 0 && <Contador n={interesadosNuevos} />}
    </>
  )

  // Por debajo de ~1280 px no caben todas (antes la barra se desbordaba con scroll
  // horizontal): las que no caben pasan al menú «Más». Se miden en una fila invisible.
  const [caben, setCaben] = useState(visibleTabs.length)
  const filaRef = useRef<HTMLDivElement>(null)
  const medidaRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const fila = filaRef.current
    const medida = medidaRef.current
    if (!fila || !medida) return
    // El observador avisa al empezar y cada vez que cambia el ancho (ventana, fuente, contador).
    const ro = new ResizeObserver(() => {
      const anchos = Array.from(medida.children, (c) => (c as HTMLElement).offsetWidth)
      const mas = anchos.pop() ?? 0
      const disponible = fila.clientWidth
      let usado = anchos.reduce((a, w) => a + w, 0)
      if (usado <= disponible) return setCaben(anchos.length)
      let n = 0
      for (usado = mas; n < anchos.length && usado + anchos[n] <= disponible; n++) usado += anchos[n]
      setCaben(n)
    })
    ro.observe(fila)
    ro.observe(medida)
    return () => ro.disconnect()
  }, [visibleTabs.length])

  const [menuAbierto, setMenuAbierto] = useState(false)
  const masRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menuAbierto) return
    const onClickFuera = (e: MouseEvent) => {
      if (masRef.current && !masRef.current.contains(e.target as Node)) setMenuAbierto(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuAbierto(false)
    }
    document.addEventListener('mousedown', onClickFuera)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClickFuera)
      document.removeEventListener('keydown', onEsc)
    }
  }, [menuAbierto])

  const enBarra = visibleTabs.slice(0, caben)
  const enMas = visibleTabs.slice(caben)
  const nuevosEnMas = enMas.some((t) => t.href === '/interesados') ? interesadosNuevos : 0

  return (
    <nav aria-label="Secciones" className="bg-white border-b border-gray-200 shadow-sm sticky top-16 z-20">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div ref={filaRef} className="flex">
          <div className="flex min-w-0 overflow-hidden">
            {enBarra.map((tab) => {
              const activa = esActiva(tab)
              return (
                <Link key={tab.href} href={tab.href} aria-current={activa ? 'page' : undefined} className={claseTab(activa)}>
                  {contenido(tab)}
                </Link>
              )
            })}
          </div>

          {enMas.length > 0 && (
            <div className="relative" ref={masRef}>
              <button
                type="button"
                onClick={() => setMenuAbierto((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuAbierto}
                className={claseTab(enMas.some(esActiva))}
              >
                Más
                {nuevosEnMas > 0 && <Contador n={nuevosEnMas} />}
                <IconChevronDown size={16} className={`transition-transform ${menuAbierto ? 'rotate-180' : ''}`} />
              </button>
              {menuAbierto && (
                <div
                  role="menu"
                  className="absolute right-0 z-40 mt-1 w-60 rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg"
                >
                  {enMas.map((tab) => {
                    const activa = esActiva(tab)
                    return (
                      <Link
                        key={tab.href}
                        href={tab.href}
                        role="menuitem"
                        aria-current={activa ? 'page' : undefined}
                        onClick={() => setMenuAbierto(false)}
                        className={[
                          'flex items-center gap-2.5 px-3 py-2 text-sm font-semibold transition-colors',
                          activa ? 'bg-coral-50 text-coral-700' : 'text-gray-700 hover:bg-coral-50 hover:text-coral-700',
                        ].join(' ')}
                      >
                        {contenido(tab)}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fila de medida: todas las pestañas y el «Más», invisibles, fuera del flujo y
          recortadas (sin el recorte, en móvil daban scroll horizontal a la página). */}
      <div aria-hidden className="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden">
        <div ref={medidaRef} className="flex w-max">
          {visibleTabs.map((tab) => (
            <span key={tab.href} className={claseTab(false)}>
              {contenido(tab)}
            </span>
          ))}
          <span className={claseTab(false)}>
            Más
            {interesadosNuevos > 0 && <Contador n={interesadosNuevos} />}
            <IconChevronDown size={16} />
          </span>
        </div>
      </div>
    </nav>
  )
}
