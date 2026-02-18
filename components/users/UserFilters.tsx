'use client'

/**
 * Filtros de Usuarios - HP-117
 * Barra de búsqueda y filtros
 */

import { IconSearch, IconX, IconPlus } from '@/components/icons'
import { ROLE_OPTIONS, STATUS_OPTIONS } from './constants'
import type { IUserFilters, UserRole } from '@/types/user'

interface UserFiltersProps {
  filters: IUserFilters
  onFilterChange: (filters: Partial<IUserFilters>) => void
  onClearFilters: () => void
  onCreateClick: () => void
  isLoading?: boolean
}

export function UserFilters({
  filters,
  onFilterChange,
  onClearFilters,
  onCreateClick,
  isLoading,
}: UserFiltersProps) {
  const hasActiveFilters = filters.search || filters.role || filters.is_active

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Barra de búsqueda */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <IconSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        {/* Filtros y acciones */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Select de Rol */}
          <select
            value={filters.role}
            onChange={(e) => onFilterChange({ role: e.target.value as UserRole | '' })}
            className="block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isLoading}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Select de Estado */}
          <select
            value={filters.is_active}
            onChange={(e) =>
              onFilterChange({ is_active: e.target.value as 'true' | 'false' | '' })
            }
            className="block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isLoading}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Limpiar filtros */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <IconX className="h-4 w-4" />
              <span className="hidden sm:inline">Limpiar</span>
            </button>
          )}

          {/* Botón Crear */}
          <button
            type="button"
            onClick={onCreateClick}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            disabled={isLoading}
          >
            <IconPlus className="h-4 w-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>
    </div>
  )
}
