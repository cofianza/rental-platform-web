/**
 * EstudiosTable - HP-331
 * Tabla responsive de estudios con score bar visual, badges y paginacion
 */

'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { ITEMS_PER_PAGE_OPTIONS, SORTABLE_COLUMNS, PROVEEDOR_LABELS, ESTUDIO_UI_MESSAGES } from './constants'
import { formatDate } from '@/lib/constants'
import {
  IconChevronUp,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconShield,
  IconExternalLink,
} from '@/components/icons'
import { cn } from '@/lib/utils'
import type { IEstudioListItem, IEstudioFilters, IEstudiosMeta } from '@/types/estudio'
import { EstudioDetailModal } from '@/components/expedientes/EstudioDetailModal'
import { estudioService } from '@/services/estudioService'
import type { IEstudio } from '@/types/estudio'

// ============================================
// Score Bar component
// ============================================

function ScoreBar({ score }: { score?: number | null }) {
  if (score == null) return <span className="text-sm text-gray-400">-</span>

  const pct = Math.min(100, Math.max(0, (score / 999) * 100))

  let barColor: string
  let textColor: string
  if (score <= 300) {
    barColor = 'bg-red-500'
    textColor = 'text-red-700'
  } else if (score <= 600) {
    barColor = 'bg-yellow-500'
    textColor = 'text-yellow-700'
  } else {
    barColor = 'bg-green-500'
    textColor = 'text-green-700'
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn('text-xs font-semibold tabular-nums', textColor)}>{score}</span>
    </div>
  )
}

// ============================================
// Sortable header
// ============================================

interface SortableHeaderProps {
  column: IEstudioFilters['sortBy']
  label: string
  currentSortBy: IEstudioFilters['sortBy']
  currentSortOrder: 'asc' | 'desc'
  onSort: (column: IEstudioFilters['sortBy']) => void
}

function SortableHeader({ column, label, currentSortBy, currentSortOrder, onSort }: SortableHeaderProps) {
  const isActive = currentSortBy === column

  return (
    <button onClick={() => onSort(column)} className="flex items-center gap-1 group text-left">
      <span>{label}</span>
      <span className={cn('transition-opacity', isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50')}>
        {isActive && currentSortOrder === 'asc' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
      </span>
    </button>
  )
}

// ============================================
// Helper
// ============================================

function getSolicitanteName(estudio: IEstudioListItem): string {
  const sol = estudio.expedientes?.solicitantes
  if (sol) return `${sol.nombre} ${sol.apellido}`.trim()
  return 'Sin solicitante'
}

function getExpedienteNumero(estudio: IEstudioListItem): string {
  return estudio.expedientes?.numero || '-'
}

// ============================================
// Table
// ============================================

export interface EstudiosTableProps {
  estudios: IEstudioListItem[]
  meta: IEstudiosMeta | null
  filters: IEstudioFilters
  onSort: (column: IEstudioFilters['sortBy']) => void
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  onClearFilters?: () => void
}

export function EstudiosTable({
  estudios,
  meta,
  filters,
  onSort,
  onPageChange,
  onLimitChange,
  onClearFilters,
}: EstudiosTableProps) {
  const [selectedEstudio, setSelectedEstudio] = useState<IEstudio | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const handleRowClick = async (estudioId: string) => {
    setLoadingDetail(true)
    try {
      const detail = await estudioService.getEstudioById(estudioId)
      setSelectedEstudio(detail)
    } catch {
      // silent fail, user can try again
    } finally {
      setLoadingDetail(false)
    }
  }

  // Empty state
  if (estudios.length === 0) {
    return (
      <div className="text-center py-12">
        <IconShield size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {ESTUDIO_UI_MESSAGES.EMPTY_STATE}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {ESTUDIO_UI_MESSAGES.EMPTY_STATE_FILTERED}
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100"
          >
            {ESTUDIO_UI_MESSAGES.CLEAR_FILTERS}
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Solicitante
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Proveedor
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <SortableHeader
                  column="estado"
                  label={SORTABLE_COLUMNS.estado.label}
                  currentSortBy={filters.sortBy}
                  currentSortOrder={filters.sortOrder}
                  onSort={onSort}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <SortableHeader
                  column="resultado"
                  label={SORTABLE_COLUMNS.resultado.label}
                  currentSortBy={filters.sortBy}
                  currentSortOrder={filters.sortOrder}
                  onSort={onSort}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                <SortableHeader
                  column="score"
                  label={SORTABLE_COLUMNS.score.label}
                  currentSortBy={filters.sortBy}
                  currentSortOrder={filters.sortOrder}
                  onSort={onSort}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <SortableHeader
                  column="created_at"
                  label={SORTABLE_COLUMNS.created_at.label}
                  currentSortBy={filters.sortBy}
                  currentSortOrder={filters.sortOrder}
                  onSort={onSort}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {estudios.map((estudio) => (
              <tr
                key={estudio.id}
                onClick={() => handleRowClick(estudio.id)}
                className={cn(
                  'hover:bg-gray-50 cursor-pointer transition-colors',
                  loadingDetail && 'pointer-events-none opacity-60'
                )}
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                      {getSolicitanteName(estudio)}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {getExpedienteNumero(estudio)}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-700 capitalize">
                    {estudio.tipo === 'con_coarrendatario' ? 'Co-arrendatario' : 'Individual'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-700">
                    {PROVEEDOR_LABELS[estudio.proveedor] || estudio.proveedor}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge estado={estudio.estado} />
                </td>
                <td className="px-4 py-3">
                  <Badge estado={estudio.resultado} />
                </td>
                <td className="px-4 py-3">
                  <ScoreBar score={estudio.score} />
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500">
                    {formatDate(estudio.created_at)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRowClick(estudio.id)
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
                  >
                    <IconExternalLink size={14} />
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {estudios.map((estudio) => (
          <div
            key={estudio.id}
            onClick={() => handleRowClick(estudio.id)}
            className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-primary-300 hover:shadow-sm transition-all"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-900">
                {getSolicitanteName(estudio)}
              </span>
              <Badge estado={estudio.estado} />
            </div>

            {/* Info row */}
            <div className="flex items-center gap-3 mb-2 text-xs text-gray-500">
              <span className="font-mono">{getExpedienteNumero(estudio)}</span>
              <span>{PROVEEDOR_LABELS[estudio.proveedor] || estudio.proveedor}</span>
              <span className="capitalize">
                {estudio.tipo === 'con_coarrendatario' ? 'Co-arr.' : 'Individual'}
              </span>
            </div>

            {/* Score bar */}
            {estudio.score != null && (
              <div className="mb-3">
                <ScoreBar score={estudio.score} />
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <Badge estado={estudio.resultado} />
              <span className="text-xs text-gray-500">
                {formatDate(estudio.created_at)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              Mostrando {(meta.page - 1) * meta.limit + 1} -{' '}
              {Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
            </span>
            <select
              value={filters.limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} por pagina
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(meta.page - 1)}
              disabled={meta.page <= 1}
              className="p-2 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <IconChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                let pageNum: number
                if (meta.totalPages <= 5) {
                  pageNum = i + 1
                } else if (meta.page <= 3) {
                  pageNum = i + 1
                } else if (meta.page >= meta.totalPages - 2) {
                  pageNum = meta.totalPages - 4 + i
                } else {
                  pageNum = meta.page - 2 + i
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={cn(
                      'w-8 h-8 rounded text-sm font-medium transition-colors',
                      pageNum === meta.page
                        ? 'bg-primary-600 text-white'
                        : 'hover:bg-gray-100 text-gray-600'
                    )}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => onPageChange(meta.page + 1)}
              disabled={meta.page >= meta.totalPages}
              className="p-2 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <IconChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedEstudio && (
        <EstudioDetailModal
          estudio={selectedEstudio}
          isOpen={!!selectedEstudio}
          onClose={() => setSelectedEstudio(null)}
        />
      )}
    </>
  )
}
