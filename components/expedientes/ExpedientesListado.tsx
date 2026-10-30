/**
 * ExpedientesListado — listado con bandejas operativas, filtros y tabla. Solo
 * para Cofianza (administrador, operador, Gerencia): la inmobiliaria y el
 * propietario usan EstudiosExpedientesFusion.
 *
 * Usa useExpedientes (que escribe el querystring). NO montar simultáneamente
 * con otro listado que use el mismo querystring.
 */

'use client'

import { Button } from '@/components/ui/Button'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader, ExportButton } from '@/components/ui'
import { IconPlus, IconRefresh, IconAlertTriangle, IconLoader } from '@/components/icons'
import { useExpedientes } from '@/hooks/useExpedientes'
import { expedienteService } from '@/services/expedienteService'
import { useAuthStore } from '@/stores/auth.store'
import { BandejaTabs } from './BandejaTabs'
import { ExpedientesFilters } from './ExpedientesFilters'
import { ExpedientesTable } from './ExpedientesTable'
import { ExpedientesSkeleton } from './ExpedientesSkeleton'
import { EXPEDIENTE_UI_MESSAGES } from './constants'

export function ExpedientesListado() {
  const router = useRouter()
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
    meta,
    stats,
    filters,
    analistas,
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

  // «Turno del gestor»: llega por el enlace del aviso de bloqueos.
  const requiereAccionActivo = filters.estudio_filtro === 'requiere_accion'
  const elegirBandeja = (bandeja: Parameters<typeof setActiveBandeja>[0]) => {
    setActiveBandeja(bandeja)
    if (requiereAccionActivo) setFilters({ estudio_filtro: 'todos', page: 1 })
    // Adenda de precios §8.2: la cola del analista va por prioridad (la ordena
    // la API) y luego por antigüedad: lo más antiguo primero.
    if (bandeja === 'condicionado' && puedeAsignar) setFilters({ sortBy: 'created_at', sortOrder: 'asc', page: 1 })
  }

  // Estado de error
  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <IconAlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar estudios</h3>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button
          onClick={() => fetchExpedientes()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors"
        >
          <IconRefresh size={18} />
          {EXPEDIENTE_UI_MESSAGES.ERROR_RETRY}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Estudios"
        subtitle={meta ? `${meta.total} estudios` : 'Cargando...'}
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              endpoint="/export/expedientes"
              params={{
                ...(filters.search ? { search: filters.search } : {}),
                ...(filters.estado.length > 0 ? { estado: filters.estado.join(',') } : {}),
                ...(filters.analista_id ? { analista_id: filters.analista_id } : {}),
                ...(filters.miembro_responsable_id ? { miembro_responsable_id: filters.miembro_responsable_id } : {}),
                // El API de exportar lee fecha_desde/fecha_hasta (dateFrom es de los reportes).
                ...(filters.fecha_desde ? { fecha_desde: filters.fecha_desde } : {}),
                ...(filters.fecha_hasta ? { fecha_hasta: filters.fecha_hasta } : {}),
              }}
              entityName="Estudios"
            />
            {puedeCrearExpediente && (
              <Button onClick={() => router.push('/expedientes/nuevo')}>
                <IconPlus size={16} />
                {EXPEDIENTE_UI_MESSAGES.NEW_EXPEDIENTE}
              </Button>
            )}
          </div>
        }
      />

      {/* Bandejas operativas: Tabs + Toggle «Asignados a mí» */}
      <BandejaTabs
        activeBandeja={activeBandeja}
        misExpedientes={misExpedientes}
        stats={stats}
        onBandejaChange={elegirBandeja}
        onToggleMisExpedientes={toggleMisExpedientes}
        requiereAccionActivo={requiereAccionActivo}
      />

      {/* Filtros (sin chips de estado, ahora están en bandejas) */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <ExpedientesFilters
          filters={filters}
          analistas={analistas}
          isLoading={isLoading}
          onFilterChange={setFilters}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters()}
        />
      </div>

      {/* Tabla / Skeleton / Empty */}
      <div
        className={`relative bg-white rounded-lg border border-gray-200 p-4${isLoading && expedientes.length > 0 ? ' opacity-60' : ''}`}
        aria-busy={isLoading}
      >
        {/* Al volver o al filtrar se siguen viendo las filas de antes mientras llegan las nuevas. */}
        {isLoading && expedientes.length > 0 && (
          <span role="status" className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs text-gray-600 shadow-sm">
            <IconLoader size={12} className="animate-spin" /> Actualizando…
          </span>
        )}
        {isLoading && expedientes.length === 0 ? (
          <ExpedientesSkeleton count={filters.limit} />
        ) : (
          <ExpedientesTable
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
              misExpedientes && !filters.search && !filters.fecha_desde && !filters.fecha_hasta
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
    </div>
  )
}
