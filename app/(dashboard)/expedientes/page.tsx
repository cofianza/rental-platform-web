/**
 * Página de listado de expedientes - HP-229 + Bandejas Operativas
 * Listado con bandejas por estado, filtros, ordenamiento y paginación del servidor
 */

'use client'

import { Suspense } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { ExpedientesListado, ExpedientesSkeleton } from '@/components/expedientes'
import { EstudiosExpedientesFusion } from '@/components/estudios/EstudiosExpedientesFusion'

function ExpedientesPageContent() {
  const rol = useAuthStore((s) => s.user?.rol)
  // La inmobiliaria ve la vista fusionada (expedientes + estudio embebido),
  // igual que en /estudios. El resto de roles ve el listado estándar.
  if (rol === 'inmobiliaria') return <EstudiosExpedientesFusion />
  return <ExpedientesListado />
}

export default function ExpedientesPage() {
  return (
    <Suspense fallback={<ExpedientesPageSkeleton />}>
      <ExpedientesPageContent />
    </Suspense>
  )
}

/**
 * Skeleton de página completa
 */
function ExpedientesPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-40 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Bandeja tabs skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse" />
          <div className="lg:w-56 h-10 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="flex-1 lg:w-40 h-10 bg-gray-200 rounded animate-pulse" />
            <div className="flex-1 lg:w-40 h-10 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <ExpedientesSkeleton count={10} />
      </div>
    </div>
  )
}
