/**
 * Filtro «Inmobiliaria» de la cola de estudios de Cofianza: un combobox donde se escribe parte del nombre y se elige
 * (patrón combobox con lista de WAI-ARIA: flechas, Enter, Escape y Tab). Opciones: «Todas las inmobiliarias», «Sin
 * inmobiliaria (propietario directo)» y cada organización. Solo lo monta la cola de Cofianza: la inmobiliaria y el
 * propietario no lo ven (y la API les rechaza el parámetro).
 */

'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { IconBuilding2, IconCheck, IconChevronDown, IconX } from '@/components/icons'
import { cn } from '@/lib/utils'
import { nombreInmobiliariaElegida, opcionesInmobiliaria, TEXTO_TODAS_INMOBILIARIAS } from '@/lib/filtrosExpedientes'
import type { IInmobiliariaFiltro } from '@/types/expediente'

export interface FiltroInmobiliariaProps {
  /** '' = todas; 'ninguna' = sin inmobiliaria; o el id de la organización. */
  valor: string
  /** null = todavía no llegan. */
  inmobiliarias: IInmobiliariaFiltro[] | null
  /** No se pudieron cargar. */
  error?: boolean
  /** Con error, se vuelven a pedir al abrir la lista. */
  onReintentar?: () => void
  onChange: (valor: string) => void
  /** Clases del campo de la barra (borde, alto, foco). */
  campo: string
  className?: string
}

export function FiltroInmobiliaria({ valor, inmobiliarias, error = false, onReintentar, onChange, campo, className }: FiltroInmobiliariaProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const listaId = `${id}-lista`
  const [abierta, setAbierta] = useState(false)
  const [texto, setTexto] = useState('')
  const [activa, setActiva] = useState(-1)
  const opciones = useMemo(() => opcionesInmobiliaria(inmobiliarias ?? [], texto), [inmobiliarias, texto])
  const elegida = nombreInmobiliariaElegida(valor, inmobiliarias)
  // La organización elegida todavía no se conoce (la lista no llega): se dice que hay una elegida, sin inventar el nombre.
  const textoElegida = elegida ?? 'Inmobiliaria elegida'

  const abrir = (textoInicial = '') => {
    if (error) onReintentar?.()
    setAbierta(true)
    setTexto(textoInicial)
    // Al abrir se marca lo elegido (o «Todas»); escribiendo, la primera coincidencia.
    setActiva(textoInicial ? 0 : Math.max(0, opcionesInmobiliaria(inmobiliarias ?? [], '').findIndex((o) => o.valor === valor)))
  }
  const cerrar = () => {
    setAbierta(false)
    setTexto('')
    setActiva(-1)
  }
  const elegir = (v: string) => {
    if (v !== valor) onChange(v)
    cerrar()
  }

  // La opción marcada con las flechas siempre a la vista en la lista.
  useEffect(() => {
    if (!abierta || activa < 0) return
    document.getElementById(`${listaId}-${activa}`)?.scrollIntoView({ block: 'nearest' })
  }, [abierta, activa, listaId])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!abierta) {
        abrir()
        return
      }
      if (opciones.length === 0) return
      setActiva((i) => (e.key === 'ArrowDown' ? Math.min(opciones.length - 1, i + 1) : Math.max(0, i - 1)))
    } else if (e.key === 'Enter') {
      if (abierta && activa >= 0 && opciones[activa]) {
        e.preventDefault()
        elegir(opciones[activa].valor)
      }
    } else if (e.key === 'Escape') {
      if (abierta) {
        e.preventDefault()
        cerrar()
      }
    } else if (e.key === 'Tab') {
      if (abierta) cerrar()
    } else if (!abierta && (e.key === 'Backspace' || e.key === 'Delete')) {
      // Con la lista cerrada el campo muestra el nombre elegido: borrar empieza una búsqueda nueva, no edita el nombre.
      e.preventDefault()
      abrir()
    } else if (!abierta && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Escribir con la lista cerrada busca desde cero (si no, la letra se pegaba al nombre elegido).
      e.preventDefault()
      abrir(e.key)
    }
  }

  const activaId = abierta && activa >= 0 && opciones[activa] ? `${listaId}-${activa}` : undefined

  return (
    <div className={cn('relative min-w-0', className)}>
      <IconBuilding2 size={16} className="pointer-events-none absolute inset-y-0 left-3 my-auto text-gray-500" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label="Filtrar por inmobiliaria"
        aria-autocomplete="list"
        aria-expanded={abierta}
        aria-controls={listaId}
        aria-activedescendant={activaId}
        autoComplete="off"
        spellCheck={false}
        value={abierta ? texto : valor ? textoElegida : ''}
        placeholder={abierta ? (valor ? textoElegida : 'Escriba parte del nombre') : TEXTO_TODAS_INMOBILIARIAS}
        onClick={() => {
          if (!abierta) abrir()
        }}
        onChange={(e) => {
          setTexto(e.target.value)
          setAbierta(true)
          // Al escribir se marca la primera coincidencia: Enter la elige.
          setActiva(0)
        }}
        onKeyDown={onKeyDown}
        onBlur={cerrar}
        className={cn(campo, 'w-full truncate pl-9 pr-9 placeholder:text-gray-500', valor && !abierta && 'font-medium')}
      />
      {valor && !abierta ? (
        <button
          type="button"
          aria-label="Quitar el filtro de inmobiliaria"
          onClick={() => {
            onChange('')
            // El botón desaparece: el foco vuelve al campo, no al final de la página.
            inputRef.current?.focus()
          }}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-gray-500 hover:text-gray-700"
        >
          <IconX size={14} />
        </button>
      ) : (
        <IconChevronDown
          size={16}
          className={cn('pointer-events-none absolute inset-y-0 right-3 my-auto text-gray-500 transition-transform', abierta && 'rotate-180')}
        />
      )}

      {abierta && (
        <div
          // mousedown no le quita el foco al campo: si no, la lista se cerraba antes del clic.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 top-full z-30 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {inmobiliarias === null && !error && <p className="px-3 py-2 text-sm text-gray-500">Cargando inmobiliarias…</p>}
          {error && (
            <p className="px-3 py-2 text-sm text-amber-800">
              No se pudieron cargar las inmobiliarias. Cierre y vuelva a abrir la lista para intentarlo de nuevo.
            </p>
          )}
          <ul id={listaId} role="listbox" aria-label="Inmobiliarias" className="max-h-64 overflow-y-auto py-1">
            {opciones.map((o, i) => {
              const seleccionada = o.valor === valor
              return (
                <li
                  key={o.valor || 'todas'}
                  id={`${listaId}-${i}`}
                  role="option"
                  aria-selected={seleccionada}
                  onClick={() => elegir(o.valor)}
                  onMouseEnter={() => setActiva(i)}
                  className={cn(
                    'flex min-h-10 cursor-pointer items-center gap-2 px-3 py-2 text-sm',
                    i === activa ? 'bg-primary-100 text-primary-900' : 'text-gray-800',
                  )}
                >
                  <IconCheck size={14} className={cn('shrink-0', seleccionada ? 'text-primary-700' : 'invisible')} />
                  <span className="min-w-0 flex-1 truncate">{o.texto}</span>
                  {o.detalle && <span className="shrink-0 text-xs text-gray-500">{o.detalle}</span>}
                </li>
              )
            })}
          </ul>
          {opciones.length === 0 && inmobiliarias !== null && (
            <p className="px-3 pb-2 text-sm text-gray-500">Ninguna inmobiliaria coincide con «{texto.trim()}».</p>
          )}
        </div>
      )}
      {/* Región viva siempre montada: el lector de pantalla anuncia cuántas opciones quedan al escribir. */}
      <p aria-live="polite" className="sr-only">
        {!abierta
          ? ''
          : error
            ? 'No se pudieron cargar las inmobiliarias.'
            : inmobiliarias === null
              ? 'Cargando inmobiliarias…'
              : opciones.length === 0
                ? 'Ninguna inmobiliaria coincide.'
                : `${opciones.length} ${opciones.length === 1 ? 'opción' : 'opciones'}`}
      </p>
    </div>
  )
}
