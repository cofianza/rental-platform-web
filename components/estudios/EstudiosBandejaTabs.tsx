/**
 * EstudiosBandejaTabs - HP-331
 * Tabs con contadores por estado y KPI cards para estudios.
 *
 * Los KPI cards se llenan con GET /estudios/stats (counts reales por
 * estado/resultado), no con la meta del listado paginado.
 */

'use client'

import { useEffect, useState } from 'react'
import { ESTADOS_ESTUDIO, type EstadoEstudioType } from '@/lib/constants'
import type { IEstudiosMeta, IEstudiosStats } from '@/types/estudio'
import { estudioService } from '@/services/estudioService'
import { cn } from '@/lib/utils'
import { BANDEJAS } from './constants'

export interface EstudiosBandejaTabsProps {
  activeBandeja: string | null
  meta: IEstudiosMeta | null
  onBandejaChange: (bandeja: string | null) => void
}

export function EstudiosBandejaTabs({
  activeBandeja,
  meta,
  onBandejaChange,
}: EstudiosBandejaTabsProps) {
  const [stats, setStats] = useState<IEstudiosStats | null>(null)

  useEffect(() => {
    estudioService
      .getStats()
      .then(setStats)
      .catch(() => setStats(null))
  }, [])

  return (
    <div className="space-y-4">
      {/* KPI Cards — nueva propuesta UI Mario (12-may-2026): Este mes /
          Aprobados / En proceso / Rechazados. "Condicionados" se sumó porque
          stats ya lo devolvía y es la cola que exige decisión humana (§14):
          sin él, esos casos no se contaban en ninguna parte. */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <KPIMini
          label="Este mes"
          value={stats?.este_mes ?? meta?.total ?? 0}
          color="bg-primary-600"
        />
        <KPIMini label="Aprobados" value={stats?.aprobados ?? 0} color="bg-green-500" />
        <KPIMini label="Condicionados" value={stats?.condicionados ?? 0} color="bg-amber-500" />
        <KPIMini label="En proceso" value={stats?.en_proceso ?? 0} color="bg-blue-500" />
        <KPIMini label="Rechazados" value={stats?.rechazados ?? 0} color="bg-red-500" />
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto">
        <nav className="flex gap-1 min-w-max" aria-label="Bandejas de estudios">
          {BANDEJAS.map((bandeja) => {
            // Sin bandeja explícita (primera carga o filtros limpios) el estado
            // real es "Todos".
            const isActive = (activeBandeja ?? 'todos') === bandeja.id
            // El punto de color solo tiene sentido cuando la bandeja es un
            // estado único; las agrupadas no tienen un color propio.
            const config =
              bandeja.estados.length === 1
                ? ESTADOS_ESTUDIO[bandeja.estados[0] as EstadoEstudioType]
                : null
            // Sin contador el operador no sabía si una bandeja tenía trabajo
            // dentro o estaba vacía: había que entrar a cada una.
            const count = bandeja.resultado
              ? (stats?.por_resultado[bandeja.resultado] ?? 0)
              : bandeja.estados.length
                ? bandeja.estados.reduce((n, e) => n + (stats?.por_estado[e] ?? 0), 0)
                : (stats?.total ?? 0)

            return (
              <button
                key={bandeja.id}
                onClick={() => onBandejaChange(bandeja.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                  isActive
                    ? config
                      ? `${config.bgColor} ${config.textColor} ${config.borderColor} border`
                      : 'bg-primary-100 text-primary-700 border border-primary-300'
                    : 'text-gray-600 hover:bg-gray-100 border border-transparent'
                )}
              >
                {config && (
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      isActive ? config.textColor.replace('text-', 'bg-') : 'bg-gray-400'
                    )}
                  />
                )}
                {bandeja.label}
                <span className="bg-white/60 px-1.5 rounded text-xs">{count}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

function KPIMini({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 relative overflow-hidden">
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', color)} />
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
