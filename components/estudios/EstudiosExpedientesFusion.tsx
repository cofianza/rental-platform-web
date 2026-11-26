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
 *   Reporte de la Oficina Virtual (25-nov), puntos 1 y 13: las cifras salen de
 *   GET /oficina-virtual/conteos (las mismas de Inicio, Contratos y Analítica), cada una
 *   con su periodo escrito al lado; los chips son una partición de «Todos» (con
 *   «Cerrados y cancelados»); la tasa es la de los últimos 30 días («Aprobamos 6 de cada
 *   10 estudios»), con el detalle al pasar el cursor o tocar; mientras cargan, esqueleto.
 * - Al cambiar de chip no se ven las filas del anterior mientras carga: el esqueleto (punto 12).
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
import { useConteosOficina } from '@/hooks/useConteosOficina'
import { expedienteService } from '@/services/expedienteService'
import { creditosEstudiosService, type ISaldoCreditos } from '@/services/creditosEstudiosService'
import { listMiembros } from '@/services/miembrosService'
import type { EstudioFiltro } from '@/types/expediente'
import type { SeccionOficina } from '@/types/oficinaVirtual'
import { chipsVisibles, type ConteosEstudios } from '@/lib/conteosEstudios'
import { detalleAprobacion, textoAprobamos, textoEstudiosPeriodo } from '@/lib/conteosOficina'
import { InfoTip } from '@/components/ui/InfoTip'
import { Skeleton } from '@/components/ui/Skeleton'
import { ExpedientesFilters } from '@/components/expedientes/ExpedientesFilters'
import { ExpedientesTable } from '@/components/expedientes/ExpedientesTable'
import { ExpedientesTablaCofianzaSkeleton } from '@/components/expedientes/ExpedientesTablaCofianza'
import { AdquirirEstudiosCredito } from './AdquirirEstudiosCredito'

/** Lo que muestra esta pantalla: las pestañas (con «este mes») y la tasa de los últimos 30 días. */
const SECCIONES: readonly SeccionOficina[] = ['estudios', 'aprobacion']

export function EstudiosExpedientesFusion() {
  const puedeEditar = usePuedeEditar()
  // El propietario no tiene equipo, cupos ni paquetes.
  const esPropietario = useAuthStore((s) => s.user?.rol) === 'propietario'
  const {
    expedientes,
    filasDeLaPestana,
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

  const [saldo, setSaldo] = useState<ISaldoCreditos | null>(null)
  const [saldoError, setSaldoError] = useState(false)
  // Mapa perfil_id → nombre de los miembros del equipo, para mostrar en la
  // columna "Responsable" el miembro al que se asignó cada expediente.
  const [miembrosById, setMiembrosById] = useState<Record<string, string>>({})

  // Los chips cuentan ESTUDIOS con el mismo filtro que aplican: contadas por
  // evaluación (coarrendatarios, reevaluaciones, canceladas) decían 9 y al
  // pulsarlas la lista traía 5. Se recalculan al montar (volver a la lista) y al recuperar la ventana: un estudio
  // movido en otra pestaña dejaba los números del aviso y de los chips viejos.
  const ov = useConteosOficina(SECCIONES, { alVolver: true })
  // Con una API anterior (sin /oficina-virtual/conteos), los chips como antes y sin la frase de la tasa.
  const [conteosAnteriores, setConteosAnteriores] = useState<ConteosEstudios | null | undefined>(undefined)
  useEffect(() => {
    if (ov.disponible !== false) return
    expedienteService.getConteos().then(setConteosAnteriores).catch(() => setConteosAnteriores((c) => c ?? null))
  }, [ov.disponible])
  // undefined = todavía no llegan; null = no se pudieron leer: los chips van sin número y no sale el aviso (nunca un «0»
  // falso). Una lectura anterior que sí llegó se conserva (el hook la guarda).
  const conteos: ConteosEstudios | null | undefined =
    ov.disponible === false
      ? conteosAnteriores
      : ov.data
        ? (ov.data.estudios?.pestanas ?? null)
        : ov.isLoading
          ? undefined
          : null
  const aprobacion = ov.data?.aprobacion ?? null
  const esteMes = ov.data?.estudios?.este_mes.creados

  useEffect(() => {
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

  // Punto 13: «Aprobamos 6 de cada 10 estudios (últimos 30 días)», la misma tasa de Analítica.
  const textoTasa = textoAprobamos(aprobacion)
  const detalleTasa = detalleAprobacion(aprobacion)
  const activeChip: EstudioFiltro = filters.estudio_filtro ?? 'todos'
  // Con la API nueva, los resultados de la Adenda 5 en lugar de «Condicionados».
  const chips = chipsVisibles(conteos, activeChip, { equipo: !puedeEditar })
  const pendientes = conteos?.requiere_accion ?? 0
  // Los conteos son de toda la cartera: con búsqueda, responsable o periodo no coinciden con la lista y se ocultan.
  const conFiltros = hasActiveFilters()
  // «Todos»: el total de la lista cuando no hay chip ni filtros; se recuerda al cambiar de chip.
  const [totalTodos, setTotalTodos] = useState<number | null>(null)
  // Solo con las filas de «Todos» ya cargadas: con las de otro chip el total sería el de ese chip.
  if (activeChip === 'todos' && !conFiltros && !isLoading && filasDeLaPestana && meta && meta.total !== totalTodos) setTotalTodos(meta.total)
  const conteoChip = (f: EstudioFiltro): number | undefined =>
    conFiltros ? undefined : f === 'todos' ? (totalTodos ?? conteos?.todos) : conteos?.[f]
  const elegir = (f: EstudioFiltro) => setFilters({ estudio_filtro: f, page: 1 })
  // Sin ningún estudio todavía: los chips y la barra de filtros no tienen qué filtrar.
  const sinEstudios = !isLoading && !error && filasDeLaPestana && meta?.total === 0 && activeChip === 'todos' && !hasActiveFilters()
  // Las filas que hay son de otro chip: mientras llega el elegido, el esqueleto (nunca la lista anterior).
  const actualizando = isLoading && expedientes.length > 0 && filasDeLaPestana

  // P22: lo que se puede gastar (lo que quedó en contra se resta).
  const disponibles = saldo?.saldo_efectivo ?? saldo?.saldo_total ?? 0

  return (
    <div className="space-y-5">
      {/* Encabezado: qué es la lista, con el ritmo del mes y la tasa en una frase (antes eran tarjetas que filtraban lo mismo que los chips). */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Estudios</h1>
          {/* Punto 1: cada cifra con su periodo («desde el inicio», «este mes», «últimos 30 días»); mientras cargan, el
              esqueleto, nunca un 0. Los conteos son de toda la cartera: no dependen de los filtros de la lista. */}
          <p className="mt-0.5 max-w-2xl text-sm text-gray-600">
            Sus estudios y en qué va cada uno
            {(() => {
              const periodo = textoEstudiosPeriodo(conteos?.todos, esteMes)
              return periodo ? `: ${periodo}.` : '.'
            })()}
          </p>
          {ov.disponible !== false &&
            (ov.isLoading && !ov.data ? (
              <div role="status" className="mt-1.5">
                <span className="sr-only">Cargando la tasa de aprobación…</span>
                <Skeleton className="h-4 w-72 max-w-full" />
              </div>
            ) : (
              textoTasa && (
                // La burbuja se ancla al párrafo (abre desde su borde izquierdo): a 390 px no se sale de la pantalla.
                <p className="relative mt-1 flex flex-wrap items-center gap-x-1.5 text-sm font-medium text-gray-800">
                  {textoTasa}
                  {detalleTasa && <InfoTip texto={detalleTasa} etiqueta="Detalle de la tasa de aprobación" anclada lado="derecha" />}
                </p>
              )
            ))}
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
        <div>
          <div className="-mx-4 overflow-x-auto px-4 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] sm:mx-0 sm:px-0 sm:[mask-image:none]">
            <nav aria-label="Filtrar por etapa" className="flex min-w-max gap-1 pr-6 sm:min-w-0 sm:flex-wrap sm:pr-0">
              {chips.map((c) => {
                const activo = activeChip === c.id
                const n = conteoChip(c.id)
                const turno = c.id === 'requiere_accion' && !!n && puedeEditar
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={activo}
                    aria-describedby={c.ayuda ? `ayuda-chip-${c.id}` : undefined}
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
                    {c.label}
                    {/* Mientras cargan los conteos, un esqueleto en lugar del número (nunca un 0). */}
                    {n == null && conteos === undefined && !conFiltros && (
                      <span aria-hidden="true" className="inline-block h-4 w-5 animate-pulse rounded-full bg-gray-200" />
                    )}
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
          {/* Fuera del carrusel: así no la corta el desvanecido del borde derecho. */}
          {chips.filter((c) => c.ayuda).map((c) => (
            <p
              key={c.id}
              id={`ayuda-chip-${c.id}`}
              className={activeChip === c.id ? 'mt-1.5 text-xs text-gray-600' : 'sr-only'}
            >
              {c.ayuda}
            </p>
          ))}
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
          className={cn('relative p-3 sm:p-4', actualizando && 'pointer-events-none opacity-60')}
          aria-busy={isLoading}
        >
          {/* Al volver, al buscar, ordenar o pasar de página se siguen viendo las filas de antes mientras
              llegan las nuevas. Al cambiar de chip no: serían de otro estado (punto 12 del reporte). */}
          {actualizando && (
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
          ) : (isLoading && expedientes.length === 0) || !filasDeLaPestana ? (
            <>
              <span role="status" className="sr-only">Cargando estudios…</span>
              <ExpedientesTablaCofianzaSkeleton count={Math.min(filters.limit, 8)} />
            </>
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
