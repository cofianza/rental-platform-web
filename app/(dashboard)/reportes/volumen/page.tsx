/**
 * Página de reporte: Volumen de Expedientes
 * HP-360: Creados vs cerrados por periodo con gráfico de barras y tabla resumen
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PageHeader, ExportButton } from '@/components/ui'
import { IconArrowLeft } from '@/components/icons'
import {
  reporteService,
  type VolumenData,
  type VolumenPeriodo,
  type VolumenFilters,
} from '@/services/reporteService'

// ============================================
// ESTADOS DE EXPEDIENTES
// ============================================

const ESTADOS_EXPEDIENTE = [
  { value: '', label: 'Todos los estados' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'finalizado', label: 'Finalizado' },
]

// ============================================
// BAR CHART (SVG)
// ============================================

function BarChart({ data }: { data: VolumenPeriodo[] }) {
  if (data.length === 0) return null

  const maxValue = Math.max(...data.flatMap((d) => [d.creados, d.cerrados]), 1)
  const barWidth = Math.max(20, Math.min(40, 600 / (data.length * 2 + data.length)))
  const chartHeight = 200
  const chartWidth = data.length * (barWidth * 2 + barWidth) + barWidth

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}
        className="w-full min-w-[400px]"
        style={{ maxHeight: 280 }}
      >
        {data.map((d, i) => {
          const x = i * (barWidth * 2 + barWidth) + barWidth / 2
          const hCreados = (d.creados / maxValue) * chartHeight
          const hCerrados = (d.cerrados / maxValue) * chartHeight
          return (
            <g key={i}>
              <rect
                x={x}
                y={chartHeight - hCreados}
                width={barWidth}
                height={hCreados}
                fill="#0d9488"
                rx={2}
              />
              <rect
                x={x + barWidth + 2}
                y={chartHeight - hCerrados}
                width={barWidth}
                height={hCerrados}
                fill="#22c55e"
                rx={2}
              />
              <text
                x={x + barWidth}
                y={chartHeight + 16}
                textAnchor="middle"
                fontSize="9"
                fill="#6b7280"
              >
                {d.periodo.split(' ')[0].slice(0, 3)}
              </text>
              {d.creados > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - hCreados - 4}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#0d9488"
                >
                  {d.creados}
                </text>
              )}
              {d.cerrados > 0 && (
                <text
                  x={x + barWidth + 2 + barWidth / 2}
                  y={chartHeight - hCerrados - 4}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#22c55e"
                >
                  {d.cerrados}
                </text>
              )}
            </g>
          )
        })}
        <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#e5e7eb" />
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
          <div key={i} className="flex gap-1 items-end flex-1">
            <div
              className="bg-gray-200 rounded w-full"
              style={{ height: `${30 + Math.random() * 120}px` }}
            />
            <div
              className="bg-gray-200 rounded w-full"
              style={{ height: `${20 + Math.random() * 100}px` }}
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

// ============================================
// EMPTY STATE
// ============================================

function EmptyChart() {
  return (
    <div className="text-center py-12">
      <p className="text-gray-500 text-sm">
        No hay datos de volumen para el periodo seleccionado.
      </p>
      <p className="text-gray-400 text-xs mt-1">
        Intenta ajustar los filtros de fecha o estado.
      </p>
    </div>
  )
}

// ============================================
// PAGE COMPONENT
// ============================================

export default function VolumenExpedientesPage() {
  const [data, setData] = useState<VolumenData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<VolumenFilters>({
    dateFrom: '',
    dateTo: '',
    estado: '',
  })

  const fetchData = useCallback(async (currentFilters?: VolumenFilters) => {
    setLoading(true)
    try {
      const filtersToUse = currentFilters || {}
      // Clean empty strings
      const cleanFilters: VolumenFilters = {}
      if (filtersToUse.dateFrom) cleanFilters.dateFrom = filtersToUse.dateFrom
      if (filtersToUse.dateTo) cleanFilters.dateTo = filtersToUse.dateTo
      if (filtersToUse.estado) cleanFilters.estado = filtersToUse.estado

      const result = await reporteService.getVolumenExpedientes(cleanFilters)
      setData(result)
    } catch (err) {
      console.error('Error cargando volumen de expedientes:', err)
      toast.error('Error al cargar el reporte de volumen')
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

  const hasPeriodos = data && data.periodos.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Volumen de Expedientes"
        subtitle="Creados vs cerrados por periodo"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              endpoint="/export/reportes/volumen"
              params={{
                ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
                ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
                ...(filters.estado ? { estado: filters.estado } : {}),
              }}
              entityName="Volumen Expedientes"
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

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Desde</label>
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Hasta</label>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Estado</label>
          <select
            value={filters.estado || ''}
            onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
          >
            {ESTADOS_EXPEDIENTE.map((opt) => (
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

      {/* Legend */}
      <div className="flex gap-4">
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-3 h-3 rounded bg-teal-600" />
          Creados
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-3 h-3 rounded bg-green-500" />
          Cerrados
        </span>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {loading ? (
          <ChartSkeleton />
        ) : hasPeriodos ? (
          <BarChart data={data.periodos} />
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
        ) : hasPeriodos ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-700">Periodo</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Creados</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Cerrados</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Neto</th>
              </tr>
            </thead>
            <tbody>
              {data.periodos.map((p, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                >
                  <td className="px-4 py-3 text-gray-900">{p.periodo}</td>
                  <td className="px-4 py-3 text-right text-teal-600 font-medium">{p.creados}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">{p.cerrados}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    <span className={p.neto >= 0 ? 'text-blue-600' : 'text-red-600'}>
                      {p.neto >= 0 ? '+' : ''}
                      {p.neto}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td className="px-4 py-3 font-bold text-gray-900">Totales</td>
                <td className="px-4 py-3 text-right font-bold text-teal-600">
                  {data.totales.total_creados}
                </td>
                <td className="px-4 py-3 text-right font-bold text-green-600">
                  {data.totales.total_cerrados}
                </td>
                <td className="px-4 py-3 text-right font-bold">
                  <span
                    className={
                      data.totales.total_neto >= 0 ? 'text-blue-600' : 'text-red-600'
                    }
                  >
                    {data.totales.total_neto >= 0 ? '+' : ''}
                    {data.totales.total_neto}
                  </span>
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
