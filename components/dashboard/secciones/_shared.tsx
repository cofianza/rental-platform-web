/**
 * Helpers compartidos para las secciones del Centro de Control.
 * Estilo alineado al mockup htmls/15_*: tablas con header gris, chips de
 * estado, KPIs compactos. Todas las secciones los reutilizan para mantener
 * consistencia visual. Son la única fuente de verdad del lenguaje visual del
 * dashboard interno — las props nuevas son opcionales y retrocompatibles.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import type { IconProps } from '@/components/icons'
import { IconRefresh, IconX, IconTrendingUp, IconTrendingDown } from '@/components/icons'

// ── Formatters ───────────────────────────────────────────────

export const money = (n: number | null | undefined) => `$${Number(n ?? 0).toLocaleString('es-CO')}`

/** Moneda compacta para valores grandes en cards estrechas: $2,1 M / $850 k. */
export const moneyCompact = (n: number | null | undefined) => {
  const v = Number(n ?? 0)
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
  if (abs >= 1_000) return `$${(v / 1_000).toLocaleString('es-CO', { maximumFractionDigits: 0 })} k`
  return money(v)
}

export const fechaCorta = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Tiempo relativo en español ("hace 3 h", "hace 2 d"). Cae a fechaCorta si es viejo. */
export const fechaRelativa = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const segs = (Date.now() - d.getTime()) / 1000
  if (segs < 60) return 'hace un momento'
  if (segs < 3600) return `hace ${Math.floor(segs / 60)} min`
  if (segs < 86400) return `hace ${Math.floor(segs / 3600)} h`
  if (segs < 604800) return `hace ${Math.floor(segs / 86400)} d`
  return fechaCorta(iso)
}

// ── Hook de carga de sección ─────────────────────────────────

export function useSeccion<T>(loader: () => Promise<T>): {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
} {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(() => {
    setLoading(true)
    setError(null)
    loader()
      .then((d) => setData(d))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar los datos'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    run()
  }, [run])

  return { data, loading, error, reload: run }
}

// ── Skeleton de carga (mejor perceived-performance que un spinner) ──

function SkeletonBar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-ink-100 ${className}`} />
}

/** Placeholder con forma de tabla mientras carga la sección. */
function TablaSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-xl border border-ink-200 bg-white">
      <div className="flex items-center gap-4 border-b border-ink-200 bg-ink-50 px-3 py-3">
        <SkeletonBar className="h-2.5 w-28" />
        <SkeletonBar className="h-2.5 w-20" />
        <SkeletonBar className="ml-auto h-2.5 w-16" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-ink-100 px-3 py-3.5">
          <SkeletonBar className="h-3 flex-1" />
          <SkeletonBar className="hidden h-3 w-24 sm:block" />
          <SkeletonBar className="h-3 w-16" />
          <SkeletonBar className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

// ── Estado de sección (loading / error / vacío) ──────────────

/** Estado vacío enriquecido: ícono + título + descripción + acción (CTA). */
export interface EmptyState {
  icon?: React.ComponentType<IconProps>
  titulo?: string
  descripcion?: string
  action?: React.ReactNode
}

export function SeccionEstado({
  loading,
  error,
  onRetry,
  vacio,
  children,
}: {
  loading: boolean
  error: string | null
  onRetry: () => void
  vacio?: boolean | EmptyState
  children: React.ReactNode
}) {
  if (loading) {
    return (
      <div role="status" aria-live="polite">
        <span className="sr-only">Cargando…</span>
        <TablaSkeleton />
      </div>
    )
  }
  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm font-semibold text-red-700">No pudimos cargar esta sección</p>
        <p className="mt-1 text-xs text-red-600">{error}</p>
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          <IconRefresh size={14} /> Reintentar
        </button>
      </div>
    )
  }
  if (vacio) {
    const e: EmptyState = typeof vacio === 'object' ? vacio : {}
    const EmptyIcon = e.icon
    return (
      <div className="rounded-xl border border-ink-200 bg-white py-16 text-center">
        {EmptyIcon && (
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-400">
            <EmptyIcon size={24} />
          </span>
        )}
        <p className="text-sm font-semibold text-ink-700">{e.titulo ?? 'Sin registros'}</p>
        {e.descripcion ? (
          <p className="mt-1 text-xs text-ink-500">{e.descripcion}</p>
        ) : (
          !e.titulo && <p className="text-sm text-ink-500">No hay registros para mostrar.</p>
        )}
        {e.action && <div className="mt-4 flex justify-center">{e.action}</div>}
      </div>
    )
  }
  return <>{children}</>
}

// ── Encabezado de sección (título + subtítulo + acción) ──────

export function SeccionHeader({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-ink-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}

// ── KPIs compactos ───────────────────────────────────────────

type KpiTone = 'green' | 'orange' | 'blue' | 'red' | 'purple' | 'gray'

const KPI_TONE: Record<KpiTone, { value: string; iconBg: string }> = {
  green: { value: 'text-primary-700', iconBg: 'bg-primary-50 text-primary-600' },
  orange: { value: 'text-coral-600', iconBg: 'bg-coral-50 text-coral-600' },
  blue: { value: 'text-blue-600', iconBg: 'bg-blue-50 text-blue-600' },
  red: { value: 'text-red-600', iconBg: 'bg-red-50 text-red-600' },
  purple: { value: 'text-purple-600', iconBg: 'bg-purple-50 text-purple-600' },
  gray: { value: 'text-ink-900', iconBg: 'bg-ink-100 text-ink-500' },
}

type KpiAccent = 'none' | 'danger' | 'warning' | 'risk'

const KPI_ACCENT: Record<KpiAccent, string> = {
  none: '',
  danger: 'border-l-4 border-l-red-500 bg-red-50/40',
  warning: 'border-l-4 border-l-coral-500 bg-coral-50/40',
  risk: 'border-l-4 border-l-purple-500 bg-purple-50/40',
}

export function KpiRow({ children, cols = 4 }: { children: React.ReactNode; cols?: 2 | 3 | 4 | 5 }) {
  const lg = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5' }[cols]
  return <div className={`dash-reveal mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 ${lg}`}>{children}</div>
}

export interface KpiDelta {
  value: string
  dir: 'up' | 'down'
  tone?: 'good' | 'bad' | 'neutral'
}

export function Kpi({
  label,
  value,
  sub,
  tone = 'gray',
  Icon,
  accent = 'none',
  delta,
  unavailable = false,
  onClick,
  active = false,
}: {
  label: string
  value: string | number
  sub?: string
  tone?: KpiTone
  Icon?: React.ComponentType<IconProps>
  /** Franja lateral + fondo tenue para resaltar alertas (danger/warning/risk). */
  accent?: KpiAccent
  /** Indicador de tendencia opcional junto al valor. */
  delta?: KpiDelta
  /** Atenúa la tarjeta y muestra un badge "sin data" (métrica no configurada). */
  unavailable?: boolean
  /** Hace la tarjeta clicable (drill-down). */
  onClick?: () => void
  /** Resalta la tarjeta como filtro activo. */
  active?: boolean
}) {
  const t = KPI_TONE[tone]
  const DeltaArrow = delta?.dir === 'down' ? IconTrendingDown : IconTrendingUp
  const deltaColor =
    delta?.tone === 'good' ? 'text-primary-600' : delta?.tone === 'bad' ? 'text-red-600' : 'text-ink-500'

  const className = [
    'relative rounded-xl border bg-white p-3 text-left',
    active ? 'border-primary-500 ring-[3px] ring-primary-600/10' : 'border-ink-200',
    KPI_ACCENT[accent],
    unavailable ? 'opacity-60' : '',
    onClick ? 'w-full cursor-pointer transition hover:border-ink-300 hover:shadow-sm' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const inner = (
    <>
      {unavailable && (
        <span className="absolute right-2 top-2 rounded bg-ink-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-ink-500">
          sin data
        </span>
      )}
      <div className="flex items-center gap-2">
        {Icon && (
          <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${t.iconBg}`}>
            <Icon size={15} />
          </span>
        )}
        <span className="text-[9px] font-semibold uppercase tracking-wide text-ink-500">{label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={`text-xl font-extrabold tracking-tight ${t.value}`}>{value}</span>
        {delta && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${deltaColor}`}>
            <DeltaArrow size={12} />
            {delta.value}
          </span>
        )}
      </div>
      {sub && <div className="mt-0.5 text-[10px] text-ink-500">{sub}</div>}
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    )
  }
  return <div className={className}>{inner}</div>
}

// ── Chip / badge ─────────────────────────────────────────────

export type ChipTone = 'green' | 'orange' | 'red' | 'blue' | 'purple' | 'gray' | 'yellow' | 'risk'

const CHIP_TONE: Record<ChipTone, string> = {
  green: 'bg-primary-50 text-primary-700',
  orange: 'bg-coral-50 text-coral-700',
  red: 'bg-red-50 text-red-700',
  blue: 'bg-blue-50 text-blue-700',
  purple: 'bg-purple-50 text-purple-700',
  gray: 'bg-ink-100 text-ink-600',
  yellow: 'bg-amber-100 text-amber-700',
  // Variante sólida para marcar zona de riesgo M8-14.
  risk: 'bg-purple-600 text-white',
}

export function Chip({ tone = 'gray', children }: { tone?: ChipTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${CHIP_TONE[tone]}`}>
      {children}
    </span>
  )
}

// ── Tabla estilizada ─────────────────────────────────────────

export function Tabla({
  head,
  children,
  zebra = false,
  sticky = false,
  density = 'normal',
}: {
  head: string[]
  children: React.ReactNode
  /** Filas alternas con fondo tenue (mejora legibilidad en tablas anchas). */
  zebra?: boolean
  /** Header pegajoso al hacer scroll. */
  sticky?: boolean
  /** Densidad de filas. */
  density?: 'normal' | 'compact'
}) {
  const dens = density === 'compact' ? '[&_th]:py-1.5 [&_td]:py-1.5' : ''
  const zeb = zebra ? '[&_tbody_tr:nth-child(even)]:bg-ink-50/50' : ''
  return (
    <div className="overflow-x-auto rounded-xl border border-ink-200 bg-white">
      <table
        className={`w-full border-collapse text-left [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-ink-50 ${zeb} ${dens}`}
      >
        <thead className={sticky ? 'sticky top-0 z-10' : ''}>
          <tr className="bg-ink-50">
            {head.map((h, i) => (
              <th
                key={i}
                scope="col"
                className="whitespace-nowrap border-b border-ink-200 px-3 py-2.5 text-[9px] font-bold uppercase tracking-wide text-ink-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <td className={`border-b border-ink-100 px-3 py-2.5 text-xs text-ink-800 ${className}`}>{children}</td>
}

// ── Barra de filtros (selects) ───────────────────────────────

export function FiltroSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  label: string
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-primary-600 focus:outline-none focus:ring-[3px] focus:ring-primary-600/10"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function FiltroBar({
  children,
  count,
  onClear,
}: {
  children: React.ReactNode
  count?: string
  /** Si se pasa, muestra un botón "Limpiar" (úsalo solo cuando haya filtro activo). */
  onClear?: () => void
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {children}
      {onClear && (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:underline"
        >
          <IconX size={12} /> Limpiar
        </button>
      )}
      {count && <span className="ml-auto text-[11px] text-ink-500">{count}</span>}
    </div>
  )
}
