/**
 * Esqueletos de carga compartidos.
 *
 * Regla de carga del sistema:
 * - Primera carga de una página, lista o detalle: esqueleto con la forma del
 *   contenido (estos componentes), nunca un spinner a pantalla completa.
 * - Recarga, filtro o paginación con datos ya en pantalla: se dejan los datos
 *   y se marca la recarga (opacidad o un spinner pequeño), sin borrar la lista.
 * - Acciones (guardar, enviar, descargar): spinner dentro del botón que las
 *   dispara, con el botón deshabilitado.
 */

import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded bg-gray-200', className)} />
}

/** Anuncia la carga a lectores de pantalla; el contenido visual va dentro. */
function Cargando({ etiqueta, className, children }: { etiqueta: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{etiqueta}</span>
      {children}
    </div>
  )
}

/** Párrafo: líneas de ancho decreciente. */
export function SkeletonText({ lineas = 3, className }: { lineas?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lineas }, (_, i) => (
        <Skeleton key={i} className={cn('h-4', i === lineas - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

/**
 * Lista o tabla: en escritorio filas con columnas; en el celular, tarjetas,
 * que es como se ven las listas a ese ancho.
 */
export function SkeletonTable({
  filas = 6,
  columnas = 5,
  etiqueta = 'Cargando…',
  className,
}: {
  filas?: number
  columnas?: number
  etiqueta?: string
  className?: string
}) {
  return (
    <Cargando etiqueta={etiqueta} className={cn('rounded-xl border border-gray-200 bg-white', className)}>
      <div className="hidden md:block">
        <div className="flex gap-4 border-b border-gray-100 px-4 py-3">
          {Array.from({ length: columnas }, (_, c) => (
            <Skeleton key={c} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: filas }, (_, f) => (
          <div key={f} className="flex items-center gap-4 border-b border-gray-50 px-4 py-4 last:border-0">
            {Array.from({ length: columnas }, (_, c) => (
              <Skeleton key={c} className={cn('h-4 flex-1', c === 0 && 'max-w-[8rem]')} />
            ))}
          </div>
        ))}
      </div>
      <div className="divide-y divide-gray-100 md:hidden">
        {Array.from({ length: Math.min(filas, 4) }, (_, f) => (
          <div key={f} className="space-y-2 p-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </Cargando>
  )
}

/** Tarjetas en grilla (KPIs, inmuebles, resúmenes). */
export function SkeletonCards({
  cantidad = 3,
  etiqueta = 'Cargando…',
  className,
}: {
  cantidad?: number
  etiqueta?: string
  className?: string
}) {
  return (
    <Cargando etiqueta={etiqueta} className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </Cargando>
  )
}

/** Detalle: encabezado y bloques de datos. */
export function SkeletonDetail({ bloques = 2, etiqueta = 'Cargando…', className }: { bloques?: number; etiqueta?: string; className?: string }) {
  return (
    <Cargando etiqueta={etiqueta} className={cn('space-y-6', className)}>
      <div className="space-y-2">
        <Skeleton className="h-7 w-2/3 max-w-xs" />
        <Skeleton className="h-4 w-1/2 max-w-sm" />
      </div>
      {Array.from({ length: bloques }, (_, b) => (
        <div key={b} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </Cargando>
  )
}

/** Página de lista completa: encabezado, filtros y tabla. Para loading.tsx y cargas iniciales. */
export function SkeletonPage({ etiqueta = 'Cargando…' }: { etiqueta?: string }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <SkeletonTable etiqueta={etiqueta} />
    </div>
  )
}
