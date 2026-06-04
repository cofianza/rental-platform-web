/**
 * ContratosInmobiliariaView — vista de Contratos para la inmobiliaria con el
 * diseño del mockup 13_v2 (tab "Contratos"): 3 stat-cards + tres paneles por
 * etapa (Pendientes de generar / En proceso de firma / Contratos activos) con
 * el lenguaje visual de EstudiosInmobiliariaView (stat-cards font-black,
 * paneles con punto de color, chips de código monospace y badges pill con bdot).
 *
 * NO inventa datos: reutiliza contratoService.getStats (KPIs reales) y
 * contratoService.getAllContratos (listado), agrupando por estado igual que
 * ContratosAgrupados. No se replican columnas ficticias del mockup (tier,
 * tipo de contrato comercial, cédula, firma por-parte) — solo campos reales.
 * Admin/operador/gerencia conservan su vista (KPIMini + ContratosAgrupados).
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { contratoService, type IContratosStats } from '@/services/contratoService'
import type { IContratoListItem, EstadoContrato } from '@/types/contrato'
import { ESTADOS_CONTRATO, formatCurrency, formatDate, formatDateTime, type EstadoContratoKey } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { IconLoader, IconAlertTriangle, IconFileText, IconChevronRight } from '@/components/icons'

// ── Helpers de presentación (reutilizados de ContratosAgrupados) ──

function arrendatario(c: IContratoListItem): string {
  const s = c.expedientes?.solicitantes
  const nombre = s ? `${s.nombre ?? ''} ${s.apellido ?? ''}`.trim() : ''
  return nombre || '—'
}

function Propiedad({ c }: { c: IContratoListItem }) {
  const inm = c.expedientes?.inmuebles
  if (!inm) return <span className="text-gray-400">—</span>
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

// ── Badges tipo pill con bdot (override visual: pendiente_firma en azul para
// igualar el mockup; el label sigue saliendo de ESTADOS_CONTRATO) ───────────

type BadgeKind = 'pendiente' | 'firma' | 'activo' | 'finalizado' | 'cancelado'

const BADGE_STYLE: Record<BadgeKind, { wrap: string; dot: string }> = {
  pendiente: { wrap: 'bg-coral-50 text-coral-600', dot: 'bg-coral-500' },
  firma: { wrap: 'bg-blue-50 text-blue-600', dot: 'bg-blue-600 animate-pulse' },
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
    case 'firmado':
    case 'vigente':
      return 'activo'
    case 'cancelado':
      return 'cancelado'
    default:
      return 'finalizado'
  }
}

function EstadoBadge({ estado }: { estado: EstadoContrato }) {
  const bs = BADGE_STYLE[badgeKind(estado)]
  const label = ESTADOS_CONTRATO[estado as EstadoContratoKey]?.label ?? estado
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', bs.wrap)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', bs.dot)} />
      {label}
    </span>
  )
}

// ── Componente ───────────────────────────────────────────────

export function ContratosInmobiliariaView() {
  const [contratos, setContratos] = useState<IContratoListItem[]>([])
  const [stats, setStats] = useState<IContratosStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    contratoService.getStats().then((s) => {
      if (!cancel) setStats(s)
    }).catch(() => {})
    contratoService
      .getAllContratos({ limit: 100, page: 1, sortBy: 'created_at', sortDir: 'desc' })
      .then((r) => {
        if (!cancel) setContratos(r.data)
      })
      .catch((e) => {
        if (!cancel) setError(e instanceof Error ? e.message : 'Error al cargar contratos')
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
        <IconLoader size={28} className="animate-spin text-primary-600" />
        <span className="sr-only">Cargando contratos…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        <IconAlertTriangle size={20} className="mx-auto mb-2" />
        {error}
      </div>
    )
  }

  const pendientes = contratos.filter((c) => c.estado === 'borrador')
  const enFirma = contratos.filter((c) => c.estado === 'pendiente_firma')
  const activos = contratos.filter((c) => c.estado === 'firmado' || c.estado === 'vigente')

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Pendientes de generar"
          value={stats?.pendientes_generar ?? 0}
          color="text-coral-500"
          sub="Estudios aprobados sin contrato"
        />
        <StatCard
          label="En proceso de firma"
          value={stats?.en_proceso_firma ?? 0}
          color="text-blue-600"
          sub="Esperando firmas"
        />
        <StatCard
          label="Activos"
          value={stats?.activos ?? 0}
          color="text-primary-600"
          sub="Contratos vigentes"
        />
      </div>

      {/* Pendientes de generar (borrador) */}
      <Panel title="Pendientes de generar contrato" dot="bg-coral-500" subtitle="Borradores listos para finalizar o enviar a firma">
        {pendientes.length === 0 ? (
          <EmptyRow texto="No hay contratos en borrador." />
        ) : (
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-6 py-3 font-bold">Arrendatario</th>
                <th className="px-6 py-3 font-bold">Propiedad</th>
                <th className="px-6 py-3 font-bold">Canon</th>
                <th className="px-6 py-3 font-bold">Generado</th>
                <th className="px-6 py-3 font-bold">Estado</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {pendientes.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-6 py-3 font-medium text-gray-900">{arrendatario(c)}</td>
                  <td className="px-6 py-3"><Propiedad c={c} /></td>
                  <td className="px-6 py-3 font-bold text-gray-900">
                    {c.valor_arriendo ? formatCurrency(c.valor_arriendo) : '—'}
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">{fecha(c.fecha_generacion ?? c.created_at)}</td>
                  <td className="px-6 py-3"><EstadoBadge estado={c.estado} /></td>
                  <td className="px-6 py-3 text-right">
                    <Link
                      href={`/contratos/${c.id}`}
                      className="inline-flex items-center gap-1 rounded-md border-[1.5px] border-coral-500 px-3 py-1 text-xs font-bold text-coral-600 transition-colors hover:bg-coral-50"
                    >
                      Generar contrato
                      <IconChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {/* En proceso de firma (pendiente_firma) */}
      <Panel title="En proceso de firma" dot="bg-blue-600" subtitle="Esperando firmas">
        {enFirma.length === 0 ? (
          <EmptyRow texto="Ningún contrato en proceso de firma." />
        ) : (
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-6 py-3 font-bold">Arrendatario</th>
                <th className="px-6 py-3 font-bold">Propiedad</th>
                <th className="px-6 py-3 font-bold">Estado</th>
                <th className="px-6 py-3 font-bold">Generado</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {enFirma.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-6 py-3 font-medium text-gray-900">{arrendatario(c)}</td>
                  <td className="px-6 py-3"><Propiedad c={c} /></td>
                  <td className="px-6 py-3"><EstadoBadge estado={c.estado} /></td>
                  <td className="px-6 py-3 text-xs text-gray-500">{fecha(c.fecha_generacion ?? c.created_at)}</td>
                  <td className="px-6 py-3 text-right">
                    <VerLink id={c.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {/* Contratos activos (firmado / vigente) */}
      <Panel title="Contratos activos" dot="bg-primary-600" subtitle="Contratos vigentes">
        {activos.length === 0 ? (
          <EmptyRow texto="Sin contratos activos." />
        ) : (
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-6 py-3 font-bold">Arrendatario</th>
                <th className="px-6 py-3 font-bold">Propiedad</th>
                <th className="px-6 py-3 font-bold">Canon</th>
                <th className="px-6 py-3 font-bold">Inicio</th>
                <th className="px-6 py-3 font-bold">Estado</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {activos.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-6 py-3 font-medium text-gray-900">{arrendatario(c)}</td>
                  <td className="px-6 py-3"><Propiedad c={c} /></td>
                  <td className="px-6 py-3 font-bold text-gray-900">
                    {c.valor_arriendo ? formatCurrency(c.valor_arriendo) : '—'}
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">{c.fecha_inicio ? formatDate(c.fecha_inicio) : '—'}</td>
                  <td className="px-6 py-3"><EstadoBadge estado={c.estado} /></td>
                  <td className="px-6 py-3 text-right">
                    <VerLink id={c.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
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
    <div className="px-6 py-8 text-center text-sm text-gray-400">
      <IconFileText size={28} className="mx-auto mb-2 text-gray-300" />
      {texto}
    </div>
  )
}

function VerLink({ id }: { id: string }) {
  return (
    <Link
      href={`/contratos/${id}`}
      className="inline-flex items-center gap-1 rounded-md border-[1.5px] border-gray-200 px-3 py-1 text-xs font-bold text-gray-600 transition-colors hover:border-coral-500 hover:text-coral-600"
    >
      Ver
      <IconChevronRight size={14} />
    </Link>
  )
}
