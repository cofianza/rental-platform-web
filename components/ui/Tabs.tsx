/**
 * Tabs - Navegación por pestañas con contadores opcionales
 * Client Component - requiere interactividad
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
  return (
    <div className={cn('border-b border-gray-200', className)}>
      <nav
        className="-mb-px flex space-x-8 overflow-x-auto"
        aria-label="Tabs"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                isActive
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
              aria-current={isActive ? 'page' : undefined}
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
