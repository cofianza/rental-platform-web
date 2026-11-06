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
 * - Los chips llevan su conteo (antes había además cuatro tarjetas que filtraban
 *   lo mismo); la tasa de aprobación y el ritmo del mes van en la frase del encabezado.
 * - «Qué sigue» de cada fila y el aviso de arriba dicen qué le toca a quien mira.
 * - Clic en una fila → /expedientes/[id] (donde vive el estudio completo).
 */

'use client'

import { buttonClasses } from '@/components/ui/Button'
import Link from 'next/link'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'
import { IconArrowRight, IconCheckCircle, IconPlus, IconRefresh, IconAlertTriangle, IconLoader } from '@/components/icons'
import { useExpedientes } from '@/hooks/useExpedientes'
import { estudioService } from '@/services/estudioService'
import { expedienteService } from '@/services/expedienteService'
import { creditosEstudiosService, type ISaldoCreditos } from '@/services/creditosEstudiosService'
import { listMiembros } from '@/services/miembrosService'
import type { IEstudiosStats } from '@/types/estudio'
import type { EstudioFiltro } from '@/types/expediente'
import { ExpedientesFilters } from '@/components/expedientes/ExpedientesFilters'
import { ExpedientesTable } from '@/components/expedientes/ExpedientesTable'
import { ExpedientesTablaCofianzaSkeleton } from '@/components/expedientes/ExpedientesTablaCofianza'
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
  const [saldo, setSaldo] = useState<ISaldoCreditos | null>(null)
  const [saldoError, setSaldoError] = useState(false)
  // Mapa perfil_id → nombre de los miembros del equipo, para mostrar en la
  // columna "Responsable" el miembro al que se asignó cada expediente.
  const [miembrosById, setMiembrosById] = useState<Record<string, string>>({})

  // Los chips cuentan ESTUDIOS con el mismo filtro que aplican: contadas por
  // evaluación (coarrendatarios, reevaluaciones, canceladas) decían 9 y al
  // pulsarlas la lista traía 5.
  const [conteos, setConteos] = useState<Partial<Record<EstudioFiltro, number>> | null>(null)
  // Se recalculan al montar (volver a la lista) y al recuperar la ventana: un estudio
  // movido en otra pestaña dejaba los números del aviso y de los chips viejos.
  useEffect(() => {
    const contar = () =>
      Promise.all(
        (['requiere_accion', 'sin_estudio', 'en_proceso', 'condicionado', 'aprobado', 'rechazado'] as const).map((f) =>
          expedienteService.getExpedientes({ estudio_filtro: f, page: 1, limit: 1 }).then((r) => [f, r.meta.total] as const),
        ),
      )
        .then((rs) => setConteos(Object.fromEntries(rs)))
        // Sin conteos los chips van sin número y no sale el aviso (nunca un «0» falso).
        .catch(() => {})
    void contar()
    const alVolver = () => {
      if (document.visibilityState === 'visible') void contar()
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [])

  useEffect(() => {
    // Solo alimenta la frase del encabezado: si falla, la frase no sale.
    estudioService.getStats().then(setStats).catch(() => {})
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
  const activeChip: EstudioFiltro = filters.estudio_filtro ?? 'todos'
  const pendientes = conteos?.requiere_accion ?? 0
  // Los conteos son de toda la cartera: con búsqueda, responsable o periodo no coinciden con la lista y se ocultan.
  const conFiltros = hasActiveFilters()
  // «Todos»: el total de la lista cuando no hay chip ni filtros; se recuerda al cambiar de chip.
  const [totalTodos, setTotalTodos] = useState<number | null>(null)
  if (activeChip === 'todos' && !conFiltros && !isLoading && meta && meta.total !== totalTodos) setTotalTodos(meta.total)
  const conteoChip = (f: EstudioFiltro): number | undefined =>
    conFiltros ? undefined : f === 'todos' ? (totalTodos ?? undefined) : conteos?.[f]
  const elegir = (f: EstudioFiltro) => setFilters({ estudio_filtro: f, page: 1 })
  // Sin ningún estudio todavía: los chips y la barra de filtros no tienen qué filtrar.
  const sinEstudios = !isLoading && !error && meta?.total === 0 && activeChip === 'todos' && !hasActiveFilters()

  // P22: lo que se puede gastar (lo que quedó en contra se resta).
  const disponibles = saldo?.saldo_efectivo ?? saldo?.saldo_total ?? 0

  return (
    <div className="space-y-5">
      {/* Encabezado: qué es la lista, con el ritmo del mes y la tasa en una frase (antes eran tarjetas que filtraban lo mismo que los chips). */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Estudios</h1>
          <p className="mt-0.5 max-w-2xl text-sm text-gray-600">
            Sus estudios y en qué va cada uno.
            {stats &&
              (stats.este_mes === 1
                ? ' Este mes se inició 1 evaluación crediticia.'
                : ` Este mes se iniciaron ${stats.este_mes} evaluaciones crediticias.`)}
            {tasa != null &&
              ` Tasa de aprobación: ${tasa.toLocaleString('es-CO')} % (${aprobados} ${aprobados === 1 ? 'aprobado' : 'aprobados'} de ${decididos} ${decididos === 1 ? 'decidido' : 'decididos'}).`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {!esPropietario && (
            <span className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3.5 text-sm font-semibold text-primary-800">
              <IconCheckCircle size={14} />
              {saldo
                ? `${disponibles} ${disponibles === 1 ? 'cupo disponible' : 'cupos disponibles'}`
                : saldoError
                  ? 'Cupos: no se pudo cargar'
                  : 'Cupos: cargando…'}
            </span>
          )}
          {puedeEditar && (
            <Link href="/expedientes/nuevo" className={buttonClasses('accent')}>
              <IconPlus size={16} />
              Nuevo estudio
            </Link>
          )}
        </div>
      </div>

      {/* Lo primero que busca quien gestiona: qué le toca. Fuera del filtro, un aviso que lleva a él. */}
      {pendientes > 0 && activeChip !== 'requiere_accion' && (
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border px-4 py-2.5',
            puedeEditar ? 'border-coral-200 bg-coral-50' : 'border-gray-200 bg-white',
          )}
        >
          <p className={cn('flex items-center gap-2 text-sm font-semibold', puedeEditar ? 'text-coral-800' : 'text-gray-800')}>
            <IconArrowRight size={16} className="shrink-0" />
            {puedeEditar
              ? pendientes === 1
                ? '1 estudio necesita algo de usted'
                : `${pendientes} estudios necesitan algo de usted`
              : pendientes === 1
                ? '1 estudio espera una acción de su equipo'
                : `${pendientes} estudios esperan una acción de su equipo`}
          </p>
          <button
            type="button"
            onClick={() => elegir('requiere_accion')}
            className={cn(
              '-my-1 inline-flex h-10 items-center rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary-600',
              puedeEditar ? 'text-coral-800 hover:bg-coral-100' : 'text-primary-700 hover:bg-gray-100',
            )}
          >
            Ver cuáles
          </button>
        </div>
      )}

      {/* Chips: filtran por el estado del estudio, con su conteo cuando se conoce. En móvil
          el borde derecho se desvanece: sin esa pista no parecían deslizables. */}
      {!sinEstudios && (
        <div className="-mx-4 overflow-x-auto px-4 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] sm:mx-0 sm:px-0 sm:[mask-image:none]">
          <nav aria-label="Filtrar por etapa" className="flex min-w-max gap-1 pr-6 sm:min-w-0 sm:flex-wrap sm:pr-0">
            {CHIPS.map((c) => {
              const activo = activeChip === c.id
              const n = conteoChip(c.id)
              const turno = c.id === 'requiere_accion' && !!n && puedeEditar
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={activo}
                  title={c.title}
                  onClick={() => elegir(c.id)}
                  className={cn(
                    'flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary-600',
                    activo
                      ? turno
                        ? 'border-coral-300 bg-coral-50 text-coral-800'
                        : 'border-primary-300 bg-primary-50 text-primary-800'
                      : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  )}
                >
                  {c.id === 'requiere_accion' && !puedeEditar ? 'Requieren acción del equipo' : c.label}
                  {n != null && (
                    <span
                      className={cn(
                        'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums',
                        turno ? 'bg-coral-100 text-coral-800' : activo ? 'bg-white/70 text-primary-800' : 'bg-gray-100 text-gray-600',
                      )}
                    >
                      {n}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      )}

      {/* Una sola superficie: la barra de filtros encabeza la lista que filtra (como la cola de Cofianza). */}
      <section aria-label="Estudios" className="rounded-lg border border-gray-200 bg-white">
        {!sinEstudios && (
          <div className="border-b border-gray-100 p-3 sm:p-4">
            <ExpedientesFilters
              barra
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
        )}

        <div
          className={cn('relative p-3 sm:p-4', isLoading && expedientes.length > 0 && 'pointer-events-none opacity-60')}
          aria-busy={isLoading}
        >
          {/* Al volver o al filtrar se siguen viendo las filas de antes mientras llegan las nuevas. */}
          {isLoading && expedientes.length > 0 && (
            <span role="status" className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs text-gray-600 shadow-sm">
              <IconLoader size={12} className="animate-spin" /> Actualizando…
            </span>
          )}
          {error ? (
            // El error queda dentro de la lista: el encabezado («Nuevo estudio») y los filtros siguen a mano.
            <div role="alert" className="py-10 text-center">
              <IconAlertTriangle size={40} className="mx-auto mb-3 text-red-500" />
              <h2 className="mb-1 text-lg font-medium text-gray-900">No se pudieron cargar los estudios</h2>
              <p className="mx-auto mb-4 max-w-md text-sm text-gray-600">{error}</p>
              <button
                type="button"
                onClick={() => fetchExpedientes()}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-white transition-colors hover:bg-primary-800"
              >
                <IconRefresh size={18} />
                Reintentar
              </button>
            </div>
          ) : isLoading && expedientes.length === 0 ? (
            <ExpedientesTablaCofianzaSkeleton count={Math.min(filters.limit, 8)} />
          ) : (
            <ExpedientesTable
              expedientes={expedientes}
              meta={meta}
              filters={filters}
              onSort={handleSort}
              onOrdenar={(sortBy, sortOrder) => setFilters({ sortBy, sortOrder, page: 1 })}
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
      </section>

      {/* Compra de paquetes de estudios */}
      {!esPropietario && <AdquirirEstudiosCredito />}
    </div>
  )
}
