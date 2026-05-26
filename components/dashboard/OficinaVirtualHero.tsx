/**
 * Hero gradient esmeralda con stats reales del portafolio del propietario/
 * inmobiliaria — sustituye al PageHeader plano en `/dashboard` cuando el
 * usuario es external (Mario 12-may-2026, mockup 13_*propietario.html).
 */

'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { dashboardService, type PortfolioStats } from '@/services/dashboardService'
import { formatCurrency } from '@/lib/constants'

interface Props {
  rol: 'propietario' | 'inmobiliaria'
}

function formatCompactCOP(monto: number): string {
  if (monto >= 1_000_000) {
    const millones = monto / 1_000_000
    return `$${millones.toFixed(millones >= 10 ? 0 : 1)}M`
  }
  if (monto >= 1_000) {
    return `$${(monto / 1_000).toFixed(0)}K`
  }
  return formatCurrency(monto)
}

export function OficinaVirtualHero({ rol }: Props) {
  const [stats, setStats] = useState<PortfolioStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardService.getPortfolioStats()
      .then(setStats)
      .catch(() => setStats({ propiedades_activas: 0, inquilinos_cartera: 0, canon_mensual: 0 }))
      .finally(() => setLoading(false))
  }, [])

  const titulo = rol === 'inmobiliaria' ? 'Oficina Virtual Inmobiliaria' : 'Tu Oficina Virtual'
  const subtitulo = rol === 'inmobiliaria'
    ? 'Gestiona inmuebles, expedientes y recaudos de tu cartera con Cofianza.'
    : 'Gestiona propiedades, inquilinos y recaudos con seguridad y control total.'

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg">
      <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-44 h-44 bg-coral-300/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative p-6 md:p-8 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1.5">
            {titulo}
          </h1>
          <p className="text-sm md:text-[15px] text-white/85 mb-4">{subtitulo}</p>
          <Link
            href="/inmuebles/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-primary-700 bg-white rounded-lg hover:bg-primary-50 shadow-md transition-all"
          >
            + Agregar propiedad
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3 md:gap-4 min-w-0">
          <StatCard label="Propiedades activas" value={loading ? '…' : String(stats?.propiedades_activas ?? 0)} />
          <StatCard label="Inquilinos en cartera" value={loading ? '…' : String(stats?.inquilinos_cartera ?? 0)} />
          <StatCard
            label="Recaudado este mes"
            value={loading ? '…' : formatCompactCOP(stats?.canon_mensual ?? 0)}
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-3 md:px-4 md:py-4 text-center backdrop-blur-sm">
      <div className="text-xl md:text-2xl font-extrabold leading-none mb-1">{value}</div>
      <div className="text-[10px] md:text-xs font-medium text-white/75">{label}</div>
    </div>
  )
}
