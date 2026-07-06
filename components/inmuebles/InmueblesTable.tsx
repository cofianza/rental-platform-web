'use client'

/**
 * Tabla de Inmuebles - HP-174
 * Tabla responsive con paginación y ordenamiento
 */

import { useState } from 'react'
import {
  IconEdit,
  IconTrash,
  IconEye,
  IconEyeOff,
  IconChevronLeft,
  IconChevronRight,
  IconLoader,
  IconChevronUp,
  IconChevronDown,
  IconPlus,
  IconRefresh,
} from '@/components/icons'
import { EstadoBadge, TipoBadge, EstratoBadge } from './InmuebleBadges'
import { ITEMS_PER_PAGE_OPTIONS, INMUEBLE_MESSAGES } from './constants'
import type { IInmueble, IInmuebleFilters, IInmueblesMeta } from '@/types/inmueble'

/**
 * Toggle de visibilidad en vitrina - HP-369
 */
function VitrinaToggle({
  inmueble,
  onToggle,
}: {
  inmueble: IInmueble
  onToggle: (id: string, value: boolean) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const disabled = inmueble.estado !== 'disponible'

  const handleClick = async () => {
    if (disabled || loading) return
    setLoading(true)
    try {
      await onToggle(inmueble.id, !inmueble.visible_vitrina)
    } finally {
      setLoading(false)
    }
  }

  // Estado visual simplificado
  const isActive = inmueble.visible_vitrina && !disabled

  return (
    <div
      className="flex items-center gap-2"
      title={
        disabled
          ? 'Solo inmuebles disponibles pueden publicarse en la vitrina'
          : inmueble.visible_vitrina
            ? 'Visible en vitrina'
            : 'Oculto de vitrina'
      }
    >
      {disabled ? (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 text-gray-400 text-[11px]">
          <IconEyeOff size={13} />
          No disponible
        </span>
      ) : inmueble.visible_vitrina ? (
        <button
          onClick={handleClick}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-[11px] font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
        >
          {loading ? <IconLoader size={13} className="animate-spin" /> : <IconEye size={13} />}
          Publicado
        </button>
      ) : (
        <button
          onClick={handleClick}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-500 text-[11px] font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {loading ? <IconLoader size={13} className="animate-spin" /> : <IconEyeOff size={13} />}
          Oculto
        </button>
      )}
    </div>
  )
}

interface InmueblesTableProps {
  inmuebles: IInmueble[]
  meta: IInmueblesMeta | null
  filters: IInmuebleFilters
  onFilterChange: (filters: Partial<IInmuebleFilters>) => void
  onSort: (column: IInmuebleFilters['sortBy']) => void
  onView: (inmueble: IInmueble) => void
  onEdit: (inmueble: IInmueble) => void
  onDelete: (inmueble: IInmueble) => void
  isLoading?: boolean
  canEdit?: boolean
  canDelete?: boolean
  canCreate?: boolean
  isAdmin?: boolean
  onToggleVitrina?: (id: string, value: boolean) => Promise<void>
  error?: string | null
  onRetry?: () => void
  onCreateNew?: () => void
}

/**
 * Formatea valor en pesos colombianos
 */
function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Componente de encabezado ordenable
 */
function SortableHeader({
  label,
  column,
  currentSort,
  currentOrder,
  onSort,
}: {
  label: string
  column: IInmuebleFilters['sortBy']
  currentSort: string
  currentOrder: 'asc' | 'desc'
  onSort: (column: IInmuebleFilters['sortBy']) => void
}) {
  const isActive = currentSort === column
  const Icon = isActive && currentOrder === 'asc' ? IconChevronUp : IconChevronDown

  return (
    <button
      onClick={() => onSort(column)}
      className="group inline-flex items-center gap-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
    >
      {label}
      <Icon
        size={14}
        className={`transition-colors ${
          isActive ? 'text-primary-600' : 'text-gray-400 opacity-0 group-hover:opacity-100'
        }`}
      />
    </button>
  )
}

export function InmueblesTable({
  inmuebles,
  meta,
  filters,
  onFilterChange,
  onSort,
  onView,
  onEdit,
  onDelete,
  isLoading = false,
  canEdit = true,
  canDelete = false,
  canCreate = true,
  onToggleVitrina,
  error = null,
  onRetry,
  onCreateNew,
}: InmueblesTableProps) {
  const handlePageChange = (newPage: number) => {
    onFilterChange({ page: newPage })
  }

  const handleLimitChange = (newLimit: number) => {
    onFilterChange({ limit: newLimit, page: 1 })
  }

  // Estado de error
  if (error && !isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <IconRefresh size={18} />
            Reintentar
          </button>
        )}
      </div>
    )
  }

  // Estado vacío
  if (!isLoading && inmuebles.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500 mb-4">{INMUEBLE_MESSAGES.EMPTY_STATE}</p>
        {canCreate && onCreateNew && (
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <IconPlus size={18} />
            Nuevo Inmueble
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
      {/* Loading overlay */}
      {isLoading && inmuebles.length > 0 && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
          <IconLoader size={32} className="text-primary-600 animate-spin" />
        </div>
      )}

      {/* Vista Desktop - Tabla */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <SortableHeader
                  label="Código"
                  column="codigo"
                  currentSort={filters.sortBy}
                  currentOrder={filters.sortOrder}
                  onSort={onSort}
                />
              </th>
              <th className="px-4 py-3 text-left">
                <SortableHeader
                  label="Tipo"
                  column="tipo"
                  currentSort={filters.sortBy}
                  currentOrder={filters.sortOrder}
                  onSort={onSort}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dirección
              </th>
              <th className="px-4 py-3 text-left">
                <SortableHeader
                  label="Ciudad"
                  column="ciudad"
                  currentSort={filters.sortBy}
                  currentOrder={filters.sortOrder}
                  onSort={onSort}
                />
              </th>
              <th className="px-4 py-3 text-center">
                <SortableHeader
                  label="Estrato"
                  column="estrato"
                  currentSort={filters.sortBy}
                  currentOrder={filters.sortOrder}
                  onSort={onSort}
                />
              </th>
              <th className="px-4 py-3 text-right">
                <SortableHeader
                  label="Arriendo"
                  column="valor_arriendo"
                  currentSort={filters.sortBy}
                  currentOrder={filters.sortOrder}
                  onSort={onSort}
                />
              </th>
              <th className="px-4 py-3 text-center">
                <SortableHeader
                  label="Estado"
                  column="estado"
                  currentSort={filters.sortBy}
                  currentOrder={filters.sortOrder}
                  onSort={onSort}
                />
              </th>
              {onToggleVitrina && (
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vitrina
                </th>
              )}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inmuebles.map((inmueble) => (
              <tr
                key={inmueble.id}
                onClick={() => onView(inmueble)}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm font-medium text-primary-600">{inmueble.codigo}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <TipoBadge tipo={inmueble.tipo} />
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900 max-w-xs truncate" title={inmueble.direccion}>
                    {inmueble.direccion}
                  </div>
                  {inmueble.barrio && (
                    <div className="text-xs text-gray-500">{inmueble.barrio}</div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{inmueble.ciudad}</div>
                  <div className="text-xs text-gray-500">{inmueble.departamento}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <EstratoBadge estrato={inmueble.estrato} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {formatCOP(inmueble.valor_arriendo)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <EstadoBadge estado={inmueble.estado} />
                </td>
                {onToggleVitrina && (
                  <td
                    className="px-4 py-3 whitespace-nowrap text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-center">
                      <VitrinaToggle inmueble={inmueble} onToggle={onToggleVitrina} />
                    </div>
                  </td>
                )}
                <td
                  className="px-4 py-3 whitespace-nowrap text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onView(inmueble)}
                      className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      title="Ver detalle"
                    >
                      <IconEye size={18} />
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => onEdit(inmueble)}
                        className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="Editar inmueble"
                      >
                        <IconEdit size={18} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => onDelete(inmueble)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar inmueble"
                      >
                        <IconTrash size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista Mobile/Tablet - Cards */}
      <div className="lg:hidden divide-y divide-gray-200">
        {inmuebles.map((inmueble) => (
          <div
            key={inmueble.id}
            onClick={() => onView(inmueble)}
            className="p-4 space-y-3 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-primary-600">{inmueble.codigo}</span>
                  <EstadoBadge estado={inmueble.estado} />
                </div>
                <div className="text-sm text-gray-900 truncate">{inmueble.direccion}</div>
                <div className="text-xs text-gray-500">
                  {inmueble.ciudad}, {inmueble.departamento}
                </div>
              </div>
              <div
                className="flex items-center gap-1 ml-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => onView(inmueble)}
                  className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                >
                  <IconEye size={18} />
                </button>
                {canEdit && (
                  <button
                    onClick={() => onEdit(inmueble)}
                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  >
                    <IconEdit size={18} />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => onDelete(inmueble)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <IconTrash size={18} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <TipoBadge tipo={inmueble.tipo} />
              <EstratoBadge estrato={inmueble.estrato} />
              <span className="text-sm font-medium text-gray-900">
                {formatCOP(inmueble.valor_arriendo)}
              </span>
              {onToggleVitrina && (
                <VitrinaToggle inmueble={inmueble} onToggle={onToggleVitrina} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Paginación */}
      {meta && meta.totalPages > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Info */}
            <div className="text-sm text-gray-500">
              Mostrando {(meta.page - 1) * meta.limit + 1} -{' '}
              {Math.min(meta.page * meta.limit, meta.total)} de {meta.total} inmuebles
            </div>

            {/* Controles */}
            <div className="flex items-center gap-4">
              {/* Items por página */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Mostrar:</span>
                <select
                  value={filters.limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                >
                  {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* Navegación de páginas */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(meta.page - 1)}
                  disabled={meta.page <= 1}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <IconChevronLeft size={20} />
                </button>
                <span className="px-3 text-sm text-gray-700">
                  {meta.page} / {meta.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(meta.page + 1)}
                  disabled={meta.page >= meta.totalPages}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <IconChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
