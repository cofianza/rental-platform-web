/**
 * Cola de estudios de Cofianza (administrador, operador, Gerencia). La misma
 * información que ExpedientesTable, ordenada para quien revisa: la etapa y
 * «Qué sigue» van en columnas separadas, y lo que le toca a quien mira
 * («Su turno…») se distingue del turno de los demás. La inmobiliaria y el
 * propietario siguen con ExpedientesTable (EstudiosExpedientesFusion).
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { Avatar } from '@/components/ui/Avatar'
import { IconArrowRight, IconClock, IconLoader, IconUserCheck } from '@/components/icons'
import { tomarDisponible } from '@/lib/etapaFila'
import { AYUDA } from '@/lib/ayudaEstudio'
import { cn, formatNumeroEstudio } from '@/lib/utils'
import type { VistaTurno } from '@/lib/etapaEstudio'
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
  /** «Su turno…»: le toca actuar a quien mira. */
  propio: boolean
}

/** Ciudad e inmobiliaria en una línea: la inmobiliaria ya no tiene columna propia que la recorte. */
function lugar(e: IExpediente): string {
  const partes = [e.inmueble?.ciudad, nombreInmobiliaria(e)].filter((p) => p && p !== '—')
  return partes.join(' · ')
}

function Inmueble({ expediente }: { expediente: IExpediente }) {
  const direccion = expediente.inmueble ? expediente.inmueble.titulo || expediente.inmueble.direccion : null
  return (
    <div className="min-w-0">
      {direccion ? (
        <p title={direccion} className="line-clamp-2 break-words text-sm text-gray-900">
          {direccion}
        </p>
      ) : (
        <p className="text-sm text-gray-500">Inmueble por definir</p>
      )}
      <p title={lugar(expediente)} className="mt-0.5 line-clamp-2 break-words text-xs text-gray-500">
        {lugar(expediente)}
      </p>
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
      ) : (
        <span className="text-sm text-gray-500">
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
  const analista = rol === 'administrador' || rol === 'operador_analista'
  const vista: VistaTurno = 'cofianza'
  // Hora fijada al montar: Date.now() en render es impuro.
  const [ahora] = useState(() => Date.now())

  if (expedientes.length === 0) {
    // Cofianza no crea estudios desde el vacío de su cola: el botón está en el encabezado.
    return <EstadoVacio vacio={vacio} puedeCrear={false} onClearFilters={onClearFilters} />
  }

  const filas: Fila[] = expedientes.map((expediente) => {
    const datos = datosEstadoFila(expediente, { interno: true, vista, analista, ahora })
    return {
      expediente,
      datos,
      propio: !!datos.turno && turnoPropio(datos.turno.turno, vista, datos.turno),
    }
  })
  const conPuntaje = filas.some((f) => f.datos.score > 0)

  const abrir = (id: string) => router.push(`/expedientes/${id}`)
  const teclaFila = (e: React.KeyboardEvent<HTMLElement>) => {
    // Solo la fila: Enter sobre «Tomar» hace lo suyo, no abre el estudio.
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.currentTarget.click()
    }
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
        <span className="text-sm text-gray-500">
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
        className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-primary-600 bg-white px-3 text-sm font-semibold text-primary-700 shadow-sm transition-colors hover:bg-primary-50 active:bg-primary-100 disabled:cursor-wait disabled:opacity-60"
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
              <col className="w-[12.5rem]" />
              <col className="w-[13rem]" />
              <col className="w-[9rem]" />
              <col className="w-[8rem]" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200">
                {/* El número va bajo el nombre: una columna menos y sin cortes en «N.º 2026-…». */}
                <th scope="col" className={th}>
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
                <th scope="col" className={th}>
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
                    role="button"
                    tabIndex={0}
                    onKeyDown={teclaFila}
                    aria-label={`Abrir el estudio ${formatNumeroEstudio(expediente.numero_expediente)}`}
                    className={cn(
                      'cursor-pointer align-top transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-600',
                      fila.propio ? 'bg-coral-50/60 hover:bg-coral-50' : 'hover:bg-gray-50',
                    )}
                  >
                    <td className="px-3 py-3">
                      <p className="break-words text-sm font-medium text-gray-900">
                        {expediente.solicitante?.nombre ?? 'Sin solicitante'}
                      </p>
                      <p className="text-xs tabular-nums text-gray-500">
                        <span className="whitespace-nowrap font-medium text-gray-700">
                          {formatNumeroEstudio(expediente.numero_expediente)}
                        </span>
                        {expediente.solicitante && <> · <span className="whitespace-nowrap">{expediente.solicitante.documento}</span></>}
                      </p>
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
                    <td className="px-3 py-2.5">{responsable(fila)}</td>
                    <td className="px-3 py-3">
                      <Actividad expediente={expediente} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Angosta y media: tarjetas, con «Qué sigue» antes que el inmueble. */}
        <ul className="grid gap-3 @xl:grid-cols-2 @5xl:hidden">
          {filas.map((fila) => {
            const { expediente } = fila
            return (
              <li key={expediente.id}>
                <div
                  onClick={() => abrir(expediente.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={teclaFila}
                  aria-label={`Abrir el estudio ${formatNumeroEstudio(expediente.numero_expediente)}`}
                  className={cn(
                    'flex h-full cursor-pointer flex-col gap-3 rounded-lg border p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600',
                    fila.propio
                      ? 'border-coral-200 bg-coral-50/60 hover:border-coral-300'
                      : 'border-gray-200 bg-white hover:border-gray-300',
                  )}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 break-words text-sm font-semibold text-gray-900">
                      {expediente.solicitante?.nombre ?? 'Sin solicitante'}
                    </p>
                    <span className="shrink-0 text-xs font-medium tabular-nums text-gray-500">
                      {formatNumeroEstudio(expediente.numero_expediente)}
                    </span>
                  </div>

                  <QueSigue fila={fila} vista={vista} />
                  <Etapa datos={fila.datos} />
                  <Inmueble expediente={expediente} />

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
                    {responsable(fila)}
                    <div className="text-right">
                      <Actividad expediente={expediente} />
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
          <div key={i} className="grid grid-cols-[1fr_1fr_12.5rem_13rem_9rem_8rem] gap-0 py-3.5">
            <div className="space-y-1.5 px-3">{barra('h-4 w-28')}{barra('h-3 w-32')}</div>
            <div className="space-y-1.5 px-3">{barra('h-4 w-40')}{barra('h-3 w-24')}</div>
            <div className="px-3">{barra('h-5 w-28 rounded-full')}</div>
            <div className="px-3">{barra('h-4 w-36')}</div>
            <div className="px-3">{barra('h-8 w-20 rounded-lg')}</div>
            <div className="space-y-1.5 px-3">{barra('h-4 w-12')}{barra('h-3 w-20')}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 @xl:grid-cols-2 @5xl:hidden">
        {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border border-gray-200 p-4">
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
