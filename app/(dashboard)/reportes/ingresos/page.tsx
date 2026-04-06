/**
 * Pagina de reporte: Ingresos por Pagos
 * HP-362: Ingresos por periodo con grafico de barras y desglose por concepto
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PageHeader, ExportButton } from '@/components/ui'
import { IconArrowLeft } from '@/components/icons'
import { formatCurrency } from '@/lib/constants'
import {
  reporteService,
  type IngresosData,
  type IngresosPeriodo,
} from '@/services/reporteService'

// ============================================
// CONCEPTO LABELS
// ============================================

const CONCEPTO_LABELS: Record<string, string> = {
  estudio: 'Estudio',
  deposito: 'Deposito',
  mensualidad: 'Mensualidad',
  comision: 'Comision',
  administracion: 'Administracion',
  otro: 'Otro',
}

function conceptoLabel(concepto: string): string {
  return CONCEPTO_LABELS[concepto] || concepto.charAt(0).toUpperCase() + concepto.slice(1)
}

const CONCEPTO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'estudio', label: 'Estudio' },
  { value: 'deposito', label: 'Deposito' },
  { value: 'mensualidad', label: 'Mensualidad' },
  { value: 'comision', label: 'Comision' },
  { value: 'administracion', label: 'Administracion' },
  { value: 'otro', label: 'Otro' },
]

// ============================================
// BAR CHART (SVG)
// ============================================

interface MonthAggregate {
  periodo: string
  total: number
}

function aggregateByMonth(data: IngresosPeriodo[]): MonthAggregate[] {
  const map = new Map<string, number>()
  for (const d of data) {
    map.set(d.periodo, (map.get(d.periodo) || 0) + d.monto_total)
  }
  return Array.from(map.entries()).map(([periodo, total]) => ({ periodo, total }))
}

function IngresosBarChart({ data }: { data: IngresosPeriodo[] }) {
  const months = aggregateByMonth(data)
  if (months.length === 0) return null

  const maxTotal = Math.max(...months.map((d) => d.total), 1)
  const chartHeight = 200
  const barWidth = Math.max(24, Math.min(50, 600 / (months.length + 1)))
  const gap = 12
  const chartWidth = months.length * (barWidth + gap)

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}
        className="w-full min-w-[400px]"
        style={{ maxHeight: 280 }}
      >
        {months.map((d, i) => {
          const x = i * (barWidth + gap)
          const h = (d.total / maxTotal) * chartHeight
          const y = chartHeight - h
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                fill="#14b8a6"
                rx={2}
              />
              <text
                x={x + barWidth / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize="8"
                fill="#0d9488"
                fontWeight="600"
              >
                {formatCurrency(d.total)}
              </text>
              <text
                x={x + barWidth / 2}
                y={chartHeight + 16}
                textAnchor="middle"
                fontSize="9"
                fill="#6b7280"
              >
                {d.periodo.split(' ')[0].slice(0, 3)}
              </text>
            </g>
          )
        })}
        <line
          x1="0"
          y1={chartHeight}
          x2={chartWidth}
          y2={chartHeight}
          stroke="#e5e7eb"
        />
      </svg>
    </div>
  )
}

// ============================================
// LOADING SKELETONS
// ============================================

function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex items-end gap-3 h-[200px]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1">
            <div
              className="bg-gray-200 rounded w-full"
              style={{ height: `${40 + Math.random() * 120}px` }}
            />
          </div>
        ))}
      </div>
      <div className="h-3 bg-gray-200 rounded w-full" />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-gray-100 rounded-t" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-10 bg-gray-50 border-t border-gray-100" />
      ))}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-lg border border-gray-200 p-6">
      <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-32" />
    </div>
  )
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyChart() {
  return (
    <div className="text-center py-12">
      <p className="text-gray-500 text-sm">
        No hay datos de ingresos para el periodo seleccionado.
      </p>
      <p className="text-gray-400 text-xs mt-1">
        Intenta ajustar los filtros de fecha o concepto.
      </p>
    </div>
  )
}

// ============================================
// PAGE COMPONENT
// ============================================

interface IngresosFilters {
  dateFrom: string
  dateTo: string
  concepto: string
}

export default function IngresosReportePage() {
  const [data, setData] = useState<IngresosData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<IngresosFilters>({
    dateFrom: '',
    dateTo: '',
    concepto: '',
  })

  const fetchData = useCallback(async (currentFilters?: IngresosFilters) => {
    setLoading(true)
    try {
      const cleanFilters: { dateFrom?: string; dateTo?: string; concepto?: string } = {}
      if (currentFilters?.dateFrom) cleanFilters.dateFrom = currentFilters.dateFrom
      if (currentFilters?.dateTo) cleanFilters.dateTo = currentFilters.dateTo
      if (currentFilters?.concepto) cleanFilters.concepto = currentFilters.concepto

      const result = await reporteService.getIngresosReporte(cleanFilters)
      setData(result)
    } catch (err) {
      console.error('Error cargando ingresos:', err)
      toast.error('Error al cargar el reporte de ingresos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(filters)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = () => {
    fetchData(filters)
  }

  const hasMeses = data && data.meses.length > 0

  // Compute table totals from meses data
  const tableTotals = hasMeses
    ? data.meses.reduce(
        (acc, row) => ({
          cantidad_pagos: acc.cantidad_pagos + row.cantidad_pagos,
          monto_total: acc.monto_total + row.monto_total,
        }),
        { cantidad_pagos: 0, monto_total: 0 }
      )
    : { cantidad_pagos: 0, monto_total: 0 }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Ingresos por Pagos"
        subtitle="Ingresos totales por periodo y concepto"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              endpoint="/export/reportes/ingresos"
              params={{
                ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
                ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
                ...(filters.concepto ? { concepto: filters.concepto } : {}),
              }}
              entityName="Ingresos"
            />
            <Link
              href="/reportes"
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <IconArrowLeft size={16} />
              Volver a reportes
            </Link>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white rounded-lg border border-green-200 p-6">
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">
                Total Ingresos
              </p>
              <p className="text-2xl font-bold text-green-700">
                {formatCurrency(data?.resumen.total_ingresos ?? 0)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-amber-200 p-6">
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">
                Total Pendiente
              </p>
              <p className="text-2xl font-bold text-amber-700">
                {formatCurrency(data?.resumen.total_pendiente ?? 0)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                Cantidad de Pagos
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {data?.resumen.cantidad_pagos ?? 0}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Desde</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Hasta</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Concepto</label>
          <select
            value={filters.concepto}
            onChange={(e) => setFilters((f) => ({ ...f, concepto: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
          >
            {CONCEPTO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleApply}
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Aplicar
        </button>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {loading ? (
          <ChartSkeleton />
        ) : hasMeses ? (
          <IngresosBarChart data={data.meses} />
        ) : (
          <EmptyChart />
        )}
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-4">
            <TableSkeleton />
          </div>
        ) : hasMeses ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-700">Periodo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Concepto</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700"># Pagos</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Monto Total</th>
              </tr>
            </thead>
            <tbody>
              {data.meses.map((p, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                >
                  <td className="px-4 py-3 text-gray-900">{p.periodo}</td>
                  <td className="px-4 py-3 text-gray-900">{conceptoLabel(p.concepto)}</td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">
                    {p.cantidad_pagos}
                  </td>
                  <td className="px-4 py-3 text-right text-teal-600 font-medium">
                    {formatCurrency(p.monto_total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td className="px-4 py-3 font-bold text-gray-900">Totales</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right font-bold text-gray-900">
                  {tableTotals.cantidad_pagos}
                </td>
                <td className="px-4 py-3 text-right font-bold text-teal-600">
                  {formatCurrency(tableTotals.monto_total)}
                </td>
              </tr>
            </tfoot>
          </table>
        ) : !loading ? (
          <div className="p-6 text-center text-gray-400 text-sm">Sin datos para mostrar</div>
        ) : null}
      </div>
    </div>
  )
}
