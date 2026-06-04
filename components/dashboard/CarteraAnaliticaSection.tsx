/**
 * Analítica de cartera de la inmobiliaria (mockup 13_v2), agregada en /reportes
 * SIN tocar el grid de reportes existente. Se auto-restringe a rol inmobiliaria
 * (devuelve null para otros). Solo secciones con datos reales: Salud de cartera
 * + Desempeño de estudios + Próximas acciones pendientes (widget existente).
 * No incluye tiers/comisión/cashback/comparación-sector (no existen / inventados).
 *
 * Re-skin (mockup 13_v2): stat-cards grandes estilo "est-stat" (igual que
 * EstudiosInmobiliariaView) dentro de paneles con header de punto verde, en
 * lugar de los Kpi/KpiRow compactos. Mismos datos reales de getMiCarteraAnalitica.
 */

'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { dashboardService, type MiCarteraAnalitica } from '@/services/dashboardService'
import { moneyCompact } from '@/components/dashboard/secciones/_shared'
import { AccionesPendientesWidget } from '@/components/dashboard/AccionesPendientesWidget'
import { cn } from '@/lib/utils'
import { IconLoader } from '@/components/icons'

export function CarteraAnaliticaSection() {
  const rol = useAuthStore((s) => s.user?.rol)
  const [data, setData] = useState<MiCarteraAnalitica | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (rol !== 'inmobiliaria') {
      setLoading(false)
      return
    }
    let cancel = false
    dashboardService
      .getMiCarteraAnalitica()
      .then((d) => {
        if (!cancel) setData(d)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [rol])

  if (rol !== 'inmobiliaria') return null

  if (loading) {
    return (
      <div className="flex justify-center py-10" role="status" aria-live="polite">
        <IconLoader size={24} className="animate-spin text-primary-600" />
        <span className="sr-only">Cargando analítica…</span>
      </div>
    )
  }

  if (!data) return null
  const s = data.salud
  const e = data.estudios
  const d = e.decisiones30d

  return (
    <div className="space-y-6">
      {/* Salud de tu cartera */}
      <Panel title="Salud de tu cartera">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Contratos activos"
            value={s.contratosActivos}
            color="text-primary-600"
            sub="con Cofianza"
          />
          <StatCard
            label="Morosidad actual"
            value={`${s.morosidadPct}%`}
            color={s.moraActiva > 0 ? 'text-red-500' : 'text-gray-900'}
            sub={`${s.moraActiva} contrato${s.moraActiva === 1 ? '' : 's'} en mora`}
          />
          <StatCard
            label="Días prom. de mora"
            value={s.diasPromedioMora || '—'}
            color="text-coral-500"
            sub="cuando hay incumplimiento"
          />
          <StatCard
            label="Canon gestionado"
            value={moneyCompact(s.canonGestionado)}
            color="text-primary-600"
            sub="contratos activos"
          />
        </div>
      </Panel>

      {/* Desempeño de tus estudios */}
      <Panel title="Desempeño de tus estudios">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Estudios aprobados"
            value={e.aprobados}
            color="text-primary-600"
            sub={`de ${e.total} en total`}
          />
          <StatCard
            label="Score promedio"
            value={e.scorePromedio != null ? `${e.scorePromedio}/1000` : '—'}
            color="text-blue-600"
            sub="inquilinos calificados"
          />
          <StatCard
            label="Tasa de aprobación"
            value={d.total ? `${d.tasaAprobacion}%` : '—'}
            color="text-primary-600"
            sub="últimos 30 días"
          />
        </div>

        {/* Decisiones — últimos 30 días */}
        <div className="mt-4">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">
            Decisiones — últimos 30 días
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DecisionCard
              label="Aprobados"
              value={d.aprobados}
              variant="border-primary-600 bg-primary-50 text-primary-700"
            />
            <DecisionCard
              label="Condicionados"
              value={d.condicionados}
              variant="border-amber-300 bg-amber-50 text-amber-700"
            />
            <DecisionCard
              label="Rechazados"
              value={d.rechazados}
              variant="border-red-300 bg-red-50 text-red-500"
            />
            <DecisionCard
              label="Tasa"
              value={d.total ? `${d.tasaAprobacion}%` : '—'}
              variant="border-primary-600 bg-primary-50 text-primary-700"
            />
          </div>
        </div>
      </Panel>

      {/* Próximas acciones pendientes */}
      <Panel title="Próximas acciones pendientes">
        <AccionesPendientesWidget />
      </Panel>
    </div>
  )
}

// ── Subcomponentes de presentación (estilo mockup) ──────────────

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-6 py-5">
        <h3 className="flex items-center gap-2.5 text-base font-bold text-gray-900">
          <span className="inline-block h-2 w-2 rounded-full bg-primary-600" />
          {title}
        </h3>
      </div>
      <div className="p-6">{children}</div>
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
  value: string | number
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

function DecisionCard({
  label,
  value,
  variant,
}: {
  label: string
  value: string | number
  variant: string
}) {
  return (
    <div className={cn('rounded-xl border px-4 py-3.5 text-center', variant)}>
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  )
}
