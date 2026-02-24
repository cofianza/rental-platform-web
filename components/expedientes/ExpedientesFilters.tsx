/**
 * ExpedientesFilters - HP-229
 * Panel de filtros para listado de expedientes
 */

'use client'

import { IconSearch, IconX, IconLoader, IconCalendar } from '@/components/icons'
import { EXPEDIENTE_UI_MESSAGES } from './constants'
import type { IExpedienteFilters, IAnalistaOption } from '@/types/expediente'

export interface ExpedientesFiltersProps {
  filters: IExpedienteFilters
  analistas: IAnalistaOption[]
  isLoading: boolean
  onFilterChange: (filters: Partial<IExpedienteFilters>) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function ExpedientesFilters({
  filters,
  analistas,
  isLoading,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: ExpedientesFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Búsqueda y filtros principales */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Campo de búsqueda */}
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
            placeholder={EXPEDIENTE_UI_MESSAGES.SEARCH_PLACEHOLDER}
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

        {/* Filtro de responsable */}
        <div className="lg:w-56">
          <select
            value={filters.analista_id}
            onChange={(e) => onFilterChange({ analista_id: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            <option value="">Todos los responsables</option>
            {analistas.map((analista) => (
              <option key={analista.id} value={analista.id}>
                {analista.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de fechas */}
        <div className="flex gap-2 lg:w-auto">
          <div className="relative flex-1 lg:w-40">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IconCalendar size={16} className="text-gray-400" />
            </div>
            <input
              type="date"
              value={filters.fecha_desde}
              onChange={(e) => onFilterChange({ fecha_desde: e.target.value })}
              placeholder="Desde"
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
              placeholder="Hasta"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Botón limpiar filtros */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
          >
            <IconX size={14} />
            {EXPEDIENTE_UI_MESSAGES.CLEAR_FILTERS}
          </button>
        </div>
      )}
    </div>
  )
}
