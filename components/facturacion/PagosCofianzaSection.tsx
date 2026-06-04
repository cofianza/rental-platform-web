/**
 * "Pagos a Cofianza" (inmobiliaria) — tab agregado en /facturacion (mockup 13_v2).
 *
 * Re-skin del mockup #payment adaptado a datos REALES: card consolidado con
 * gradiente esmeralda (comisión estimada IVA incluido), fila de stat-cards
 * (contratos / canon / comisión / IVA) y la tabla "Detalle por contrato"
 * (canon × comisión + IVA = total) con total consolidado.
 *
 * Fuente única: dashboardService.getMisPagosCofianza() → MisPagosCofianzaData.
 * Es una ESTIMACIÓN a la tasa de comisión configurada — no existe "tier", ni
 * flujo de consignación, ni deadline, ni historial de pagos en el sistema, así
 * que esos elementos del mockup se omiten (no se inventan datos).
 */

'use client'

import { useEffect, useState } from 'react'
import { dashboardService, type MisPagosCofianzaData } from '@/services/dashboardService'
import { formatCurrency } from '@/lib/constants'
import { cn } from '@/lib/utils'
import {
  IconLoader,
  IconInfo,
  IconReceipt,
  IconAlertTriangle,
  IconHome,
  IconDollarSign,
  IconFileText,
} from '@/components/icons'

export function PagosCofianzaSection() {
  const [data, setData] = useState<MisPagosCofianzaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    dashboardService
      .getMisPagosCofianza()
      .then((d) => {
        if (!cancel) setData(d)
      })
      .catch((e) => {
        if (!cancel) setError(e instanceof Error ? e.message : 'Error al cargar los pagos')
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
        <span className="sr-only">Cargando…</span>
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

  if (!data) return null
  const { detalle, totales, comisionPorcentaje, ivaPorcentaje } = data
  const nContratos = detalle.length

  return (
    <div className="space-y-6">
      {/* Card consolidado — comisión estimada (gradiente esmeralda) */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/20">
        <div className="px-9 py-7">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/70">
            <IconReceipt size={14} />
            Pagos a Cofianza
          </div>
          <div className="mt-3 text-[13px] text-white/75">Comisión estimada (IVA incluido)</div>
          <div className="mt-1 text-4xl font-black leading-none tracking-tight">
            {formatCurrency(totales.total)}
          </div>
          <div className="mt-3 text-[13px] text-white/75">
            Comisión {comisionPorcentaje}% {formatCurrency(totales.comision)} · IVA {ivaPorcentaje}%{' '}
            {formatCurrency(totales.iva)}
          </div>
        </div>
        <div className="flex items-center justify-between bg-black/10 px-9 py-3.5 text-[13px] font-semibold text-white/80">
          <span>
            {nContratos} contrato{nContratos === 1 ? '' : 's'} activo{nContratos === 1 ? '' : 's'} en este periodo
          </span>
          <span className="text-white/60">Estimación calculada por Cofianza</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Contratos"
          value={nContratos}
          sub="Activos este periodo"
          icon={<IconHome size={15} className="text-gray-400" />}
        />
        <StatCard
          label="Canon total"
          value={formatCurrency(totales.canon)}
          sub="Suma de cánones"
          icon={<IconDollarSign size={15} className="text-gray-400" />}
        />
        <StatCard
          label="Comisión"
          value={formatCurrency(totales.comision)}
          sub={`Tasa ${comisionPorcentaje}%`}
          color="text-primary-600"
          icon={<IconDollarSign size={15} className="text-gray-400" />}
        />
        <StatCard
          label="IVA"
          value={formatCurrency(totales.iva)}
          sub={`${ivaPorcentaje}%`}
          icon={<IconFileText size={15} className="text-gray-400" />}
        />
      </div>

      {/* Detalle por contrato */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center gap-2.5 border-b border-gray-200 px-6 py-5">
          <span className="inline-block h-2 w-2 rounded-full bg-primary-600" />
          <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <IconReceipt size={16} className="text-primary-600" />
            Detalle por contrato
          </h3>
          <span className="text-xs text-gray-500">Cada fila: canon × comisión + IVA = total</span>
        </div>

        <div className="flex items-start gap-2 border-b border-blue-100 bg-blue-50 px-5 py-3 text-xs text-blue-800">
          <IconInfo size={14} className="mt-0.5 shrink-0" />
          <span>
            Estimación a la tasa de comisión configurada ({comisionPorcentaje}%) + IVA {ivaPorcentaje}% sobre tus
            contratos activos. No incluye niveles/tiers (no existen en el sistema).
          </span>
        </div>

        {detalle.length === 0 ? (
          <div className="py-12 text-center">
            <IconFileText size={44} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-900">No tienes contratos activos en este periodo</p>
            <p className="mt-1 text-sm text-gray-500">
              Cuando tengas contratos vigentes verás aquí la comisión estimada por cada uno.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-6 py-3 text-left font-bold">Inquilino</th>
                  <th className="px-6 py-3 text-left font-bold">Propiedad</th>
                  <th className="px-6 py-3 text-right font-bold">Canon</th>
                  <th className="px-6 py-3 text-right font-bold">Comisión ({comisionPorcentaje}%)</th>
                  <th className="px-6 py-3 text-right font-bold">IVA ({ivaPorcentaje}%)</th>
                  <th className="px-6 py-3 text-right font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {detalle.map((d) => (
                  <tr key={d.contratoId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                    <td className="whitespace-nowrap px-6 py-3 font-medium text-gray-900">{d.inquilino}</td>
                    <td className="px-6 py-3 text-gray-700">{d.inmueble}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums text-gray-700">
                      {formatCurrency(d.canon)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums text-gray-900">
                      {formatCurrency(d.comision)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums text-gray-700">
                      {formatCurrency(d.iva)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right font-bold tabular-nums text-primary-700">
                      {formatCurrency(d.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-primary-200 bg-primary-50 font-bold">
                  <td className="px-6 py-3 text-gray-900" colSpan={2}>
                    Total consolidado
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums text-gray-900">
                    {formatCurrency(totales.canon)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums text-gray-900">
                    {formatCurrency(totales.comision)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums text-gray-900">
                    {formatCurrency(totales.iva)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums text-primary-700">
                    {formatCurrency(totales.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  color = 'text-gray-900',
  icon,
}: {
  label: string
  value: string | number
  sub: string
  color?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">
        {icon}
        {label}
      </div>
      <div className={cn('text-3xl font-black leading-none tracking-tight', color)}>{value}</div>
      <div className="mt-1 text-xs text-gray-500">{sub}</div>
    </div>
  )
}
