'use client'

import { IconSearch, IconLoader, IconX, IconCalendar } from '@/components/icons'
import { ESTADOS_CONTRATO, type EstadoContratoKey } from '@/lib/constants'
import type { IContratoListFilters } from '@/types/contrato'

interface ContratosFiltersProps {
  filters: IContratoListFilters
  isLoading: boolean
  onFilterChange: (filters: Partial<IContratoListFilters>) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

const ESTADO_OPTIONS = Object.entries(ESTADOS_CONTRATO).map(([key, config]) => ({
  value: key,
  label: config.label,
}))

export function ContratosFilters({
  filters,
  isLoading,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: ContratosFiltersProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Search */}
      <div className="relative flex-1 min-w-0">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
            <IconLoader size={16} className="animate-spin text-gray-400" />
          ) : (
            <IconSearch size={16} className="text-gray-400" />
          )}
        </div>
        <input
          type="text"
          value={filters.search || ''}
          onChange={(e) => onFilterChange({ search: e.target.value || undefined })}
          placeholder="Buscar por nombre de archivo..."
          className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {filters.search && (
          <button
            onClick={() => onFilterChange({ search: undefined })}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <IconX size={14} className="text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Estado select */}
      <select
        value={filters.estado || ''}
        onChange={(e) => onFilterChange({ estado: e.target.value || undefined })}
        className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent min-w-[180px]"
      >
        <option value="">Todos los estados</option>
        {ESTADO_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Fecha desde */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <IconCalendar size={16} className="text-gray-400" />
        </div>
        <input
          type="date"
          value={filters.fecha_desde || ''}
          onChange={(e) => onFilterChange({ fecha_desde: e.target.value || undefined })}
          className="pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Desde"
        />
      </div>

      {/* Fecha hasta */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <IconCalendar size={16} className="text-gray-400" />
        </div>
        <input
          type="date"
          value={filters.fecha_hasta || ''}
          onChange={(e) => onFilterChange({ fecha_hasta: e.target.value || undefined })}
          className="pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Hasta"
        />
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors whitespace-nowrap"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
