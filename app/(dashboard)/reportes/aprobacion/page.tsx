/**
 * Pagina de reporte: Tasa de Aprobacion de Expedientes
 * HP-361: Aprobados vs rechazados por periodo con grafico de barras apiladas.
 * P26: la decisión vigente de cada estudio, los aprobados por ruta de
 * aprobación y los condicionados sin decidir aparte («en decisión»), fuera de la tasa.
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PageHeader, ExportButton } from '@/components/ui'
import { IconArrowLeft } from '@/components/icons'
import { desgloseDeCifras, fraseDesgloseAprobacion, tasaLegible } from '@/lib/conteosEstudios'
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

/** La primera columna de la tabla («Periodo») queda fija al desplazarla a los lados, con una línea que la separa. */
const COLUMNA_FIJA = 'sticky left-0 z-10 whitespace-nowrap shadow-[inset_-1px_0_0_#e5e7eb]'

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

  // La barra apila también los que siguen en decisión, que no están en `total`.
  const maxTotal = Math.max(...data.map((d) => d.total + d.condicionados), 1)
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
          // Bloque 4: decididos que no son aprobados ni no aprobables (cuentan en `total`); 0 con una API anterior.
          const hSegundo = ((d.con_segundo_firmante ?? 0) / maxTotal) * chartHeight
          const hBloqueados = ((d.bloqueados ?? 0) / maxTotal) * chartHeight
          // Desde abajo: aprobados, con segundo firmante, en decisión, no aprobables y bloqueados por listas.
          const yAprobados = chartHeight - hAprobados
          const ySegundo = yAprobados - hSegundo
          const yCondicionados = ySegundo - hCondicionados
          const yRechazados = yCondicionados - hRechazados
          const yBloqueados = yRechazados - hBloqueados
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
              {hSegundo > 0 && <rect x={x} y={ySegundo} width={barWidth} height={hSegundo} fill="#0ea5e9" rx={2} />}
              {hBloqueados > 0 && <rect x={x} y={yBloqueados} width={barWidth} height={hBloqueados} fill="#7f1d1d" rx={2} />}
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

// Alturas fijas (antes Math.random en render: impuro y distinto en cada render).
const SKELETON_ALTURAS = [120, 80, 150, 60, 130, 100]

function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex items-end gap-3 h-[200px]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1">
            <div
              className="bg-gray-200 rounded w-full"
              style={{ height: `${SKELETON_ALTURAS[i]}px` }}
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
        No hay datos de aprobación para el periodo seleccionado.
      </p>
      <p className="text-gray-500 text-xs mt-1">
        Intente ajustar los filtros de fecha.
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
  // Tercer estado (como en Ingresos): sin esto un fallo se veía como «no hay
  // datos» y, al fallar con filtros nuevos, quedaban las cifras del periodo anterior.
  const [falloCarga, setFalloCarga] = useState(false)
  const [filters, setFilters] = useState<AprobacionFilters>({
    dateFrom: '',
    dateTo: '',
  })

  // Filtros con los que se pidió el reporte (los de arriba son el borrador
  // del formulario hasta pulsar «Aplicar»). El efecto carga cada vez que
  // cambian o se reintenta, y descarta la respuesta si llegó otra después.
  const [aplicados, setAplicados] = useState<AprobacionFilters>(filters)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vigente = true
    const cargar = async () => {
      const cleanFilters: { dateFrom?: string; dateTo?: string } = {}
      if (aplicados.dateFrom) cleanFilters.dateFrom = aplicados.dateFrom
      if (aplicados.dateTo) cleanFilters.dateTo = aplicados.dateTo
      try {
        const result = await reporteService.getAprobacionExpedientes(cleanFilters)
        if (!vigente) return
        setData(result)
        setFalloCarga(false)
      } catch (err) {
        if (!vigente) return
        console.error('Error cargando aprobacion de estudios:', err)
        toast.error('Error al cargar el reporte de aprobación')
        setData(null)
        setFalloCarga(true)
      } finally {
        if (vigente) setLoading(false)
      }
    }
    cargar()
    return () => {
      vigente = false
    }
  }, [aplicados, intento])

  const handleApply = () => {
    setLoading(true)
    setAplicados({ ...filters })
  }

  const reintentar = () => {
    setLoading(true)
    setIntento((n) => n + 1)
  }

  const hasMeses = data && data.meses.length > 0
  const tasaGlobal = data?.totales.tasa_global
  // Bloque 4: la misma definición de /estudios y del inicio. Con ella los aprobados con segundo firmante y los
  // bloqueados por listas cuentan en los decididos: van en su columna y en la frase del indicador. Una API anterior
  // no los manda: la página queda como antes.
  const conDesglose = typeof data?.totales.total_con_segundo_firmante === 'number'
  const desgloseTasa = data
    ? desgloseDeCifras({
        aprobados: data.totales.total_aprobados,
        con_segundo_firmante: data.totales.total_con_segundo_firmante,
        rechazados: data.totales.total_rechazados,
        bloqueados: data.totales.total_bloqueados,
      })
    : null

  // Recarga con datos en pantalla: se dejan las cifras (atenuadas), sin volver al esqueleto.
  const recargando = loading && !!data

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Tasa de Aprobación"
        subtitle={
          conDesglose
            ? 'Aprobados sobre decididos por periodo. Decididos: aprobados, aprobados con segundo firmante, no aprobables y bloqueados por listas. Los aprobados se agrupan por tarifa: automática (sin analista, también cuando se aprueba con su segundo firmante) o no automática (decididos por un analista). Lo que sigue en revisión de Cofianza va aparte y no cuenta en la tasa.'
            : 'Aprobados vs no aprobables por periodo. Los aprobados se agrupan por tarifa: automática (sin analista, también cuando se aprueba con su segundo firmante) o no automática (decididos por un analista). Lo que sigue en revisión de Cofianza va aparte y no cuenta en la tasa.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButton
              endpoint="/export/reportes/aprobacion"
              params={{
                ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
                ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
              }}
              entityName="Aprobación"
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

      {falloCarga && !loading && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="flex-1 text-sm text-amber-900">
            No se pudo cargar el reporte. Las cifras de abajo no están disponibles — no son cero.
          </p>
          <button
            type="button"
            onClick={reintentar}
            className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Global indicator */}
      {loading && !data ? (
        <IndicatorSkeleton />
      ) : falloCarga ? null : (
        <div
          className={`rounded-lg border p-6 text-center ${
            tasaGlobal != null ? tasaBgColor(tasaGlobal) : 'bg-gray-50 text-gray-500 border-gray-200'
          }`}
        >
          <p className="text-4xl font-bold">
            {tasaGlobal != null ? tasaLegible(tasaGlobal) : 'N/A'}
          </p>
          <p className="text-sm mt-1 opacity-80">
            Tasa de aprobación global del periodo (aprobados sobre decididos)
          </p>
          {desgloseTasa && tasaGlobal != null && (
            <p className="mt-1 text-sm opacity-80">{`${fraseDesgloseAprobacion(desgloseTasa).replace(/^de /, 'De ')}.`}</p>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="aprobacion-desde" className="text-xs font-medium text-gray-600">Desde</label>
          <input id="aprobacion-desde"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="aprobacion-hasta" className="text-xs font-medium text-gray-600">Hasta</label>
          <input id="aprobacion-hasta"
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <button
          onClick={handleApply}
          disabled={loading}
          className="px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Aplicar
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-3 h-3 rounded bg-green-500" />
          Aprobados
        </span>
        {conDesglose && (
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-3 h-3 rounded bg-sky-500" />
            Con segundo firmante
          </span>
        )}
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-3 h-3 rounded bg-red-500" />
          No aprobables
        </span>
        {conDesglose && (
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-3 h-3 rounded bg-red-900" />
            Bloqueados por listas
          </span>
        )}
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-3 h-3 rounded bg-amber-500" />
          En revisión de Cofianza
        </span>
      </div>

      {/* Chart */}
      <div className={`bg-white rounded-lg border border-gray-200 p-4 sm:p-6 transition-opacity ${recargando ? 'opacity-60' : ''}`}>
        {loading && !data ? (
          <ChartSkeleton />
        ) : hasMeses ? (
          <StackedBarChart data={data.meses} />
        ) : falloCarga ? (
          <p className="py-12 text-center text-sm text-gray-500">No disponible</p>
        ) : (
          <EmptyChart />
        )}
      </div>

      {/* Summary Table */}
      <div className={`bg-white rounded-lg border border-gray-200 overflow-x-auto transition-opacity ${recargando ? 'opacity-60' : ''}`} aria-busy={recargando}>
        {loading && !data ? (
          <div className="p-4">
            <TableSkeleton />
          </div>
        ) : hasMeses ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {/* Fija al desplazar la tabla a los lados (a 390 px las columnas no caben): siempre se sabe de qué mes es la fila. */}
                <th className={`text-left px-4 py-3 font-medium text-gray-700 bg-gray-50 ${COLUMNA_FIJA}`}>Periodo</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Aprobados</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Tarifa automática</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Tarifa no automática</th>
                {conDesglose && <th className="text-right px-4 py-3 font-medium text-gray-700">Con segundo firmante</th>}
                <th className="text-right px-4 py-3 font-medium text-gray-700">No aprobables</th>
                {conDesglose && <th className="text-right px-4 py-3 font-medium text-gray-700">Bloqueados por listas</th>}
                <th className="text-right px-4 py-3 font-medium text-gray-700">En revisión de Cofianza</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Decididos</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Tasa</th>
              </tr>
            </thead>
            <tbody>
              {data.meses.map((p, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                >
                  <td className={`px-4 py-3 text-gray-900 bg-white ${COLUMNA_FIJA}`}>{p.periodo}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">{p.aprobados}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{p.aprobados_tarifa_automatica}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{p.aprobados_tarifa_no_automatica}</td>
                  {conDesglose && <td className="px-4 py-3 text-right text-sky-700 font-medium">{p.con_segundo_firmante ?? 0}</td>}
                  <td className="px-4 py-3 text-right text-red-600 font-medium">{p.rechazados}</td>
                  {conDesglose && <td className="px-4 py-3 text-right text-red-900 font-medium">{p.bloqueados ?? 0}</td>}
                  <td className="px-4 py-3 text-right text-amber-600 font-medium">
                    {p.condicionados}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">{p.total}</td>
                  <td className={`px-4 py-3 text-right font-medium ${tasaColor(p.tasa)}`}>
                    {tasaLegible(p.tasa)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td className={`px-4 py-3 font-bold text-gray-900 bg-gray-50 ${COLUMNA_FIJA}`}>Totales</td>
                <td className="px-4 py-3 text-right font-bold text-green-600">
                  {data.totales.total_aprobados}
                </td>
                <td className="px-4 py-3 text-right font-bold text-gray-600">
                  {data.totales.total_aprobados_tarifa_automatica}
                </td>
                <td className="px-4 py-3 text-right font-bold text-gray-600">
                  {data.totales.total_aprobados_tarifa_no_automatica}
                </td>
                {conDesglose && (
                  <td className="px-4 py-3 text-right font-bold text-sky-700">{data.totales.total_con_segundo_firmante ?? 0}</td>
                )}
                <td className="px-4 py-3 text-right font-bold text-red-600">
                  {data.totales.total_rechazados}
                </td>
                {conDesglose && <td className="px-4 py-3 text-right font-bold text-red-900">{data.totales.total_bloqueados ?? 0}</td>}
                <td className="px-4 py-3 text-right font-bold text-amber-600">
                  {data.totales.total_condicionados}
                </td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">
                  {data.totales.total_resueltos}
                </td>
                <td
                  className={`px-4 py-3 text-right font-bold ${tasaColor(data.totales.tasa_global)}`}
                >
                  {tasaLegible(data.totales.tasa_global)}
                </td>
              </tr>
            </tfoot>
          </table>
        ) : !loading ? (
          <div className="p-6 text-center text-gray-500 text-sm">Sin datos para mostrar</div>
        ) : null}
      </div>
    </div>
  )
}
