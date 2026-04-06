/**
 * Pagina de reporte: Tasa de Aprobacion de Expedientes
 * HP-361: Aprobados vs rechazados por periodo con grafico de barras apiladas
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PageHeader, ExportButton } from '@/components/ui'
import { IconArrowLeft } from '@/components/icons'
import {
  reporteService,
  type AprobacionData,
  type AprobacionPeriodo,
} from '@/services/reporteService'

// ============================================
// TASA COLOR HELPER
// ============================================

function tasaColor(tasa: number): string {
  if (tasa >= 60) return 'text-green-600'
  if (tasa >= 40) return 'text-amber-600'
  return 'text-red-600'
}

function tasaBgColor(tasa: number): string {
  if (tasa >= 60) return 'bg-green-50 text-green-700 border-green-200'
  if (tasa >= 40) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-red-50 text-red-700 border-red-200'
}

// ============================================
// STACKED BAR CHART (SVG)
// ============================================

function StackedBarChart({ data }: { data: AprobacionPeriodo[] }) {
  if (data.length === 0) return null

  const maxTotal = Math.max(...data.map((d) => d.total), 1)
  const chartHeight = 200
  const barWidth = Math.max(24, Math.min(50, 600 / (data.length + 1)))
  const gap = 12
  const chartWidth = data.length * (barWidth + gap)

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}
        className="w-full min-w-[400px]"
        style={{ maxHeight: 280 }}
      >
        {data.map((d, i) => {
          const x = i * (barWidth + gap)
          const hAprobados = (d.aprobados / maxTotal) * chartHeight
          const hRechazados = (d.rechazados / maxTotal) * chartHeight
          const hCondicionados = (d.condicionados / maxTotal) * chartHeight
          // Stack from bottom: aprobados, then condicionados, then rechazados
          const yAprobados = chartHeight - hAprobados
          const yCondicionados = yAprobados - hCondicionados
          const yRechazados = yCondicionados - hRechazados
          return (
            <g key={i}>
              {d.aprobados > 0 && (
                <rect
                  x={x}
                  y={yAprobados}
                  width={barWidth}
                  height={hAprobados}
                  fill="#22c55e"
                  rx={2}
                />
              )}
              {d.condicionados > 0 && (
                <rect
                  x={x}
                  y={yCondicionados}
                  width={barWidth}
                  height={hCondicionados}
                  fill="#f59e0b"
                  rx={2}
                />
              )}
              {d.rechazados > 0 && (
                <rect
                  x={x}
                  y={yRechazados}
                  width={barWidth}
                  height={hRechazados}
                  fill="#ef4444"
                  rx={2}
                />
              )}
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
// LOADING SKELETON
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

function IndicatorSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-lg border border-gray-200 p-6 text-center">
      <div className="h-10 bg-gray-200 rounded w-24 mx-auto mb-2" />
      <div className="h-4 bg-gray-200 rounded w-48 mx-auto" />
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
        No hay datos de aprobacion para el periodo seleccionado.
      </p>
      <p className="text-gray-400 text-xs mt-1">
        Intenta ajustar los filtros de fecha.
      </p>
    </div>
  )
}

// ============================================
// PAGE COMPONENT
// ============================================

interface AprobacionFilters {
  dateFrom: string
  dateTo: string
}

export default function AprobacionExpedientesPage() {
  const [data, setData] = useState<AprobacionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<AprobacionFilters>({
    dateFrom: '',
    dateTo: '',
  })

  const fetchData = useCallback(async (currentFilters?: AprobacionFilters) => {
    setLoading(true)
    try {
      const cleanFilters: { dateFrom?: string; dateTo?: string } = {}
      if (currentFilters?.dateFrom) cleanFilters.dateFrom = currentFilters.dateFrom
      if (currentFilters?.dateTo) cleanFilters.dateTo = currentFilters.dateTo

      const result = await reporteService.getAprobacionExpedientes(cleanFilters)
      setData(result)
    } catch (err) {
      console.error('Error cargando aprobacion de expedientes:', err)
      toast.error('Error al cargar el reporte de aprobacion')
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
  const tasaGlobal = data?.totales.tasa_global

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Tasa de Aprobacion"
        subtitle="Aprobados vs rechazados por periodo"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              endpoint="/export/reportes/aprobacion"
              params={{
                ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
                ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
              }}
              entityName="Aprobacion"
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

      {/* Global indicator */}
      {loading ? (
        <IndicatorSkeleton />
      ) : (
        <div
          className={`rounded-lg border p-6 text-center ${
            tasaGlobal != null ? tasaBgColor(tasaGlobal) : 'bg-gray-50 text-gray-500 border-gray-200'
          }`}
        >
          <p className="text-4xl font-bold">
            {tasaGlobal != null ? `${tasaGlobal.toFixed(1)}%` : 'N/A'}
          </p>
          <p className="text-sm mt-1 opacity-80">
            Tasa de aprobacion global del periodo
          </p>
        </div>
      )}

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
        <button
          onClick={handleApply}
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Aplicar
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4">
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-3 h-3 rounded bg-green-500" />
          Aprobados
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-3 h-3 rounded bg-red-500" />
          Rechazados
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-3 h-3 rounded bg-amber-500" />
          Condicionados
        </span>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {loading ? (
          <ChartSkeleton />
        ) : hasMeses ? (
          <StackedBarChart data={data.meses} />
        ) : (
          <EmptyChart />
        )}
      </div>

      {/* Summary Table */}
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
                <th className="text-right px-4 py-3 font-medium text-gray-700">Aprobados</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Rechazados</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Condicionados</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Total</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Tasa (%)</th>
              </tr>
            </thead>
            <tbody>
              {data.meses.map((p, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                >
                  <td className="px-4 py-3 text-gray-900">{p.periodo}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">{p.aprobados}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium">{p.rechazados}</td>
                  <td className="px-4 py-3 text-right text-amber-600 font-medium">
                    {p.condicionados}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">{p.total}</td>
                  <td className={`px-4 py-3 text-right font-medium ${tasaColor(p.tasa)}`}>
                    {p.tasa.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td className="px-4 py-3 font-bold text-gray-900">Totales</td>
                <td className="px-4 py-3 text-right font-bold text-green-600">
                  {data.totales.total_aprobados}
                </td>
                <td className="px-4 py-3 text-right font-bold text-red-600">
                  {data.totales.total_rechazados}
                </td>
                <td className="px-4 py-3 text-right font-bold text-amber-600">
                  {data.totales.total_condicionados}
                </td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">
                  {data.totales.total_resueltos}
                </td>
                <td
                  className={`px-4 py-3 text-right font-bold ${tasaColor(data.totales.tasa_global)}`}
                >
                  {data.totales.tasa_global.toFixed(1)}%
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
