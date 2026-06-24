/**
 * ExpedientesTable - HP-229
 * Tabla responsive de expedientes con ordenamiento y paginación
 */

'use client'

import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { ExpedienteBadge, ProcessStepBadge } from './ExpedienteBadges'
import { EstudioResultadoBadge } from '@/components/estudios/EstudioResultadoBadge'
import { ITEMS_PER_PAGE_OPTIONS, SORTABLE_COLUMNS, EXPEDIENTE_UI_MESSAGES } from './constants'
import { formatDate } from '@/lib/constants'
import {
  IconChevronUp,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconFolderOpen,
  IconPlus,
  IconExternalLink,
} from '@/components/icons'
import { cn } from '@/lib/utils'
import type { IExpediente, IExpedienteFilters, IExpedientesMeta } from '@/types/expediente'

interface SortableHeaderProps {
  column: IExpedienteFilters['sortBy']
  label: string
  currentSortBy: IExpedienteFilters['sortBy']
  currentSortOrder: 'asc' | 'desc'
  onSort: (column: IExpedienteFilters['sortBy']) => void
}

function SortableHeader({
  column,
  label,
  currentSortBy,
  currentSortOrder,
  onSort,
}: SortableHeaderProps) {
  const isActive = currentSortBy === column

  return (
    <button
      onClick={() => onSort(column)}
      className="flex items-center gap-1 group text-left"
    >
      <span>{label}</span>
      <span className={cn('transition-opacity', isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50')}>
        {isActive && currentSortOrder === 'asc' ? (
          <IconChevronUp size={14} />
        ) : (
          <IconChevronDown size={14} />
        )}
      </span>
    </button>
  )
}

export interface ExpedientesTableProps {
  expedientes: IExpediente[]
  meta: IExpedientesMeta | null
  filters: IExpedienteFilters
  onSort: (column: IExpedienteFilters['sortBy']) => void
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  /** Mapa perfil_id → nombre de los miembros de la inmobiliaria. Cuando se
   *  provee (vista inmobiliaria), la columna Responsable muestra el MIEMBRO
   *  asignado al expediente (miembro_responsable_id); si no, cae al analista
   *  interno (vista admin/operador). */
  miembrosResponsablesById?: Record<string, string>
}

export function ExpedientesTable({
  expedientes,
  meta,
  filters,
  onSort,
  onPageChange,
  onLimitChange,
  miembrosResponsablesById,
}: ExpedientesTableProps) {
  const router = useRouter()

  // Nombre a mostrar en la columna Responsable: prioriza el miembro de la
  // inmobiliaria asignado al expediente; si no hay (o no se proveyó el mapa),
  // cae al analista interno.
  const nombreResponsable = (e: IExpediente): string | null => {
    if (e.miembro_responsable_id && miembrosResponsablesById?.[e.miembro_responsable_id]) {
      return miembrosResponsablesById[e.miembro_responsable_id]
    }
    return e.analista?.nombre ?? null
  }

  const handleRowClick = (id: string) => {
    router.push(`/expedientes/${id}`)
  }

  // Empty state
  if (expedientes.length === 0) {
    return (
      <div className="text-center py-12">
        <IconFolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {EXPEDIENTE_UI_MESSAGES.EMPTY_STATE}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {EXPEDIENTE_UI_MESSAGES.EMPTY_STATE_FILTERED}
        </p>
        <button
          onClick={() => router.push('/expedientes/nuevo')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <IconPlus size={18} />
          {EXPEDIENTE_UI_MESSAGES.NEW_EXPEDIENTE}
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Vista Desktop - Tabla */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <SortableHeader
                  column="numero"
                  label={SORTABLE_COLUMNS.numero.label}
                  currentSortBy={filters.sortBy}
                  currentSortOrder={filters.sortOrder}
                  onSort={onSort}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Inmueble
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Solicitante
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
                Estudio
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Responsable
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
            {expedientes.map((expediente) => (
              <tr
                key={expediente.id}
                onClick={() => handleRowClick(expediente.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-sm font-medium text-primary-600">
                    {expediente.numero_expediente}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {expediente.inmueble ? (
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                        {expediente.inmueble.titulo || expediente.inmueble.direccion}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">
                        {expediente.inmueble.ciudad}
                      </p>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Sin inmueble</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {expediente.solicitante ? (
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {expediente.solicitante.nombre}
                      </p>
                      <p className="text-xs text-gray-500">
                        {expediente.solicitante.documento}
                      </p>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Sin solicitante</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <ProcessStepBadge
                      estado={expediente.estado}
                      citaRealizada={expediente.cita_realizada ?? false}
                      cancelado={!!expediente.cancelado_at}
                      estadoPreCancelacion={expediente.estado_pre_cancelacion}
                    />
                    <ExpedienteBadge
                      estado={expediente.estado}
                      size="sm"
                      cancelado={!!expediente.cancelado_at}
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <EstudioResultadoBadge
                    estado={expediente.estudio_vigente?.estado}
                    resultado={expediente.estudio_vigente?.resultado}
                    score={expediente.estudio_vigente?.score}
                  />
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const nombre = nombreResponsable(expediente)
                    return nombre ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={nombre} size="sm" />
                        <span className="text-sm text-gray-700">{nombre}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Sin asignar</span>
                    )
                  })()}
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500">
                    {formatDate(expediente.created_at)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRowClick(expediente.id)
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

      {/* Vista Mobile - Cards */}
      <div className="lg:hidden space-y-3">
        {expedientes.map((expediente) => (
          <div
            key={expediente.id}
            onClick={() => handleRowClick(expediente.id)}
            className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-primary-300 hover:shadow-sm transition-all"
          >
            {/* Header: código y estado */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className="font-mono text-sm font-medium text-primary-600">
                {expediente.numero_expediente}
              </span>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <ProcessStepBadge
                  estado={expediente.estado}
                  citaRealizada={expediente.cita_realizada ?? false}
                  cancelado={!!expediente.cancelado_at}
                  estadoPreCancelacion={expediente.estado_pre_cancelacion}
                />
                <ExpedienteBadge
                  estado={expediente.estado}
                  size="sm"
                  cancelado={!!expediente.cancelado_at}
                />
                <EstudioResultadoBadge
                  estado={expediente.estudio_vigente?.estado}
                  resultado={expediente.estudio_vigente?.resultado}
                  score={expediente.estudio_vigente?.score}
                />
              </div>
            </div>

            {/* Inmueble */}
            {expediente.inmueble && (
              <div className="mb-2">
                <p className="text-sm font-medium text-gray-900">
                  {expediente.inmueble.titulo || expediente.inmueble.direccion}
                </p>
                <p className="text-xs text-gray-500">{expediente.inmueble.ciudad}</p>
              </div>
            )}

            {/* Solicitante */}
            {expediente.solicitante && (
              <div className="mb-3">
                <p className="text-sm text-gray-700">{expediente.solicitante.nombre}</p>
                <p className="text-xs text-gray-500">{expediente.solicitante.documento}</p>
              </div>
            )}

            {/* Footer: responsable y fecha */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              {(() => {
                const nombre = nombreResponsable(expediente)
                return nombre ? (
                  <div className="flex items-center gap-2">
                    <Avatar name={nombre} size="sm" />
                    <span className="text-xs text-gray-600">{nombre}</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">Sin asignar</span>
                )
              })()}
              <span className="text-xs text-gray-500">
                {formatDate(expediente.created_at)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Paginación */}
      {meta && meta.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
          {/* Info y selector de items */}
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
                  {option} por página
                </option>
              ))}
            </select>
          </div>

          {/* Botones de paginación */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(meta.page - 1)}
              disabled={meta.page <= 1}
              className="p-2 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <IconChevronLeft size={18} />
            </button>

            {/* Números de página */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                // Calcular qué páginas mostrar
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
    </>
  )
}
