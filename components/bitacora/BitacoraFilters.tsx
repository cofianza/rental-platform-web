'use client'

import { useEffect, useState } from 'react'
import { IconX } from '@/components/icons'
import { ACTION_OPTIONS, ENTITY_OPTIONS } from './constants'
import { userService } from '@/services/userService'
import type { IAuditLogFilters } from '@/types/bitacora'

interface UserOption {
  value: string
  label: string
}

interface BitacoraFiltersProps {
  filters: IAuditLogFilters
  onFilterChange: (filters: Partial<IAuditLogFilters>) => void
  onClearFilters: () => void
  isLoading?: boolean
}

export function BitacoraFilters({
  filters,
  onFilterChange,
  onClearFilters,
  isLoading,
}: BitacoraFiltersProps) {
  const [userOptions, setUserOptions] = useState<UserOption[]>([])

  useEffect(() => {
    userService
      .getUsers({ limit: 100 })
      .then((res) => {
        const options = res.data.map((u) => ({
          value: u.id,
          label: `${u.nombre} ${u.apellido}`,
        }))
        setUserOptions(options)
      })
      .catch(() => {
        // silently fail - filter just won't have user options
      })
  }, [])

  const hasActiveFilters =
    filters.action || filters.entityType || filters.dateFrom || filters.dateTo || filters.userId

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:flex-wrap">
        {/* Usuario */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Usuario</label>
          <select
            value={filters.userId}
            onChange={(e) => onFilterChange({ userId: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isLoading}
          >
            <option value="">Todos los usuarios</option>
            {userOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Accion */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Accion</label>
          <select
            value={filters.action}
            onChange={(e) => onFilterChange({ action: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isLoading}
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Entidad */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Entidad</label>
          <select
            value={filters.entityType}
            onChange={(e) => onFilterChange({ entityType: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isLoading}
          >
            {ENTITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Fecha desde */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFilterChange({ dateFrom: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        {/* Fecha hasta */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFilterChange({ dateTo: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>

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
      </div>
    </div>
  )
}
