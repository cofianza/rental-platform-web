/**
 * Franja esmeralda «Su Oficina Virtual» con stats reales del portafolio de la
 * inmobiliaria (mockup htmls/13_COFIANZA_Oficina_Virtual_v2.html). Reporte de la
 * Oficina Virtual (25-nov), punto 12: va SOLO en Inicio, debajo de los pendientes
 * (antes estaba en el shell, sobre las pestañas de todas las secciones, y ocupaba
 * media pantalla). En el Inicio el h1 es «Sus pendientes»: aquí va un h2.
 */

'use client'

import { IconPlus } from '@/components/icons'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { dashboardService, type PortfolioStats } from '@/services/dashboardService'
import { formatCurrency } from '@/lib/constants'
import { notaContratosCerrados } from '@/lib/contratosCancelados'

// Formato colombiano: «$1,5 M» y «$850 mil» (antes «$1.5M» y «$850K»).
function formatCompactCOP(monto: number): string {
  if (monto >= 1_000_000) {
    const millones = monto / 1_000_000
    return `$${millones.toLocaleString('es-CO', { maximumFractionDigits: millones >= 10 ? 0 : 1 })} M`
  }
  if (monto >= 1_000) {
    return `$${Math.round(monto / 1_000).toLocaleString('es-CO')} mil`
  }
  return formatCurrency(monto)
}

export function OficinaVirtualHero() {
  const puedeEditar = usePuedeEditar()
  const [stats, setStats] = useState<PortfolioStats | null>(null)
  const [loading, setLoading] = useState(true)
  // Tercer estado. El catch devolvia un objeto de ceros, asi que un fallo de red
  // se leia como "no tienes nada": "0 Propiedades · 0 Inquilinos · $0 Recaudado"
  // sobre una cartera llena. Y como este hero vive en el shell con useEffect([]),
  // el cero se quedaba toda la sesion.
  const [fallo, setFallo] = useState(false)

  const cargar = useCallback(() => {
    setLoading(true)
    dashboardService.getPortfolioStats()
      .then((s) => { setStats(s); setFallo(false) })
      .catch(() => { setStats(null); setFallo(true) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Reporte de la Oficina Virtual (25-nov), punto 7 (amplía la Adenda 6 §9): con contratos cancelados o terminados se dice
  // junto al contador («(4 contratos cancelados)»), como en Contratos y Analítica; una sola vez, bajo los inquilinos.
  const notaCancelados =
    stats && !loading
      ? notaContratosCerrados({ cancelados: stats.contratos_cancelados, finalizados: stats.contratos_finalizados }, { conPalabraContratos: true })
      : null
  const titulo = 'Su Oficina Virtual'
  // Sin «recaudos»: el canon de la franja es el contratado, no plata recaudada (la plataforma no recauda).
  const subtitulo = 'Gestione propiedades, estudios y contratos en un solo lugar.'

  return (
    <section aria-labelledby="oficina-virtual-titulo" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 to-primary-800 text-white">
      <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-44 h-44 bg-coral-300/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative grid grid-cols-1 items-center gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_auto]">
        <div>
          <h2 id="oficina-virtual-titulo" className="text-xl md:text-2xl font-extrabold tracking-tight mb-1.5">
            {titulo}
          </h2>
          <p className="text-sm md:text-[15px] text-white/85 mb-4">{subtitulo}</p>
          {puedeEditar && (
            <Link
              href="/inmuebles/nuevo"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-primary-700 bg-white rounded-lg hover:bg-primary-50 shadow-md transition-all"
            >
              <IconPlus size={16} />
              Agregar propiedad
            </Link>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 md:gap-4 min-w-0">
          <StatCard label="Propiedades activas" value={loading ? '…' : stats ? String(stats.propiedades_activas) : '—'} />
          <StatCard label="Inquilinos en cartera" value={loading ? '…' : stats ? String(stats.inquilinos_cartera) : '—'} nota={notaCancelados} />
          {/* Suma de cánones de contratos firmados/vigentes, no plata recaudada
              (no mira pagos ni moras): mismo nombre que en el panel del propietario. */}
          <StatCard
            label="Canon contratado / mes"
            value={loading ? '…' : stats ? formatCompactCOP(stats.canon_mensual) : '—'}
          />
        </div>

        {fallo && !loading && (
          <p className="mt-3 text-sm text-white/90">
            No se pudieron cargar sus cifras.{' '}
            <button
              type="button"
              onClick={cargar}
              className="inline-flex min-h-10 items-center underline underline-offset-2 hover:text-white"
            >
              Reintentar
            </button>
          </p>
        )}
      </div>
    </section>
  )
}

function StatCard({ label, value, nota }: { label: string; value: string; nota?: string | null }) {
  return (
    <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-3 md:px-4 md:py-4 text-center backdrop-blur-sm">
      <div className="text-xl md:text-2xl font-extrabold leading-none mb-1">{value}</div>
      <div className="text-[10px] md:text-xs font-medium text-white/75">{label}</div>
      {nota && <div className="mt-0.5 text-[10px] md:text-xs font-medium text-white/90">{nota}</div>}
    </div>
  )
}
