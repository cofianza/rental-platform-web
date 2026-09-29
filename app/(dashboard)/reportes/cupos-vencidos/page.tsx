/**
 * Reporte: cupos vencidos del mes — Adenda de precios §3.9
 * Cupos de paquetes prepagados que vencieron sin usarse, por inmobiliaria y
 * compra, para el registro contable. Valores en pesos, sin IVA.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui'
import { IconArrowLeft, IconDownload } from '@/components/icons'
import { formatCurrency, formatDate } from '@/lib/constants'
import { reporteService, type CuposVencidosData } from '@/services/reporteService'

/** 'YYYY-MM' del mes en curso en hora Colombia. */
function mesActual(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 7)
}

const csvCelda = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`

function descargarCsv(data: CuposVencidosData) {
  const encabezado = ['Inmobiliaria', 'Compra', 'Fecha de compra', 'Cupos del paquete', 'Cupos vencidos', 'Valor unitario sin IVA', 'Valor total sin IVA']
  const filas = data.filas.map((f) => [
    f.organizacion,
    f.compra_id ?? 'Ajuste sin compra',
    f.fecha_compra ? f.fecha_compra.slice(0, 10) : '',
    f.cupos_paquete,
    f.cupos_vencidos,
    f.valor_unitario,
    f.valor_total,
  ])
  const csv = '﻿' + [encabezado, ...filas].map((l) => l.map(csvCelda).join(',')).join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `cupos_vencidos_${data.mes}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}

export default function CuposVencidosReportePage() {
  const [mes, setMes] = useState(mesActual)
  const [data, setData] = useState<CuposVencidosData | null>(null)
  const [loading, setLoading] = useState(true)
  // Tercer estado: «no cargó» no es «no venció nada».
  const [falloCarga, setFalloCarga] = useState(false)

  const fetchData = useCallback(async (m: string) => {
    setLoading(true)
    try {
      setData(await reporteService.getCuposVencidos(m))
      setFalloCarga(false)
    } catch (err) {
      console.error('Error cargando cupos vencidos:', err)
      toast.error('Error al cargar el reporte de cupos vencidos')
      setData(null)
      setFalloCarga(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(mes)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const hayFilas = !!data && data.filas.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cupos vencidos"
        subtitle="Cupos de paquetes prepagados que vencieron sin usarse en el mes, para el registro contable. Valores sin IVA."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => data && descargarCsv(data)}
              disabled={!hayFilas || loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <IconDownload size={16} />
              Descargar CSV
            </button>
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
            onClick={() => fetchData(mes)}
            className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="cupos-vencidos-mes" className="text-xs font-medium text-gray-600">Mes</label>
          <input
            id="cupos-vencidos-mes"
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <button
          onClick={() => mes && fetchData(mes)}
          disabled={loading || !mes}
          className="px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Aplicar
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        {loading ? (
          <div className="animate-pulse p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded" />
            ))}
          </div>
        ) : hayFilas ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-700">Inmobiliaria</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Compra</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Cupos vencidos</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Valor unitario</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Valor total</th>
              </tr>
            </thead>
            <tbody>
              {data.filas.map((f) => (
                <tr key={`${f.perfil_id}-${f.compra_id ?? 'ajuste'}`} className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-900">{f.organizacion}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {f.compra_id
                      ? `Paquete de ${f.cupos_paquete} · ${f.fecha_compra ? formatDate(f.fecha_compra) : ''}`
                      : 'Ajuste sin compra'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">{f.cupos_vencidos}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(f.valor_unitario)}</td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">{formatCurrency(f.valor_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td className="px-4 py-3 font-bold text-gray-900">Totales</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right font-bold text-gray-900">{data.totales.cupos_vencidos}</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(data.totales.valor_total)}</td>
              </tr>
            </tfoot>
          </table>
        ) : !falloCarga ? (
          <div className="p-6 text-center text-gray-500 text-sm">Ningún cupo venció sin usarse en este mes.</div>
        ) : null}
      </div>
    </div>
  )
}
