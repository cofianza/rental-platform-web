/**
 * EstudiosInmobiliariaView — vista de Estudios para la inmobiliaria con el
 * diseño del mockup 13_v2 (tab "Estudios"): barra de inicio + badge de saldo +
 * "Nuevo estudio", 4 stat-cards, panel "Historial de estudios" con chips de
 * filtro y badges tipo pill, y la sección de compra de paquetes.
 *
 * NO inventa datos: reutiliza useEstudiosList (listado + filtros), getStats
 * (KPIs reales) y el saldo de créditos. Las columnas Propiedad/Canon del mockup
 * no existen en el listado de estudios → se sustituyen por Expediente + Score,
 * que sí son datos reales y enlazables. Admin/operador conservan su vista.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useEstudiosList } from '@/hooks/useEstudiosList'
import { estudioService } from '@/services/estudioService'
import { creditosEstudiosService, type ISaldoCreditos } from '@/services/creditosEstudiosService'
import type { IEstudio, IEstudioListItem, IEstudiosStats } from '@/types/estudio'
import { EstudioDetailModal } from '@/components/expedientes/EstudioDetailModal'
import { AdquirirEstudiosCredito } from '@/components/estudios/AdquirirEstudiosCredito'
import { fechaCorta } from '@/components/dashboard/secciones/_shared'
import { cn } from '@/lib/utils'
import { IconSearch, IconPlus, IconLoader, IconShield, IconChevronRight } from '@/components/icons'

// ── Helpers de presentación (estilo mockup) ──────────────────

function prospecto(e: IEstudioListItem): string {
  const sol = e.expedientes?.solicitantes
  if (sol) return `${sol.nombre} ${sol.apellido}`.trim()
  return e.expedientes?.numero ?? '—'
}

type BadgeKind = 'aprobado' | 'rechazado' | 'procesando' | 'esperando' | 'condicionado'

const BADGE_STYLE: Record<BadgeKind, { wrap: string; dot: string }> = {
  aprobado: { wrap: 'bg-primary-50 text-primary-700', dot: 'bg-primary-600' },
  rechazado: { wrap: 'bg-red-50 text-red-500', dot: 'bg-red-500' },
  condicionado: { wrap: 'bg-coral-50 text-coral-600', dot: 'bg-coral-500' },
  procesando: { wrap: 'bg-blue-50 text-blue-600', dot: 'bg-blue-600 animate-pulse' },
  esperando: { wrap: 'bg-gray-50 text-gray-600 border border-gray-200', dot: 'bg-gray-400' },
}

function estadoBadge(e: IEstudioListItem): { kind: BadgeKind; label: string } {
  if (e.resultado === 'aprobado') return { kind: 'aprobado', label: 'Aprobado' }
  if (e.resultado === 'rechazado') return { kind: 'rechazado', label: 'Rechazado' }
  if (e.resultado === 'condicionado') return { kind: 'condicionado', label: 'Condicionado' }
  switch (e.estado) {
    case 'en_proceso':
    case 'pagado':
    case 'autorizado':
    case 'formulario_completado':
    case 'documentos_cargados':
      return { kind: 'procesando', label: 'En proceso' }
    case 'completado':
      return { kind: 'procesando', label: 'Completado' }
    case 'fallido':
      return { kind: 'rechazado', label: 'Fallido' }
    case 'cancelado':
      return { kind: 'esperando', label: 'Cancelado' }
    default:
      return { kind: 'esperando', label: 'Esperando' }
  }
}

const CHIPS = [
  { id: 'todos', label: 'Todos' },
  { id: 'aprobado', label: 'Aprobados' },
  { id: 'proceso', label: 'En proceso' },
  { id: 'rechazado', label: 'Rechazados' },
] as const

// ── Componente ───────────────────────────────────────────────

interface EstudiosViewProps {
  /** Texto de intro a la izquierda del encabezado. */
  intro?: string
  /** Badge de saldo de créditos (solo inmobiliaria). */
  showSaldo?: boolean
  /** Sección de compra de paquetes (solo inmobiliaria). */
  showPaquetes?: boolean
}

export function EstudiosInmobiliariaView({
  intro = 'Inicia estudios · Respuesta en segundos · Notificación inmediata a las partes',
  showSaldo = true,
  showPaquetes = true,
}: EstudiosViewProps = {}) {
  const {
    estudios,
    meta,
    filters,
    isLoading,
    activeBandeja,
    setActiveBandeja,
    setFilters,
  } = useEstudiosList()

  const [stats, setStats] = useState<IEstudiosStats | null>(null)
  const [saldo, setSaldo] = useState<ISaldoCreditos | null>(null)
  const [detalle, setDetalle] = useState<IEstudio | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  useEffect(() => {
    estudioService.getStats().then(setStats).catch(() => {})
    if (showSaldo) creditosEstudiosService.getMiSaldo().then(setSaldo).catch(() => {})
  }, [showSaldo])

  // Tasa de aprobación honesta: aprobados / decididos (aprob + rech + cond).
  const decididos = stats ? stats.aprobados + stats.rechazados + stats.condicionados : 0
  const tasa = decididos > 0 ? Math.round((stats!.aprobados / decididos) * 1000) / 10 : null

  const activeChip =
    filters.resultado === 'aprobado'
      ? 'aprobado'
      : filters.resultado === 'rechazado'
        ? 'rechazado'
        : activeBandeja === 'en_proceso'
          ? 'proceso'
          : 'todos'

  function aplicarChip(id: (typeof CHIPS)[number]['id']) {
    if (id === 'todos') {
      setActiveBandeja(null)
      setFilters({ resultado: '', page: 1 })
    } else if (id === 'proceso') {
      setFilters({ resultado: '', page: 1 })
      setActiveBandeja('en_proceso')
    } else {
      setActiveBandeja(null)
      setFilters({ resultado: id, page: 1 })
    }
  }

  async function verEstudio(id: string) {
    setCargandoDetalle(true)
    try {
      setDetalle(await estudioService.getEstudioById(id))
    } catch {
      /* el usuario puede reintentar */
    } finally {
      setCargandoDetalle(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado: intro + saldo + nuevo estudio */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-500">{intro}</p>
        <div className="flex items-center gap-2.5">
          {showSaldo && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary-600 bg-primary-50 px-3.5 py-1.5 text-sm font-bold text-primary-700">
              <IconSearch size={14} />
              {saldo ? saldo.saldo_total : '…'} estudios disponibles
            </span>
          )}
          <Link
            href="/expedientes"
            className="inline-flex items-center gap-1.5 rounded-lg bg-coral-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-coral-600"
          >
            <IconPlus size={16} />
            Nuevo estudio
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Este mes" value={stats?.este_mes ?? 0} sub="Estudios iniciados" />
        <StatCard
          label="Aprobados"
          value={stats?.aprobados ?? 0}
          color="text-primary-600"
          sub={tasa != null ? `${tasa}% tasa de aprobación` : 'Sin decisiones aún'}
        />
        <StatCard
          label="En proceso"
          value={stats?.en_proceso ?? 0}
          color="text-blue-600"
          sub="Esperando prospecto"
        />
        <StatCard
          label="Rechazados"
          value={stats?.rechazados ?? 0}
          color="text-red-500"
          sub={
            stats && stats.condicionados > 0
              ? `${stats.condicionados} condicionado${stats.condicionados === 1 ? '' : 's'}`
              : 'Sin condicionados'
          }
        />
      </div>

      {/* Historial */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-5">
          <h3 className="flex items-center gap-2.5 text-base font-bold text-gray-900">
            <span className="inline-block h-2 w-2 rounded-full bg-primary-600" />
            Historial de estudios
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {CHIPS.map((c) => (
              <button
                key={c.id}
                onClick={() => aplicarChip(c.id)}
                className={cn(
                  'rounded-full border-[1.5px] px-3.5 py-1 text-xs font-bold transition-colors',
                  activeChip === c.id
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary-600',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
              <IconLoader size={20} className="animate-spin text-primary-600" />
              Cargando estudios…
            </div>
          ) : estudios.length === 0 ? (
            <div className="py-12 text-center">
              <IconShield size={44} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-900">No hay estudios para este filtro</p>
              <p className="mt-1 text-sm text-gray-500">
                Inicia uno desde un expediente con el botón “Nuevo estudio”.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-6 py-3 font-bold">Prospecto</th>
                  <th className="px-6 py-3 font-bold">Tipo</th>
                  <th className="px-6 py-3 font-bold">Expediente</th>
                  <th className="px-6 py-3 font-bold">Estado</th>
                  <th className="px-6 py-3 font-bold">Score</th>
                  <th className="px-6 py-3 font-bold">Fecha</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {estudios.map((e) => {
                  const badge = estadoBadge(e)
                  const bs = BADGE_STYLE[badge.kind]
                  const esCoa = e.tipo === 'con_coarrendatario'
                  return (
                    <tr key={e.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                      <td className="px-6 py-3 font-medium text-gray-900">{prospecto(e)}</td>
                      <td className="px-6 py-3">
                        <span
                          className={cn(
                            'inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                            esCoa ? 'bg-blue-50 text-blue-600' : 'bg-coral-50 text-coral-600',
                          )}
                        >
                          {esCoa ? 'Co-arrendatario' : 'Individual'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{e.expedientes?.numero ?? '—'}</td>
                      <td className="px-6 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold',
                            bs.wrap,
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', bs.dot)} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 tabular-nums text-gray-700">{e.score ?? '—'}</td>
                      <td className="px-6 py-3 text-gray-600">
                        {fechaCorta(e.fecha_solicitud ?? e.created_at)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => verEstudio(e.id)}
                          disabled={cargandoDetalle}
                          className="inline-flex items-center gap-1 rounded-md border-[1.5px] border-gray-200 px-3 py-1 text-xs font-bold text-gray-600 transition-colors hover:border-coral-500 hover:text-coral-600 disabled:opacity-50"
                        >
                          Ver
                          <IconChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación simple (reusa meta del listado) */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 text-sm text-gray-500">
            <span>
              Página {meta.page} de {meta.totalPages} · {meta.total} estudios
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ page: meta.page - 1 })}
                disabled={meta.page <= 1}
                className="rounded-md border border-gray-200 px-3 py-1 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setFilters({ page: meta.page + 1 })}
                disabled={meta.page >= meta.totalPages}
                className="rounded-md border border-gray-200 px-3 py-1 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Compra de paquetes (ya existente, flujo Stripe) — solo inmobiliaria */}
      {showPaquetes && <AdquirirEstudiosCredito />}

      {/* Detalle del estudio (modal reutilizado) */}
      {detalle && (
        <EstudioDetailModal isOpen={!!detalle} onClose={() => setDetalle(null)} estudio={detalle} readOnly />
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  color = 'text-gray-900',
}: {
  label: string
  value: number
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
