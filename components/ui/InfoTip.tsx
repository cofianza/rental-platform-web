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
  /**
   * La burbuja se ubica respecto al contenedor posicionado (`relative`) más
   * cercano, no respecto al ícono. Para un ícono pegado a una pastilla de largo
   * variable: con el contenedor al inicio de la celda y lado 'derecha', abre
   * desde ese borde y no se sale de la pantalla aunque el ícono quede a la derecha.
   */
  anclada?: boolean
  className?: string
}

export function InfoTip({ texto, etiqueta = 'Más información', lado = 'centro', anclada = false, className }: Props) {
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
      className={cn(!anclada && 'relative', 'inline-flex align-middle normal-case tracking-normal', className)}
      // Solo el mouse abre al pasar: en táctil el toque dispara también un mouseenter
      // emulado y el segundo toque no cerraba (el «hover» seguía en true).
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') setHover(true)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') setHover(false)
      }}
      // Tocar la burbuja (o el espacio del ícono) no debe abrir la fila o la tarjeta clicable de afuera.
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
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
        // El ícono mide 20 px; el before amplía el área táctil a 40 px sin agrandarlo.
        className="relative inline-flex h-5 w-5 items-center justify-center rounded-full text-gray-400 before:absolute before:-inset-2.5 before:content-[''] hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
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
