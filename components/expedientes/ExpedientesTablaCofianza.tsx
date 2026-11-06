/**
 * Cola de estudios de Cofianza (administrador, operador, Gerencia). La misma
 * información que ExpedientesTable, ordenada para quien revisa: la etapa y
 * «Qué sigue» van en columnas separadas, y lo que le toca a quien mira
 * («Su turno…») se distingue del turno de los demás. La inmobiliaria y el
 * propietario siguen con ExpedientesTable (EstudiosExpedientesFusion).
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { Avatar } from '@/components/ui/Avatar'
import { IconArrowRight, IconClock, IconLoader, IconUserCheck } from '@/components/icons'
import { tomarDisponible } from '@/lib/etapaFila'
import { AYUDA } from '@/lib/ayudaEstudio'
import { cn, formatNumeroEstudio } from '@/lib/utils'
import type { EtapaEstudio, VistaTurno } from '@/lib/etapaEstudio'
import type { IExpediente } from '@/types/expediente'
import { AYUDA_PUNTAJE, PastillaEtapa, PrioridadBaja, datosEstadoFila, type DatosEstadoFila } from './EstadoFila'
import { textoTurno, turnoPropio } from './PastillaTurno'
import {
  Actividad,
  ActividadHeader,
  EstadoVacio,
  Paginacion,
  SortableHeader,
  nombreInmobiliaria,
  type ExpedientesTableProps,
} from './ExpedientesTable'
import { SORTABLE_COLUMNS } from './constants'

type Props = Omit<ExpedientesTableProps, 'miembrosResponsablesById'>

interface Fila {
  expediente: IExpediente
  datos: DatosEstadoFila
  /** «Su turno…»: le toca actuar a quien mira (no, si la revisión ya la tomó otro analista). */
  propio: boolean
}

/**
 * Etapas sin nada por hacer: «Qué sigue» lo dice en vez de dejar un guion. No
 * aprobado no entra: puede tener una apelación o reevaluación por decidir.
 */
const TERMINADAS: EtapaEstudio[] = ['cancelado', 'finalizado']

/** Ciudad e inmobiliaria en una línea: la inmobiliaria ya no tiene columna propia que la recorte. */
function lugar(e: IExpediente): string {
  const partes = [e.inmueble?.ciudad, nombreInmobiliaria(e)].filter((p) => p && p !== '—')
  return partes.join(' · ')
}

/** Siglas que se dejan en mayúscula aunque tengan vocales. */
const SIGLAS = new Set(['BBVA', 'NIT', 'SAS', 'IPS', 'EPS', 'UPZ', 'ESE'])
/** Conectores en minúscula salvo al inicio («Calle 10 de la Sierra»). */
const CONECTORES = new Set(['EN', 'EL', 'LA', 'DE', 'DEL', 'LOS', 'LAS', 'Y'])

/**
 * Las direcciones llegan como se digitaron: «CALLE 45 # 12-30 APTO 301» junto a
 * «Calle 10 Sur # 43-21». Solo las escritas todo en mayúsculas se pasan a
 * mayúscula inicial. Quedan igual las palabras con números («40A», «12-30»),
 * las que no tienen vocales («PH», «KR») y las siglas («BBVA», «S.A.S.»).
 */
export function direccionLegible(texto: string): string {
  if (/\p{Ll}/u.test(texto)) return texto
  return texto
    .split(' ')
    .map((w, i) => {
      const letras = w.replace(/[^\p{L}]/gu, '')
      if (!letras || /\d/.test(w)) return w
      const minuscula = w.toLocaleLowerCase('es-CO')
      if (i > 0 && CONECTORES.has(letras)) return minuscula
      if (!/[AEIOUÁÉÍÓÚ]/.test(letras) || SIGLAS.has(letras) || /^(\p{L}\.){2,}/u.test(w)) return w
      return minuscula.charAt(0).toLocaleUpperCase('es-CO') + minuscula.slice(1)
    })
    .join(' ')
}

function Inmueble({ expediente }: { expediente: IExpediente }) {
  const direccion = expediente.inmueble ? expediente.inmueble.titulo || expediente.inmueble.direccion : null
  const donde = lugar(expediente)
  return (
    <div className="min-w-0">
      {direccion ? (
        <p title={direccion} className="line-clamp-2 break-words text-sm text-gray-900">
          {direccionLegible(direccion)}
        </p>
      ) : (
        <p className="text-sm text-gray-500">Inmueble por definir</p>
      )}
      {donde && (
        // Una sola línea: la inmobiliaria se repite fila tras fila y no debe pesar más que la dirección.
        <p title={donde} className="mt-0.5 truncate text-xs text-gray-500">
          {donde}
        </p>
      )}
    </div>
  )
}

function Etapa({ datos }: { datos: DatosEstadoFila }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <PastillaEtapa texto={datos.texto} tono={datos.tono} ayuda={datos.ayuda} />
      {datos.score > 0 && (
        <span title={AYUDA_PUNTAJE} className="text-xs tabular-nums text-gray-500">
          Puntaje de la central: {datos.score}
        </span>
      )}
    </div>
  )
}

/** De quién es el turno y qué hay que hacer; lo propio resalta, lo ajeno queda en segundo plano. */
function QueSigue({ fila, vista }: { fila: Fila; vista: VistaTurno }) {
  const { datos, propio } = fila
  return (
    <div className="flex flex-col items-start gap-1">
      {datos.turno ? (
        propio ? (
          <span className="inline-flex items-start gap-1.5 text-sm font-semibold text-coral-700">
            <IconArrowRight size={16} className="mt-0.5 shrink-0" />
            {textoTurno(datos.turno.turno, vista, datos.turno)}
          </span>
        ) : (
          <span className="text-sm text-gray-600">{textoTurno(datos.turno.turno, vista, datos.turno)}</span>
        )
      ) : TERMINADAS.includes(datos.etapa) ? (
        <span className="text-sm text-gray-500">Nada pendiente</span>
      ) : (
        <span className="text-sm text-gray-400">
          <span aria-hidden="true">—</span>
          <span className="sr-only">Sin turno</span>
        </span>
      )}
      {datos.demora && (
        <span
          className={cn(
            'inline-flex items-center gap-1 text-xs font-medium',
            datos.demora.tono === 'rojo' ? 'text-red-700' : 'text-amber-700',
          )}
        >
          <IconClock size={12} className="shrink-0" />
          {datos.demora.texto}
        </span>
      )}
      {datos.prioridadBaja && <PrioridadBaja />}
    </div>
  )
}

export function ExpedientesTablaCofianza({
  expedientes,
  meta,
  filters,
  onSort,
  onOrdenar,
  onPageChange,
  onLimitChange,
  onTomar,
  tomandoId,
  vacio = 'nada',
  onClearFilters,
}: Props) {
  const router = useRouter()
  const rol = useAuthStore((st) => st.user?.rol)
  const yo = useAuthStore((st) => st.user?.id)
  const analista = rol === 'administrador' || rol === 'operador_analista'
  const vista: VistaTurno = 'cofianza'
  // Hora fijada al montar: Date.now() en render es impuro.
  const [ahora] = useState(() => Date.now())

  if (expedientes.length === 0) {
    // Cofianza no crea estudios desde el vacío de su cola: el botón está en el encabezado.
    return <EstadoVacio vacio={vacio} puedeCrear={false} onClearFilters={onClearFilters} />
  }

  const filas: Fila[] = expedientes.map((expediente) => {
    // yo: si la revisión ya la tomó otro analista, «En revisión de X» en gris (antes el coral se lo marcaba a todos).
    const datos = datosEstadoFila(expediente, { interno: true, vista, analista, ahora, yo })
    return {
      expediente,
      datos,
      propio: !!datos.turno && turnoPropio(datos.turno.turno, vista, datos.turno),
    }
  })
  const conPuntaje = filas.some((f) => f.datos.score > 0)

  // Con el ratón, toda la fila abre el estudio. Con teclado y lector de pantalla
  // se usa el enlace del nombre: una fila role="button" con «Tomar» adentro
  // anidaba un botón en otro y le quitaba a la tabla su semántica.
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

  const responsable = ({ expediente }: Fila) => {
    const nombre = expediente.analista?.nombre ?? null
    if (nombre) {
      return (
        <span className="flex min-w-0 items-center gap-2">
          <Avatar name={nombre} size="sm" />
          <span className="min-w-0 break-words text-sm text-gray-700">{nombre}</span>
        </span>
      )
    }
    if (!onTomar) {
      return (
        <span title={AYUDA.responsable} className="text-sm text-gray-500">
          Sin asignar
        </span>
      )
    }
    // U9: «Tomar» solo cuando el turno es de Cofianza; si no, no hay nada que tomar.
    if (!tomarDisponible(expediente)) {
      return (
        <span className="text-sm text-gray-400">
          <span aria-hidden="true">—</span>
          <span className="sr-only">Sin analista</span>
        </span>
      )
    }
    const tomando = tomandoId === expediente.id
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          void onTomar(expediente.id)
        }}
        disabled={tomando}
        aria-label={`Tomar el estudio ${formatNumeroEstudio(expediente.numero_expediente)}`}
        // Discreto: 40 px de alto para el dedo, pero sin borde ni sombra que compitan con «Qué sigue».
        className="-ml-2.5 -my-2 inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50 active:bg-primary-100 focus-visible:outline-2 focus-visible:outline-primary-600 disabled:cursor-wait disabled:opacity-60"
      >
        {tomando ? <IconLoader size={14} className="animate-spin" /> : <IconUserCheck size={14} />}
        {tomando ? 'Tomando…' : 'Tomar'}
      </button>
    )
  }

  const th = 'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500'

  return (
    <>
      {/* Según el ancho real de la lista (no de la ventana): con el menú lateral
          abierto una pantalla de 1280 px no da para siete datos por fila. */}
      <div className="@container">
        <div className="hidden @5xl:block">
          <table className="w-full table-fixed">
            {/* Fijas las columnas de lectura corta; el solicitante y el inmueble se reparten el resto. */}
            <colgroup>
              <col />
              <col />
              <col className="w-[12rem]" />
              <col className="w-[13rem]" />
              <col className="w-[8.5rem]" />
              <col className="w-[7.5rem]" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200">
                {/* El número va bajo el nombre: una columna menos y sin cortes en «N.º 2026-…». */}
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
                {/* Sin ordenar: el orden por estado formal ya no coincide con la etapa que se ve. */}
                <th scope="col" className={th}>Etapa</th>
                <th scope="col" className={th}>Qué sigue</th>
                <th scope="col" className={th}>Analista</th>
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
                  <tr
                    key={expediente.id}
                    onClick={() => abrir(expediente.id)}
                    className={cn(
                      'cursor-pointer align-top transition-colors',
                      fila.propio ? 'bg-coral-50/60 hover:bg-coral-50' : 'hover:bg-gray-50',
                    )}
                  >
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
                    <td className="px-3 py-3">{responsable(fila)}</td>
                    <td className="px-3 py-3">
                      <Actividad expediente={expediente} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Angosta y media: filas apiladas, con «Qué sigue» antes que el inmueble. Sin
            borde propio: ya están dentro de la superficie de la lista (tarjeta en tarjeta). */}
        <ul className="-my-1 divide-y divide-gray-100 @5xl:hidden">
          {filas.map((fila) => {
            const { expediente } = fila
            return (
              <li key={expediente.id} className="py-1">
                <div
                  onClick={() => abrir(expediente.id)}
                  className={cn(
                    '-mx-2 grid cursor-pointer gap-x-6 gap-y-2.5 rounded-lg px-2 py-3 transition-colors @xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]',
                    fila.propio ? 'bg-coral-50/60 hover:bg-coral-50' : 'hover:bg-gray-50',
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
                      {responsable(fila)}
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

      {conPuntaje && (
        <p className="pt-3 text-xs text-gray-500">
          Puntaje de la central: el de la central de riesgo, de 0 a 999. No es el puntaje de Cofianza.
        </p>
      )}

      <Paginacion meta={meta} limit={filters.limit} onPageChange={onPageChange} onLimitChange={onLimitChange} />
    </>
  )
}

/** Carga inicial con la misma forma que la cola (tabla desde xl, tarjetas antes). */
export function ExpedientesTablaCofianzaSkeleton({ count = 5 }: { count?: number }) {
  const barra = (c: string) => <div className={cn('animate-pulse rounded bg-gray-200', c)} />
  return (
    <div aria-hidden="true" className="@container">
      <div className="hidden divide-y divide-gray-100 @5xl:block">
        <div className="flex gap-6 px-3 py-3">
          {barra('h-3 w-16')}
          {barra('h-3 w-24')}
          {barra('h-3 w-24')}
          {barra('h-3 w-16')}
          {barra('h-3 w-20')}
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_12rem_13rem_8.5rem_7.5rem] gap-0 py-3.5">
            <div className="space-y-1.5 px-3">{barra('h-4 w-28')}{barra('h-3 w-32')}</div>
            <div className="space-y-1.5 px-3">{barra('h-4 w-40')}{barra('h-3 w-24')}</div>
            <div className="px-3">{barra('h-5 w-28 rounded-full')}</div>
            <div className="px-3">{barra('h-4 w-36')}</div>
            <div className="px-3">{barra('h-4 w-16')}</div>
            <div className="space-y-1.5 px-3">{barra('h-4 w-12')}{barra('h-3 w-20')}</div>
          </div>
        ))}
      </div>
      <div className="divide-y divide-gray-100 @5xl:hidden">
        {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
          <div key={i} className="space-y-3 py-4">
            <div className="flex justify-between">{barra('h-4 w-32')}{barra('h-3 w-16')}</div>
            {barra('h-4 w-44')}
            {barra('h-5 w-28 rounded-full')}
            {barra('h-3 w-full')}
          </div>
        ))}
      </div>
    </div>
  )
}
