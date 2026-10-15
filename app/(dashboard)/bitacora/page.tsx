'use client'

import { Suspense } from 'react'
import { PageHeader } from '@/components/ui'
import { IconLoader, IconRefresh } from '@/components/icons'
import { BitacoraFilters } from '@/components/bitacora/BitacoraFilters'
import { BitacoraTable } from '@/components/bitacora/BitacoraTable'
import { BitacoraDetailModal } from '@/components/bitacora/BitacoraDetailModal'
import { useBitacora } from '@/hooks/useBitacora'
import { useAuth } from '@/hooks/useAuth'

function BitacoraContent() {
  const { user } = useAuth()
  const {
    logs,
    meta,
    filters,
    isLoading,
    error,
    selectedLog,
    setFilters,
    clearFilters,
    fetchLogs,
    viewDetail,
    clearSelectedLog,
  } = useBitacora()

  const isAdmin = user?.rol === 'administrador'

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Bitácora" subtitle="Registro de actividad del sistema" />
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-red-600 mb-2">Acceso Denegado</div>
          <p className="text-gray-500">
            Solo los administradores pueden acceder a esta sección.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bitácora"
        subtitle={meta ? `${meta.total} registros de actividad` : error ? '—' : 'Cargando...'}
      />

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span className="flex-1">No se pudo cargar la bitácora: {error}</span>
          <button type="button" onClick={fetchLogs} disabled={isLoading} className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100">
            <IconRefresh size={14} />
            Reintentar
          </button>
        </div>
      )}

      <BitacoraFilters
        filters={filters}
        onFilterChange={setFilters}
        onClearFilters={clearFilters}
        isLoading={isLoading}
      />

      {/* Sin registros por un fallo no es «no se encontraron registros». */}
      {!(error && logs.length === 0) && (
      <div className="relative">
        <BitacoraTable
          logs={logs}
          meta={meta}
          filters={filters}
          onFilterChange={setFilters}
          onViewDetail={viewDetail}
          isLoading={isLoading}
        />
      </div>
      )}

      <BitacoraDetailModal log={selectedLog} onClose={clearSelectedLog} />
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="space-y-6">
      <PageHeader title="Bitácora" subtitle="Cargando..." />
      <div className="flex items-center justify-center h-64">
        <IconLoader size={32} className="text-primary-600 animate-spin" />
      </div>
    </div>
  )
}

export default function BitacoraPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BitacoraContent />
    </Suspense>
  )
}
