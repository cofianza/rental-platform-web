/**
 * Pagina de listado global de estudios - HP-331
 * Listado con bandejas por estado, filtros, ordenamiento y paginacion
 */

'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui'
import { IconAlertTriangle, IconRefresh } from '@/components/icons'
import { useEstudiosList } from '@/hooks/useEstudiosList'
import { useAuthStore } from '@/stores/auth.store'
import {
  EstudiosBandejaTabs,
  EstudiosFilters,
  EstudiosTable,
  EstudiosSkeleton,
  ESTUDIO_UI_MESSAGES,
} from '@/components/estudios'
import { EstudiosInmobiliariaView } from '@/components/estudios/EstudiosInmobiliariaView'
import { EstudiosPropietarioView } from '@/components/estudios/EstudiosPropietarioView'

function EstudiosContent() {
  const router = useRouter()
  const userRol = useAuthStore((s) => s.user?.rol)
  const isInitialized = useAuthStore((s) => s.isInitialized)

  // El solicitante no debe entrar a este listado operativo — ve su estudio
  // en el detalle del expediente. Si llega por URL directa, lo redirigimos.
  useEffect(() => {
    if (!isInitialized) return
    if (userRol === 'solicitante') {
      router.replace('/dashboard')
    }
  }, [isInitialized, userRol, router])

  // La inmobiliaria ve la vista con el diseño del mockup 13_v2; admin/operador
  // conservan la bandeja/tabla operativa de siempre.
  if (userRol === 'inmobiliaria') {
    return (
      <div className="space-y-6">
        <PageHeader title="Estudios" subtitle="Inicia y consulta tus estudios de crédito" />
        <EstudiosInmobiliariaView />
      </div>
    )
  }

  // Propietario: "Evaluar candidato" (mockup 14) — mismo historial re-skineado,
  // sin saldo/paquetes; "Nuevo estudio" lleva al flujo real (expediente).
  if (userRol === 'propietario') {
    return (
      <div className="space-y-6">
        <PageHeader title="Evaluar candidato" subtitle="Envía a un prospecto a estudio crediticio y consulta tus evaluaciones." />
        <EstudiosPropietarioView />
      </div>
    )
  }

  return <EstudiosAdminView />
}

function EstudiosAdminView() {
  const {
    estudios,
    meta,
    filters,
    isLoading,
    error,
    activeBandeja,
    setActiveBandeja,
    setFilters,
    clearFilters,
    handleSort,
    hasActiveFilters,
    fetchEstudios,
  } = useEstudiosList()

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <IconAlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar estudios</h3>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button
          onClick={() => fetchEstudios()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <IconRefresh size={18} />
          {ESTUDIO_UI_MESSAGES.ERROR_RETRY}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estudios"
        subtitle={meta ? `${meta.total} estudios` : 'Cargando...'}
      />

      <EstudiosBandejaTabs
        activeBandeja={activeBandeja}
        meta={meta}
        onBandejaChange={setActiveBandeja}
      />

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <EstudiosFilters
          filters={filters}
          isLoading={isLoading}
          onFilterChange={setFilters}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters()}
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {isLoading ? (
          <EstudiosSkeleton count={filters.limit} />
        ) : (
          <EstudiosTable
            estudios={estudios}
            meta={meta}
            filters={filters}
            onSort={handleSort}
            onPageChange={(page) => setFilters({ page })}
            onLimitChange={(limit) => setFilters({ limit, page: 1 })}
            onClearFilters={hasActiveFilters() ? clearFilters : undefined}
          />
        )}
      </div>
    </div>
  )
}

export default function EstudiosPage() {
  return (
    <Suspense fallback={<EstudiosPageSkeleton />}>
      <EstudiosContent />
    </Suspense>
  )
}

function EstudiosPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-40 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse" />
          <div className="lg:w-44 h-10 bg-gray-200 rounded animate-pulse" />
          <div className="lg:w-44 h-10 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="flex-1 lg:w-40 h-10 bg-gray-200 rounded animate-pulse" />
            <div className="flex-1 lg:w-40 h-10 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <EstudiosSkeleton count={10} />
      </div>
    </div>
  )
}
