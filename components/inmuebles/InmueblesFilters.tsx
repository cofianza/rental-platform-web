'use client'

/**
 * Filtros de Inmuebles - HP-174
 * Panel de filtros con búsqueda, tipo, ciudad, estado, estrato y rango de arriendo
 */

import { IconSearch, IconPlus, IconX, IconLoader } from '@/components/icons'
import { TIPO_OPTIONS, ESTADO_OPTIONS, ESTRATO_OPTIONS } from './constants'
import type { IInmuebleFilters, IFilterOptions } from '@/types/inmueble'

interface InmueblesFiltersProps {
  filters: IInmuebleFilters
  filterOptions: IFilterOptions | null
  onFilterChange: (filters: Partial<IInmuebleFilters>) => void
  onClearFilters: () => void
  onCreateClick: () => void
  isLoading?: boolean
  canCreate?: boolean
}

export function InmueblesFilters({
  filters,
  filterOptions,
  onFilterChange,
  onClearFilters,
  onCreateClick,
  isLoading = false,
  canCreate = true,
}: InmueblesFiltersProps) {
  // Verificar si hay filtros activos
  const hasActiveFilters =
    filters.search ||
    filters.tipo ||
    filters.ciudad ||
    filters.estado ||
    filters.estrato !== '' ||
    filters.rent_min !== '' ||
    filters.rent_max !== ''

  // Ciudades disponibles (del backend o de filterOptions)
  const ciudadOptions = filterOptions?.ciudades || []

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
      {/* Primera fila: Búsqueda y botón crear */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Búsqueda */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isLoading ? (
              <IconLoader size={18} className="text-gray-400 animate-spin" />
            ) : (
              <IconSearch size={18} className="text-gray-400" />
            )}
          </div>
          <input
            type="text"
            placeholder="Buscar por código, dirección..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Botón crear */}
        {canCreate && (
          <button
            onClick={onCreateClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            <IconPlus size={18} />
            Nuevo Inmueble
          </button>
        )}
      </div>

      {/* Segunda fila: Filtros */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Tipo */}
        <select
          value={filters.tipo}
          onChange={(e) => onFilterChange({ tipo: e.target.value as IInmuebleFilters['tipo'] })}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 bg-white"
        >
          {TIPO_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Ciudad */}
        <select
          value={filters.ciudad}
          onChange={(e) => onFilterChange({ ciudad: e.target.value })}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">Todas las ciudades</option>
          {ciudadOptions.map((ciudad) => (
            <option key={ciudad} value={ciudad}>
              {ciudad}
            </option>
          ))}
        </select>

        {/* Estado */}
        <select
          value={filters.estado}
          onChange={(e) => onFilterChange({ estado: e.target.value as IInmuebleFilters['estado'] })}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 bg-white"
        >
          {ESTADO_OPTIONS.filter(opt => opt.value !== 'inactivo').map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Estrato */}
        <select
          value={filters.estrato}
          onChange={(e) => {
            const value = e.target.value
            onFilterChange({ estrato: value === '' ? '' : parseInt(value, 10) })
          }}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 bg-white"
        >
          {ESTRATO_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Limpiar filtros */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <IconX size={16} />
            Limpiar
          </button>
        )}
      </div>

      {/* Tercera fila: Rango de arriendo (opcional, colapsable) */}
      <details className="group">
        <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900 list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform">▶</span>
          Filtros avanzados
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Rango de arriendo mínimo */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Arriendo mínimo</label>
            <input
              type="number"
              placeholder="$ Mínimo"
              value={filters.rent_min}
              onChange={(e) => {
                const value = e.target.value
                onFilterChange({ rent_min: value === '' ? '' : parseInt(value, 10) })
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Rango de arriendo máximo */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Arriendo máximo</label>
            <input
              type="number"
              placeholder="$ Máximo"
              value={filters.rent_max}
              onChange={(e) => {
                const value = e.target.value
                onFilterChange({ rent_max: value === '' ? '' : parseInt(value, 10) })
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </details>
    </div>
  )
}
