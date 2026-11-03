/**
 * Esqueleto de primera carga para los flujos públicos por enlace (autorizar,
 * coarrendatario, cargar documentos, pago, verificar identidad, visita…) y
 * para las pantallas de auth que validan un enlace antes de mostrarse.
 *
 * Mientras se valida el token y se traen los datos se pinta la forma de la
 * tarjeta que va a aparecer, a ancho completo en el celular, en lugar de un
 * spinner suelto en una pantalla en blanco.
 *
 * - `formulario`: encabezado + tarjeta con campos (etiqueta arriba) y botón.
 * - `resultado`: tarjeta centrada con ícono, título, texto y botón (pago,
 *   certificado, invitaciones).
 */

import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

interface EsqueletoFlujoProps {
  /** Texto para lectores de pantalla. */
  etiqueta?: string
  variante?: 'formulario' | 'resultado'
  /** Campos del formulario (variante `formulario`). */
  campos?: number
  /** Tarjetas de datos encima del formulario (variante `formulario`). */
  bloques?: number
  className?: string
}

export function EsqueletoFlujo({
  etiqueta = 'Cargando…',
  variante = 'formulario',
  campos = 3,
  bloques = 0,
  className,
}: EsqueletoFlujoProps) {
  if (variante === 'resultado') {
    return (
      <div role="status" aria-live="polite" className={cn('mx-auto w-full max-w-md', className)}>
        <span className="sr-only">{etiqueta}</span>
        <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <Skeleton className="mb-4 h-16 w-16 rounded-full" />
          <Skeleton className="h-6 w-2/3" />
          <div className="mt-4 w-full space-y-2">
            <Skeleton className="mx-auto h-4 w-full" />
            <Skeleton className="mx-auto h-4 w-4/5" />
          </div>
          <Skeleton className="mt-6 h-11 w-full rounded-lg sm:w-48" />
        </div>
      </div>
    )
  }

  return (
    <div role="status" aria-live="polite" className={cn('w-full space-y-6', className)}>
      <span className="sr-only">{etiqueta}</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-3/4 max-w-sm" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      {Array.from({ length: bloques }, (_, b) => (
        <div key={b} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <Skeleton className="h-5 w-40 max-w-full" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ))}
      {campos > 0 && (
        <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          {Array.from({ length: campos }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          ))}
          <Skeleton className="h-11 w-full rounded-lg sm:ml-auto sm:w-48" />
        </div>
      )}
    </div>
  )
}
