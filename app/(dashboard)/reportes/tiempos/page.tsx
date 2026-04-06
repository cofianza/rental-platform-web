/**
 * Pagina de reporte: Tiempos por Etapa
 * HP-363: Tiempo promedio por etapa del flujo con grafico horizontal y tabla detalle
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PageHeader, ExportButton } from '@/components/ui'
import { IconArrowLeft } from '@/components/icons'
import {
  reporteService,
  type TiemposData,
  type TiempoEtapa,
} from '@/services/reporteService'

// ============================================
// HELPERS
// ============================================

function formatTime(dias: number): string {
  if (dias >= 1) return `${dias.toFixed(1)} dias`
  return `${(dias * 24).toFixed(1)} horas`
}

// ============================================
// HORIZONTAL BAR CHART (SVG)
// ============================================

function HorizontalBarChart({ data }: { data: TiempoEtapa[] }) {
  if (data.length === 0) return null

  const maxDays = Math.max(...data.map((d) => d.promedio_dias), 0.1)
  const barHeight = 32
  const labelWidth = 140
  const chartWidth = 500
  const svgHeight = data.length * (barHeight + 8) + 10

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${labelWidth + chartWidth + 80} ${svgHeight}`}
        className="w-full"
        style={{ maxHeight: Math.max(200, svgHeight) }}
      >
        {data.map((d, i) => {
          const y = i * (barHeight + 8) + 4
          const barW = (d.promedio_dias / maxDays) * chartWidth
          const color = d.es_cuello_botella ? '#ef4444' : '#0d9488'
          const timeLabel = formatTime(d.promedio_dias)
          return (
            <g key={d.etapa}>
              <text
                x={labelWidth - 8}
                y={y + barHeight / 2 + 4}
                textAnchor="end"
                fontSize="11"
                fill="#374151"
              >
                {d.etapa}
              </text>
              <rect
                x={labelWidth}
                y={y}
                width={Math.max(barW, 2)}
                height={barHeight}
                fill={color}
                rx={4}
              />
              <text
                x={labelWidth + barW + 6}
                y={y + barHeight / 2 + 4}
                fontSize="11"
                fill="#6b7280"
              >
                {timeLabel}
              </text>
            </g>
          )
        })}
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
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-4 bg-gray-200 rounded w-28" />
          <div
            className="h-8 bg-gray-200 rounded"
            style={{ width: `${40 + Math.random() * 40}%` }}
          />
        </div>
      ))}
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

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse bg-white rounded-lg border border-gray-200 p-4">
          <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
          <div className="h-6 bg-gray-200 rounded w-16" />
        </div>
      ))}
    </div>
  )
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyState() {
  return (
    <div className="text-center py-12">
      <p className="text-gray-500 text-sm">
        No hay datos de tiempos para el periodo seleccionado.
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

export default function TiemposPorEtapaPage() {
  const [data, setData] = useState<TiemposData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<{ dateFrom: string; dateTo: string }>({
    dateFrom: '',
    dateTo: '',
  })

  const fetchData = useCallback(async (currentFilters?: { dateFrom?: string; dateTo?: string }) => {
    setLoading(true)
    try {
      const cleanFilters: { dateFrom?: string; dateTo?: string } = {}
      if (currentFilters?.dateFrom) cleanFilters.dateFrom = currentFilters.dateFrom
      if (currentFilters?.dateTo) cleanFilters.dateTo = currentFilters.dateTo

      const result = await reporteService.getTiemposPorEtapa(cleanFilters)
      setData(result)
    } catch (err) {
      console.error('Error cargando tiempos por etapa:', err)
      toast.error('Error al cargar el reporte de tiempos')
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

  const hasEtapas = data && data.etapas.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Tiempos por Etapa"
        subtitle="Tiempo promedio en cada etapa del flujo de expedientes"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              endpoint="/export/reportes/tiempos"
              params={{
                ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
                ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
              }}
              entityName="Tiempos"
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

      {/* Summary cards */}
      {loading ? (
        <CardsSkeleton />
      ) : hasEtapas ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Tiempo total promedio</p>
            <p className="text-2xl font-bold text-primary-600">
              {formatTime(data.resumen.tiempo_total_promedio_dias)}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Etapa mas lenta</p>
            <p className="text-2xl font-bold text-red-600">
              {data.resumen.etapa_mas_lenta}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Etapa mas rapida</p>
            <p className="text-2xl font-bold text-green-600">
              {data.resumen.etapa_mas_rapida}
            </p>
          </div>
        </div>
      ) : null}

      {/* Warning banner for insufficient data */}
      {!loading && data && data.resumen.total_expedientes_analizados < 5 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
          <strong>Datos insuficientes:</strong> solo {data.resumen.total_expedientes_analizados}{' '}
          expedientes analizados. Se recomiendan al menos 5 para resultados significativos.
        </div>
      )}

      {/* Legend */}
      {!loading && hasEtapas && (
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-3 h-3 rounded bg-teal-600" />
            Normal
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-3 h-3 rounded bg-red-500" />
            Cuello de botella
          </span>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {loading ? (
          <ChartSkeleton />
        ) : hasEtapas ? (
          <HorizontalBarChart data={data.etapas} />
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-4">
            <TableSkeleton />
          </div>
        ) : hasEtapas ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-700">Etapa</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Promedio</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Minimo</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Maximo</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700"># Expedientes</th>
                <th className="text-center px-4 py-3 font-medium text-gray-700">Cuello de botella</th>
              </tr>
            </thead>
            <tbody>
              {data.etapas.map((etapa, i) => (
                <tr
                  key={etapa.etapa}
                  className={`border-b border-gray-100 ${
                    etapa.es_cuello_botella ? 'bg-red-50' : i % 2 === 1 ? 'bg-gray-50/50' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-gray-900 font-medium">{etapa.etapa}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatTime(etapa.promedio_dias)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatTime(etapa.minimo_dias)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatTime(etapa.maximo_dias)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{etapa.cantidad_expedientes}</td>
                  <td className="px-4 py-3 text-center">
                    {etapa.es_cuello_botella ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Si
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        No
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : !loading ? (
          <div className="p-6 text-center text-gray-400 text-sm">Sin datos para mostrar</div>
        ) : null}
      </div>
    </div>
  )
}
