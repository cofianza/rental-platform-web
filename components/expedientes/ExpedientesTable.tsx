/**
 * ExpedientesTable - HP-229
 * Tabla responsive de expedientes con ordenamiento y paginación
 */

'use client'

import Link from 'next/link'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { EstadoFila } from './EstadoFila'
import { actividadConAlerta, siguienteOrdenActividad, tomarDisponible } from '@/lib/etapaFila'
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
      type="button"
      onClick={() => onSort(column)}
      // U7: el botón no hereda el uppercase del encabezado.
      className="flex items-center gap-1 group text-left uppercase tracking-wider"
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

/**
 * U7: un solo encabezado ordenable para la actividad y la creación. X5: cada
 * clic fija orden y sentido (siguienteOrdenActividad): actividad reciente,
 * actividad antigua, creación reciente, creación antigua.
 */
function ActividadHeader({
  currentSortBy,
  currentSortOrder,
  onOrdenar,
}: {
  currentSortBy: IExpedienteFilters['sortBy']
  currentSortOrder: IExpedienteFilters['sortOrder']
  onOrdenar: (sortBy: IExpedienteFilters['sortBy'], sortOrder: IExpedienteFilters['sortOrder']) => void
}) {
  const porCreacion = currentSortBy === 'created_at'
  const activo = porCreacion || currentSortBy === 'updated_at'
  const siguiente = siguienteOrdenActividad(currentSortBy, currentSortOrder)
  return (
    <button
      type="button"
      onClick={() => onOrdenar(siguiente.sortBy, siguiente.sortOrder)}
      title="Clic para ordenar por la última actividad o por la fecha de creación"
      className="flex items-center gap-1 group text-left uppercase tracking-wider"
    >
      <span>{porCreacion ? 'Creado' : 'Actividad'}</span>
      <span className={cn('transition-opacity', activo ? 'opacity-100' : 'opacity-0 group-hover:opacity-50')}>
        {activo && currentSortOrder === 'asc' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
      </span>
    </button>
  )
}

/** Vista de Cofianza. Ausente = la API no pudo leerla: mejor un guion que afirmar que no tiene. */
function nombreInmobiliaria(e: IExpediente): string {
  if (e.inmobiliaria_nombre === undefined) return '—'
  return e.inmobiliaria_nombre ?? 'Sin inmobiliaria'
}

/** Sin columna que la nombre (tarjeta y tabla angosta). */
function rotuloInmobiliaria(e: IExpediente): string {
  return e.inmobiliaria_nombre ? `Inmobiliaria: ${e.inmobiliaria_nombre}` : nombreInmobiliaria(e)
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
  // U14: en alerta solo si alguien tiene que mover el estudio (gestor o Cofianza).
  const cerrado = !actividadConAlerta(expediente)
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
  asignados: [M.VACIO_ASIGNADOS_TITULO, M.VACIO_ASIGNADOS_TEXTO],
  asignados_bandeja: [M.VACIO_ASIGNADOS_BANDEJA_TITULO, null],
}

export interface ExpedientesTableProps {
  expedientes: IExpediente[]
  meta: IExpedientesMeta | null
  filters: IExpedienteFilters
  onSort: (column: IExpedienteFilters['sortBy']) => void
  /** X5: orden y sentido explícitos (el encabezado «Actividad» recorre cuatro órdenes). */
  onOrdenar: (sortBy: IExpedienteFilters['sortBy'], sortOrder: IExpedienteFilters['sortOrder']) => void
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
  vacio?: 'accion' | 'filtros' | 'nada' | 'bandeja' | 'asignados' | 'asignados_bandeja'
  onClearFilters?: () => void
}

export function ExpedientesTable({
  expedientes,
  meta,
  filters,
  onSort,
  onOrdenar,
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
  const analista = rol === 'administrador' || rol === 'operador_analista'
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
          <Link
            href="/expedientes/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors"
          >
            <IconPlus size={18} />
            {M.NEW_EXPEDIENTE}
          </Link>
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
    // U9: «Tomar» solo cuando el turno es de Cofianza; si no, no hay nada que tomar.
    if (onTomar && !tomarDisponible(expediente)) {
      return <span className={movil ? 'text-xs text-gray-500' : 'text-sm text-gray-500'}>—</span>
    }
    return onTomar ? (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onTomar(expediente.id)
        }}
        disabled={tomandoId === expediente.id}
        className="inline-flex min-h-10 items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded disabled:opacity-50 transition-colors"
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
              {interno && (
                <th className="hidden xl:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Inmobiliaria
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Solicitante
              </th>
              {/* Sin ordenar: el orden por estado formal ya no coincide con la etapa que se ve. */}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Etapa
              </th>
              {conResponsable && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {/* U9: para Cofianza la columna es el analista asignado. */}
                  {interno ? 'Analista' : 'Responsable'}
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {/* Dos ordenamientos reales en un botón: por movimiento (lo que
                    importa para no dejar un estudio quieto) y por fecha de creación. */}
                <ActividadHeader currentSortBy={filters.sortBy} currentSortOrder={filters.sortOrder} onOrdenar={onOrdenar} />
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
                  // Solo la fila: Enter sobre un botón interno («Tomar»)
                  // hace lo suyo, no abre la fila.
                  if (e.target !== e.currentTarget) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.currentTarget.click()
                  }
                }}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-gray-900 tabular-nums">
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
                  {/* Sin espacio para la columna (menú abierto en portátil), la lleva aquí. */}
                  {interno && (
                    <p className="xl:hidden text-xs text-gray-500 truncate max-w-[200px]" title={nombreInmobiliaria(expediente)}>
                      {rotuloInmobiliaria(expediente)}
                    </p>
                  )}
                </td>
                {interno && (
                  <td className="hidden xl:table-cell px-4 py-3">
                    <p className="text-sm text-gray-700 truncate max-w-[160px]" title={nombreInmobiliaria(expediente)}>
                      {nombreInmobiliaria(expediente)}
                    </p>
                  </td>
                )}
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
                  <EstadoFila expediente={expediente} interno={interno} vista={vista} analista={analista} />
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
              <span className="text-sm font-medium text-gray-900 tabular-nums shrink-0">
                {formatNumeroEstudio(expediente.numero_expediente)}
              </span>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              {expediente.inmueble
                ? `${expediente.inmueble.titulo || expediente.inmueble.direccion} · ${expediente.inmueble.ciudad}`
                : 'Inmueble por definir'}
            </p>
            {interno && <p className="text-xs text-gray-500 -mt-2 mb-3">{rotuloInmobiliaria(expediente)}</p>}

            <EstadoFila expediente={expediente} interno={interno} vista={vista} analista={analista} />

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
              className="inline-flex min-h-10 min-w-10 items-center justify-center p-2 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    type="button"
                    onClick={() => onPageChange(pageNum)}
                    className={cn(
                      'min-h-10 min-w-10 rounded text-sm font-medium transition-colors',
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
              className="inline-flex min-h-10 min-w-10 items-center justify-center p-2 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <IconChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
