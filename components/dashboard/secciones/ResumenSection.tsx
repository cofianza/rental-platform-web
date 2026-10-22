/**
 * Inicio del administrador (Centro de Control).
 * Basado en mockup htmls/15_COFIANZA_Dashboard_Interno_v2.html (tab "Resumen").
 *
 * Consume GET /api/v1/dashboard/admin/overview (cartera, riesgo, dinero, vitrina,
 * actividad). Aparte, y sin tumbar la página si fallan, pide lo que espera una
 * acción de Cofianza (estudios en revisión, pagos sin facturar, lotes de migración
 * en firma) y los estudios del mes. Las métricas de `meta.metricasNoDisponibles`
 * se pintan como «sin datos» porque todavía no tienen fuente en el backend.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { dashboardService } from '@/services/dashboardService'
import type { AdminOverview, DashboardSummary } from '@/services/dashboardService'
import { expedienteService } from '@/services/expedienteService'
import { facturacionService } from '@/services/facturacionService'
import { migracionService } from '@/services/migracionService'
import type { IExpedientesStats } from '@/types/expediente'
import { ACTION_LABELS, ENTITY_LABELS } from '@/components/bitacora/constants'
import {
  Kpi,
  KpiRow,
  SeccionHeader,
  money,
  pct,
  fechaCorta,
  fechaRelativa,
  TotalesPorOrigenTabla,
} from '@/components/dashboard/secciones/_shared'
import {
  IconLoader,
  IconRefresh,
  IconBuilding2,
  IconFileText,
  IconFileCheck,
  IconFolderOpen,
  IconClipboardList,
  IconReceipt,
  IconCheck,
  IconCheckCircle,
  IconAlertTriangle,
  IconDollarSign,
  IconBank,
  IconTrendingUp,
  IconTrendingDown,
  IconInbox,
  IconInfo,
  IconActivity,
  IconCalendar,
  IconClock,
  IconEye,
  IconImages,
  IconUsers,
  IconChevronDown,
  IconArrowRight,
  IconUserX,
} from '@/components/icons'
import type { IconProps } from '@/components/icons'

/** Umbrales de siniestralidad: los mismos en la tarjeta, las barras, la leyenda y la alerta. */
const UMBRAL_ATENCION = 5
const UMBRAL_CRITICO = 20

const numero1 = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 1 })

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
  const base = `flex w-full items-start gap-2 rounded-lg border-l-4 px-3 py-2.5 text-left text-xs leading-relaxed ${ALERT_STYLES[tone]}`
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
        <h4 className="text-xs font-bold text-ink-700">{titulo}</h4>
        <span className="rounded-full bg-ink-100 px-1.5 py-px text-[11px] font-bold text-ink-600">{items.length}</span>
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
          className="inline-flex items-center gap-1 px-0.5 text-xs font-semibold text-primary-700 hover:underline"
        >
          <IconChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          {open ? 'Ver menos' : `Ver ${restantes} más`}
        </button>
      )}
    </div>
  )
}

// ── Bloque con título ────────────────────────────────────────

function Bloque({ titulo, accion, children }: { titulo: string; accion?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-ink-900">{titulo}</h3>
        {accion}
      </div>
      {children}
    </section>
  )
}

function Reintentar({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 font-semibold underline">
      <IconRefresh size={12} /> Reintentar
    </button>
  )
}

// ── Datos aparte del overview ────────────────────────────────

/** Lo que el Inicio pide aparte del overview. `null` en un campo = esa consulta falló. */
interface Extras {
  stats: IExpedientesStats | null
  sinFacturar: number | null
  lotesEnFirma: number | null
  resumen: DashboardSummary | null
}

const valor = <T,>(r: PromiseSettledResult<T>): T | null => (r.status === 'fulfilled' ? r.value : null)

/** Filas de la bitácora que llevan a su registro. */
const ENLACE_ENTIDAD: Record<string, string> = { expediente: '/expedientes/', contrato: '/contratos/' }

/** Acción sin etiqueta en la bitácora: «contrato_reenviado» → «Contrato reenviado», nunca la clave cruda. */
const accionLegible = (accion: string) =>
  ACTION_LABELS[accion] ?? (accion.charAt(0).toUpperCase() + accion.slice(1)).replace(/_/g, ' ')

// ── Main ─────────────────────────────────────────────────────

export function ResumenSection() {
  const router = useRouter()
  const [data, setData] = useState<AdminOverview | null>(null)
  const [extras, setExtras] = useState<Extras | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarExtras = useCallback(async () => {
    const [stats, pagos, lotes, resumen] = await Promise.allSettled([
      expedienteService.getStats(),
      facturacionService.listPendientesFacturar(),
      migracionService.listarLotes(),
      dashboardService.getSummary(),
    ])
    setExtras({
      stats: valor(stats),
      sinFacturar: valor(pagos)?.length ?? null,
      lotesEnFirma: valor(lotes)?.filter((l) => l.estado === 'en_firma').length ?? null,
      resumen: valor(resumen),
    })
  }, [])

  /** `refrescar`: el botón «Actualizar» se salta la caché de 5 min de la API. */
  const fetchOverview = useCallback(
    async (refrescar = false) => {
      setLoading(true)
      setError(null)
      const extrasListos = cargarExtras()
      try {
        setData(await dashboardService.getAdminOverview(refrescar))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar el Inicio')
        // Con cifras en pantalla el bloque de error no se ve: que no quede en silencio.
        if (refrescar) toast.error('No se pudieron actualizar las cifras. Se siguen mostrando las anteriores.')
      } finally {
        setLoading(false)
      }
      await extrasListos
    },
    [cargarExtras],
  )

  const reintentarExtras = () => {
    setExtras(null)
    cargarExtras()
  }

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  if (loading && !data) {
    return <CentroControlSkeleton />
  }

  if (error && !data) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm font-semibold text-red-700">No pudimos cargar el Inicio</p>
        <p className="mt-1 text-xs text-red-600">{error}</p>
        <button
          onClick={() => fetchOverview()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          <IconRefresh size={14} /> Reintentar
        </button>
      </div>
    )
  }

  if (!data) return null

  const { kpis, config, histSiniestralidad, contratosPorVencer, contratosZonaRiesgo, moraActiva, actividadReciente, meta, noSoyYo } = data
  const noData = new Set(meta.metricasNoDisponibles)

  const fechaActual = new Date().toLocaleString('es-CO', { month: 'long', year: 'numeric' })

  // Migración §6 (4.1) / §9.5: con cartera migrada, la siniestralidad es la de la originada; la migrada
  // va aparte (sub del KPI y tabla por origen), nunca sumadas.
  const o = kpis.porOrigen
  const hayMigrada = !!o && o.migracion.contratos > 0 && o.plataforma.siniestralidad != null
  const siniestralidad = hayMigrada ? o!.plataforma.siniestralidad! : kpis.siniestralidad
  const hist = hayMigrada && data.histSiniestralidadPorOrigen ? data.histSiniestralidadPorOrigen.plataforma : histSiniestralidad
  const contratosMedidos = hayMigrada ? o!.plataforma.contratos : kpis.contratosActivos
  const moraMedida = hayMigrada ? o!.plataforma.moraActivaCount ?? 0 : kpis.moraActivaCount
  // Sin contratos no hay nada que medir: un 0 % «sano» sería falso.
  const sinCartera = contratosMedidos === 0
  const histVacio = hist.every((h) => h.ct === 0)

  const nivel = siniestralidad > UMBRAL_CRITICO ? 'critico' : siniestralidad > UMBRAL_ATENCION ? 'atencion' : 'sano'
  const siniestralidadTone = sinCartera ? 'gray' : nivel === 'critico' ? 'red' : nivel === 'atencion' ? 'orange' : 'green'
  const siniestralidadAccent = sinCartera ? 'none' : nivel === 'critico' ? 'danger' : nivel === 'atencion' ? 'warning' : 'none'
  const SiniestralidadIcon = sinCartera ? IconActivity : nivel === 'sano' ? IconCheck : IconAlertTriangle

  const capitalDeficit = kpis.capitalLibre !== null && kpis.capitalLibre < kpis.exposicionMaxima

  // Tendencia: último mes vs. penúltimo, solo si ambos tenían contratos.
  let siniestralidadDelta: { value: string; dir: 'up' | 'down'; tone: 'good' | 'bad' } | undefined
  if (hist.length >= 2) {
    const ultimo = hist[hist.length - 1]
    const penultimo = hist[hist.length - 2]
    const diff = ultimo.r - penultimo.r
    if (diff !== 0 && ultimo.ct > 0 && penultimo.ct > 0) {
      siniestralidadDelta = {
        value: `${numero1(Math.abs(diff))} ${Math.abs(diff) === 1 ? 'punto' : 'puntos'}`,
        dir: diff > 0 ? 'up' : 'down',
        // Subir la siniestralidad es malo; bajar es bueno.
        tone: diff > 0 ? 'bad' : 'good',
      }
    }
  }

  // Drill-down: rutas del sidebar.
  const goMoras = () => router.push('/moras')
  const goContratos = () => router.push('/contratos')
  const goContrato = (id: string) => () => router.push(`/contratos/${id}`)
  const goInmobiliarias = () => router.push('/inmobiliarias')
  const goIngresos = () => router.push('/ingresos')
  const goExpedientes = () => router.push('/expedientes')
  const goInmuebles = () => router.push('/inmuebles')

  // ── Alertas agrupadas por categoría (arrays completos del backend) ──
  const zonaRiesgoAlerts: AlertItem[] = contratosZonaRiesgo.map((c) => ({
    key: c.id,
    onClick: goContrato(c.id),
    message: (
      <>
        {c.inquilino}{c.origen === 'migracion' && ' (migrado)'} en el <strong>mes {c.mes}</strong> del contrato · {c.inmueble} ·{' '}
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
          <strong>{m.ticketNumero}</strong> — {m.inquilino} · fase {m.fase} · {m.dias} {m.dias === 1 ? 'día' : 'días'} ·{' '}
          <span className="font-semibold">{money(m.monto)}</span>
        </>
      ),
    }))

  const porVencerAlerts: AlertItem[] = contratosPorVencer.map((c) => ({
    key: c.id,
    onClick: goContrato(c.id),
    message: (
      <>
        {c.inquilino}{c.origen === 'migracion' && ' (migrado)'} — vence el {fechaCorta(c.fechaFin)} ·{' '}
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
          El capital libre (<strong>{money(kpis.capitalLibre)}</strong>) está <strong>por debajo</strong> del canon en riesgo (
          {money(kpis.exposicionMaxima)}). Riesgo de insolvencia.
        </>
      ),
    })
  }
  if (!sinCartera && siniestralidad > UMBRAL_CRITICO) {
    alertasGlobales.push({
      key: 'siniestralidad-alta',
      message: (
        <>
          Siniestralidad{hayMigrada ? ' de la cartera originada' : ''} en <strong>{pct(siniestralidad)}</strong>: supera el umbral
          del {UMBRAL_CRITICO}&nbsp;%.
        </>
      ),
    })
  }

  const totalAlertas =
    alertasGlobales.length + zonaRiesgoAlerts.length + moraCriticaAlerts.length + porVencerAlerts.length

  // ── Pendientes de Cofianza (se ocultan los que están en 0) ──
  const pendientes = [
    { key: 'revision', n: extras?.stats?.por_estado.en_revision, label: 'Estudios en revisión', href: '/expedientes?estado=en_revision', Icon: IconFolderOpen },
    {
      key: 'incompletos',
      n: extras?.stats?.por_estado.informacion_incompleta,
      label: 'Estudios con información incompleta',
      href: '/expedientes?estado=informacion_incompleta',
      Icon: IconClipboardList,
    },
    { key: 'facturar', n: extras?.sinFacturar, label: 'Pagos sin facturar', href: '/facturacion', Icon: IconReceipt },
    { key: 'lotes', n: extras?.lotesEnFirma, label: 'Lotes de migración en firma', href: '/admin/migracion', Icon: IconFileCheck },
    { key: 'tickets', n: kpis.ticketsAbiertos, label: 'Tickets de soporte sin resolver', href: '/soporte', Icon: IconInbox },
  ].filter((p) => (p.n ?? 0) > 0)
  const fallosPendientes = extras
    ? [!extras.stats && 'estudios', extras.sinFacturar == null && 'pagos sin facturar', extras.lotesEnFirma == null && 'lotes de migración'].filter(
        (x): x is string => !!x,
      )
    : []

  const resumen = extras?.resumen
  const sinDecisiones = resumen?.decididosDelPeriodo === 0

  return (
    <div className="space-y-6 font-display">
      <SeccionHeader
        title="Inicio"
        subtitle={`Cofianza · ${fechaActual}${meta.generadoEn ? ` · cifras de ${fechaRelativa(meta.generadoEn)}` : ''}`}
        right={
          <button
            onClick={() => fetchOverview(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-200 disabled:opacity-50"
          >
            {loading ? <IconLoader size={12} className="animate-spin" /> : <IconRefresh size={12} />}
            Actualizar
          </button>
        }
      />

      {/* Lo que espera una acción de Cofianza. El firmante y los bloqueos por
          documento ya salen como banners del shell: no se repiten aquí. */}
      <Bloque titulo="Pendientes de Cofianza">
        <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
          {extras === null ? (
            <p role="status" className="flex items-center gap-2 px-3 py-3 text-xs text-ink-500">
              <IconLoader size={14} className="animate-spin" /> Cargando pendientes…
            </p>
          ) : (
            <>
              {pendientes.length > 0 ? (
                <ul className="divide-y divide-ink-100">
                  {pendientes.map((p) => (
                    <li key={p.key}>
                      <Link href={p.href} className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-ink-50">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-coral-50 text-coral-700">
                          <p.Icon size={15} />
                        </span>
                        <span className="min-w-0 flex-1 text-sm text-ink-800">{p.label}</span>
                        <span className="text-base font-extrabold tabular-nums text-ink-900">{p.n?.toLocaleString('es-CO')}</span>
                        <IconArrowRight size={14} className="shrink-0 text-ink-500" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                fallosPendientes.length === 0 && (
                  <p className="flex items-center gap-2 px-3 py-3 text-xs font-semibold text-primary-800">
                    <IconCheckCircle size={16} className="shrink-0" /> Nada pendiente por ahora.
                  </p>
                )
              )}
              {fallosPendientes.length > 0 && (
                <p role="alert" className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-ink-100 px-3 py-2 text-xs text-red-700 first:border-t-0">
                  No se pudieron cargar: {fallosPendientes.join(', ')}.
                  <Reintentar onClick={reintentarExtras} />
                </p>
              )}
            </>
          )}
        </div>
      </Bloque>

      {/* Adenda 3 V2 §9: «no soy yo» por asesor e inmobiliaria (solo Cofianza). Solo si hay algo que mirar. */}
      {noSoyYo && (noSoyYo.total30d > 0 || noSoyYo.cedulasReincidentes > 0) && (
        <Bloque titulo="«No soy yo» en los últimos 30 días">
          <div className="space-y-2 rounded-xl border border-ink-200 bg-white px-3 py-3 text-sm text-ink-800">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <IconUserX size={16} className="shrink-0 text-coral-700" />
              <span>
                <strong className="tabular-nums">{noSoyYo.total30d}</strong> en 30 días
              </span>
              <span>
                <strong className="tabular-nums">{noSoyYo.escalados30d}</strong> escalados a la Gerencia
              </span>
              <span>
                <strong className="tabular-nums">{noSoyYo.cedulasReincidentes}</strong> repetidos sobre una misma cédula
              </span>
            </p>
            {noSoyYo.porAsesor.length > 0 && (
              <p className="text-xs text-ink-600">
                Por asesor: {noSoyYo.porAsesor.map((a) => `${a.nombre} (${a.total})`).join(', ')}
              </p>
            )}
            {noSoyYo.porInmobiliaria.length > 0 && (
              <p className="text-xs text-ink-600">
                Por inmobiliaria: {noSoyYo.porInmobiliaria.map((i) => `${i.nombre} (${i.total})`).join(', ')}
              </p>
            )}
          </div>
        </Bloque>
      )}

      {/* Alertas agrupadas (o una línea compacta si no hay ninguna) */}
      {totalAlertas === 0 ? (
        kpis.contratosActivos === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border-l-4 border-l-ink-300 bg-ink-50 px-3 py-3 text-xs font-semibold text-ink-700">
            <IconInfo size={16} className="shrink-0" />
            Sin alertas · todavía no hay contratos activos
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border-l-4 border-l-primary-700 bg-primary-50 px-3 py-3 text-xs font-semibold text-primary-800">
            <IconCheckCircle size={16} className="shrink-0" />
            Sin alertas activas · cartera al día
          </div>
        )
      ) : (
        <Bloque titulo={`Alertas (${totalAlertas})`}>
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
            <AlertGroup titulo="Contratos en meses de mayor riesgo (8 a 14)" tone="risk" items={zonaRiesgoAlerts} onItemClick={goContratos} />
            <AlertGroup titulo="Mora crítica (fase 2 o más)" tone="danger" items={moraCriticaAlerts} onItemClick={goMoras} />
            <AlertGroup titulo="Contratos por vencer" tone="warning" items={porVencerAlerts} onItemClick={goContratos} />
          </div>
        </Bloque>
      )}

      {/* Cartera y riesgo: color solo cuando la cifra señala un estado */}
      <Bloque titulo="Cartera y riesgo">
        <KpiRow cols={5}>
          <Kpi
            Icon={IconFileText}
            label="Contratos activos"
            value={kpis.contratosActivos}
            sub={`${money(kpis.canonTotalMensual)} de canon al mes`}
            onClick={goContratos}
          />
          <Kpi
            Icon={kpis.moraActivaCount ? IconAlertTriangle : IconCheck}
            tone={kpis.moraActivaCount ? 'red' : 'gray'}
            accent={kpis.moraActivaCount ? 'danger' : 'none'}
            label="Mora activa"
            value={kpis.moraActivaCount}
            sub={`${kpis.moraActivaCount ? `${money(kpis.moraActivaMonto)} en mora` : 'ningún contrato en mora'}${
              hayMigrada ? ` · ${o!.migracion.moraActivaCount} en la migrada` : ''
            }`}
            hint="Contratos con mora reportada que todavía no se ha pagado"
            onClick={goMoras}
          />
          <Kpi
            Icon={SiniestralidadIcon}
            tone={siniestralidadTone}
            accent={siniestralidadAccent}
            label={hayMigrada ? 'Siniestralidad originada' : 'Siniestralidad'}
            value={sinCartera ? '—' : pct(siniestralidad)}
            sub={
              sinCartera
                ? 'sin contratos activos'
                : `${moraMedida} en mora de ${contratosMedidos} ${contratosMedidos === 1 ? 'contrato' : 'contratos'}${
                    hayMigrada ? ` · migrada ${pct(o!.migracion.siniestralidad)}` : ''
                  }`
            }
            hint={`Porcentaje de contratos activos con mora. Atención desde ${UMBRAL_ATENCION} %, crítico desde ${UMBRAL_CRITICO} %`}
            delta={sinCartera ? undefined : siniestralidadDelta}
            onClick={goMoras}
          />
          <Kpi
            Icon={kpis.zonaRiesgoCount ? IconAlertTriangle : IconCheck}
            tone={kpis.zonaRiesgoCount ? 'purple' : 'gray'}
            accent={kpis.zonaRiesgoCount ? 'risk' : 'none'}
            label="Contratos en meses 8 a 14"
            value={kpis.zonaRiesgoCount}
            sub={kpis.zonaRiesgoCount ? `${money(kpis.zonaRiesgoExposicion)} de canon al mes` : 'ninguno en ese tramo'}
            hint="Los meses 8 a 14 del contrato concentran el mayor riesgo de impago"
            onClick={goContratos}
          />
          <Kpi
            Icon={IconTrendingUp}
            tone={kpis.exposicionMaxima > 0 ? 'orange' : 'gray'}
            label="Canon en riesgo"
            value={money(kpis.exposicionMaxima)}
            sub={
              hayMigrada
                ? `mora o meses 8 a 14 · migrada ${money(o!.migracion.exposicionMaxima ?? 0)}`
                : 'al mes, de contratos en mora o en meses 8 a 14'
            }
            hint="Peor caso: lo que Cofianza cubriría cada mes si no pagan los contratos en mora o en meses 8 a 14"
          />
        </KpiRow>

        <TotalesPorOrigenTabla porOrigen={kpis.porOrigen} />

        {/* Siniestralidad últimos meses */}
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-ink-900">
              {hayMigrada ? 'Siniestralidad originada · últimos 6 meses' : 'Siniestralidad · últimos 6 meses'}
            </h4>
            {siniestralidadDelta && !histVacio && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-bold ${
                  siniestralidadDelta.tone === 'good' ? 'text-primary-700' : 'text-red-600'
                }`}
              >
                {siniestralidadDelta.dir === 'down' ? <IconTrendingDown size={13} /> : <IconTrendingUp size={13} />}
                {siniestralidadDelta.value}
                <span className="font-medium text-ink-500">vs. mes anterior</span>
              </span>
            )}
          </div>
          {histVacio ? (
            <div className="py-6 text-center">
              <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-ink-500">
                <IconFileText size={20} />
              </span>
              <p className="text-sm font-semibold text-ink-700">Todavía no hay contratos activos</p>
              <p className="mt-1 text-xs text-ink-500">La siniestralidad se calcula cuando haya contratos firmados.</p>
              <Link
                href="/contratos"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline"
              >
                Ver contratos <IconArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <>
              <SiniestralidadChart hist={hist} />
              {/* Leyenda de umbrales */}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-3 rounded-full bg-primary-500" /> hasta {UMBRAL_ATENCION}&nbsp;% sano
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-3 rounded-full bg-coral-500" /> {UMBRAL_ATENCION}–{UMBRAL_CRITICO}&nbsp;% atención
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-3 rounded-full bg-red-500" /> más de {UMBRAL_CRITICO}&nbsp;% crítico
                </span>
                {hist.some((h) => h.ct === 0) && (
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-3 rounded-full bg-ink-200" /> sin contratos ese mes
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </Bloque>

      {/* Estudios (GET /dashboard/summary): los activos son de hoy; aprobación y días, del mes en curso */}
      <Bloque titulo="Estudios">
        {extras === null ? (
          <KpiRow cols={3} loading>
            <span />
            <span />
            <span />
          </KpiRow>
        ) : !resumen ? (
          <p role="alert" className="flex flex-wrap items-center gap-x-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            No se pudieron cargar los estudios del mes.
            <Reintentar onClick={reintentarExtras} />
          </p>
        ) : (
          <KpiRow cols={3}>
            <Kpi
              Icon={IconFolderOpen}
              label="Estudios activos"
              value={resumen.totalExpedientesActivos}
              sub="sin cerrar ni rechazar, de todas las inmobiliarias"
              onClick={goExpedientes}
            />
            <Kpi
              Icon={IconCheckCircle}
              label="Aprobación del mes"
              value={sinDecisiones ? '—' : pct(resumen.tasaAprobacion)}
              sub={
                sinDecisiones
                  ? 'ningún estudio decidido este mes'
                  : resumen.decididosDelPeriodo != null
                    ? `de ${resumen.decididosDelPeriodo} ${resumen.decididosDelPeriodo === 1 ? 'estudio decidido' : 'estudios decididos'}`
                    : undefined
              }
              hint="Aprobados sobre los estudios creados este mes que ya tienen decisión (aprobados y rechazados)"
              onClick={goExpedientes}
            />
            <Kpi
              Icon={IconClock}
              label="Días hasta la decisión"
              // Sin aprobados ni rechazados puede haber condicionados: esos sí tienen días hasta su decisión.
              value={
                sinDecisiones && !resumen.tiempoPromedioResolucionDias
                  ? '—'
                  : `${numero1(resumen.tiempoPromedioResolucionDias)} ${resumen.tiempoPromedioResolucionDias === 1 ? 'día' : 'días'}`
              }
              sub="promedio de los estudios creados este mes"
              hint="Días entre la creación del estudio y su primera decisión"
              onClick={goExpedientes}
            />
          </KpiRow>
        )}
      </Bloque>

      {/* Dinero */}
      <Bloque titulo="Dinero">
        <KpiRow cols={noData.has('desembolsado') ? 2 : 3}>
          <Kpi
            Icon={IconDollarSign}
            label="Tarifa mensual"
            value={money(kpis.ingresosFianzas)}
            sub={
              (config.ivaGarantiaPorcentaje > 0 ? `+ ${money(kpis.ivaRecaudado)} de IVA` : 'exenta de IVA') +
              (kpis.contratosSinTarifa
                ? ` · ${kpis.contratosSinTarifa} ${kpis.contratosSinTarifa === 1 ? 'contrato' : 'contratos'} sin tarifa calculada`
                : '')
            }
            hint="Tarifa de afianzamiento que causan este mes los contratos activos"
            onClick={goIngresos}
          />
          <Kpi
            Icon={IconBank}
            tone={capitalDeficit ? 'red' : 'gray'}
            accent={capitalDeficit ? 'danger' : 'none'}
            label="Capital libre"
            value={kpis.capitalLibre !== null ? money(kpis.capitalLibre) : '—'}
            sub={
              kpis.capitalLibre === null
                ? 'Configurar tesorería'
                : kpis.capitalDisponible !== null
                  ? `de ${money(kpis.capitalDisponible)} disponibles`
                  : undefined
            }
            hint="Capital disponible menos la reserva mínima (se configura en Tesorería)"
            unavailable={noData.has('capital_libre')}
            onClick={() => router.push('/configuracion/tesoreria')}
          />
          {/* Sin registro de desembolsos todavía (P41) la tarjeta no se pinta: vuelve sola cuando la API la entregue. */}
          {!noData.has('desembolsado') && (
            <Kpi Icon={IconDollarSign} label="Desembolsado" value={money(kpis.desembolsado)} sub="pagado a propietarios" />
          )}
        </KpiRow>
      </Bloque>

      {/* Operación y vitrina */}
      <Bloque titulo="Operación y vitrina">
        <KpiRow cols={4}>
          <Kpi Icon={IconBuilding2} label="Inmobiliarias activas" value={kpis.inmobiliariasActivas} onClick={goInmobiliarias} />
          <Kpi Icon={IconImages} label="Publicados en la vitrina" value={kpis.vitrinaPublicados} onClick={goInmuebles} />
          <Kpi
            Icon={IconEye}
            label="Visitas del mes"
            value={kpis.vitrinaVisitasMes}
            sub="a inmuebles de la vitrina"
            unavailable={noData.has('vitrina_visitas_mes')}
          />
          <Kpi
            Icon={IconUsers}
            label="Estudios desde la vitrina"
            value={kpis.vitrinaProspectos}
            sub="sin cerrar"
            hint="Estudios que un interesado inició desde la vitrina pública"
            onClick={goExpedientes}
          />
        </KpiRow>
      </Bloque>

      {/* Actividad reciente (sin inicios ni cierres de sesión: siguen en la bitácora) */}
      <Bloque
        titulo="Actividad reciente"
        accion={
          <Link href="/bitacora" className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline">
            Ver toda la bitácora <IconArrowRight size={12} />
          </Link>
        }
      >
        <div className="rounded-xl border border-ink-200 bg-white px-3 py-1">
          {actividadReciente.length === 0 ? (
            <p className="py-3 text-center text-xs text-ink-500">Sin actividad reciente registrada.</p>
          ) : (
            <ul>
              {actividadReciente.map((log) => {
                const accion = accionLegible(log.accion)
                const entidad = ENTITY_LABELS[log.entidad]
                const ruta = ENLACE_ENTIDAD[log.entidad]
                const href = log.entidadId && ruta ? `${ruta}${log.entidadId}` : null
                const fila = 'flex items-start gap-2 py-2 text-xs'
                const contenido = (
                  <>
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-700" />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold text-ink-900">{log.usuario || 'Sistema'}</span>
                      <span className="text-ink-600"> — {accion}</span>
                      {entidad && !accion.toLowerCase().includes(entidad.toLowerCase()) && (
                        <span className="text-ink-500"> · {entidad}</span>
                      )}
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-ink-500">{fechaRelativa(log.fecha)}</span>
                  </>
                )
                return (
                  <li key={log.id} className="border-b border-ink-200 last:border-0">
                    {href ? (
                      <Link href={href} className={`${fila} -mx-1 rounded px-1 hover:bg-ink-50`}>
                        {contenido}
                      </Link>
                    ) : (
                      <div className={fila}>{contenido}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </Bloque>
    </div>
  )
}

// ── Gráfico de barras de siniestralidad ──────────────────────

function SiniestralidadChart({ hist }: { hist: AdminOverview['histSiniestralidad'] }) {
  // Escalamos contra el mayor valor del periodo + headroom (mínimo 30).
  const maxR = Math.max(30, ...hist.map((x) => x.r))
  const top = (p: number) => `${100 - (p / maxR) * 100}%`
  const detalle = (h: (typeof hist)[number]) =>
    h.ct === 0 ? `${h.mes}: sin contratos ese mes` : `${h.mes}: ${pct(h.r)}, ${h.mr} en mora de ${h.ct} contratos`

  // Las barras no son interactivas: el lector de pantalla recibe el resumen entero; el tooltip es solo para el mouse.
  return (
    <div role="img" aria-label={`Siniestralidad de los últimos ${hist.length} meses. ${hist.map(detalle).join('. ')}.`}>
      {/* pl-8: las marcas 5 % y 20 % van en el margen izquierdo, sin tapar barras. */}
      <div className="relative h-20 pl-8">
        {[UMBRAL_ATENCION, UMBRAL_CRITICO].map((u) => (
          <span
            key={u}
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-0 border-t border-dashed ${
              u === UMBRAL_CRITICO ? 'border-red-400/70' : 'border-coral-400/70'
            }`}
            style={{ top: top(u) }}
          >
            <span
              className={`absolute left-0 -top-1.5 text-[10px] font-bold leading-none ${
                u === UMBRAL_CRITICO ? 'text-red-600' : 'text-coral-700'
              }`}
            >
              {u}&nbsp;%
            </span>
          </span>
        ))}

        <div className="flex h-full items-end gap-1">
          {hist.map((h) => {
            const sinContratos = h.ct === 0
            const color = sinContratos
              ? 'bg-ink-200'
              : h.r > UMBRAL_CRITICO
                ? 'bg-red-500'
                : h.r > UMBRAL_ATENCION
                  ? 'bg-coral-500'
                  : 'bg-primary-500'
            const alto = sinContratos ? 3 : Math.max((h.r / maxR) * 100, 5)
            return (
              <div key={h.mes} className="group relative flex h-full flex-1 items-end">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-1.5 py-0.5 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  {detalle(h)}
                </span>
                <div className={`w-full rounded-t ${color}`} style={{ height: `${alto}%` }} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Meses: cada rótulo en la columna de su barra; el año va en el tooltip. */}
      <div aria-hidden="true" className="mt-1 flex gap-1 pl-8">
        {hist.map((h) => (
          <span key={h.mes} title={h.mes} className="min-w-0 flex-1 truncate text-center text-[11px] text-ink-500">
            {h.mes.split(' ')[0]}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────

function CentroControlSkeleton() {
  const fila = (n: number, lg: string) => (
    <div className={`grid grid-cols-2 gap-2.5 sm:grid-cols-3 ${lg}`}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl border border-ink-200 bg-white p-3" />
      ))}
    </div>
  )
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">Cargando…</span>
      <div aria-hidden="true">
        <div className="h-6 w-48 animate-pulse rounded bg-ink-200" />
        <div className="mt-2 h-3 w-32 animate-pulse rounded bg-ink-100" />
      </div>
      <div aria-hidden="true" className="h-28 animate-pulse rounded-xl border border-ink-200 bg-white" />
      <div aria-hidden="true" className="space-y-2.5">
        {fila(5, 'lg:grid-cols-5')}
        <div className="h-32 animate-pulse rounded-xl border border-ink-200 bg-white" />
      </div>
      <div aria-hidden="true">{fila(3, 'lg:grid-cols-3')}</div>
    </div>
  )
}
