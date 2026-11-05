/**
 * ExpedientesFilters - HP-229
 * Panel de filtros para listado de expedientes
 */

'use client'

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
            className={`${campo} w-full pl-9 pr-9 placeholder:text-gray-500`}
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
              aria-label="Filtrar por responsable"
              value={usaMiembros ? (filters.miembro_responsable_id ?? '') : filters.analista_id}
              onChange={(e) =>
                onFilterChange(
                  usaMiembros ? { miembro_responsable_id: e.target.value } : { analista_id: e.target.value },
                )
              }
              className={`${campo} min-w-0 flex-1 px-3 md:w-52 md:flex-none`}
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
          )}

          {/* U18: el rango lleva rótulo visible («Creado … a …»); el placeholder de un date no se ve. */}
          <fieldset className="flex h-10 w-full min-w-0 items-center md:w-auto gap-1.5 rounded-lg border border-gray-200 bg-white pl-3 pr-1 focus-within:ring-2 focus-within:ring-primary-500">
            <legend className="sr-only">Fecha de creación</legend>
            <IconCalendar size={16} className="hidden shrink-0 text-gray-500 sm:block" />
            <span aria-hidden="true" className="text-sm text-gray-600">Creado</span>
            <input
              type="date"
              aria-label="Creado desde"
              value={filters.fecha_desde}
              onChange={(e) => onFilterChange({ fecha_desde: e.target.value })}
              className="h-8 min-w-0 flex-1 rounded-md px-1 text-sm text-gray-900 focus:outline-none md:w-[8.5rem] md:flex-none"
            />
            <span aria-hidden="true" className="text-sm text-gray-500">a</span>
            <input
              type="date"
              aria-label="Creado hasta"
              value={filters.fecha_hasta}
              onChange={(e) => onFilterChange({ fecha_hasta: e.target.value })}
              className="h-8 min-w-0 flex-1 rounded-md px-1 text-sm text-gray-900 focus:outline-none md:w-[8.5rem] md:flex-none"
            />
          </fieldset>

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
