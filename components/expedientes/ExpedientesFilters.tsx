/**
 * ExpedientesFilters - HP-229
 * Panel de filtros para listado de expedientes
 */

'use client'

import { useState } from 'react'
import { IconSearch, IconX, IconLoader, IconCalendar } from '@/components/icons'
import { EXPEDIENTE_UI_MESSAGES } from './constants'
import type { IExpedienteFilters, IAnalistaOption } from '@/types/expediente'

export interface ExpedientesFiltersProps {
  filters: IExpedienteFilters
  analistas: IAnalistaOption[]
  /** Miembros del equipo de la inmobiliaria (perfil_id → nombre). Cuando llegan,
   *  el select filtra por miembro_responsable_id en vez de analista_id: el
   *  select interno siempre salia vacio para la inmobiliaria. */
  miembros?: Record<string, string>
  isLoading: boolean
  onFilterChange: (filters: Partial<IExpedienteFilters>) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
  /** Propietario: no tiene equipo, el select de responsable sobra. */
  ocultarResponsable?: boolean
  /** Cola de Cofianza: una sola barra sobre la tabla (sin tarjeta propia ni rótulos apilados). */
  barra?: boolean
  /** Barra: control extra al final (p. ej. «Asignados a mí»). */
  accesorio?: React.ReactNode
}

type Periodo = '' | 'hoy' | '7' | '30' | 'mes' | 'otro'

/** Fecha de hoy en Colombia como AAAA-MM-DD (lo que esperan fecha_desde/fecha_hasta). */
function hoyBogota(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
}

function restarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - dias)).toISOString().slice(0, 10)
}

/** Rango de cada periodo; «hasta» vacío = sin tope (incluye hoy). */
function rangoPeriodo(p: Exclude<Periodo, '' | 'otro'>, hoy: string): { fecha_desde: string; fecha_hasta: string } {
  if (p === 'hoy') return { fecha_desde: hoy, fecha_hasta: hoy }
  if (p === 'mes') return { fecha_desde: `${hoy.slice(0, 8)}01`, fecha_hasta: '' }
  return { fecha_desde: restarDias(hoy, Number(p) - 1), fecha_hasta: '' }
}

function periodoDe(desde: string, hasta: string, hoy: string): Periodo {
  if (!desde && !hasta) return ''
  for (const p of ['hoy', '7', '30', 'mes'] as const) {
    const r = rangoPeriodo(p, hoy)
    if (r.fecha_desde === desde && r.fecha_hasta === hasta) return p
  }
  return 'otro'
}

/**
 * Barra de la cola: un selector de periodo en vez de dos fechas nativas
 * («dd/mm/aaaa a dd/mm/aaaa» se leía como ruido). «Otro rango…» abre
 * las dos fechas para lo que no cabe en los periodos.
 */
function FiltroPeriodo({
  desde,
  hasta,
  onChange,
  campo,
}: {
  desde: string
  hasta: string
  onChange: (f: Partial<IExpedienteFilters>) => void
  campo: string
}) {
  // Solo para reconocer el periodo elegido (leer la hora en cada render es impuro); elegir() la recalcula.
  const [hoy] = useState(hoyBogota)
  const [abrirRango, setAbrirRango] = useState(false)
  // «Limpiar filtros» (o borrar las dos fechas) cierra el rango personalizado.
  const [previas, setPrevias] = useState({ desde, hasta })
  if (previas.desde !== desde || previas.hasta !== hasta) {
    setPrevias({ desde, hasta })
    if (!desde && !hasta) setAbrirRango(false)
  }
  const periodo = abrirRango ? 'otro' : periodoDe(desde, hasta, hoy)

  const elegir = (p: Periodo) => {
    if (p === 'otro') {
      setAbrirRango(true)
      return
    }
    setAbrirRango(false)
    // «Hoy» al elegir, no al montar: con la pantalla abierta desde ayer, «Creado hoy» sería ayer.
    onChange(p === '' ? { fecha_desde: '', fecha_hasta: '' } : rangoPeriodo(p, hoyBogota()))
  }

  const fecha = 'h-8 min-w-0 flex-1 rounded-md px-1 text-sm text-gray-900 focus:outline-none md:w-[8.5rem] md:flex-none'
  return (
    <>
      <div className="relative min-w-0 grow basis-40 md:w-56 md:grow-0 md:basis-auto">
        <IconCalendar size={16} className="pointer-events-none absolute inset-y-0 left-3 my-auto text-gray-500" />
        <select
          aria-label="Fecha de creación"
          value={periodo}
          onChange={(e) => elegir(e.target.value as Periodo)}
          className={`${campo} w-full pl-9 pr-3`}
        >
          <option value="">Creado: cualquier fecha</option>
          <option value="hoy">Creado hoy</option>
          <option value="7">Últimos 7 días</option>
          <option value="30">Últimos 30 días</option>
          <option value="mes">Este mes</option>
          <option value="otro">Otro rango…</option>
        </select>
      </div>
      {periodo === 'otro' && (
        <fieldset className="flex h-10 w-full min-w-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 focus-within:ring-2 focus-within:ring-primary-500 md:w-auto">
          <legend className="sr-only">Rango de creación</legend>
          <input
            type="date"
            aria-label="Creado desde"
            value={desde}
            max={hasta || undefined}
            onChange={(e) => onChange({ fecha_desde: e.target.value })}
            className={fecha}
          />
          <span aria-hidden="true" className="text-sm text-gray-500">a</span>
          <input
            type="date"
            aria-label="Creado hasta"
            value={hasta}
            min={desde || undefined}
            onChange={(e) => onChange({ fecha_hasta: e.target.value })}
            className={fecha}
          />
        </fieldset>
      )}
    </>
  )
}

export function ExpedientesFilters({
  filters,
  analistas,
  miembros,
  isLoading,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
  ocultarResponsable = false,
  barra = false,
  accesorio,
}: ExpedientesFiltersProps) {
  const usaMiembros = Object.keys(miembros ?? {}).length > 0

  if (barra) {
    const campo =
      'h-10 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
    return (
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <div className="relative min-w-0 md:flex-1 md:basis-64">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            {isLoading ? (
              <IconLoader size={16} className="animate-spin text-gray-500" />
            ) : (
              <IconSearch size={16} className="text-gray-500" />
            )}
          </div>
          <input
            type="search"
            aria-label="Buscar estudios"
            placeholder="Código, inmueble o solicitante"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            // Sin la «x» nativa de type=search: ya hay un botón para borrar (salían dos).
            className={`${campo} w-full pl-9 pr-9 placeholder:text-gray-500 [&::-webkit-search-cancel-button]:appearance-none`}
          />
          {filters.search && (
            <button
              type="button"
              aria-label="Borrar la búsqueda"
              onClick={() => onFilterChange({ search: '' })}
              className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-gray-500 hover:text-gray-700"
            >
              <IconX size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!ocultarResponsable && (
            <select
              aria-label={usaMiembros ? 'Filtrar por responsable' : 'Filtrar por analista'}
              value={usaMiembros ? (filters.miembro_responsable_id ?? '') : filters.analista_id}
              onChange={(e) =>
                onFilterChange(
                  usaMiembros ? { miembro_responsable_id: e.target.value } : { analista_id: e.target.value },
                )
              }
              className={`${campo} min-w-0 grow basis-full px-3 sm:basis-40 md:w-52 md:grow-0 md:basis-auto`}
            >
              {/* La columna de la cola se llama «Analista»: el filtro, igual. */}
              <option value="">{usaMiembros ? 'Todos los responsables' : 'Todos los analistas'}</option>
              {usaMiembros
                ? Object.entries(miembros ?? {}).map(([id, nombre]) => (
                    <option key={id} value={id}>
                      {nombre}
                    </option>
                  ))
                : analistas.map((analista) => (
                    <option key={analista.id} value={analista.id}>
                      {analista.nombre}
                    </option>
                  ))}
            </select>
          )}

          <FiltroPeriodo desde={filters.fecha_desde} hasta={filters.fecha_hasta} onChange={onFilterChange} campo={campo} />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <IconX size={14} />
              {EXPEDIENTE_UI_MESSAGES.CLEAR_FILTERS}
            </button>
          )}
          {accesorio}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Búsqueda y filtros principales */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        {/* Campo de búsqueda */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isLoading ? (
              <IconLoader size={18} className="text-gray-500 animate-spin" />
            ) : (
              <IconSearch size={18} className="text-gray-500" />
            )}
          </div>
          <input
            type="text"
            aria-label="Buscar estudios"
            placeholder={EXPEDIENTE_UI_MESSAGES.SEARCH_PLACEHOLDER}
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {filters.search && (
            <button
              type="button"
              aria-label="Borrar la búsqueda"
              onClick={() => onFilterChange({ search: '' })}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-600"
            >
              <IconX size={16} />
            </button>
          )}
        </div>

        {/* Filtro de responsable */}
        {!ocultarResponsable && (
          <div className="lg:w-56">
            <select
              aria-label="Filtrar por responsable"
              value={usaMiembros ? (filters.miembro_responsable_id ?? '') : filters.analista_id}
              onChange={(e) =>
                onFilterChange(
                  usaMiembros
                    ? { miembro_responsable_id: e.target.value }
                    : { analista_id: e.target.value },
                )
              }
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              <option value="">Todos los responsables</option>
              {usaMiembros
                ? Object.entries(miembros ?? {}).map(([id, nombre]) => (
                    <option key={id} value={id}>
                      {nombre}
                    </option>
                  ))
                : analistas.map((analista) => (
                    <option key={analista.id} value={analista.id}>
                      {analista.nombre}
                    </option>
                  ))}
            </select>
          </div>
        )}

        {/* Filtro de fechas (U18: con rótulo visible; el placeholder de un date no se ve) */}
        <div className="flex gap-2 lg:w-auto">
          <div className="min-w-0 flex-1 lg:w-40">
            <label htmlFor="filtro-creado-desde" className="mb-1 block text-xs font-medium text-gray-600">
              Creado desde
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IconCalendar size={16} className="text-gray-500" />
              </div>
              <input
                id="filtro-creado-desde"
                type="date"
                value={filters.fecha_desde}
                onChange={(e) => onFilterChange({ fecha_desde: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="min-w-0 flex-1 lg:w-40">
            <label htmlFor="filtro-creado-hasta" className="mb-1 block text-xs font-medium text-gray-600">
              Creado hasta
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IconCalendar size={16} className="text-gray-500" />
              </div>
              <input
                id="filtro-creado-hasta"
                type="date"
                value={filters.fecha_hasta}
                onChange={(e) => onFilterChange({ fecha_hasta: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Botón limpiar filtros */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClearFilters}
            className="flex min-h-10 items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
          >
            <IconX size={14} />
            {EXPEDIENTE_UI_MESSAGES.CLEAR_FILTERS}
          </button>
        </div>
      )}
    </div>
  )
}
