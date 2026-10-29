/**
 * ExpedientesTable - HP-229
 * Tabla responsive de expedientes con ordenamiento y paginación
 */

'use client'

import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { EstadoFila } from './EstadoFila'
import { ITEMS_PER_PAGE_OPTIONS, SORTABLE_COLUMNS, EXPEDIENTE_UI_MESSAGES } from './constants'
import { formatDate } from '@/lib/constants'
import { AYUDA } from '@/lib/ayudaEstudio'
import {
  IconChevronUp,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconCheckCircle,
  IconFolderOpen,
  IconPlus,
  IconUserCheck,
  IconX,
} from '@/components/icons'
import { cn, formatNumeroEstudio } from '@/lib/utils'
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

const M = EXPEDIENTE_UI_MESSAGES
/** Estado vacío según por qué está vacía la tabla: [título, texto]. */
const VACIO: Record<NonNullable<ExpedientesTableProps['vacio']>, [string, string | null]> = {
  accion: [M.VACIO_ACCION_TITULO, M.VACIO_ACCION_TEXTO],
  filtros: [M.VACIO_FILTROS_TITULO, M.VACIO_FILTROS_TEXTO],
  nada: [M.VACIO_NADA_TITULO, M.VACIO_NADA_TEXTO],
  bandeja: [M.VACIO_BANDEJA_TITULO, null],
}

export interface ExpedientesTableProps {
  expedientes: IExpediente[]
  meta: IExpedientesMeta | null
  filters: IExpedienteFilters
  onSort: (column: IExpedienteFilters['sortBy']) => void
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  /** Mapa perfil_id → nombre de los miembros de la inmobiliaria. Cuando se
   *  provee (vista inmobiliaria), la columna Responsable muestra solo el MIEMBRO
   *  asignado al expediente (miembro_responsable_id); si no, el analista
   *  interno (vista admin/operador). */
  miembrosResponsablesById?: Record<string, string>
  /** Asigna el estudio a quien está mirando la lista, sin abrir el detalle ni
   *  el modal de analistas. Solo se provee a roles que asignan (admin/operador);
   *  para inmobiliaria no se pasa. */
  onTomar?: (id: string) => Promise<void>
  /** Id del estudio que se está asignando ahora mismo (deshabilita su botón). */
  tomandoId?: string | null
  /** Por qué está vacía: pendientes del gestor, filtros, sin estudios o bandeja de Cofianza. */
  vacio?: 'accion' | 'filtros' | 'nada' | 'bandeja'
  onClearFilters?: () => void
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
  vacio = 'nada',
  onClearFilters,
}: ExpedientesTableProps) {
  const router = useRouter()
  const rol = useAuthStore((st) => st.user?.rol)
  const interno = rol === 'administrador' || rol === 'operador_analista' || rol === 'gerencia_consulta'
  const puedeEditar = usePuedeEditar()
  const vista = interno ? 'cofianza' : puedeEditar ? 'gestor' : 'equipo'
  // Solo lectura y el prospecto no crean estudios: sin esto el estado vacío les
  // ofrecía un botón que termina en 403.
  const puedeCrear = puedeEditar && rol !== 'solicitante'
  // El propietario no tiene equipo: ni columna ni nombre de responsable.
  const conResponsable = rol !== 'propietario'

  // Con el mapa del equipo, solo el miembro asignado: caer al analista le
  // mostraba a la inmobiliaria a alguien de Cofianza que no está en su filtro.
  const nombreResponsable = (e: IExpediente): string | null => {
    if (miembrosResponsablesById) {
      return e.miembro_responsable_id ? (miembrosResponsablesById[e.miembro_responsable_id] ?? null) : null
    }
    return e.analista?.nombre ?? null
  }

  const handleRowClick = (id: string) => {
    router.push(`/expedientes/${id}`)
  }

  // Empty state
  if (expedientes.length === 0) {
    const [titulo, texto] = VACIO[vacio]
    return (
      <div className="text-center py-12">
        {vacio === 'accion' ? (
          <IconCheckCircle size={48} className="mx-auto text-primary-300 mb-4" />
        ) : (
          <IconFolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
        )}
        <h3 className="text-lg font-medium text-gray-900 mb-1">{titulo}</h3>
        {texto && <p className="mx-auto max-w-md text-sm text-gray-500 mb-4">{texto}</p>}
        {vacio === 'filtros' && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <IconX size={16} />
            {M.CLEAR_FILTERS}
          </button>
        )}
        {vacio === 'nada' && puedeCrear && (
          <button
            onClick={() => router.push('/expedientes/nuevo')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors"
          >
            <IconPlus size={18} />
            {M.NEW_EXPEDIENTE}
          </button>
        )}
      </div>
    )
  }

  const responsable = (expediente: IExpediente, movil: boolean) => {
    const nombre = nombreResponsable(expediente)
    if (nombre) {
      return (
        <div className="flex items-center gap-2">
          <Avatar name={nombre} size="sm" />
          <span className={movil ? 'text-xs text-gray-600' : 'text-sm text-gray-700'}>{nombre}</span>
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
      <span title={AYUDA.responsable} className={movil ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>
        Sin asignar
      </span>
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
              {/* Sin ordenar: el orden por estado formal ya no coincide con la etapa que se ve. */}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Etapa
              </th>
              {conResponsable && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Responsable
                </th>
              )}
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
                  // Solo la fila: Enter sobre un botón o enlace interno
                  // («Tomar», «Abrir estudio») hace lo suyo, no abre la fila.
                  if (e.target !== e.currentTarget) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.currentTarget.click()
                  }
                }}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-sm font-medium text-primary-600">
                    {formatNumeroEstudio(expediente.numero_expediente)}
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
                    <span className="text-sm text-gray-500">Inmueble por definir</span>
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
                  <EstadoFila expediente={expediente} interno={interno} vista={vista} />
                </td>
                {conResponsable && <td className="px-4 py-3">{responsable(expediente, false)}</td>}
                <td className="px-4 py-3">
                  <Actividad expediente={expediente} />
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
            // La vista angosta (y el zoom de 150 %) usa estas tarjetas: sin foco
            // ni teclado, la lista no se abría sin mouse.
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.currentTarget.click()
              }
            }}
            className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-primary-300 hover:shadow-sm transition-all"
          >
            {/* Arriba el solicitante y el número; las pastillas van debajo, no apiladas junto al nombre. */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm font-medium text-gray-900">
                {expediente.solicitante?.nombre ?? 'Sin solicitante'}
              </p>
              <span className="font-mono text-sm font-medium text-primary-600 shrink-0">
                {formatNumeroEstudio(expediente.numero_expediente)}
              </span>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              {expediente.inmueble
                ? `${expediente.inmueble.titulo || expediente.inmueble.direccion} · ${expediente.inmueble.ciudad}`
                : 'Inmueble por definir'}
            </p>

            <EstadoFila expediente={expediente} interno={interno} vista={vista} />

            {/* Footer: responsable y fecha */}
            <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-gray-100">
              {conResponsable && responsable(expediente, true)}
              <div className="ml-auto text-right">
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
                        ? 'bg-primary-700 text-white'
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
