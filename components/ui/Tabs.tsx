/**
 * Tabs - Navegación por pestañas con contadores opcionales
 * Client Component - requiere interactividad
 *
 * Cada pestaña es #tab-<id> y apunta a #panel-<id>: el uso envuelve el
 * contenido activo en <div role="tabpanel" id="panel-<id>" aria-labelledby="tab-<id>">.
 * Flechas, Inicio y Fin cambian de pestaña; Tab salta directo al panel.
 */

'use client'

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

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
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
        role="tablist"
        className="-mb-px flex gap-5 overflow-x-auto [scrollbar-width:thin] sm:gap-7"
        aria-label="Secciones"
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
