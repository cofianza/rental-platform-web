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
  IconUserCheck,
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

/** Días completos transcurridos desde una fecha ISO. */
function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

/**
 * Antigüedad en el estado actual + fecha de creación. La cola se prioriza por
 * "lo más estancado primero", y antes solo se veía la fecha de creación: un
 * caso abierto hace 2 meses y tocado ayer se veía igual de urgente que uno
 * parado hace 3 semanas. Los casos cerrados no se pintan de rojo: ya no esperan.
 */
function Actividad({ expediente }: { expediente: IExpediente }) {
  const cerrado =
    expediente.estado === 'cerrado' || expediente.estado === 'rechazado' || !!expediente.cancelado_at
  const d = diasDesde(expediente.updated_at)

  return (
    <div>
      <p
        title={formatDate(expediente.updated_at)}
        className={cn(
          'text-sm',
          !cerrado && d >= 7
            ? 'text-red-600 font-medium'
            : !cerrado && d >= 3
              ? 'text-amber-600'
              : 'text-gray-700'
        )}
      >
        {d === 0 ? 'Hoy' : `hace ${d} d`}
      </p>
      <p className="text-xs text-gray-500">Creado {formatDate(expediente.created_at)}</p>
    </div>
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
  /** Asigna el estudio a quien está mirando la lista, sin abrir el detalle ni
   *  el modal de analistas. Solo se provee a roles que asignan (admin/operador);
   *  para inmobiliaria no se pasa. */
  onTomar?: (id: string) => Promise<void>
  /** Id del estudio que se está asignando ahora mismo (deshabilita su botón). */
  tomandoId?: string | null
}

export function ExpedientesTable({
  expedientes,
  meta,
  filters,
  onSort,
  onPageChange,
  onLimitChange,
  miembrosResponsablesById,
  onTomar,
  tomandoId,
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
                {/* Dos ordenamientos reales: por movimiento (lo que importa
                    para no dejar un estudio quieto) y por fecha de creación. */}
                <SortableHeader
                  column="updated_at"
                  label="Última actividad"
                  currentSortBy={filters.sortBy}
                  currentSortOrder={filters.sortOrder}
                  onSort={onSort}
                />
                <SortableHeader
                  column="created_at"
                  label="Creado"
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
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.currentTarget.click()
                  }
                }}
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
                    <span className="text-sm text-gray-500">Sin inmueble</span>
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
                    <span className="text-sm text-gray-500">Sin solicitante</span>
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
                  {expediente.depende_de && (
                    <span
                      className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        expediente.depende_de === 'gestor'
                          ? 'border-coral-200 bg-coral-50 text-coral-700'
                          : 'border-gray-200 bg-gray-50 text-gray-600'
                      }`}
                    >
                      {expediente.depende_de === 'gestor'
                        ? 'Te toca a ti'
                        : expediente.depende_de === 'prospecto'
                          ? 'Esperando al prospecto'
                          : 'Cofianza procesando'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const nombre = nombreResponsable(expediente)
                    if (nombre) {
                      return (
                        <div className="flex items-center gap-2">
                          <Avatar name={nombre} size="sm" />
                          <span className="text-sm text-gray-700">{nombre}</span>
                        </div>
                      )
                    }
                    return onTomar ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onTomar(expediente.id)
                        }}
                        disabled={tomandoId === expediente.id}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded disabled:opacity-50 transition-colors"
                      >
                        <IconUserCheck size={14} />
                        Tomar
                      </button>
                    ) : (
                      <span className="text-sm text-gray-500">Sin asignar</span>
                    )
                  })()}
                </td>
                <td className="px-4 py-3">
                  <Actividad expediente={expediente} />
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
                if (nombre) {
                  return (
                    <div className="flex items-center gap-2">
                      <Avatar name={nombre} size="sm" />
                      <span className="text-xs text-gray-600">{nombre}</span>
                    </div>
                  )
                }
                return onTomar ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onTomar(expediente.id)
                    }}
                    disabled={tomandoId === expediente.id}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded disabled:opacity-50 transition-colors"
                  >
                    <IconUserCheck size={14} />
                    Tomar
                  </button>
                ) : (
                  <span className="text-xs text-gray-500">Sin asignar</span>
                )
              })()}
              <div className="text-right">
                <Actividad expediente={expediente} />
              </div>
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
              type="button"
              aria-label="Página anterior"
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
              type="button"
              aria-label="Página siguiente"
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
