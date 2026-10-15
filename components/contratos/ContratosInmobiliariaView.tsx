/**
 * ContratosInmobiliariaView — vista de Contratos para la inmobiliaria con el
 * diseño del mockup 13_v2 (tab "Contratos"): 3 stat-cards + tres paneles por
 * etapa (Pendientes de generar / En proceso de firma / Contratos activos) con
 * el lenguaje visual de EstudiosInmobiliariaView (stat-cards font-black,
 * paneles con punto de color, chips de código monospace y badges pill con bdot).
 *
 * NO inventa datos: reutiliza contratoService.getStats (KPIs reales) y
 * contratoService.getAllContratos (listado), agrupando por estado igual que
 * No se replican columnas ficticias del mockup (tier, tipo de contrato
 * comercial, cédula, firma por-parte) — solo campos reales.
 * Es la vista de todos los roles: Cofianza también necesita buscar, paginar y
 * encontrar los terminados y cancelados (antes veía 100 contratos sin buscador).
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { contratoService, type IContratosStats } from '@/services/contratoService'
import type { IContratoListItem, IContratoMeta, IContratoListFilters, EstadoContrato } from '@/types/contrato'
import { etiquetaContrato, formatCurrency, formatDate, formatDateTime, rutaContrato } from '@/lib/constants'
import { cn, formatNumeroEstudio } from '@/lib/utils'
import { useAprobadosSinContrato } from '@/hooks/useAprobadosSinContrato'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import { ContratosFilters } from './ContratosFilters'
import {
  IconLoader,
  IconAlertTriangle,
  IconFileText,
  IconChevronDown,
  IconChevronRight,
  IconArrowLeft,
  IconArrowRight,
  IconRefresh,
} from '@/components/icons'

// ── Helpers de presentación ──

function arrendatario(c: IContratoListItem): string {
  const s = c.expedientes?.solicitantes
  const nombre = s ? `${s.nombre ?? ''} ${s.apellido ?? ''}`.trim() : ''
  return nombre || '—'
}

function Propiedad({ c }: { c: IContratoListItem }) {
  const inm = c.expedientes?.inmuebles
  if (!inm) return <span className="text-gray-500">—</span>
  return (
    <div>
      <span className="text-gray-900">
        {inm.codigo && (
          <span className="mr-1.5 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-bold">{inm.codigo}</span>
        )}
        {inm.direccion}
      </span>
      {inm.ciudad && <span className="block text-xs text-gray-500">{inm.ciudad}</span>}
    </div>
  )
}

const fecha = (iso: string | null) => (iso ? formatDateTime(iso) : '—')

/**
 * Primera columna = enlace al contrato, con su número: en el celular la tabla se
 * desplaza y la acción de la última columna queda fuera de la pantalla.
 */
function Arrendatario({ c }: { c: IContratoListItem }) {
  return (
    <Link href={rutaContrato(c)} className="font-medium text-primary-700 hover:underline">
      {arrendatario(c)}
      {c.numero && <span className="block font-mono text-xs font-normal text-gray-500">N° {c.numero}</span>}
    </Link>
  )
}

// ── Badges tipo pill con bdot (override visual: pendiente_firma en azul para
// igualar el mockup; el label sale de etiquetaContrato) ─────────────────────

type BadgeKind = 'pendiente' | 'firma' | 'incompleta' | 'activo' | 'finalizado' | 'cancelado'

const BADGE_STYLE: Record<BadgeKind, { wrap: string; dot: string }> = {
  pendiente: { wrap: 'bg-coral-50 text-coral-700', dot: 'bg-coral-500' },
  firma: { wrap: 'bg-blue-50 text-blue-600', dot: 'bg-blue-600 animate-pulse' },
  // V3: la firma venció o la rechazaron; la fianza no opera hasta reenviarla.
  incompleta: { wrap: 'bg-red-50 text-red-700', dot: 'bg-red-600' },
  activo: { wrap: 'bg-primary-50 text-primary-700', dot: 'bg-primary-600' },
  finalizado: { wrap: 'bg-gray-50 text-gray-600 border border-gray-200', dot: 'bg-gray-400' },
  cancelado: { wrap: 'bg-red-50 text-red-500', dot: 'bg-red-500' },
}

function badgeKind(estado: EstadoContrato): BadgeKind {
  switch (estado) {
    case 'borrador':
      return 'pendiente'
    case 'pendiente_firma':
      return 'firma'
    case 'firma_incompleta':
      return 'incompleta'
    case 'firmado':
    case 'vigente':
      return 'activo'
    case 'cancelado':
      return 'cancelado'
    default:
      return 'finalizado'
  }
}

function EstadoBadge({ c }: { c: IContratoListItem }) {
  const bs = BADGE_STYLE[badgeKind(c.estado)]
  const label = etiquetaContrato(c.estado, !!c.destinacion)
  return (
    <>
      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', bs.wrap)}>
        <span className={cn('h-1.5 w-1.5 rounded-full', bs.dot)} />
        {label}
      </span>
      {c.origen === 'migracion' && (
        <span className="ml-1.5 inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">Migrado</span>
      )}
    </>
  )
}

// ── Componente ───────────────────────────────────────────────

/** Grupos de estado por panel. El backend acepta `estado` separado por comas. */
const ESTADOS_PENDIENTES = 'borrador,en_revision,aprobado'
// firma_incompleta (V3) va con "en firma": es trabajo pendiente del gestor (reenviar o cancelar).
const ESTADOS_EN_FIRMA = 'pendiente_firma,firma_incompleta'
const ESTADOS_ACTIVOS = 'firmado,vigente'
// Plegado: se piden solo al abrirlo (o al filtrar por uno de estos estados).
const ESTADOS_CERRADOS = 'finalizado,cancelado'

/** Lo que devuelve cada consulta de grupo (filas + su paginación). */
interface Grupo {
  data: IContratoListItem[]
  meta: IContratoMeta
}

const GRUPO_VACIO: Grupo = { data: [], meta: { total: 0, page: 1, limit: 0, totalPages: 0 } }

/**
 * Si el usuario filtra por un estado concreto, ese estado solo debe alimentar
 * SU panel: los otros dos quedan vacíos en vez de ignorar el filtro.
 */
function estadosDelGrupo(grupo: string, filtro?: string): string | null {
  if (!filtro) return grupo
  const permitidos = grupo.split(',')
  return permitidos.includes(filtro) ? filtro : null
}

export function ContratosInmobiliariaView() {
  const [pendientes, setPendientes] = useState<Grupo>(GRUPO_VACIO)
  const [enFirma, setEnFirma] = useState<Grupo>(GRUPO_VACIO)
  const [activos, setActivos] = useState<Grupo>(GRUPO_VACIO)
  const [stats, setStats] = useState<IContratosStats | null>(null)
  const [loading, setLoading] = useState(true)
  // Solo la PRIMERA carga tapa la pantalla; al filtrar dejamos la tabla puesta
  // y el spinner va dentro del buscador (menos parpadeo).
  const [primeraCarga, setPrimeraCarga] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estudios aprobados a los que aún les falta el contrato: no son contratos,
  // por eso no salían en esta pestaña pese a ser el trabajo pendiente real.
  const { expedientes: sinContrato, isLoading: loadingSinContrato } = useAprobadosSinContrato()

  // Filtros + paginación del panel de activos (el único que puede crecer sin
  // techo; pendientes y en firma son colas de trabajo y se muestran completas).
  const [filters, setFilters] = useState<IContratoListFilters>({})
  const [search, setSearch] = useState('')
  const [pageActivos, setPageActivos] = useState(1)
  const [verCerrados, setVerCerrados] = useState(false)
  const [cerrados, setCerrados] = useState<Grupo>(GRUPO_VACIO)
  const [pageCerrados, setPageCerrados] = useState(1)
  const puedeEditar = usePuedeEditar()

  // Debounce de la búsqueda: sin esto cada tecla dispara 3 consultas.
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((prev) => (prev.search === (search || undefined) ? prev : { ...prev, search: search || undefined }))
      setPageActivos(1)
      setPageCerrados(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { estado: estadoFiltro, fecha_desde, fecha_hasta, search: searchAplicado } = filters

  // Solo cuenta la última carga: estado, fechas y página disparan cargar() sin
  // debounce, y una respuesta vieja que tardó más no puede pisar la vigente.
  const peticionRef = useRef(0)
  const cargar = useCallback(async () => {
    const n = ++peticionRef.current
    setLoading(true)
    setError(null)
    const comunes = { search: searchAplicado, fecha_desde, fecha_hasta, sortBy: 'created_at', sortDir: 'desc' as const }
    const pedir = async (estados: string | null, extra: Partial<IContratoListFilters>): Promise<Grupo> => {
      if (!estados) return GRUPO_VACIO
      return contratoService.getAllContratos({ ...comunes, ...extra, estado: estados })
    }
    try {
      const [p, f, a, c] = await Promise.all([
        pedir(estadosDelGrupo(ESTADOS_PENDIENTES, estadoFiltro), { limit: 50, page: 1 }),
        pedir(estadosDelGrupo(ESTADOS_EN_FIRMA, estadoFiltro), { limit: 50, page: 1 }),
        pedir(estadosDelGrupo(ESTADOS_ACTIVOS, estadoFiltro), { limit: 20, page: pageActivos }),
        pedir(verCerrados ? estadosDelGrupo(ESTADOS_CERRADOS, estadoFiltro) : null, { limit: 20, page: pageCerrados }),
      ])
      if (n !== peticionRef.current) return
      setPendientes(p)
      setEnFirma(f)
      setActivos(a)
      setCerrados(c)
    } catch (e) {
      if (n !== peticionRef.current) return
      setError(e instanceof Error ? e.message : 'Error al cargar contratos')
    } finally {
      if (n === peticionRef.current) {
        setLoading(false)
        setPrimeraCarga(false)
      }
    }
  }, [searchAplicado, estadoFiltro, fecha_desde, fecha_hasta, pageActivos, verCerrados, pageCerrados])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Los KPI son globales (no dependen de los filtros): se piden una sola vez.
  useEffect(() => {
    let cancel = false
    contratoService.getStats().then((s) => {
      if (!cancel) setStats(s)
    }).catch(() => {})
    return () => {
      cancel = true
    }
  }, [])

  const hasActiveFilters = !!(search || filters.estado || filters.fecha_desde || filters.fecha_hasta)
  // La búsqueda también acota los estudios aprobados sin contrato (antes los ignoraba).
  const plegar = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  const sinContratoVisibles = searchAplicado
    ? sinContrato.filter((e) =>
        plegar(
          [e.solicitante?.nombre, e.numero_expediente, formatNumeroEstudio(e.numero_expediente), e.inmueble?.codigo, e.inmueble?.direccion, e.inmueble?.ciudad]
            .filter(Boolean)
            .join(' '),
        ).includes(plegar(searchAplicado.trim())),
      )
    : sinContrato
  const onFilterChange = (patch: Partial<IContratoListFilters>) => {
    if ('search' in patch) {
      setSearch(patch.search ?? '')
      return
    }
    setFilters((prev) => ({ ...prev, ...patch }))
    setPageActivos(1)
    setPageCerrados(1)
    // Filtrar por terminado o cancelado abre su panel: si no, la lista quedaba vacía sin explicación.
    if (patch.estado && ESTADOS_CERRADOS.split(',').includes(patch.estado)) setVerCerrados(true)
  }

  const onClearFilters = () => {
    setSearch('')
    setFilters({})
    setPageActivos(1)
    setPageCerrados(1)
  }

  if (primeraCarga) {
    return (
      <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
        <IconLoader size={28} className="animate-spin text-primary-600" />
        <span className="sr-only">Cargando contratos…</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* El error va dentro de la vista, no en lugar de ella: si falla una
          búsqueda, el usuario tiene que poder quitar el filtro. */}
      {error && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          <IconAlertTriangle size={18} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => void cargar()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <IconRefresh size={14} /> Reintentar
          </button>
        </div>
      )}

      {/* Búsqueda y filtros: antes la vista pedía 100 contratos de golpe y el
          101 desaparecía sin aviso. */}
      <ContratosFilters
        filters={{ ...filters, search }}
        isLoading={loading}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Pendientes de generar"
          value={sinContrato.length}
          color="text-coral-700"
          sub="Estudios aprobados sin contrato"
        />
        <StatCard
          label="En proceso de firma"
          // Sin stats (fallo o cargando), «—»: un 0 contradecía los paneles de abajo.
          value={stats ? stats.en_proceso_firma + (stats.por_estado.firma_incompleta ?? 0) : '—'}
          color="text-blue-600"
          sub="Esperando firmas o por reenviar"
        />
        <StatCard
          label="Activos"
          value={stats?.activos ?? '—'}
          color="text-primary-600"
          sub="Contratos vigentes"
        />
      </div>

      {/* Estudios aprobados a los que todavía les falta generar el contrato.
          No son contratos, por eso ninguna consulta de esta pestaña los veía. */}
      <Panel
        title="Estudios aprobados sin contrato"
        dot="bg-coral-500"
        subtitle="Genere el contrato desde el estudio"
      >
        {loadingSinContrato ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500" role="status" aria-live="polite">
            <IconLoader size={20} className="mx-auto mb-2 animate-spin text-primary-600" />
            Buscando estudios aprobados…
          </div>
        ) : sinContratoVisibles.length === 0 ? (
          <EmptyRow
            texto={sinContrato.length > 0 ? 'Ningún estudio aprobado coincide con la búsqueda.' : 'Ningún estudio aprobado espera contrato.'}
          />
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wide text-gray-600">
                <th className="px-6 py-3 font-bold">Arrendatario</th>
                <th className="px-6 py-3 font-bold">Inmueble</th>
                <th className="px-6 py-3 font-bold">Aprobado el</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {sinContratoVisibles.map((e) => (
                <tr key={e.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-6 py-3">
                    <Link href={`/expedientes/${e.id}`} className="font-medium text-primary-700 hover:underline">
                      {e.solicitante?.nombre ?? '—'}
                    </Link>
                  </td>
                  <td className="px-6 py-3">
                    {e.inmueble ? (
                      <div>
                        <span className="text-gray-900">
                          {e.inmueble.codigo && (
                            <span className="mr-1.5 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-bold">
                              {e.inmueble.codigo}
                            </span>
                          )}
                          {e.inmueble.direccion}
                        </span>
                        {e.inmueble.ciudad && <span className="block text-xs text-gray-500">{e.inmueble.ciudad}</span>}
                      </div>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">{formatDate(e.updated_at)}</td>
                  <td className="px-6 py-3 text-right">
                    <Link
                      href={`/expedientes/${e.id}`}
                      className="inline-flex items-center gap-1 rounded-md border-[1.5px] border-coral-500 px-3 py-1 text-xs font-bold text-coral-700 transition-colors hover:bg-coral-50"
                    >
                      {puedeEditar ? 'Generar contrato' : 'Ver estudio'}
                      <IconChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </Panel>

      {/* Borradores YA generados: aquí la acción no es generar (el contrato
          existe), sino revisarlo y mandarlo a firma. */}
      <Panel title="Borradores por enviar a firma" dot="bg-coral-500" subtitle="Contratos generados que faltan revisar o enviar">
        {pendientes.data.length === 0 ? (
          <EmptyRow texto="No hay contratos en borrador." />
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wide text-gray-600">
                <th className="px-6 py-3 font-bold">Arrendatario</th>
                <th className="px-6 py-3 font-bold">Propiedad</th>
                <th className="px-6 py-3 font-bold">Canon</th>
                <th className="px-6 py-3 font-bold">Generado</th>
                <th className="px-6 py-3 font-bold">Estado</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {pendientes.data.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-6 py-3"><Arrendatario c={c} /></td>
                  <td className="px-6 py-3"><Propiedad c={c} /></td>
                  <td className="px-6 py-3 font-bold text-gray-900">
                    {c.valor_arriendo ? formatCurrency(c.valor_arriendo) : '—'}
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">{fecha(c.fecha_generacion ?? c.created_at)}</td>
                  <td className="px-6 py-3"><EstadoBadge c={c} /></td>
                  <td className="px-6 py-3 text-right">
                    <Link
                      href={rutaContrato(c)}
                      className="inline-flex items-center gap-1 rounded-md border-[1.5px] border-coral-500 px-3 py-1 text-xs font-bold text-coral-700 transition-colors hover:bg-coral-50"
                    >
                      {/* Un borrador V3 puede estar en el paso 1: "enviar a firma" sería prometer de más. */}
                      {!puedeEditar ? 'Ver' : c.destinacion ? 'Continuar contrato' : 'Revisar y enviar a firma'}
                      <IconChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
        <ResumenTope meta={pendientes.meta} />
      </Panel>

      {/* En proceso de firma (pendiente_firma y, en V3, firma_incompleta) */}
      <Panel title="En proceso de firma" dot="bg-blue-600" subtitle="Esperando firmas o por reenviar (firma incompleta)">
        {enFirma.data.length === 0 ? (
          <EmptyRow texto="Ningún contrato en proceso de firma." />
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wide text-gray-600">
                <th className="px-6 py-3 font-bold">Arrendatario</th>
                <th className="px-6 py-3 font-bold">Propiedad</th>
                <th className="px-6 py-3 font-bold">Estado</th>
                <th className="px-6 py-3 font-bold">Generado</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {enFirma.data.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-6 py-3"><Arrendatario c={c} /></td>
                  <td className="px-6 py-3"><Propiedad c={c} /></td>
                  <td className="px-6 py-3"><EstadoBadge c={c} /></td>
                  <td className="px-6 py-3 text-xs text-gray-500">{fecha(c.fecha_generacion ?? c.created_at)}</td>
                  <td className="px-6 py-3 text-right">
                    <VerLink c={c} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
        <ResumenTope meta={enFirma.meta} />
      </Panel>

      {/* Contratos activos (firmado / vigente) */}
      <Panel title="Contratos activos" dot="bg-primary-600" subtitle="Contratos vigentes">
        {activos.data.length === 0 ? (
          <EmptyRow texto="Sin contratos activos." />
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wide text-gray-600">
                <th className="px-6 py-3 font-bold">Arrendatario</th>
                <th className="px-6 py-3 font-bold">Propiedad</th>
                <th className="px-6 py-3 font-bold">Canon</th>
                <th className="px-6 py-3 font-bold">Inicio</th>
                <th className="px-6 py-3 font-bold">Estado</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {activos.data.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-6 py-3"><Arrendatario c={c} /></td>
                  <td className="px-6 py-3"><Propiedad c={c} /></td>
                  <td className="px-6 py-3 font-bold text-gray-900">
                    {c.valor_arriendo ? formatCurrency(c.valor_arriendo) : '—'}
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">{c.fecha_inicio ? formatDate(c.fecha_inicio) : '—'}</td>
                  <td className="px-6 py-3"><EstadoBadge c={c} /></td>
                  <td className="px-6 py-3 text-right">
                    <VerLink c={c} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
        <Paginacion meta={activos.meta} que="contratos activos" loading={loading} onPage={setPageActivos} />
      </Panel>

      {/* Terminados y cancelados: plegado, se piden al abrirlo. */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => setVerCerrados((v) => !v)}
          aria-expanded={verCerrados}
          className="flex w-full flex-wrap items-center justify-between gap-3 px-6 py-5 text-left hover:bg-gray-50/60"
        >
          <span className="flex items-center gap-2.5 text-base font-bold text-gray-900">
            <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />
            Terminados y cancelados
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            {verCerrados ? 'Ocultar' : 'Ver'}
            <IconChevronDown size={14} className={cn('transition-transform', verCerrados && 'rotate-180')} />
          </span>
        </button>
        {verCerrados && (
          <div className="border-t border-gray-200">
            {loading && cerrados.data.length === 0 ? (
              <div className="px-6 py-8 text-center" role="status" aria-live="polite">
                <IconLoader size={20} className="mx-auto animate-spin text-primary-600" />
                <span className="sr-only">Cargando contratos terminados y cancelados…</span>
              </div>
            ) : cerrados.data.length === 0 ? (
              <EmptyRow texto="Ningún contrato terminado ni cancelado." />
            ) : (
              <div className="overflow-x-auto"><table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wide text-gray-600">
                    <th className="px-6 py-3 font-bold">Arrendatario</th>
                    <th className="px-6 py-3 font-bold">Propiedad</th>
                    <th className="px-6 py-3 font-bold">Inicio</th>
                    <th className="px-6 py-3 font-bold">Terminado</th>
                    <th className="px-6 py-3 font-bold">Estado</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {cerrados.data.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                      <td className="px-6 py-3"><Arrendatario c={c} /></td>
                      <td className="px-6 py-3"><Propiedad c={c} /></td>
                      <td className="px-6 py-3 text-xs text-gray-500">{c.fecha_inicio ? formatDate(c.fecha_inicio) : '—'}</td>
                      <td className="px-6 py-3 text-xs text-gray-500">{c.fecha_terminacion ? formatDate(c.fecha_terminacion) : '—'}</td>
                      <td className="px-6 py-3"><EstadoBadge c={c} /></td>
                      <td className="px-6 py-3 text-right">
                        <VerLink c={c} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
            <Paginacion meta={cerrados.meta} que="contratos terminados y cancelados" loading={loading} onPage={setPageCerrados} />
          </div>
        )}
      </div>
    </div>
  )
}

function Paginacion({
  meta,
  que,
  loading,
  onPage,
}: {
  meta: IContratoMeta
  que: string
  loading: boolean
  onPage: (cambio: (p: number) => number) => void
}) {
  if (meta.totalPages <= 1) return null
  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-6 py-3"
      aria-label={`Paginación de ${que}`}
    >
      <p className="text-xs text-gray-500">
        Página {meta.page} de {meta.totalPages} · {meta.total} contratos
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage((p) => Math.max(1, p - 1))}
          disabled={meta.page <= 1 || loading}
          aria-label={`Página anterior de ${que}`}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconArrowLeft size={14} />
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onPage((p) => p + 1)}
          disabled={meta.page >= meta.totalPages || loading}
          aria-label={`Página siguiente de ${que}`}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
          <IconArrowRight size={14} />
        </button>
      </div>
    </nav>
  )
}

/**
 * Aviso explícito cuando el panel muestra menos filas de las que hay. Antes el
 * tope se aplicaba en silencio y el resto simplemente no existía para el gestor.
 */
function ResumenTope({ meta }: { meta: IContratoMeta }) {
  if (meta.total <= meta.limit || meta.limit === 0) return null
  return (
    <p className="border-t border-gray-200 px-6 py-3 text-xs text-gray-500">
      Mostrando {meta.limit} de {meta.total}. Use la búsqueda o los filtros para acotar la lista.
    </p>
  )
}

// ── Subcomponentes de presentación ───────────────────────────

function StatCard({
  label,
  value,
  sub,
  color = 'text-gray-900',
}: {
  label: string
  value: number | string
  sub: string
  color?: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</div>
      <div className={cn('text-3xl font-black leading-none tracking-tight', color)}>{value}</div>
      <div className="mt-1 text-xs text-gray-500">{sub}</div>
    </div>
  )
}

function Panel({
  title,
  dot,
  subtitle,
  children,
}: {
  title: string
  dot: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-5">
        <h3 className="flex items-center gap-2.5 text-base font-bold text-gray-900">
          <span className={cn('inline-block h-2 w-2 rounded-full', dot)} />
          {title}
        </h3>
        <span className="text-xs text-gray-500">{subtitle}</span>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

function EmptyRow({ texto }: { texto: string }) {
  return (
    <div className="px-6 py-8 text-center text-sm text-gray-500">
      <IconFileText size={28} className="mx-auto mb-2 text-gray-300" />
      {texto}
    </div>
  )
}

function VerLink({ c }: { c: Parameters<typeof rutaContrato>[0] }) {
  return (
    <Link
      href={rutaContrato(c)}
      className="inline-flex items-center gap-1 rounded-md border-[1.5px] border-gray-200 px-3 py-1 text-xs font-bold text-gray-600 transition-colors hover:border-coral-500 hover:text-coral-700"
    >
      Ver
      <IconChevronRight size={14} />
    </Link>
  )
}
