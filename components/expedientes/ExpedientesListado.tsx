/**
 * ExpedientesListado — listado con bandejas operativas, filtros y tabla.
 * Extraído de app/(dashboard)/expedientes/page.tsx para poder reutilizarlo
 * tanto en la página /expedientes como dentro de la pestaña unificada
 * "Estudios" (sub-pestaña Expedientes) sin duplicar la lógica.
 *
 * Usa useExpedientes (que escribe el querystring). NO montar simultáneamente
 * con otro listado que use el mismo querystring (ver EstudiosExpedientesTabs).
 */

'use client'

import { useRouter } from 'next/navigation'
import { PageHeader, ExportButton } from '@/components/ui'
import { IconPlus, IconRefresh, IconAlertTriangle } from '@/components/icons'
import { useExpedientes } from '@/hooks/useExpedientes'
import { useAuthStore } from '@/stores/auth.store'
import { BandejaTabs } from './BandejaTabs'
import { ExpedientesFilters } from './ExpedientesFilters'
import { ExpedientesTable } from './ExpedientesTable'
import { ExpedientesSkeleton } from './ExpedientesSkeleton'
import { EXPEDIENTE_UI_MESSAGES } from './constants'

export function ExpedientesListado() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  // El solicitante no crea expedientes — el flujo arranca con la cita previa
  // que dispara el propietario/inmobiliaria desde su panel. Ocultamos el CTA.
  const puedeCrearExpediente = user?.rol !== 'solicitante'
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
            {puedeCrearExpediente && (
              <button
                onClick={() => router.push('/expedientes/nuevo')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                <IconPlus size={18} />
                {EXPEDIENTE_UI_MESSAGES.NEW_EXPEDIENTE}
              </button>
            )}
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
