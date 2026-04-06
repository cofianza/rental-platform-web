/**
 * Página de listado de expedientes - HP-229 + Bandejas Operativas
 * Listado con bandejas por estado, filtros, ordenamiento y paginación del servidor
 */

'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader, ExportButton } from '@/components/ui'
import { IconPlus, IconRefresh, IconAlertTriangle } from '@/components/icons'
import { useExpedientes } from '@/hooks/useExpedientes'
import {
  BandejaTabs,
  ExpedientesFilters,
  ExpedientesTable,
  ExpedientesSkeleton,
  EXPEDIENTE_UI_MESSAGES,
} from '@/components/expedientes'

function ExpedientesContent() {
  const router = useRouter()
  const {
    expedientes,
    meta,
    stats,
    filters,
    analistas,
    isLoading,
    error,
    activeBandeja,
    misExpedientes,
    setActiveBandeja,
    toggleMisExpedientes,
    setFilters,
    clearFilters,
    handleSort,
    hasActiveFilters,
    fetchExpedientes,
  } = useExpedientes()

  // Estado de error
  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <IconAlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar expedientes</h3>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button
          onClick={() => fetchExpedientes()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <IconRefresh size={18} />
          {EXPEDIENTE_UI_MESSAGES.ERROR_RETRY}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Expedientes"
        subtitle={meta ? `${meta.total} expedientes` : 'Cargando...'}
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              endpoint="/export/expedientes"
              params={{
                ...(filters.search ? { search: filters.search } : {}),
                ...(filters.estado.length > 0 ? { estado: filters.estado.join(',') } : {}),
                ...(filters.analista_id ? { analista_id: filters.analista_id } : {}),
                ...(filters.fecha_desde ? { dateFrom: filters.fecha_desde } : {}),
                ...(filters.fecha_hasta ? { dateTo: filters.fecha_hasta } : {}),
              }}
              entityName="Expedientes"
            />
            <button
              onClick={() => router.push('/expedientes/nuevo')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              <IconPlus size={18} />
              {EXPEDIENTE_UI_MESSAGES.NEW_EXPEDIENTE}
            </button>
          </div>
        }
      />

      {/* Bandejas operativas: KPIs + Tabs + Toggle Mis Expedientes */}
      <BandejaTabs
        activeBandeja={activeBandeja}
        misExpedientes={misExpedientes}
        stats={stats}
        onBandejaChange={setActiveBandeja}
        onToggleMisExpedientes={toggleMisExpedientes}
      />

      {/* Filtros (sin chips de estado, ahora están en bandejas) */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <ExpedientesFilters
          filters={filters}
          analistas={analistas}
          isLoading={isLoading}
          onFilterChange={setFilters}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters()}
        />
      </div>

      {/* Tabla / Skeleton / Empty */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {isLoading ? (
          <ExpedientesSkeleton count={filters.limit} />
        ) : (
          <ExpedientesTable
            expedientes={expedientes}
            meta={meta}
            filters={filters}
            onSort={handleSort}
            onPageChange={(page) => setFilters({ page })}
            onLimitChange={(limit) => setFilters({ limit, page: 1 })}
          />
        )}
      </div>
    </div>
  )
}

export default function ExpedientesPage() {
  return (
    <Suspense fallback={<ExpedientesPageSkeleton />}>
      <ExpedientesContent />
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
