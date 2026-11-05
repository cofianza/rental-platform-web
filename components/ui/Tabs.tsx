/**
 * Tabs - Navegación por pestañas con contadores opcionales
 * Client Component - requiere interactividad
 *
 * Cada pestaña es #tab-<id> y apunta a #panel-<id>: el uso envuelve el
 * contenido activo en <div role="tabpanel" id="panel-<id>" aria-labelledby="tab-<id>">.
 * Flechas, Inicio y Fin cambian de pestaña; Tab salta directo al panel.
 * Si no caben (celular), el borde que esconde pestañas se desvanece para
 * avisar que hay más, y la activa se desliza a la vista.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export interface Tab {
  id: string
  label: string
  count?: number
}

export interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
}

// Máscara (no un degradado pintado): sirve sobre cualquier fondo.
const DESVANECER = {
  izquierda: 'linear-gradient(to right, transparent, #000 32px)',
  derecha: 'linear-gradient(to left, transparent, #000 32px)',
  ambos: 'linear-gradient(to right, transparent, #000 32px, #000 calc(100% - 32px), transparent)',
} as const

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  const navRef = useRef<HTMLElement>(null)
  const [bordes, setBordes] = useState({ izquierda: false, derecha: false })

  const medir = useCallback(() => {
    const nav = navRef.current
    if (!nav) return
    const izquierda = nav.scrollLeft > 1
    const derecha = nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1
    setBordes((b) => (b.izquierda === izquierda && b.derecha === derecha ? b : { izquierda, derecha }))
  }, [])

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    medir()
    nav.addEventListener('scroll', medir, { passive: true })
    const ro = new ResizeObserver(medir)
    ro.observe(nav)
    return () => {
      nav.removeEventListener('scroll', medir)
      ro.disconnect()
    }
  }, [medir, tabs])

  // La pestaña activa a la vista, solo en horizontal (scrollIntoView movería la página).
  useEffect(() => {
    const nav = navRef.current
    const tab = nav?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!nav || !tab) return
    const margen = 32
    if (tab.offsetLeft - margen < nav.scrollLeft) nav.scrollLeft = Math.max(0, tab.offsetLeft - margen)
    else if (tab.offsetLeft + tab.offsetWidth + margen > nav.scrollLeft + nav.clientWidth)
      nav.scrollLeft = tab.offsetLeft + tab.offsetWidth + margen - nav.clientWidth
  }, [activeTab])

  const mascara =
    bordes.izquierda && bordes.derecha ? DESVANECER.ambos
      : bordes.izquierda ? DESVANECER.izquierda
        : bordes.derecha ? DESVANECER.derecha
          : undefined

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const destino = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key]
    if (destino === undefined) return
    e.preventDefault()
    const j = (destino + tabs.length) % tabs.length
    onChange(tabs[j].id)
    ;(e.currentTarget.parentElement?.children[j] as HTMLElement | undefined)?.focus()
  }

  // Si activeTab no está en la lista, la primera sigue alcanzable con Tab.
  const enfocable = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0]?.id

  return (
    <div className={cn('border-b border-gray-200', className)}>
      <nav
        ref={navRef}
        role="tablist"
        className="relative -mb-px flex gap-5 overflow-x-auto [scrollbar-width:thin] sm:gap-7"
        aria-label="Secciones"
        style={mascara ? { maskImage: mascara, WebkitMaskImage: mascara } : undefined}
      >
        {tabs.map((tab, i) => {
          const isActive = tab.id === activeTab

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={isActive ? `panel-${tab.id}` : undefined}
              tabIndex={tab.id === enfocable ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-1 py-3 text-sm transition-colors',
                'focus-visible:rounded-t-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500',
                isActive
                  ? 'border-primary-700 font-medium text-primary-800'
                  : 'border-transparent font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900'
              )}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      'inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium',
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
