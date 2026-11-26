/**
 * Aviso de una línea cuando las cifras de la Oficina Virtual no se pudieron cargar (reporte del 25-nov, punto 1):
 * las tarjetas quedan en «—» (nunca un 0) y aquí se puede reintentar.
 */

'use client'

import { IconAlertTriangle, IconRefresh } from '@/components/icons'
import { cn } from '@/lib/utils'

export function AvisoCifras({ onReintentar, cargando = false, className }: { onReintentar: () => void; cargando?: boolean; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-amber-900', className)}>
      <span className="inline-flex items-center gap-1.5">
        <IconAlertTriangle size={16} className="shrink-0" />
        No se pudieron cargar las cifras.
      </span>
      <button
        type="button"
        onClick={onReintentar}
        disabled={cargando}
        className="-my-2 inline-flex min-h-10 items-center gap-1 font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950 disabled:opacity-50"
      >
        <IconRefresh size={14} />
        Reintentar
      </button>
    </div>
  )
}
