'use client'

import { Suspense } from 'react'
import { PageHeader } from '@/components/ui'
import { IconLoader } from '@/components/icons'
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
    viewDetail,
    clearSelectedLog,
  } = useBitacora()

  const isAdmin = user?.rol === 'administrador'

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Bitacora" subtitle="Registro de actividad del sistema" />
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-red-600 mb-2">Acceso Denegado</div>
          <p className="text-gray-500">
            Solo los administradores pueden acceder a esta seccion.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bitacora"
        subtitle={meta ? `${meta.total} registros de actividad` : 'Cargando...'}
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <BitacoraFilters
        filters={filters}
        onFilterChange={setFilters}
        onClearFilters={clearFilters}
        isLoading={isLoading}
      />

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

      <BitacoraDetailModal log={selectedLog} onClose={clearSelectedLog} />
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="space-y-6">
      <PageHeader title="Bitacora" subtitle="Cargando..." />
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
