/**
 * ExpedientesListado — listado con bandejas operativas, filtros y tabla. Solo
 * para Cofianza (administrador, operador, Gerencia): la inmobiliaria y el
 * propietario usan EstudiosExpedientesFusion.
 *
 * Usa useExpedientes (que escribe el querystring). NO montar simultáneamente
 * con otro listado que use el mismo querystring.
 */

'use client'

import { buttonClasses } from '@/components/ui/Button'
import Link from 'next/link'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader, ExportButton } from '@/components/ui'
import { IconPlus, IconRefresh, IconAlertTriangle, IconLoader, IconX } from '@/components/icons'
import { useExpedientes } from '@/hooks/useExpedientes'
import { expedienteService } from '@/services/expedienteService'
import { useAuthStore } from '@/stores/auth.store'
import { BandejaTabs, ToggleAsignados } from './BandejaTabs'
import { ExpedientesFilters } from './ExpedientesFilters'
import { FiltrosActivos } from './FiltrosActivos'
import { ExpedientesTablaCofianza, ExpedientesTablaCofianzaSkeleton } from './ExpedientesTablaCofianza'
import { EXPEDIENTE_UI_MESSAGES } from './constants'
import { instanteBogota } from '@/lib/utils'
import { corregirFiltroDeBandeja, estudioFiltroDeBandeja } from '@/lib/bandejaCofianza'
import { chipsDeFiltros, hoyBogota, QUITAR_CHIP, type ClaveChip } from '@/lib/filtrosExpedientes'

export function ExpedientesListado() {
  const user = useAuthStore((s) => s.user)
  // El solicitante no crea expedientes — el flujo arranca con la cita previa
  // que dispara el propietario/inmobiliaria desde su panel. Ocultamos el CTA.
  const puedeEditar = usePuedeEditar()
  const puedeCrearExpediente = user?.rol !== 'solicitante' && puedeEditar
  // Solo quien asigna analistas puede "Tomar" desde la lista. Gerencia consulta
  // e inmobiliaria no asignan analista interno.
  const puedeAsignar = user?.rol === 'administrador' || user?.rol === 'operador_analista'
  const [tomandoId, setTomandoId] = useState<string | null>(null)
  const {
    expedientes,
    filasDeLaPestana,
    meta,
    stats,
    filters,
    analistas,
    inmobiliarias,
    errorInmobiliarias,
    sinFiltroInmobiliaria,
    reintentarInmobiliarias,
    statsVigentes,
    isLoadingStats,
    isLoading,
    error,
    activeBandeja,
    misExpedientes,
    setActiveBandeja,
    toggleMisExpedientes,
    setFilters,
    clearFilters,
    handleSort,
    hasActiveFilters,
    fetchExpedientes,
  } = useExpedientes()

  // Chips de los filtros activos (filtro mejorado, 27-nov). «Hoy» fijado al montar: leer la hora en cada render es impuro.
  const [hoy] = useState(hoyBogota)
  const chips = chipsDeFiltros(filters, { analistas, inmobiliarias, misExpedientes, hoy })
  const quitarChip = (clave: ClaveChip) => {
    // «Asignados a mí» se apaga con su interruptor (que también limpia el analista).
    if (clave === 'asignados') toggleMisExpedientes()
    else setFilters(QUITAR_CHIP[clave])
  }
  // Sin chips, el foco vuelve al buscador (no al final de la página).
  const barraRef = useRef<HTMLDivElement>(null)
  const enfocarBusqueda = () => barraRef.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus()

  // «Turno del gestor»: llega por el enlace del aviso de bloqueos.
  const requiereAccionActivo = filters.estudio_filtro === 'requiere_accion'
  const elegirBandeja = (bandeja: Parameters<typeof setActiveBandeja>[0]) => {
    setActiveBandeja(bandeja)
    // «En revisión de Cofianza» pide la lista con su chip (si la API lo sabe); las demás, sin chip (también
    // quita «Turno del gestor»).
    const filtro = estudioFiltroDeBandeja(bandeja, stats)
    if ((filters.estudio_filtro ?? 'todos') !== filtro) setFilters({ estudio_filtro: filtro, page: 1 })
    // Adenda de precios §8.2: la cola del analista va por prioridad (la ordena
    // la API) y luego por antigüedad: lo más antiguo primero.
    if (bandeja === 'condicionado' && puedeAsignar) setFilters({ sortBy: 'created_at', sortOrder: 'asc', page: 1 })
  }

  // Con la bandeja del condicionado elegida (p. ej. desde la URL) el chip sigue lo que sabe la API: con el
  // conteo, «En revisión de Cofianza»; sin él, todo el estado condicionado («Condicionados»).
  const filtroACorregir = corregirFiltroDeBandeja(activeBandeja, stats, filters.estudio_filtro)
  useEffect(() => {
    if (filtroACorregir) setFilters({ estudio_filtro: filtroACorregir, page: 1 })
  }, [filtroACorregir, setFilters])

  // Estado de error
  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <IconAlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">No se pudieron cargar los estudios</h2>
        <p className="mx-auto max-w-md text-sm text-gray-500 mb-4">{error}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => fetchExpedientes()}
            className="inline-flex min-h-10 items-center gap-2 px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors"
          >
            <IconRefresh size={18} />
            {EXPEDIENTE_UI_MESSAGES.ERROR_RETRY}
          </button>
          {/* Si el error viene de un filtro (p. ej. la inmobiliaria elegida), reintentar lo repetiría: quitarlos. */}
          {hasActiveFilters() && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              <IconX size={16} />
              {EXPEDIENTE_UI_MESSAGES.CLEAR_FILTERS}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Estudios"
        // Mientras carga otra bandeja, no la cifra de la anterior.
        subtitle={meta && filasDeLaPestana ? `${meta.total} estudios` : 'Cargando...'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButton
              endpoint="/export/expedientes"
              params={{
                ...(filters.search ? { search: filters.search } : {}),
                ...(filters.estado.length > 0 ? { estado: filters.estado.join(',') } : {}),
                ...(filters.analista_id ? { analista_id: filters.analista_id } : {}),
                ...(filters.miembro_responsable_id ? { miembro_responsable_id: filters.miembro_responsable_id } : {}),
                // El API de exportar lee fecha_desde/fecha_hasta (dateFrom es de los reportes).
                ...(filters.fecha_desde ? { fecha_desde: instanteBogota(filters.fecha_desde, 'inicio') } : {}),
                ...(filters.fecha_hasta ? { fecha_hasta: instanteBogota(filters.fecha_hasta, 'fin') } : {}),
              }}
              entityName="Estudios"
            />
            {puedeCrearExpediente && (
              <Link href="/expedientes/nuevo" className={buttonClasses()}>
                <IconPlus size={16} />
                {EXPEDIENTE_UI_MESSAGES.NEW_EXPEDIENTE}
              </Link>
            )}
          </div>
        }
      />

      {/* Bandejas operativas; «Asignados a mí» va con los filtros */}
      <BandejaTabs
        activeBandeja={activeBandeja}
        misExpedientes={misExpedientes}
        stats={stats}
        onBandejaChange={elegirBandeja}
        onToggleMisExpedientes={toggleMisExpedientes}
        requiereAccionActivo={requiereAccionActivo}
        mostrarToggle={false}
        // Con el filtro de inmobiliaria recién cambiado, los números son del anterior: no se muestran hasta que llegan
        // los nuevos (y si no llegan, «—», nunca un número de otra organización).
        conteosOcultos={statsVigentes ? undefined : isLoadingStats ? 'cargando' : 'sin_dato'}
      />

      {/* Una sola superficie: la barra de filtros encabeza la cola que filtra. */}
      <section aria-label="Estudios" className="rounded-lg border border-gray-200 bg-white">
        <div ref={barraRef} className="border-b border-gray-100 p-3 sm:p-4">
          <ExpedientesFilters
            barra
            filters={filters}
            analistas={analistas}
            isLoading={isLoading}
            onFilterChange={setFilters}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters()}
            accesorio={<ToggleAsignados activo={misExpedientes} onToggle={toggleMisExpedientes} />}
            // Con una API anterior (sin el filtro) no se muestra: diría «Inmobiliaria: X» con la lista de todas.
            inmobiliarias={sinFiltroInmobiliaria ? undefined : inmobiliarias}
            errorInmobiliarias={errorInmobiliarias}
            onReintentarInmobiliarias={() => void reintentarInmobiliarias()}
            panelMovil
            filtrosActivos={<FiltrosActivos chips={chips} onQuitar={quitarChip} onLimpiar={clearFilters} onSinChips={enfocarBusqueda} />}
          />
        </div>

        <div
          className={`relative p-3 sm:p-4${isLoading && expedientes.length > 0 && filasDeLaPestana ? ' pointer-events-none opacity-60' : ''}`}
          aria-busy={isLoading}
        >
          {/* Al volver, al buscar, ordenar o pasar de página se siguen viendo las filas de antes mientras
              llegan las nuevas. Al cambiar de bandeja no: serían de otro estado (reporte de Gerencia, punto 12). */}
          {isLoading && expedientes.length > 0 && filasDeLaPestana && (
            <span role="status" className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs text-gray-600 shadow-sm">
              <IconLoader size={12} className="animate-spin" /> Actualizando…
            </span>
          )}
          {(isLoading && expedientes.length === 0) || !filasDeLaPestana ? (
            <>
              <span role="status" className="sr-only">Cargando estudios…</span>
              <ExpedientesTablaCofianzaSkeleton count={filters.limit} />
            </>
          ) : (
            <ExpedientesTablaCofianza
              expedientes={expedientes}
              meta={meta}
              filters={filters}
              onSort={handleSort}
              onOrdenar={(sortBy, sortOrder) => setFilters({ sortBy, sortOrder, page: 1 })}
              onPageChange={(page) => setFilters({ page })}
              onLimitChange={(limit) => setFilters({ limit, page: 1 })}
              vacio={
                // U22: «Asignados a mí» filtra por analista; sin otro filtro, el vacío lo explica.
                // X11: con una pestaña activa, «en esta bandeja» (puede tener asignados en otras).
                misExpedientes && !filters.search && !filters.fecha_desde && !filters.fecha_hasta && !filters.inmobiliaria_id
                  ? activeBandeja === null
                    ? 'asignados'
                    : 'asignados_bandeja'
                  : hasActiveFilters()
                    ? 'filtros'
                    : 'bandeja'
              }
              onClearFilters={clearFilters}
              tomandoId={tomandoId}
              onTomar={
                puedeAsignar
                  ? async (id) => {
                      setTomandoId(id)
                      try {
                        await expedienteService.asignarResponsable(id, user!.id, true)
                        toast.success('Estudio asignado a usted')
                        await fetchExpedientes()
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'No se pudo asignar')
                        // Si otro ya lo tomó, la lista estaba vieja: se refresca.
                        if ((e as { code?: string }).code === 'EXPEDIENTE_YA_ASIGNADO') void fetchExpedientes()
                      } finally {
                        setTomandoId(null)
                      }
                    }
                  : undefined
              }
            />
          )}
        </div>
      </section>
    </div>
  )
}
