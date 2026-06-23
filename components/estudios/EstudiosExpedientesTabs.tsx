/**
 * EstudiosExpedientesTabs — vista unificada de la inmobiliaria: una sola
 * pestaña "Estudios" con sub-pestañas internas "Estudios" | "Expedientes",
 * para no tener dos pestañas de nav separadas.
 *
 * IMPORTANTE: useEstudiosList (Estudios) y useExpedientes (Expedientes) escriben
 * las MISMAS keys del querystring (search, estado, page, limit, sortBy...). Por
 * eso montamos SOLO la sub-pestaña activa (montaje condicional, no display:none)
 * y limpiamos el querystring al cambiar — así el hook activo es el único dueño
 * de la URL y no se contaminan los filtros entre listados.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconSearch, IconClipboardList } from '@/components/icons'
import { EstudiosInmobiliariaView } from './EstudiosInmobiliariaView'
import { ExpedientesListado } from '@/components/expedientes'

type SubTab = 'estudios' | 'expedientes'

const SUBTABS: { key: SubTab; label: string; icon: typeof IconSearch }[] = [
  { key: 'estudios', label: 'Estudios', icon: IconSearch },
  { key: 'expedientes', label: 'Expedientes', icon: IconClipboardList },
]

export function EstudiosExpedientesTabs() {
  const router = useRouter()
  const [tab, setTab] = useState<SubTab>('estudios')

  const switchTab = (next: SubTab) => {
    if (next === tab) return
    // Limpiar los params del querystring para que el nuevo listado arranque sin
    // los filtros del anterior (ambos hooks comparten las mismas keys de URL).
    router.replace('/estudios', { scroll: false })
    setTab(next)
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-gray-200">
        {SUBTABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => switchTab(t.key)}
              className={[
                'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
                active
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-primary-600',
              ].join(' ')}
            >
              <Icon size={16} />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'expedientes' ? <ExpedientesListado /> : <EstudiosInmobiliariaView />}
    </div>
  )
}
