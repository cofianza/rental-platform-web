/**
 * Panel /citas — kanban de visitas para propietario/inmobiliaria.
 * Mismo backend endpoint sirve a admin/operador sin discriminación.
 * Solicitante NO accede: queda filtrado desde NAV_ITEMS.requiredRoles en Sidebar.
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader, EmptyState } from '@/components/ui'
import { IconLoader, IconCalendar, IconRefresh } from '@/components/icons'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuthStore } from '@/stores/auth.store'
import { useMisCitas } from '@/hooks/useMisCitas'
import { CitaCard } from '@/components/citas/CitaCard'
import { inmuebleService } from '@/services/inmuebleService'
import { pagoEstudioService } from '@/services/pagoEstudioService'
import type { EstadoCita } from '@/types/cita'

/**
 * Columnas del kanban. 'sin_estudio' es virtual (no es un EstadoCita real):
 * agrupa citas realizadas cuyo expediente quedo con estudio_rechazado=true
 * tras la decision del propietario de no proceder.
 */
type ColumnaKey = EstadoCita | 'sin_estudio'
const COLUMNAS: ColumnaKey[] = ['solicitada', 'confirmada', 'realizada', 'sin_estudio', 'cancelada', 'no_asistio']

const COLUMNA_LABELS: Record<ColumnaKey, { label: string; color: string; bgColor: string }> = {
  solicitada: { label: 'Solicitada', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  confirmada: { label: 'Confirmada', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  realizada: { label: 'Realizada', color: 'text-green-700', bgColor: 'bg-green-50' },
  sin_estudio: { label: 'Sin estudio', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  cancelada: { label: 'Cancelada', color: 'text-red-700', bgColor: 'bg-red-50' },
  no_asistio: { label: 'No asistio', color: 'text-gray-700', bgColor: 'bg-gray-50' },
}
const ALLOWED_ROLES = ['administrador', 'operador_analista', 'propietario', 'inmobiliaria', 'gerencia_consulta'] as const

interface InmuebleOption {
  id: string
  codigo: string
  direccion: string
}

export default function CitasPage() {
  const router = useRouter()
  const { hasRole } = usePermissions()
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const { citas, filters, isLoading, error, refetch, setFilters, resetFilters } = useMisCitas()
  const [inmuebles, setInmuebles] = useState<InmuebleOption[]>([])
  // Estado del pago del estudio por expediente. Solo se consulta para citas
  // realizadas con estudio_habilitado — ahí es donde la card muestra la pill.
  // null = cargando, undefined = no aplica.
  const [pagoEstudioByExp, setPagoEstudioByExp] = useState<Record<string, string | null>>({})

  // Guard de rol: redirige a 403 si no tiene acceso.
  useEffect(() => {
    if (isInitialized && !hasRole([...ALLOWED_ROLES])) {
      router.replace('/dashboard/403')
    }
  }, [isInitialized, hasRole, router])

  // Cargar inmuebles para el dropdown de filtro.
  useEffect(() => {
    if (!isInitialized) return
    if (!hasRole(['propietario', 'inmobiliaria', 'administrador', 'operador_analista'])) return
    inmuebleService
      .getInmuebles({ limit: 100 })
      .then((res) => {
        setInmuebles(
          res.data.map((i) => ({ id: i.id, codigo: i.codigo, direccion: i.direccion })),
        )
      })
      .catch(() => {
        // Fallar silencioso — el filtro es opcional.
      })
  }, [isInitialized, hasRole])

  // Cuando cargan las citas, fetcheamos en paralelo el estado del pago de
  // estudio para expedientes cuyas citas ya están realizadas Y con estudio
  // habilitado. N requests pero limitado al subset relevante.
  useEffect(() => {
    const expedienteIds = Array.from(
      new Set(
        citas
          .filter(
            (c) =>
              c.estado === 'realizada' &&
              c.expediente?.id &&
              c.expediente?.estudio_habilitado === true,
          )
          .map((c) => c.expediente!.id),
      ),
    )
    if (expedienteIds.length === 0) return

    // Marcar como cargando los que aún no tenemos.
    setPagoEstudioByExp((prev) => {
      const next = { ...prev }
      for (const id of expedienteIds) {
        if (!(id in next)) next[id] = null
      }
      return next
    })

    Promise.all(
      expedienteIds.map(async (id) => {
        try {
          const res = await pagoEstudioService.getEstado(id)
          return [id, res.estado] as const
        } catch {
          return [id, 'sin_definir'] as const
        }
      }),
    ).then((entries) => {
      setPagoEstudioByExp((prev) => {
        const next = { ...prev }
        for (const [id, estado] of entries) next[id] = estado
        return next
      })
    })
  }, [citas])

  // Agrupar citas por columna (los filtros de fecha/inmueble se aplican server-side).
  // 'sin_estudio' es virtual: realizadas con expediente.estudio_rechazado=true
  // se separan en su propia columna para que el propietario las distinga de las
  // pendientes de habilitar.
  const citasPorEstado = useMemo(() => {
    const grupos: Record<ColumnaKey, typeof citas> = {
      solicitada: [],
      confirmada: [],
      realizada: [],
      sin_estudio: [],
      cancelada: [],
      no_asistio: [],
    }
    for (const c of citas) {
      if (c.estado === 'realizada' && c.expediente?.estudio_rechazado) {
        grupos.sin_estudio.push(c)
      } else {
        grupos[c.estado].push(c)
      }
    }
    return grupos
  }, [citas])

  const totalCitas = citas.length
  const hasActiveFilters = Boolean(
    filters.estado || filters.fecha_desde || filters.fecha_hasta || filters.inmueble_id,
  )

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center py-16">
        <IconLoader size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Citas de visita" subtitle="Gestiona las visitas a tus inmuebles" />

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Inmueble</label>
            <select
              value={filters.inmueble_id || ''}
              onChange={(e) => setFilters({ inmueble_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todos los inmuebles</option>
              {inmuebles.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.codigo} — {i.direccion}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
            <input
              type="date"
              value={filters.fecha_desde || ''}
              onChange={(e) => setFilters({ fecha_desde: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Hasta</label>
            <input
              type="date"
              value={filters.fecha_hasta || ''}
              onChange={(e) => setFilters({ fecha_hasta: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Limpiar
            </button>
          )}
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Refrescar"
          >
            <IconRefresh size={18} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <IconLoader size={24} className="animate-spin text-primary-600" />
        </div>
      )}

      {/* Empty state global */}
      {!isLoading && totalCitas === 0 && (
        <EmptyState
          icon={IconCalendar}
          title={hasActiveFilters ? 'Sin resultados' : 'Aún no tienes citas'}
          description={
            hasActiveFilters
              ? 'Ajusta los filtros para ver otras citas.'
              : 'Cuando un solicitante pida una visita a uno de tus inmuebles, aparecerá aquí.'
          }
          action={
            !hasActiveFilters
              ? {
                  label: 'Ver mis inmuebles',
                  onClick: () => router.push('/inmuebles'),
                }
              : undefined
          }
        />
      )}

      {/* Kanban — scroll horizontal forzado para que se vean los 5 estados.
          Wrapper con fade en el borde derecho para indicar visualmente que
          hay mas contenido fuera del viewport en pantallas angostas. */}
      {!isLoading && totalCitas > 0 && (
        <div className="relative -mx-4">
          <div
            className="flex gap-4 overflow-x-scroll pb-3 px-4 [scrollbar-color:theme(colors.gray.300)_theme(colors.gray.100)] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400"
          >
          {COLUMNAS.map((estado) => {
            const items = citasPorEstado[estado]
            const config = COLUMNA_LABELS[estado]
            return (
              <div key={estado} className="w-72 shrink-0">
                <div
                  className={`sticky top-0 z-10 mb-3 rounded-lg border px-3 py-2 flex items-center justify-between ${config.bgColor}`}
                >
                  <h2 className={`text-sm font-semibold ${config.color}`}>{config.label}</h2>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full bg-white border ${config.color}`}
                  >
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6 italic">
                      Sin citas en este estado
                    </p>
                  ) : (
                    items.map((c) => {
                      const expId = c.expediente?.id
                      const mostrarPago =
                        c.estado === 'realizada' && c.expediente?.estudio_habilitado === true
                      const pagoEstudioEstado =
                        mostrarPago && expId ? pagoEstudioByExp[expId] ?? null : undefined
                      return (
                        <CitaCard
                          key={c.id}
                          cita={c}
                          onAction={refetch}
                          pagoEstudioEstado={pagoEstudioEstado}
                        />
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
          </div>
          {/* Fade en el borde derecho para hint visual de scroll. pointer-events-none
              evita que tape los clicks de las cards. Solo en >= sm (mobile usa el
              swipe nativo y no necesita ayuda visual). */}
          <div className="hidden sm:block absolute top-0 right-0 bottom-3 w-12 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
        </div>
      )}
    </div>
  )
}
