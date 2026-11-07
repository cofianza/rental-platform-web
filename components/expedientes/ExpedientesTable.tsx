/**
 * ExpedientesTable - HP-229
 * Lista de estudios de la inmobiliaria y del propietario, más las piezas que
 * comparte con la cola de Cofianza (Actividad, EstadoVacio, Paginacion, encabezados).
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { buttonClasses } from '@/components/ui/Button'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { AYUDA_PUNTAJE, PastillaEtapa, datosEstadoFila, type DatosEstadoFila } from './EstadoFila'
import { textoTurno, turnoPropio } from './PastillaTurno'
import { actividadConAlerta, siguienteOrdenActividad } from '@/lib/etapaFila'
import { direccionLegible } from '@/lib/direccionLegible'
import type { EtapaEstudio, VistaTurno } from '@/lib/etapaEstudio'
import { ITEMS_PER_PAGE_OPTIONS, SORTABLE_COLUMNS, EXPEDIENTE_UI_MESSAGES } from './constants'
import { formatDate } from '@/lib/constants'
import { AYUDA } from '@/lib/ayudaEstudio'
import { InfoTip } from '@/components/ui/InfoTip'
import {
  IconArrowRight,
  IconChevronUp,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconCheckCircle,
  IconFolderOpen,
  IconPlus,
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

export function SortableHeader({
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
      className="-my-1 flex min-h-6 items-center gap-1 group rounded text-left uppercase tracking-wider focus-visible:outline-2 focus-visible:outline-primary-600"
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
export function ActividadHeader({
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
      className="-my-1 flex min-h-6 items-center gap-1 group rounded text-left uppercase tracking-wider focus-visible:outline-2 focus-visible:outline-primary-600"
    >
      <span>{porCreacion ? 'Creado' : 'Actividad'}</span>
      <span className={cn('transition-opacity', activo ? 'opacity-100' : 'opacity-0 group-hover:opacity-50')}>
        {activo && currentSortOrder === 'asc' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
      </span>
    </button>
  )
}

/** Vista de Cofianza. Ausente = la API no pudo leerla: mejor un guion que afirmar que no tiene. */
export function nombreInmobiliaria(e: IExpediente): string {
  if (e.inmobiliaria_nombre === undefined) return '—'
  return e.inmobiliaria_nombre ?? 'Sin inmobiliaria'
}

/** Medianoche (UTC) del día de calendario de Colombia en que cae el instante. */
const diaBogota = (d: Date) => Date.parse(d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }))

/**
 * Días de calendario de Colombia desde una fecha ISO (como plazo() en EstadoFila):
 * algo de anoche a las 11 p. m. es «Ayer», no «Hoy» por no cumplir 24 h.
 */
function diasDesde(iso: string): number {
  const f = new Date(iso)
  if (Number.isNaN(f.getTime())) return 0
  return Math.round((diaBogota(new Date()) - diaBogota(f)) / 86_400_000)
}

/**
 * Antigüedad en el estado actual + fecha de creación. La cola se prioriza por
 * "lo más estancado primero", y antes solo se veía la fecha de creación: un
 * caso abierto hace 2 meses y tocado ayer se veía igual de urgente que uno
 * parado hace 3 semanas. Los casos cerrados no se pintan de rojo: ya no esperan.
 */
export function Actividad({ expediente }: { expediente: IExpediente }) {
  // U14: en alerta solo si alguien tiene que mover el estudio (gestor o Cofianza).
  const cerrado = !actividadConAlerta(expediente)
  const d = diasDesde(expediente.updated_at)

  return (
    <div>
      <p
        title={`Última actividad: ${formatDate(expediente.updated_at)}`}
        className={cn(
          'whitespace-nowrap text-sm',
          // -700: el -600 sobre el fondo coral de «Su turno» no llegaba a 4,5:1.
          !cerrado && d >= 7
            ? 'text-red-700 font-medium'
            : !cerrado && d >= 3
              ? 'text-amber-700'
              : 'text-gray-700'
        )}
      >
        {d <= 0 ? 'Hoy' : d === 1 ? 'Ayer' : `Hace ${d} días`}
      </p>
      {/* Una línea, no tres («Creado» / fecha partida): la fecha completa queda en el title. */}
      <p title={`Creado el ${formatDate(expediente.created_at)}`} className="whitespace-nowrap text-xs text-gray-500">
        Creado {fechaCorta(expediente.created_at)}
      </p>
    </div>
  )
}

/** «30 oct.» en el año en curso; «30 oct. 2025» en otro (hora de Colombia). */
function fechaCorta(iso: string): string {
  const f = new Date(iso)
  if (Number.isNaN(f.getTime())) return '—'
  const anio = (x: Date) => x.toLocaleDateString('en-CA', { year: 'numeric', timeZone: 'America/Bogota' })
  return f.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    ...(anio(f) === anio(new Date()) ? {} : { year: 'numeric' }),
    timeZone: 'America/Bogota',
  })
}

const M = EXPEDIENTE_UI_MESSAGES
/** Estado vacío según por qué está vacía la tabla: [título, texto]. */
const VACIO: Record<NonNullable<ExpedientesTableProps['vacio']>, [string, string | null]> = {
  accion: [M.VACIO_ACCION_TITULO, M.VACIO_ACCION_TEXTO],
  accion_equipo: [M.VACIO_ACCION_EQUIPO_TITULO, M.VACIO_ACCION_EQUIPO_TEXTO],
  nada_equipo: [M.VACIO_NADA_TITULO, M.VACIO_NADA_EQUIPO_TEXTO],
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
  vacio?: 'accion' | 'accion_equipo' | 'nada_equipo' | 'filtros' | 'nada' | 'bandeja' | 'asignados' | 'asignados_bandeja'
  onClearFilters?: () => void
}

/** Fila de la lista del gestor: lo que pinta EstadoFila, repartido en «Etapa» y «Qué sigue». */
interface Fila {
  expediente: IExpediente
  datos: DatosEstadoFila
  /** Le toca actuar a quien mira (gestor con edición): coral. Solo lectura ve el turno del equipo en gris. */
  propio: boolean
}

/** Sin nada por hacer de nadie: «Qué sigue» lo dice en vez de dejar un guion. */
const SIN_PENDIENTES: EtapaEstudio[] = ['vigente', 'finalizado', 'cancelado', 'no_aprobado', 'no_habilitada']

/** Identidad rechazada: el RPC la cuenta como turno del gestor, pero datosEstadoFila le quita la pastilla de turno. */
const identidadRechazada = (e: IExpediente) => e.estudio_vigente?.estado_bloqueo === 'identidad_rechazada'

/** Qué sigue cuando la fila no lleva turno (la etapa ya nombra a quién se espera o el estudio terminó). */
function sinTurno(datos: DatosEstadoFila, e: IExpediente, vista: VistaTurno): string | null {
  if (SIN_PENDIENTES.includes(datos.etapa)) return 'Nada pendiente'
  // En la visita el RPC no da turno (depende_de NULL): la lista dice qué falta.
  if (datos.etapa === 'visita') return vista === 'gestor' ? 'Agende la visita o indique que ya se hizo' : 'Falta la visita'
  if (identidadRechazada(e)) return 'Su equipo debe comunicarse con Cofianza'
  if (datos.etapa === 'decision' && e.depende_de === 'cofianza') return 'Esperando a Cofianza'
  // La etapa ya dice «Esperando al coarrendatario»: aquí, lo que falta.
  if (datos.etapa === 'espera_coarrendatario') return 'Esperando su autorización'
  return null
}

function QueSigue({ fila, vista }: { fila: Fila; vista: VistaTurno }) {
  const { datos, propio, expediente } = fila
  if (propio && identidadRechazada(expediente)) {
    return (
      <span className="inline-flex items-start gap-1.5 text-sm font-semibold text-coral-700">
        <IconArrowRight size={16} className="mt-0.5 shrink-0" />
        Su turno: comuníquese con Cofianza
      </span>
    )
  }
  if (datos.turno) {
    const texto = textoTurno(datos.turno.turno, vista, datos.turno)
    if (propio) {
      return (
        <span className="inline-flex items-start gap-1.5 text-sm font-semibold text-coral-700">
          <IconArrowRight size={16} className="mt-0.5 shrink-0" />
          {texto}
        </span>
      )
    }
    // Solo lectura: el turno es de su equipo, no de quien mira (sin coral: no puede hacerlo).
    return <span className={cn('block text-sm', datos.turno.turno === 'gestor' ? 'font-medium text-gray-800' : 'text-gray-600')}>{texto}</span>
  }
  const texto = sinTurno(datos, expediente, vista)
  if (texto) return <span className="block text-sm text-gray-500">{texto}</span>
  return (
    <span className="text-sm text-gray-400">
      <span aria-hidden="true">—</span>
      <span className="sr-only">Sin turno</span>
    </span>
  )
}

function Etapa({ datos }: { datos: DatosEstadoFila }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <PastillaEtapa texto={datos.texto} tono={datos.tono} ayuda={datos.ayuda} conAyuda />
      {/* Qué es el puntaje: una sola vez, en la burbuja del pie. */}
      {datos.score > 0 && (
        <span className="text-xs tabular-nums text-gray-500">
          Puntaje de la central: {datos.score}
        </span>
      )}
    </div>
  )
}

function Inmueble({ expediente }: { expediente: IExpediente }) {
  const direccion = expediente.inmueble ? expediente.inmueble.titulo || expediente.inmueble.direccion : null
  return (
    <div className="min-w-0">
      {direccion ? (
        <p title={direccion} className="line-clamp-2 break-words text-sm text-gray-900">
          {direccionLegible(direccion)}
        </p>
      ) : (
        <p className="text-sm text-gray-500">Inmueble por definir</p>
      )}
      {expediente.inmueble?.ciudad && <p className="mt-0.5 truncate text-xs text-gray-500">{expediente.inmueble.ciudad}</p>}
    </div>
  )
}

/**
 * Lista de la inmobiliaria y del propietario (EstudiosExpedientesFusion). La
 * misma forma que la cola de Cofianza (ExpedientesTablaCofianza), pensada para
 * quien gestiona: «Qué sigue» dice si le toca a usted (coral), si espera al
 * prospecto o a Cofianza, o si ya no hay nada pendiente.
 */
export function ExpedientesTable({
  expedientes,
  meta,
  filters,
  onSort,
  onOrdenar,
  onPageChange,
  onLimitChange,
  miembrosResponsablesById,
  vacio = 'nada',
  onClearFilters,
}: ExpedientesTableProps) {
  const router = useRouter()
  const rol = useAuthStore((st) => st.user?.rol)
  const yo = useAuthStore((st) => st.user?.id)
  const puedeEditar = usePuedeEditar()
  const vista: VistaTurno = puedeEditar ? 'gestor' : 'equipo'
  // Solo lectura no crea estudios: sin esto el estado vacío le ofrecía un botón que termina en 403.
  const puedeCrear = puedeEditar && rol !== 'solicitante'
  // El propietario no tiene equipo: ni columna ni nombre de responsable.
  const conResponsable = rol !== 'propietario'
  // Hora fijada al montar: Date.now() en render es impuro.
  const [ahora] = useState(() => Date.now())

  if (expedientes.length === 0) {
    return <EstadoVacio vacio={vacio} puedeCrear={puedeCrear} onClearFilters={onClearFilters} equipo={!puedeEditar} />
  }

  const filas: Fila[] = expedientes.map((expediente) => {
    const d = datosEstadoFila(expediente, { interno: false, vista, ahora, yo })
    // «Qué sigue» ya dice que hay que comunicarse con Cofianza: la etapa no lo repite.
    const datos = identidadRechazada(expediente) ? { ...d, texto: 'Identidad rechazada' } : d
    const propio =
      vista === 'gestor' &&
      ((!!datos.turno && turnoPropio(datos.turno.turno, vista, datos.turno)) || (identidadRechazada(expediente) && expediente.depende_de === 'gestor'))
    return { expediente, datos, propio }
  })
  const conPuntaje = filas.some((f) => f.datos.score > 0)

  // Solo el miembro asignado: caer al analista le mostraba a alguien de Cofianza.
  const responsable = (e: IExpediente) => {
    const nombre = e.miembro_responsable_id ? (miembrosResponsablesById?.[e.miembro_responsable_id] ?? null) : null
    if (nombre) {
      return (
        <span className="flex min-w-0 items-center gap-2">
          <Avatar name={nombre} size="sm" />
          <span className="min-w-0 break-words text-sm text-gray-700">{nombre}</span>
        </span>
      )
    }
    // «Sin responsable» se entiende sin el encabezado de la columna (la vista apilada no lo tiene).
    return <span className="text-sm text-gray-500">Sin responsable</span>
  }

  // Con el ratón, toda la fila abre el estudio; con teclado y lector de pantalla,
  // el enlace del nombre (que además se abre en otra pestaña).
  const abrir = (id: string) => router.push(`/expedientes/${id}`)
  const enlace = (expediente: IExpediente, className: string) => (
    <Link
      href={`/expedientes/${expediente.id}`}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Abrir el estudio ${formatNumeroEstudio(expediente.numero_expediente)}${expediente.solicitante ? ` de ${expediente.solicitante.nombre}` : ''}`}
      className={cn('rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600', className)}
    >
      {expediente.solicitante?.nombre ?? 'Sin solicitante'}
    </Link>
  )
  const identificacion = (expediente: IExpediente) => {
    const documento = expediente.solicitante?.documento?.trim()
    return (
      <p className="text-xs tabular-nums text-gray-500">
        <span className="whitespace-nowrap font-medium text-gray-700">{formatNumeroEstudio(expediente.numero_expediente)}</span>
        {/* El separador va pegado al documento: sin documento, o si este baja de línea, no queda un «·» colgando. */}
        {documento && <span className="whitespace-nowrap"> · {documento}</span>}
      </p>
    )
  }

  const th = 'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500'
  const fondo = (f: Fila) => (f.propio ? 'bg-coral-50/60 hover:bg-coral-50' : 'hover:bg-gray-50')

  return (
    <>
      {/* Según el ancho real de la lista (no de la ventana), como la cola de Cofianza. */}
      <div className="@container">
        <div className="hidden @5xl:block">
          <table className="w-full table-fixed">
            <colgroup>
              <col />
              <col />
              <col className="w-[13rem]" />
              <col className="w-[14rem]" />
              {conResponsable && <col className="w-[9.5rem]" />}
              <col className="w-[7.5rem]" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200">
                <th
                  scope="col"
                  className={th}
                  aria-sort={filters.sortBy === 'numero' ? (filters.sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <span className="flex items-center gap-2">
                    Solicitante
                    <span aria-hidden="true" className="text-gray-300">·</span>
                    <SortableHeader
                      column="numero"
                      label={SORTABLE_COLUMNS.numero.label}
                      currentSortBy={filters.sortBy}
                      currentSortOrder={filters.sortOrder}
                      onSort={onSort}
                    />
                  </span>
                </th>
                <th scope="col" className={th}>Inmueble</th>
                <th scope="col" className={th}>Etapa</th>
                <th scope="col" className={th}>Qué sigue</th>
                {conResponsable && (
                  <th scope="col" className={th}>
                    {/* Abre a la izquierda: la columna va cerca del borde derecho. */}
                    <span className="inline-flex items-center gap-0.5">
                      Responsable
                      <InfoTip texto={AYUDA.responsable} etiqueta="Qué es el responsable" lado="izquierda" />
                    </span>
                  </th>
                )}
                <th
                  scope="col"
                  className={th}
                  aria-sort={
                    filters.sortBy === 'updated_at' || filters.sortBy === 'created_at'
                      ? filters.sortOrder === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  <ActividadHeader currentSortBy={filters.sortBy} currentSortOrder={filters.sortOrder} onOrdenar={onOrdenar} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filas.map((fila) => {
                const { expediente } = fila
                return (
                  <tr key={expediente.id} onClick={() => abrir(expediente.id)} className={cn('cursor-pointer align-top transition-colors', fondo(fila))}>
                    <td className="px-3 py-3">
                      {enlace(expediente, 'block break-words text-sm font-medium text-gray-900')}
                      {identificacion(expediente)}
                    </td>
                    <td className="px-3 py-3">
                      <Inmueble expediente={expediente} />
                    </td>
                    <td className="px-3 py-3">
                      <Etapa datos={fila.datos} />
                    </td>
                    <td className="px-3 py-3">
                      <QueSigue fila={fila} vista={vista} />
                    </td>
                    {conResponsable && <td className="px-3 py-3">{responsable(expediente)}</td>}
                    <td className="px-3 py-3">
                      <Actividad expediente={expediente} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Angosta y media: filas apiladas, con «Qué sigue» arriba. Sin borde propio:
            ya están dentro de la superficie de la lista (tarjeta en tarjeta). */}
        <ul className="-my-1 divide-y divide-gray-100 @5xl:hidden">
          {filas.map((fila) => {
            const { expediente } = fila
            return (
              <li key={expediente.id} className="py-1">
                <div
                  onClick={() => abrir(expediente.id)}
                  className={cn(
                    '-mx-2 grid cursor-pointer gap-x-6 gap-y-2.5 rounded-lg px-2 py-3 transition-colors @xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]',
                    fondo(fila),
                  )}
                >
                  <div className="flex min-w-0 flex-col gap-2">
                    <div>
                      {enlace(expediente, 'break-words text-sm font-semibold text-gray-900')}
                      {identificacion(expediente)}
                    </div>
                    <QueSigue fila={fila} vista={vista} />
                    <Etapa datos={fila.datos} />
                  </div>

                  <div className="flex min-w-0 flex-col gap-2.5">
                    <Inmueble expediente={expediente} />
                    <div className="mt-auto flex min-h-10 items-center justify-between gap-3">
                      {conResponsable ? responsable(expediente) : <span />}
                      <div className="text-right">
                        <Actividad expediente={expediente} />
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Una sola vez al pie, no en cada fila: «(no es el de Cofianza)» competía con la etapa. */}
      {conPuntaje && (
        // La burbuja va al inicio de la línea y abre a la derecha: al final, en 390 px, se salía del borde.
        <p className="flex items-start gap-1 pt-3 text-xs text-gray-500">
          <InfoTip texto={AYUDA_PUNTAJE} etiqueta="Qué es el puntaje de la central" lado="derecha" className="-mt-0.5 shrink-0" />
          <span>El puntaje que se muestra es el de la central de riesgo (0 a 999), no el de Cofianza.</span>
        </p>
      )}

      <Paginacion meta={meta} limit={filters.limit} onPageChange={onPageChange} onLimitChange={onLimitChange} />
    </>
  )
}

/** Estado vacío según por qué está vacía la tabla (compartido con la cola de Cofianza). */
export function EstadoVacio({
  vacio,
  puedeCrear,
  onClearFilters,
  equipo = false,
}: {
  vacio: NonNullable<ExpedientesTableProps['vacio']>
  puedeCrear: boolean
  onClearFilters?: () => void
  /** Solo lectura: lo pendiente es de su equipo, no de quien mira. */
  equipo?: boolean
}) {
  // Solo lectura (o sin poder crear): lo pendiente y lo nuevo son de su equipo, no de quien mira.
  const [titulo, texto] = VACIO[equipo && vacio === 'accion' ? 'accion_equipo' : equipo && vacio === 'nada' ? 'nada_equipo' : vacio]
  return (
    <div className="text-center py-12">
      {vacio === 'accion' || vacio === 'accion_equipo' ? (
        <IconCheckCircle size={48} className="mx-auto text-primary-300 mb-4" />
      ) : (
        <IconFolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
      )}
      <h2 className="text-lg font-medium text-gray-900 mb-1">{titulo}</h2>
      {texto && <p className="mx-auto max-w-md text-sm text-gray-500 mb-4">{texto}</p>}
      {vacio === 'filtros' && onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex min-h-10 items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <IconX size={16} />
          {M.CLEAR_FILTERS}
        </button>
      )}
      {vacio === 'nada' && puedeCrear && (
        // El mismo botón que el del encabezado (antes uno era naranja y el otro verde).
        <Link href="/expedientes/nuevo" className={buttonClasses('accent')}>
          <IconPlus size={16} />
          {M.NEW_EXPEDIENTE}
        </Link>
      )}
    </div>
  )
}

/** Paginación de la lista (compartida con la cola de Cofianza). */
export function Paginacion({
  meta,
  limit,
  onPageChange,
  onLimitChange,
}: {
  meta: IExpedientesMeta | null
  limit: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}) {
  if (!meta || meta.totalPages <= 1) return null
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
      {/* Info y selector de items */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-gray-600">
        <span>
          Mostrando {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
        </span>
        <select
          aria-label="Estudios por página"
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="h-10 px-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
          className="inline-flex min-h-10 min-w-10 items-center justify-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                aria-label={`Página ${pageNum}`}
                aria-current={pageNum === meta.page ? 'page' : undefined}
                className={cn(
                  'min-h-10 min-w-10 rounded-lg text-sm font-medium tabular-nums transition-colors',
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
          className="inline-flex min-h-10 min-w-10 items-center justify-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <IconChevronRight size={18} />
        </button>
      </div>
        </div>
  )
}
