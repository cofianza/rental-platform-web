/**
 * Los filtros activos de la cola de Cofianza, debajo de la barra: un chip por filtro con «×» para quitarlo y
 * «Limpiar filtros» para quitarlos todos. Los textos salen de chipsDeFiltros (lib/filtrosExpedientes, puro).
 */

'use client'

import { useRef } from 'react'
import { IconX } from '@/components/icons'
import type { ChipFiltro, ClaveChip } from '@/lib/filtrosExpedientes'
import { EXPEDIENTE_UI_MESSAGES } from './constants'

export interface FiltrosActivosProps {
  chips: ChipFiltro[]
  onQuitar: (clave: ClaveChip) => void
  onLimpiar: () => void
  /** A dónde va el foco cuando ya no quedan chips (el buscador). */
  onSinChips?: () => void
}

export function FiltrosActivos({ chips, onQuitar, onLimpiar, onSinChips }: FiltrosActivosProps) {
  const listaRef = useRef<HTMLUListElement>(null)
  if (chips.length === 0) return null

  // El botón pulsado desaparece: el foco pasa a la «×» que queda en su lugar (la siguiente o, si era la última, la
  // anterior) o, sin chips, al buscador. Si no, caía al final de la página.
  const enfocarTras = (indice: number) => {
    requestAnimationFrame(() => {
      const botones = listaRef.current?.querySelectorAll<HTMLButtonElement>('button[data-quitar-chip]')
      const destino = botones?.[Math.min(indice, botones.length - 1)]
      if (destino) destino.focus()
      else onSinChips?.()
    })
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <ul ref={listaRef} aria-label="Filtros activos" className="flex min-w-0 flex-wrap gap-2">
        {chips.map((c, i) => (
          <li key={c.clave} className="min-w-0 max-w-full">
            <span className="inline-flex h-8 max-w-full items-center gap-1 rounded-full border border-primary-200 bg-primary-50 pl-3 text-sm text-primary-800">
              <span title={c.texto} className="min-w-0 truncate">
                {c.texto}
              </span>
              {/* Zona táctil de 40 px (márgenes negativos: el chip sigue de 32 px); el círculo visible, adentro. */}
              <button
                type="button"
                data-quitar-chip
                aria-label={`Quitar el filtro: ${c.texto}`}
                onClick={() => {
                  onQuitar(c.clave)
                  enfocarTras(i)
                }}
                className="group -my-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary-700 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary-600"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors group-hover:bg-primary-100 group-hover:text-primary-900">
                  <IconX size={12} />
                </span>
              </button>
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => {
          onLimpiar()
          requestAnimationFrame(() => onSinChips?.())
        }}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
      >
        {EXPEDIENTE_UI_MESSAGES.CLEAR_FILTERS}
      </button>
    </div>
  )
}
