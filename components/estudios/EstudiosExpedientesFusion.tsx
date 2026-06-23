/**
 * EstudiosExpedientesFusion — vista UNIFICADA de la inmobiliaria: UNA sola lista
 * de EXPEDIENTES con el estado de su estudio embebido (badge por fila), ya no dos
 * pestañas (Estudios|Expedientes). El expediente es el contenedor; el estudio es
 * un paso dentro de él (se ve en su badge y en el detalle del expediente).
 *
 * - Lista = expedientes (useExpedientes). El badge de estudio sale de
 *   `estudio_vigente`, que el RPC embebe (el más reciente por fecha).
 * - Los chips filtran EXPEDIENTES por el estado de su estudio vigente
 *   (server-side, vía filters.estudio_filtro → RPC p_estudio_filtro).
 * - Stat-cards y saldo/paquetes de estudios se conservan (datos reales).
 * - Clic en una fila → /expedientes/[id] (donde vive el estudio completo).
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { IconSearch, IconPlus, IconRefresh, IconAlertTriangle } from '@/components/icons'
import { useExpedientes } from '@/hooks/useExpedientes'
import { estudioService } from '@/services/estudioService'
import { creditosEstudiosService, type ISaldoCreditos } from '@/services/creditosEstudiosService'
import type { IEstudiosStats } from '@/types/estudio'
import type { EstudioFiltro } from '@/types/expediente'
import { ExpedientesFilters } from '@/components/expedientes/ExpedientesFilters'
import { ExpedientesTable } from '@/components/expedientes/ExpedientesTable'
import { ExpedientesSkeleton } from '@/components/expedientes/ExpedientesSkeleton'
import { AdquirirEstudiosCredito } from './AdquirirEstudiosCredito'

const CHIPS: { id: EstudioFiltro; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'aprobado', label: 'Aprobados' },
  { id: 'en_proceso', label: 'En proceso' },
  { id: 'rechazado', label: 'Rechazados' },
  { id: 'condicionado', label: 'Condicionados' },
  { id: 'sin_estudio', label: 'Sin estudio' },
]

export function EstudiosExpedientesFusion() {
  const router = useRouter()
  const {
    expedientes,
    meta,
    filters,
    analistas,
    isLoading,
    error,
    setFilters,
    clearFilters,
    handleSort,
    hasActiveFilters,
    fetchExpedientes,
  } = useExpedientes()

  const [stats, setStats] = useState<IEstudiosStats | null>(null)
  const [saldo, setSaldo] = useState<ISaldoCreditos | null>(null)

  useEffect(() => {
    estudioService.getStats().then(setStats).catch(() => {})
    creditosEstudiosService.getMiSaldo().then(setSaldo).catch(() => {})
  }, [])

  // Tasa de aprobación honesta: aprobados / decididos.
  const decididos = stats ? stats.aprobados + stats.rechazados + stats.condicionados : 0
  const tasa = decididos > 0 ? Math.round((stats!.aprobados / decididos) * 1000) / 10 : null
  const activeChip: EstudioFiltro = filters.estudio_filtro ?? 'todos'

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
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Encabezado: intro + saldo + nuevo expediente */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Estudios</h1>
          <p className="text-sm font-medium text-gray-500">
            Tus expedientes y el estado de su estudio de crédito, en un solo lugar.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary-600 bg-primary-50 px-3.5 py-1.5 text-sm font-bold text-primary-700">
            <IconSearch size={14} />
            {saldo ? saldo.saldo_total : '…'} estudios disponibles
          </span>
          <button
            onClick={() => router.push('/expedientes/nuevo')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-coral-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-coral-600"
          >
            <IconPlus size={16} />
            Nuevo expediente
          </button>
        </div>
      </div>

      {/* Stat cards (estudios de mis expedientes) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Este mes" value={stats?.este_mes ?? 0} sub="Estudios iniciados" />
        <StatCard
          label="Aprobados"
          value={stats?.aprobados ?? 0}
          color="text-primary-600"
          sub={tasa != null ? `${tasa}% tasa de aprobación` : 'Sin decisiones aún'}
        />
        <StatCard
          label="En proceso"
          value={stats?.en_proceso ?? 0}
          color="text-blue-600"
          sub="Esperando prospecto"
        />
        <StatCard
          label="Rechazados"
          value={stats?.rechazados ?? 0}
          color="text-red-500"
          sub={
            stats && stats.condicionados > 0
              ? `${stats.condicionados} condicionado${stats.condicionados === 1 ? '' : 's'}`
              : 'Sin condicionados'
          }
        />
      </div>

      {/* Chips: filtran EXPEDIENTES por el estado de su estudio vigente */}
      <div className="flex flex-wrap items-center gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilters({ estudio_filtro: c.id, page: 1 })}
            className={cn(
              'rounded-full border-[1.5px] px-3.5 py-1 text-xs font-bold transition-colors',
              activeChip === c.id
                ? 'border-primary-600 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-primary-600',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Filtros (búsqueda / responsable / fechas) */}
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

      {/* Lista de expedientes con badge de estudio embebido */}
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

      {/* Compra de paquetes de estudios */}
      <AdquirirEstudiosCredito />
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  color = 'text-gray-900',
}: {
  label: string
  value: number
  sub: string
  color?: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</div>
      <div className={cn('text-3xl font-black leading-none tracking-tight', color)}>{value}</div>
      <div className="mt-1 text-xs text-gray-500">{sub}</div>
    </div>
  )
}
