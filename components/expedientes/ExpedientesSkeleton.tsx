/**
 * ExpedientesSkeleton - HP-229
 * Skeleton loading para tabla y cards de expedientes
 */

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('bg-gray-200 animate-pulse rounded', className)} />
}

/**
 * Skeleton de fila de tabla para desktop
 */
function TableRowSkeleton() {
  return (
    <tr className="border-b border-gray-100">
      {/* Código */}
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-24" />
      </td>
      {/* Inmueble */}
      <td className="px-4 py-3">
        <div className="space-y-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </td>
      {/* Solicitante */}
      <td className="px-4 py-3">
        <div className="space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </td>
      {/* Estado */}
      <td className="px-4 py-3">
        <Skeleton className="h-6 w-24 rounded-full" />
      </td>
      {/* Responsable */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </td>
      {/* Fecha */}
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-20" />
      </td>
      {/* Acciones */}
      <td className="px-4 py-3">
        <Skeleton className="h-8 w-20 rounded" />
      </td>
    </tr>
  )
}

/**
 * Skeleton de card para mobile
 */
function CardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      {/* Header: código y estado */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      {/* Inmueble */}
      <div className="space-y-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>

      {/* Solicitante */}
      <div className="space-y-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>

      {/* Footer: responsable y fecha */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

/**
 * Skeleton de tabla completa (desktop)
 */
export function ExpedientesTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="hidden lg:block overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Código
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Inmueble
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Solicitante
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Responsable
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Fecha
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Skeleton de cards (mobile)
 */
export function ExpedientesCardsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="lg:hidden space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

/**
 * Skeleton completo responsive
 */
export function ExpedientesSkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      <ExpedientesTableSkeleton rows={count} />
      <ExpedientesCardsSkeleton count={count} />
    </>
  )
}
