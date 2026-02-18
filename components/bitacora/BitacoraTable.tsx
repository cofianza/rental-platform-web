'use client'

import { IconChevronLeft, IconChevronRight, IconLoader } from '@/components/icons'
import { ActionBadge } from './ActionBadge'
import { ITEMS_PER_PAGE_OPTIONS, ENTITY_LABELS, BITACORA_MESSAGES } from './constants'
import type { IAuditLog, IAuditLogFilters, IAuditLogsMeta } from '@/types/bitacora'

interface BitacoraTableProps {
  logs: IAuditLog[]
  meta: IAuditLogsMeta | null
  filters: IAuditLogFilters
  onFilterChange: (filters: Partial<IAuditLogFilters>) => void
  onViewDetail: (log: IAuditLog) => void
  isLoading?: boolean
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function BitacoraTable({
  logs,
  meta,
  filters,
  onFilterChange,
  onViewDetail,
  isLoading = false,
}: BitacoraTableProps) {
  const handlePageChange = (newPage: number) => {
    onFilterChange({ page: newPage })
  }

  const handleLimitChange = (newLimit: number) => {
    onFilterChange({ limit: newLimit, page: 1 })
  }

  if (!isLoading && logs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">{BITACORA_MESSAGES.NO_RESULTS}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
          <IconLoader size={32} className="text-primary-600 animate-spin" />
        </div>
      )}

      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha/Hora
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Accion
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entidad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr
                key={log.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onViewDetail(log)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDateTime(log.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.usuario_nombre || <span className="text-gray-400">Sistema</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <ActionBadge action={log.accion} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {ENTITY_LABELS[log.entidad] || log.entidad}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                  {log.ip || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden divide-y divide-gray-200">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-4 space-y-2 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => onViewDetail(log)}
          >
            <div className="flex items-start justify-between">
              <div className="text-sm font-medium text-gray-900">
                {log.usuario_nombre || 'Sistema'}
              </div>
              <ActionBadge action={log.accion} />
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{ENTITY_LABELS[log.entidad] || log.entidad}</span>
              {log.ip && <span className="font-mono">{log.ip}</span>}
            </div>
            <div className="text-xs text-gray-400">{formatDateTime(log.created_at)}</div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-500">
              Mostrando {(meta.page - 1) * meta.size + 1} -{' '}
              {Math.min(meta.page * meta.size, meta.total)} de {meta.total} registros
            </div>

            <div className="flex items-center gap-4">
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
