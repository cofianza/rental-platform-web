/**
 * Burbuja de ayuda: un ícono de información que muestra un texto corto al
 * pasar el mouse o al tocarlo (en el celular no hay «hover»). Se cierra al
 * tocar fuera o con Escape. Accesible: botón con etiqueta y role="tooltip".
 */

'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { IconInfo } from '@/components/icons'
import { cn } from '@/lib/utils'

interface Props {
  texto: string
  /** Para el lector de pantalla. */
  etiqueta?: string
  /** Hacia dónde abre la burbuja: cerca del borde derecho, 'izquierda'. */
  lado?: 'centro' | 'izquierda' | 'derecha'
  className?: string
}

export function InfoTip({ texto, etiqueta = 'Más información', lado = 'centro', className }: Props) {
  const [hover, setHover] = useState(false)
  const [fijo, setFijo] = useState(false)
  const abierto = hover || fijo
  const id = useId()
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setFijo(false)
        setHover(false)
      }
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFijo(false)
        setHover(false)
      }
    }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', esc)
    }
  }, [abierto])

  return (
    <span
      ref={ref}
      className={cn('relative inline-flex align-middle normal-case tracking-normal', className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        aria-label={etiqueta}
        aria-expanded={abierto}
        aria-describedby={abierto ? id : undefined}
        // Dentro de <summary> o de una tarjeta clicable no debe abrir/cerrar lo de afuera.
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setFijo((v) => !v)
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <IconInfo size={14} />
      </button>
      {abierto && (
        <span
          role="tooltip"
          id={id}
          className={cn(
            'absolute top-full z-50 mt-1.5 w-64 max-w-[80vw] rounded-lg bg-gray-900 px-3 py-2 text-left text-xs font-normal leading-snug text-white shadow-lg',
            lado === 'centro' && 'left-1/2 -translate-x-1/2',
            lado === 'izquierda' && 'right-0',
            lado === 'derecha' && 'left-0',
          )}
        >
          {texto}
        </span>
      )}
    </span>
  )
}
