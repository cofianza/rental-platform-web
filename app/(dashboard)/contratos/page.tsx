'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { IconAlertTriangle, IconSettings } from '@/components/icons'
import { PageHeader } from '@/components/ui/PageHeader'
import { useContratos } from '@/hooks/useContratos'
import { useAuthStore } from '@/stores/auth.store'
import { ContratosFilters, ContratosTable, ContratosPageSkeleton } from '@/components/contratos'
import { contratoService, type IContratosStats } from '@/services/contratoService'

function ContratosContent() {
  const user = useAuthStore((s) => s.user)
  // Propietario e inmobiliaria editan en /configuracion/datos-contrato los
  // datos que salen en sus contratos generados (domicilio, cuenta de recaudo,
  // logo, etc.). Atajo desde la pantalla donde naturalmente miran sus contratos.
  const canEditDatosContrato = user?.rol === 'propietario' || user?.rol === 'inmobiliaria'

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

  // KPI cards (Mario 12-may-2026: Pendientes de generar / En proceso de
  // firma / Activos). Se refresca al cambiar la lista de contratos para
  // que los contadores no queden desactualizados luego de generar/firmar.
  const [stats, setStats] = useState<IContratosStats | null>(null)
  useEffect(() => {
    contratoService
      .getStats()
      .then(setStats)
      .catch(() => setStats(null))
  }, [contratos.length])

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
        actions={
          canEditDatosContrato ? (
            <Link
              href="/configuracion/datos-contrato"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <IconSettings size={16} />
              Datos para contrato
            </Link>
          ) : undefined
        }
      />

      {/* KPI cards de la nueva propuesta UI (Mario 12-may-2026):
          Pendientes de generar (coral) / En proceso de firma (azul) /
          Activos (verde). */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPIMini
          label="Pendientes de generar"
          value={stats?.pendientes_generar ?? 0}
          color="bg-coral-500"
        />
        <KPIMini
          label="En proceso de firma"
          value={stats?.en_proceso_firma ?? 0}
          color="bg-blue-500"
        />
        <KPIMini
          label="Activos"
          value={stats?.activos ?? 0}
          color="bg-primary-600"
        />
      </div>

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

// KPI card pequeno reutilizado para los stats arriba del listado.
function KPIMini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 relative overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${color}`} />
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
