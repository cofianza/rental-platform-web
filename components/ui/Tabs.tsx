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
        className="-mb-px flex space-x-8 overflow-x-auto"
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
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                isActive
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
