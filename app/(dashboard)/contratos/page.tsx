'use client'

import { Suspense } from 'react'
import { IconAlertTriangle } from '@/components/icons'
import { PageHeader } from '@/components/ui/PageHeader'
import { useContratos } from '@/hooks/useContratos'
import { ContratosFilters, ContratosTable, ContratosPageSkeleton } from '@/components/contratos'

function ContratosContent() {
  const {
    contratos,
    meta,
    filters,
    isLoading,
    error,
    setFilters,
    clearFilters,
    hasActiveFilters,
    refetch,
  } = useContratos()

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <IconAlertTriangle size={48} className="text-red-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">Error al cargar contratos</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos"
        subtitle={`${meta.total} contrato${meta.total !== 1 ? 's' : ''}`}
      />

      <ContratosFilters
        filters={filters}
        isLoading={isLoading}
        onFilterChange={setFilters}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {isLoading ? (
        <div className="space-y-4">
          <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Archivo', 'Expediente', 'Inmueble', 'Estado', 'Version', 'Fecha', 'Acciones'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-4 w-40 bg-gray-200 animate-pulse rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-200 animate-pulse rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-200 animate-pulse rounded" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-24 bg-gray-200 animate-pulse rounded-full" /></td>
                    <td className="px-6 py-4"><div className="h-5 w-12 bg-gray-200 animate-pulse rounded-full" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 animate-pulse rounded" /></td>
                    <td className="px-6 py-4"><div className="h-8 w-20 bg-gray-200 animate-pulse rounded float-right" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <ContratosTable
          contratos={contratos}
          meta={meta}
          filters={filters}
          onPageChange={(page) => setFilters({ page })}
          onRefetch={refetch}
        />
      )}
    </div>
  )
}

export default function ContratosPage() {
  return (
    <Suspense fallback={<ContratosPageSkeleton />}>
      <ContratosContent />
    </Suspense>
  )
}
