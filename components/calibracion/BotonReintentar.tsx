'use client'

import { useState } from 'react'
import { IconRefresh } from '@/components/icons'
import { cn } from '@/lib/utils'

/** «Reintentar» para un bloque que no cargó (indicadores, tablas de puntos): vuelve a pedirlo sin recargar el panel. */
export function BotonReintentar({ onReintentar, className }: { onReintentar: () => Promise<void>; className?: string }) {
  const [cargando, setCargando] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        setCargando(true)
        try {
          await onReintentar()
        } finally {
          setCargando(false)
        }
      }}
      disabled={cargando}
      aria-busy={cargando || undefined}
      className={cn(
        'inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60',
        className,
      )}
    >
      <IconRefresh size={14} className={cn(cargando && 'animate-spin motion-reduce:animate-none')} />
      Reintentar
    </button>
  )
}
