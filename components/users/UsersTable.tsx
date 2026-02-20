'use client'

/**
 * Tabla de Usuarios - HP-117
 * Tabla responsive con paginación
 */

import { IconEdit, IconUserCheck, IconUserX, IconChevronLeft, IconChevronRight, IconLoader } from '@/components/icons'
import { RoleBadge, StatusBadge } from './UserBadges'
import { ITEMS_PER_PAGE_OPTIONS, USER_MESSAGES } from './constants'
import type { IUserProfile, IUserFilters, IUsersMeta } from '@/types/user'

interface UsersTableProps {
  users: IUserProfile[]
  meta: IUsersMeta | null
  filters: IUserFilters
  onFilterChange: (filters: Partial<IUserFilters>) => void
  onEdit: (user: IUserProfile) => void
  onToggleStatus: (user: IUserProfile) => void
  isLoading?: boolean
}

export function UsersTable({
  users,
  meta,
  filters,
  onFilterChange,
  onEdit,
  onToggleStatus,
  isLoading = false,
}: UsersTableProps) {
  const handlePageChange = (newPage: number) => {
    onFilterChange({ page: newPage })
  }

  const handleLimitChange = (newLimit: number) => {
    onFilterChange({ limit: newLimit, page: 1 })
  }

  // Estado vacío
  if (!isLoading && users.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">{USER_MESSAGES.NO_RESULTS}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
          <IconLoader size={32} className="text-primary-600 animate-spin" />
        </div>
      )}

      {/* Vista Desktop - Tabla */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Registro
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {user.nombre && user.apellido
                        ? `${user.nombre} ${user.apellido}`
                        : user.nombre || user.apellido || 'Sin nombre'}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <RoleBadge role={user.rol} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge activo={user.estado === 'activo'} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(user)}
                      className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      title="Editar usuario"
                    >
                      <IconEdit size={18} />
                    </button>
                    <button
                      onClick={() => onToggleStatus(user)}
                      className={`p-1.5 rounded transition-colors ${
                        user.estado === 'activo'
                          ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                          : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                      }`}
                      title={user.estado === 'activo' ? 'Desactivar usuario' : 'Activar usuario'}
                    >
                      {user.estado === 'activo' ? <IconUserX size={18} /> : <IconUserCheck size={18} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista Mobile - Cards */}
      <div className="md:hidden divide-y divide-gray-200">
        {users.map((user) => (
          <div key={user.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {user.nombre && user.apellido
                    ? `${user.nombre} ${user.apellido}`
                    : user.nombre || user.apellido || 'Sin nombre'}
                </div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEdit(user)}
                  className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                >
                  <IconEdit size={18} />
                </button>
                <button
                  onClick={() => onToggleStatus(user)}
                  className={`p-1.5 rounded transition-colors ${
                    user.estado === 'activo'
                      ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                      : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                  }`}
                >
                  {user.estado === 'activo' ? <IconUserX size={18} /> : <IconUserCheck size={18} />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <RoleBadge role={user.rol} />
              <StatusBadge activo={user.estado === 'activo'} />
            </div>
            <div className="text-xs text-gray-500">
              Registrado:{' '}
              {new Date(user.created_at).toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
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
              {Math.min(meta.page * meta.limit, meta.total)} de {meta.total} usuarios
            </div>

            {/* Controles */}
            <div className="flex items-center gap-4">
              {/* Items por página */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Mostrar:</span>
                <select
                  value={filters.limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
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
