/**
 * EstudiosExpedientesFusion — vista UNIFICADA de la inmobiliaria y del
 * propietario (sin equipo, cupos ni paquetes): UNA sola lista
 * de EXPEDIENTES con el estado de su estudio embebido (badge por fila), ya no dos
 * pestañas (Estudios|Expedientes). El expediente es el contenedor; el estudio es
 * un paso dentro de él (se ve en su badge y en el detalle del expediente).
 *
 * - Lista = expedientes (useExpedientes). El badge de estudio sale de
 *   `estudio_vigente`, que el RPC embebe (el más reciente por fecha).
 * - Los chips filtran EXPEDIENTES por el estado de su estudio vigente
 *   (server-side, vía filters.estudio_filtro → RPC p_estudio_filtro).
 * - Stat-cards y saldo/paquetes de estudios se conservan (datos reales).
 * - Clic en una fila → /expedientes/[id] (donde vive el estudio completo).
 */

'use client'

import { Button } from '@/components/ui/Button'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'
import { IconCheckCircle, IconPlus, IconRefresh, IconAlertTriangle, IconLoader } from '@/components/icons'
import { useExpedientes } from '@/hooks/useExpedientes'
import { estudioService } from '@/services/estudioService'
import { expedienteService } from '@/services/expedienteService'
import { creditosEstudiosService, type ISaldoCreditos } from '@/services/creditosEstudiosService'
import { listMiembros } from '@/services/miembrosService'
import type { IEstudiosStats } from '@/types/estudio'
import type { EstudioFiltro } from '@/types/expediente'
import { ExpedientesFilters } from '@/components/expedientes/ExpedientesFilters'
import { ExpedientesTable } from '@/components/expedientes/ExpedientesTable'
import { ExpedientesSkeleton } from '@/components/expedientes/ExpedientesSkeleton'
import { AdquirirEstudiosCredito } from './AdquirirEstudiosCredito'

// En el orden del recorrido.
const CHIPS: { id: EstudioFiltro; label: string; title?: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'requiere_accion', label: 'Requieren su acción' },
  { id: 'sin_estudio', label: 'Antes de la evaluación', title: 'Visita pendiente o evaluación sin habilitar' },
  // U13: el mismo nombre que la pestaña de la lista de Cofianza.
  { id: 'en_proceso', label: 'Antes del resultado' },
  { id: 'condicionado', label: 'Condicionados' },
  { id: 'aprobado', label: 'Aprobados' },
  { id: 'rechazado', label: 'No aprobables' },
]

export function EstudiosExpedientesFusion() {
  const puedeEditar = usePuedeEditar()
  const router = useRouter()
  // El propietario no tiene equipo, cupos ni paquetes.
  const esPropietario = useAuthStore((s) => s.user?.rol) === 'propietario'
  const {
    expedientes,
    meta,
    filters,
    analistas,
    isLoading,
    error,
    setFilters,
    clearFilters,
    handleSort,
    hasActiveFilters,
    fetchExpedientes,
  } = useExpedientes({ conStats: false })

  const [stats, setStats] = useState<IEstudiosStats | null>(null)
  // Cargando o con error, las tarjetas no muestran «0» ni «Sin decisiones aún».
  const [statsError, setStatsError] = useState(false)
  const [saldo, setSaldo] = useState<ISaldoCreditos | null>(null)
  const [saldoError, setSaldoError] = useState(false)
  // Mapa perfil_id → nombre de los miembros del equipo, para mostrar en la
  // columna "Responsable" el miembro al que se asignó cada expediente.
  const [miembrosById, setMiembrosById] = useState<Record<string, string>>({})

  // Las tarjetas cuentan ESTUDIOS con el mismo filtro que su chip: contadas por
  // evaluación (coarrendatarios, reevaluaciones, canceladas) decían 9 y al
  // pulsarlas la lista traía 5.
  const [conteos, setConteos] = useState<Partial<Record<EstudioFiltro, number>> | null>(null)
  useEffect(() => {
    // Solo alimenta la frase del encabezado: si falla, la frase no sale.
    estudioService.getStats().then(setStats).catch(() => {})
    Promise.all(
      (['requiere_accion', 'aprobado', 'en_proceso', 'rechazado'] as const).map((f) =>
        expedienteService.getExpedientes({ estudio_filtro: f, page: 1, limit: 1 }).then((r) => [f, r.meta.total] as const),
      ),
    )
      .then((rs) => setConteos(Object.fromEntries(rs)))
      .catch(() => setStatsError(true))
    if (esPropietario) return
    creditosEstudiosService.getMiSaldo().then(setSaldo).catch(() => setSaldoError(true))
    listMiembros()
      .then((res) => {
        const map: Record<string, string> = {}
        for (const m of res.miembros) {
          const nombre = `${m.nombre ?? ''} ${m.apellido ?? ''}`.trim()
          if (m.perfil_id && nombre) map[m.perfil_id] = nombre
        }
        setMiembrosById(map)
      })
      .catch(() => {})
  }, [esPropietario])

  // Tasa de aprobación honesta: aprobados / decididos (el condicionado aún no está decidido).
  const aprobados = conteos?.aprobado ?? 0
  const rechazados = conteos?.rechazado ?? 0
  const decididos = aprobados + rechazados
  const tasa = decididos > 0 ? Math.round((aprobados / decididos) * 1000) / 10 : null
  const tasaNoAprobable = decididos > 0 ? Math.round((rechazados / decididos) * 1000) / 10 : null
  const activeChip: EstudioFiltro = filters.estudio_filtro ?? 'todos'
  const pendientes = conteos?.requiere_accion ?? 0
  const conteo = (f: EstudioFiltro) => (conteos ? (conteos[f] ?? 0) : statsError ? '—' : '…')
  const sinDato = statsError ? 'No se pudo cargar' : 'Cargando…'

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
          Reintentar
        </button>
      </div>
    )
  }

  // P22: lo que se puede gastar (lo que quedó en contra se resta).
  const disponibles = saldo?.saldo_efectivo ?? saldo?.saldo_total ?? 0

  return (
    <div className="space-y-6">
      {/* Encabezado: intro + saldo + nuevo expediente */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Estudios</h1>
          {/* «Este mes» era una tarjeta que contaba evaluaciones, no estudios: queda como frase. */}
          <p className="text-sm font-medium text-gray-500">
            Sus estudios y en qué va cada uno.
            {stats &&
              (stats.este_mes === 1
                ? ' Este mes se inició 1 evaluación crediticia.'
                : ` Este mes se iniciaron ${stats.este_mes} evaluaciones crediticias.`)}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {!esPropietario && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary-600 bg-primary-50 px-3.5 py-1.5 text-sm font-bold text-primary-700">
              <IconCheckCircle size={14} />
              {saldo
                ? `${disponibles} ${disponibles === 1 ? 'cupo disponible' : 'cupos disponibles'}`
                : saldoError
                  ? '— cupos disponibles'
                  : '… cupos disponibles'}
            </span>
          )}
          {puedeEditar && (
            <Button variante="accent" onClick={() => router.push('/expedientes/nuevo')}>
              <IconPlus size={16} />
              Nuevo estudio
            </Button>
          )}
        </div>
      </div>

      {/* Tarjetas: cuentan estudios con el mismo filtro que su chip y lo activan
          al hacer clic, para no tener dos controles que parecen filtrar y solo
          uno lo hace. Arrancan por lo que requiere acción. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={puedeEditar ? 'Requieren su acción' : 'Requieren acción del equipo'}
          value={conteo('requiere_accion')}
          color="text-coral-600"
          sub={!conteos ? sinDato : pendientes > 0 ? (puedeEditar ? 'Le toca a usted' : 'Le toca a su equipo') : 'Nada pendiente'}
          activo={activeChip === 'requiere_accion'}
          onClick={() => setFilters({ estudio_filtro: 'requiere_accion', page: 1 })}
        />
        <StatCard
          label="Aprobados"
          value={conteo('aprobado')}
          color="text-primary-600"
          sub={!conteos ? sinDato : tasa != null ? `${tasa}% tasa de aprobación` : 'Sin decisiones aún'}
          activo={activeChip === 'aprobado'}
          onClick={() => setFilters({ estudio_filtro: 'aprobado', page: 1 })}
        />
        <StatCard
          label="Antes del resultado"
          value={conteo('en_proceso')}
          color="text-blue-600"
          sub="Todavía sin resultado"
          activo={activeChip === 'en_proceso'}
          onClick={() => setFilters({ estudio_filtro: 'en_proceso', page: 1 })}
        />
        <StatCard
          label="No aprobables"
          value={conteo('rechazado')}
          color="text-red-500"
          sub={!conteos ? sinDato : tasaNoAprobable != null ? `${tasaNoAprobable}% de lo evaluado` : 'Sin decisiones aún'}
          activo={activeChip === 'rechazado'}
          onClick={() => setFilters({ estudio_filtro: 'rechazado', page: 1 })}
        />
      </div>

      {/* Chips: filtran EXPEDIENTES por el estado de su estudio vigente */}
      <div className="flex flex-wrap items-center gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={activeChip === c.id}
            title={c.title}
            onClick={() => setFilters({ estudio_filtro: c.id, page: 1 })}
            className={cn(
              'min-h-10 rounded-full border-[1.5px] px-3.5 py-1 text-xs font-bold transition-colors',
              activeChip === c.id
                ? 'border-primary-600 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-primary-600',
            )}
          >
            {c.id === 'requiere_accion' && !puedeEditar ? 'Requieren acción del equipo' : c.label}
          </button>
        ))}
      </div>

      {/* Filtros (búsqueda / responsable / fechas) */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <ExpedientesFilters
          filters={filters}
          analistas={analistas}
          miembros={miembrosById}
          isLoading={isLoading}
          onFilterChange={setFilters}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters()}
          ocultarResponsable={esPropietario}
        />
      </div>

      {/* Lista de expedientes con badge de estudio embebido */}
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
            onPageChange={(page) => setFilters({ page })}
            onLimitChange={(limit) => setFilters({ limit, page: 1 })}
            miembrosResponsablesById={miembrosById}
            vacio={
              activeChip === 'requiere_accion' && !hasActiveFilters()
                ? 'accion'
                : hasActiveFilters() || activeChip !== 'todos'
                  ? 'filtros'
                  : 'nada'
            }
            onClearFilters={clearFilters}
          />
        )}
      </div>

      {/* Compra de paquetes de estudios */}
      {!esPropietario && <AdquirirEstudiosCredito />}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  color = 'text-gray-900',
  activo = false,
  onClick,
}: {
  label: string
  value: number | string
  sub: string
  color?: string
  activo?: boolean
  onClick?: () => void
}) {
  const contenido = (
    <>
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</div>
      <div className={cn('text-3xl font-black leading-none tracking-tight', color)}>{value}</div>
      <div className="mt-1 text-xs text-gray-500">{sub}</div>
    </>
  )
  if (!onClick) {
    return <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">{contenido}</div>
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        'rounded-xl border bg-white px-5 py-4 text-left transition-colors hover:border-primary-600',
        activo ? 'border-primary-600 ring-1 ring-primary-600' : 'border-gray-200',
      )}
    >
      {contenido}
    </button>
  )
}
