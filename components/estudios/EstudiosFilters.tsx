/**
 * EstudiosFilters - HP-331
 * Panel de filtros para listado global de estudios
 */

'use client'

import { IconSearch, IconX, IconLoader, IconCalendar } from '@/components/icons'
import { ESTUDIO_UI_MESSAGES, PROVEEDOR_LABELS } from './constants'
import type { IEstudioFilters } from '@/types/estudio'

export interface EstudiosFiltersProps {
  filters: IEstudioFilters
  isLoading: boolean
  onFilterChange: (filters: Partial<IEstudioFilters>) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function EstudiosFilters({
  filters,
  isLoading,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: EstudiosFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isLoading ? (
              <IconLoader size={18} className="text-gray-400 animate-spin" />
            ) : (
              <IconSearch size={18} className="text-gray-400" />
            )}
          </div>
          <input
            type="text"
            placeholder={ESTUDIO_UI_MESSAGES.SEARCH_PLACEHOLDER}
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: '' })}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <IconX size={16} />
            </button>
          )}
        </div>

        {/* Resultado */}
        <div className="lg:w-44">
          <select
            value={filters.resultado}
            onChange={(e) => onFilterChange({ resultado: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            <option value="">Todos los resultados</option>
            <option value="aprobado">Aprobado</option>
            <option value="rechazado">Rechazado</option>
            <option value="condicionado">Condicionado</option>
            <option value="pendiente">Pendiente</option>
          </select>
        </div>

        {/* Proveedor */}
        <div className="lg:w-44">
          <select
            value={filters.proveedor}
            onChange={(e) => onFilterChange({ proveedor: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            <option value="">Todos los proveedores</option>
            {Object.entries(PROVEEDOR_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div className="flex gap-2 lg:w-auto">
          <div className="relative flex-1 lg:w-40">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IconCalendar size={16} className="text-gray-400" />
            </div>
            <input
              type="date"
              value={filters.fecha_desde}
              onChange={(e) => onFilterChange({ fecha_desde: e.target.value })}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="relative flex-1 lg:w-40">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IconCalendar size={16} className="text-gray-400" />
            </div>
            <input
              type="date"
              value={filters.fecha_hasta}
              onChange={(e) => onFilterChange({ fecha_hasta: e.target.value })}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Clear filters button */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
          >
            <IconX size={14} />
            {ESTUDIO_UI_MESSAGES.CLEAR_FILTERS}
          </button>
        </div>
      )}
    </div>
  )
}
