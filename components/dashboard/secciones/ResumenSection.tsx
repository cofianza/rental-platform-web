/**
 * Centro de Control — Dashboard interno del administrador.
 * Basado en mockup htmls/15_COFIANZA_Dashboard_Interno_v2.html (tab "Resumen").
 *
 * Consume GET /api/v1/dashboard/admin/overview. Las métricas listadas en
 * `meta.metricasNoDisponibles` se renderean con un tono más suave porque
 * todavía no hay tracking en el backend (capital, desembolsado, tickets de
 * soporte, visitas de vitrina).
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { WipeTestDataCard } from '@/components/dashboard/WipeTestDataCard'
import { dashboardService } from '@/services/dashboardService'
import type { AdminOverview } from '@/services/dashboardService'
import {
  Kpi,
  KpiRow,
  SeccionHeader,
  money,
  fechaCorta,
  fechaRelativa,
} from '@/components/dashboard/secciones/_shared'
import {
  IconLoader,
  IconRefresh,
  IconBuilding2,
  IconFileText,
  IconCheck,
  IconCheckCircle,
  IconAlertTriangle,
  IconDollarSign,
  IconBank,
  IconTrendingUp,
  IconTrendingDown,
  IconInbox,
  IconActivity,
  IconCalendar,
  IconEye,
  IconImages,
  IconChevronDown,
  IconArrowRight,
} from '@/components/icons'
import type { IconProps } from '@/components/icons'

// ── Alert ────────────────────────────────────────────────────

type AlertTone = 'danger' | 'warning' | 'success' | 'risk'

const ALERT_STYLES: Record<AlertTone, string> = {
  danger: 'border-l-red-500 bg-red-100 text-red-700',
  warning: 'border-l-coral-500 bg-coral-50 text-coral-700',
  success: 'border-l-primary-700 bg-primary-50 text-primary-800',
  risk: 'border-l-purple-600 bg-purple-50 text-purple-700',
}

const ALERT_ICONS: Record<AlertTone, React.ComponentType<IconProps>> = {
  danger: IconAlertTriangle,
  warning: IconCalendar,
  success: IconCheckCircle,
  risk: IconAlertTriangle,
}

function Alert({
  tone,
  children,
  onClick,
}: {
  tone: AlertTone
  children: React.ReactNode
  onClick?: () => void
}) {
  const Icon = ALERT_ICONS[tone]
  const base = `flex w-full items-start gap-2 rounded-lg border-l-4 px-3 py-2.5 text-left text-[11px] leading-relaxed ${ALERT_STYLES[tone]}`
  const content = (
    <>
      <Icon size={14} className="mt-0.5 shrink-0" />
      <div className="flex-1">{children}</div>
      {onClick && <IconArrowRight size={13} className="mt-0.5 shrink-0 opacity-60" />}
    </>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} cursor-pointer transition hover:brightness-[0.97]`}>
        {content}
      </button>
    )
  }
  return <div className={base}>{content}</div>
}

// ── Grupo de alertas colapsable ──────────────────────────────

interface AlertItem {
  key: string
  message: React.ReactNode
  onClick?: () => void
}

function AlertGroup({
  titulo,
  tone,
  items,
  onItemClick,
  defaultLimit = 4,
}: {
  titulo: string
  tone: AlertTone
  items: AlertItem[]
  /** Navegación al pulsar cualquier ítem (drill-down a la ruta del grupo). */
  onItemClick?: () => void
  defaultLimit?: number
}) {
  const [open, setOpen] = useState(false)
  if (items.length === 0) return null
  const visibles = open ? items : items.slice(0, defaultLimit)
  const restantes = items.length - visibles.length

  const dot =
    tone === 'danger'
      ? 'bg-red-500'
      : tone === 'risk'
        ? 'bg-purple-600'
        : tone === 'warning'
          ? 'bg-coral-500'
          : 'bg-primary-600'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 px-0.5">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-ink-700">{titulo}</h3>
        <span className="rounded-full bg-ink-100 px-1.5 py-px text-[10px] font-bold text-ink-500">{items.length}</span>
      </div>
      <div className="space-y-1.5">
        {visibles.map((it) => (
          <Alert key={it.key} tone={tone} onClick={it.onClick ?? onItemClick}>
            {it.message}
          </Alert>
        ))}
      </div>
      {(restantes > 0 || open) && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 px-0.5 text-[11px] font-semibold text-primary-600 hover:underline"
        >
          <IconChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          {open ? 'Ver menos' : `Ver ${restantes} más`}
        </button>
      )}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────

export function ResumenSection() {
  const router = useRouter()
  const [data, setData] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOverview = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await dashboardService.getAdminOverview()
      setData(res)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar el centro de control'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverview()
  }, [])

  if (loading && !data) {
    return <CentroControlSkeleton />
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm font-semibold text-red-700">No pudimos cargar el centro de control</p>
        <p className="mt-1 text-xs text-red-600">{error}</p>
        <button
          onClick={fetchOverview}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          <IconRefresh size={14} /> Reintentar
        </button>
      </div>
    )
  }

  if (!data) return null

  const { kpis, histSiniestralidad, contratosPorVencer, contratosZonaRiesgo, moraActiva, actividadReciente, meta } = data
  const noData = new Set(meta.metricasNoDisponibles)

  const fechaActual = new Date().toLocaleString('es-CO', { month: 'long', year: 'numeric' })

  // KPI: siniestralidad (mismos umbrales que la versión previa).
  const siniestralidadTone = kpis.siniestralidad > 15 ? 'red' : kpis.siniestralidad > 5 ? 'orange' : 'green'
  const siniestralidadAccent = kpis.siniestralidad > 15 ? 'danger' : kpis.siniestralidad > 5 ? 'warning' : 'none'
  const SiniestralidadIcon = kpis.siniestralidad > 5 ? IconAlertTriangle : IconCheck

  const capitalDisponible = kpis.capitalLibre !== null
  const capitalDeficit = capitalDisponible && kpis.capitalLibre !== null && kpis.capitalLibre < kpis.exposicionMaxima

  // Tendencia de siniestralidad: último mes vs penúltimo (desde histSiniestralidad[].r).
  let siniestralidadDelta: { value: string; dir: 'up' | 'down'; tone: 'good' | 'bad' | 'neutral' } | undefined
  if (histSiniestralidad.length >= 2) {
    const ultimo = histSiniestralidad[histSiniestralidad.length - 1].r
    const penultimo = histSiniestralidad[histSiniestralidad.length - 2].r
    const diff = ultimo - penultimo
    if (diff !== 0) {
      siniestralidadDelta = {
        value: `${Math.abs(diff).toFixed(1)} pp`,
        dir: diff > 0 ? 'up' : 'down',
        // Subir la siniestralidad es malo; bajar es bueno.
        tone: diff > 0 ? 'bad' : 'good',
      }
    }
  }

  // Drill-down: rutas del sidebar.
  const goMoras = () => router.push('/moras')
  const goContratos = () => router.push('/contratos')
  const goSoporte = () => router.push('/soporte')
  const goInmobiliarias = () => router.push('/inmobiliarias')
  const goIngresos = () => router.push('/ingresos')

  // ── Alertas agrupadas por categoría (arrays completos del backend) ──
  const zonaRiesgoAlerts: AlertItem[] = contratosZonaRiesgo.map((c) => ({
    key: c.id,
    onClick: goContratos,
    message: (
      <>
        {c.inquilino} en <strong>mes {c.mes}</strong> · {c.inmueble} ·{' '}
        <span className="font-semibold">{money(c.canon)}/mes</span>
      </>
    ),
  }))

  const moraCriticaAlerts: AlertItem[] = moraActiva
    .filter((m) => m.fase >= 2)
    .map((m) => ({
      key: m.id,
      onClick: goMoras,
      message: (
        <>
          <strong>{m.ticketNumero}</strong> — {m.inquilino} · Fase {m.fase} · {m.dias}d ·{' '}
          <span className="font-semibold">{money(m.monto)}</span>
        </>
      ),
    }))

  const porVencerAlerts: AlertItem[] = contratosPorVencer.map((c) => ({
    key: c.id,
    onClick: goContratos,
    message: (
      <>
        {c.inquilino} — vence {fechaCorta(c.fechaFin)} ·{' '}
        <span className="font-semibold">{money(c.canon)}/mes</span> · gestionar renovación
      </>
    ),
  }))

  // Alertas estructurales (capital / siniestralidad), por encima de los grupos.
  const alertasGlobales: AlertItem[] = []
  if (capitalDeficit && kpis.capitalLibre !== null) {
    alertasGlobales.push({
      key: 'capital-deficit',
      message: (
        <>
          Capital libre (<strong>{money(kpis.capitalLibre)}</strong>) <strong>inferior</strong> a exposición máxima (
          {money(kpis.exposicionMaxima)}). Riesgo de insolvencia.
        </>
      ),
    })
  }
  if (kpis.siniestralidad > 20) {
    alertasGlobales.push({
      key: 'siniestralidad-alta',
      message: (
        <>
          Siniestralidad al <strong>{kpis.siniestralidad.toFixed(1)}%</strong> — supera umbral del 20%.
        </>
      ),
    })
  }

  const totalAlertas =
    alertasGlobales.length + zonaRiesgoAlerts.length + moraCriticaAlerts.length + porVencerAlerts.length

  return (
    <div className="space-y-5 font-display">
      {/* Encabezado de sección: título + fecha + actualizar */}
      <SeccionHeader
        title="Resumen"
        subtitle={`Cofianza · ${fechaActual}`}
        right={
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-200 disabled:opacity-50"
          >
            {loading ? <IconLoader size={12} className="animate-spin" /> : <IconRefresh size={12} />}
            Actualizar
          </button>
        }
      />

      {/* KPIs fila 1: operación */}
      <KpiRow cols={5}>
        <Kpi
          Icon={IconBuilding2}
          tone="green"
          label="Inmobiliarias activas"
          value={kpis.inmobiliariasActivas}
          onClick={goInmobiliarias}
        />
        <Kpi
          Icon={IconFileText}
          tone="blue"
          label="Contratos activos"
          value={kpis.contratosActivos}
          sub={`${money(kpis.canonTotalMensual)}/mes`}
          onClick={goContratos}
        />
        <Kpi
          Icon={SiniestralidadIcon}
          tone={siniestralidadTone}
          accent={siniestralidadAccent}
          label="Siniestralidad"
          value={`${kpis.siniestralidad.toFixed(1)}%`}
          sub={`${kpis.moraActivaCount} de ${kpis.contratosActivos}`}
          delta={siniestralidadDelta}
          onClick={goMoras}
        />
        <Kpi
          Icon={kpis.zonaRiesgoCount ? IconAlertTriangle : IconCheck}
          tone={kpis.zonaRiesgoCount ? 'purple' : 'green'}
          accent={kpis.zonaRiesgoCount ? 'risk' : 'none'}
          label="Zona M8–14"
          value={kpis.zonaRiesgoCount}
          sub={`${money(kpis.zonaRiesgoExposicion)} exp.`}
          onClick={goContratos}
        />
        <Kpi
          Icon={IconAlertTriangle}
          tone={kpis.moraActivaCount ? 'red' : 'green'}
          accent={kpis.moraActivaCount ? 'danger' : 'none'}
          label="Mora activa"
          value={kpis.moraActivaCount}
          sub={money(kpis.moraActivaMonto)}
          onClick={goMoras}
        />
      </KpiRow>

      {/* KPIs fila 2: financiero */}
      <KpiRow cols={5}>
        <Kpi
          Icon={IconDollarSign}
          tone="green"
          label="Ingresos fianzas"
          value={money(kpis.ingresosFianzas)}
          sub={kpis.ivaRecaudado > 0 ? `+ ${money(kpis.ivaRecaudado)} IVA` : 'garantía exenta de IVA'}
          onClick={goIngresos}
        />
        <Kpi
          Icon={IconBank}
          tone={capitalDeficit ? 'red' : 'blue'}
          accent={capitalDeficit ? 'danger' : 'none'}
          label="Capital libre"
          value={kpis.capitalLibre !== null ? money(kpis.capitalLibre) : '—'}
          sub={
            kpis.capitalLibre === null
              ? 'tesorería sin configurar'
              : kpis.capitalDisponible !== null
                ? `de ${money(kpis.capitalDisponible)}`
                : undefined
          }
          unavailable={noData.has('capital_libre')}
        />
        <Kpi
          Icon={IconTrendingUp}
          tone="orange"
          label="Exposición máx."
          value={money(kpis.exposicionMaxima)}
          sub="si caen M8–14 + mora"
        />
        <Kpi
          Icon={IconDollarSign}
          tone={kpis.desembolsado ? 'red' : 'green'}
          accent={kpis.desembolsado ? 'danger' : 'none'}
          label="Desembolsado"
          value={money(kpis.desembolsado)}
          sub="pagado a propietarios"
        />
        <Kpi
          Icon={IconInbox}
          tone={kpis.ticketsAbiertos ? 'orange' : 'blue'}
          accent={kpis.ticketsAbiertos ? 'warning' : 'none'}
          label="Tickets soporte"
          value={kpis.ticketsAbiertos}
          sub="sin resolver"
          onClick={goSoporte}
        />
      </KpiRow>

      {/* Alertas agrupadas (o banner positivo si no hay ninguna) */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
          <IconAlertTriangle size={14} className={totalAlertas ? 'text-red-500' : 'text-ink-400'} />
          Alertas{totalAlertas > 0 && ` (${totalAlertas})`}
        </h2>

        {totalAlertas === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border-l-4 border-l-primary-700 bg-primary-50 px-3 py-3 text-[12px] font-semibold text-primary-800">
            <IconCheckCircle size={16} className="shrink-0" />
            Sin alertas activas · cartera al día
          </div>
        ) : (
          <div className="space-y-3">
            {alertasGlobales.length > 0 && (
              <div className="space-y-1.5">
                {alertasGlobales.map((it) => (
                  <Alert key={it.key} tone="danger">
                    {it.message}
                  </Alert>
                ))}
              </div>
            )}
            <AlertGroup titulo="Zona riesgo M8–14" tone="risk" items={zonaRiesgoAlerts} onItemClick={goContratos} />
            <AlertGroup titulo="Mora crítica" tone="danger" items={moraCriticaAlerts} onItemClick={goMoras} />
            <AlertGroup titulo="Por vencer" tone="warning" items={porVencerAlerts} onItemClick={goContratos} />
          </div>
        )}
      </section>

      {/* Charts: siniestralidad + vitrina */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Siniestralidad últimos meses */}
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-ink-900">Siniestralidad · 6 meses</h3>
            {siniestralidadDelta && (
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${
                  siniestralidadDelta.tone === 'good' ? 'text-primary-600' : 'text-red-600'
                }`}
              >
                {siniestralidadDelta.dir === 'down' ? (
                  <IconTrendingDown size={13} />
                ) : (
                  <IconTrendingUp size={13} />
                )}
                {siniestralidadDelta.value}
                <span className="font-medium text-ink-400">vs mes ant.</span>
              </span>
            )}
          </div>
          {histSiniestralidad.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink-500">Sin datos históricos suficientes.</p>
          ) : (
            <>
              <SiniestralidadChart hist={histSiniestralidad} />
              {/* Leyenda de umbrales */}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-ink-500">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-3 rounded-full bg-primary-500" /> ≤ 5% sano
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-3 rounded-full bg-coral-500" /> 5–20% atención
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-3 rounded-full bg-red-500" /> &gt; 20% crítico
                </span>
              </div>
            </>
          )}
        </div>

        {/* Vitrina comercial */}
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-ink-900">Vitrina comercial</h3>
          <KpiRow cols={3}>
            <Kpi Icon={IconImages} tone="gray" label="Publicados" value={kpis.vitrinaPublicados} />
            <Kpi
              Icon={IconEye}
              tone="gray"
              label="Visitas mes"
              value={kpis.vitrinaVisitasMes}
              unavailable={noData.has('vitrina_visitas_mes')}
            />
            <Kpi Icon={IconBuilding2} tone="gray" label="Prospectos" value={kpis.vitrinaProspectos} />
          </KpiRow>
        </div>
      </div>

      {/* Actividad reciente */}
      <section className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
          <IconActivity size={14} className="text-primary-700" />
          Actividad reciente
        </h2>
        <div className="rounded-xl border border-ink-200 bg-white p-3">
          {actividadReciente.length === 0 ? (
            <p className="py-3 text-center text-xs text-ink-500">Sin actividad reciente registrada.</p>
          ) : (
            actividadReciente.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 border-b border-ink-200 py-1.5 text-[11px] last:border-0"
              >
                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-700" />
                <div className="flex-1">
                  <span className="font-semibold text-ink-900">{log.usuario}</span>
                  <span className="text-ink-600"> — {log.accion}</span>
                  {log.entidad && <span className="text-ink-400"> · {log.entidad}</span>}
                </div>
                <div className="shrink-0 whitespace-nowrap text-ink-500">{fechaRelativa(log.fecha)}</div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* TEMPORAL: herramienta de QA "Borrar datos de prueba" — solo admin.
          Eliminar antes de producción. */}
      <WipeTestDataCard />
    </div>
  )
}

// ── Gráfico de barras de siniestralidad ──────────────────────

function SiniestralidadChart({
  hist,
}: {
  hist: AdminOverview['histSiniestralidad']
}) {
  // Escalamos contra el mayor valor del periodo + headroom (mínimo 30).
  const maxR = Math.max(30, ...hist.map((x) => x.r))
  const linePct = (pct: number) => 100 - (pct / maxR) * 100

  return (
    <div className="relative h-20">
      {/* Líneas de referencia de umbrales 5% y 20% */}
      <span
        className="pointer-events-none absolute inset-x-0 border-t border-dashed border-coral-400/70"
        style={{ top: `${linePct(5)}%` }}
      >
        <span className="absolute right-0 -top-2.5 bg-white px-1 text-[8px] font-bold text-coral-500">5%</span>
      </span>
      <span
        className="pointer-events-none absolute inset-x-0 border-t border-dashed border-red-400/70"
        style={{ top: `${linePct(20)}%` }}
      >
        <span className="absolute right-0 -top-2.5 bg-white px-1 text-[8px] font-bold text-red-500">20%</span>
      </span>

      <div className="flex h-full items-end gap-1">
        {hist.map((h) => {
          const color = h.r > 20 ? 'bg-red-500' : h.r > 5 ? 'bg-coral-500' : 'bg-primary-500'
          const heightPct = Math.max((h.r / maxR) * 100, 5)
          return (
            <div key={h.mes} className="group relative flex flex-1 flex-col items-center justify-end self-stretch">
              {/* Tooltip accesible: visible en hover Y en focus/tap */}
              <span
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-1.5 py-0.5 text-[9px] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              >
                {h.mes}: {h.r}% ({h.mr}/{h.ct})
              </span>
              <button
                type="button"
                aria-label={`${h.mes}: siniestralidad ${h.r}%, ${h.mr} en mora de ${h.ct} contratos`}
                className={`w-full rounded-t ${color} focus:outline-none focus:ring-2 focus:ring-ink-900/30`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
          )
        })}
      </div>

      {/* Etiquetas de meses */}
      <div className="mt-2 flex justify-between text-[9px] text-ink-500">
        {hist.map((h) => (
          <span key={h.mes}>{h.mes}</span>
        ))}
      </div>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────

function CentroControlSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <div className="h-6 w-48 animate-pulse rounded bg-ink-200" />
        <div className="mt-2 h-3 w-32 animate-pulse rounded bg-ink-100" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border border-ink-200 bg-white p-3" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border border-ink-200 bg-white p-3" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="h-32 animate-pulse rounded-xl border border-ink-200 bg-white" />
        <div className="h-32 animate-pulse rounded-xl border border-ink-200 bg-white" />
      </div>
    </div>
  )
}
