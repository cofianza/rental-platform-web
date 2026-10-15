/**
 * Pagina de Detalle de Factura - HP-355, HP-356, HP-357
 * Vista completa con desglose de montos, datos emisor/receptor,
 * botones de descarga PDF/XML y acciones de admin
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { facturacionService } from '@/services/facturacionService'
import { formatCurrency } from '@/lib/constants'
import { ESTADO_FACTURA_CONFIG } from '@/types/facturacion'
import type { IFactura } from '@/types/facturacion'
import {
  IconLoader,
  IconAlertTriangle,
  IconArrowLeft,
  IconDownload,
  IconFileText,
} from '@/components/icons'

// ============================================
// Types
// ============================================

type PageState = 'loading' | 'ready' | 'error' | 'not_found'

// ============================================
// Helper: Formatear fecha
// ============================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================
// Component
// ============================================

export default function FacturaDetallePage() {
  const params = useParams()
  const id = params.id as string

  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.rol === 'administrador'

  // State
  const [factura, setFactura] = useState<IFactura | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  // Fetch factura
  const fetchFactura = useCallback(async () => {
    setPageState('loading')
    setErrorMessage('')

    try {
      const data = await facturacionService.getFacturaById(id)
      if (data) {
        setFactura(data)
        setPageState('ready')
      } else {
        setPageState('not_found')
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al cargar factura')
      setPageState('error')
    }
  }, [id])

  useEffect(() => {
    fetchFactura()
  }, [fetchFactura])

  // Handle download — descarga el archivo via blob al disco
  const handleDownload = async (tipo: 'pdf' | 'xml') => {
    try {
      await facturacionService.descargarYGuardar(id, tipo)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Error al descargar ${tipo.toUpperCase()}`)
    }
  }

  // ============================================
  // Render: Loading
  // ============================================
  if (pageState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <IconLoader size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  // ============================================
  // Render: Error
  // ============================================
  if (pageState === 'error') {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-8 text-center">
        <IconAlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar factura</h3>
        <p className="text-sm text-gray-500 mb-4">{errorMessage}</p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/facturacion"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Volver
          </Link>
          <button
            onClick={fetchFactura}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // ============================================
  // Render: Not Found
  // ============================================
  if (pageState === 'not_found') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <IconFileText size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Factura no encontrada</h3>
        <p className="text-sm text-gray-500 mb-4">
          La factura que busca no existe o fue eliminada.
        </p>
        <Link
          href="/facturacion"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 transition-colors"
        >
          <IconArrowLeft size={18} />
          Volver a Facturas
        </Link>
      </div>
    )
  }

  if (!factura) return null

  const estadoConfig = ESTADO_FACTURA_CONFIG[factura.estado]
  const isCancelada = factura.estado === 'cancelada'
  // Cuando la factura esta emitida y Factus le asigno numero, los archivos
  // PDF/XML se pueden descargar bajo demanda contra Factus aun si pdf_url y
  // xml_url estan null en BD (Factus V2 no devuelve URLs persistentes).
  const factusDisponible = factura.estado === 'emitida' && !!factura.factus_number
  const pdfDescargable = factusDisponible || !!factura.pdf_url
  const xmlDescargable = factusDisponible || !!factura.xml_url

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/facturacion"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <IconArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{factura.numero}</h1>
            <p className="text-sm text-gray-500">Factura electrónica</p>
          </div>
          <span
            className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${estadoConfig.bg} ${estadoConfig.color}`}
          >
            {estadoConfig.label}
          </span>
        </div>
      </div>

      {/* Una factura electrónica no se anula desde aquí: se anula con una nota
          crédito en Factus (la API no expone la anulación). */}
      {isAdmin && factura.estado === 'emitida' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
          Para anular esta factura, emita una nota crédito en Factus. Las facturas cuyo pago se
          reembolsó aparecen en Facturas con el filtro «Nota crédito pendiente».
        </div>
      )}

      {/* Cancelation notice */}
      {isCancelada && factura.motivo_anulacion && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">Factura Anulada</p>
          <p className="text-sm text-red-600 mt-1">
            Motivo: {factura.motivo_anulacion}
          </p>
          {factura.fecha_anulacion && (
            <p className="text-xs text-red-500 mt-1">
              Anulada el {formatDateTime(factura.fecha_anulacion)}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Emisor y Receptor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Emisor */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
                Emisor
              </h3>
              <p className="text-lg font-semibold text-gray-900">{factura.emisor_razon_social}</p>
              <p className="text-sm text-gray-600 mt-1">NIT: {factura.emisor_nit}</p>
              <p className="text-sm text-gray-600 mt-1">{factura.emisor_direccion}</p>
            </div>

            {/* Receptor */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
                Receptor
              </h3>
              <p className="text-lg font-semibold text-gray-900">{factura.receptor_razon_social}</p>
              <p className="text-sm text-gray-600 mt-1">Doc: {factura.receptor_documento}</p>
              <p className="text-sm text-gray-600 mt-1">{factura.receptor_direccion}</p>
              <p className="text-sm text-gray-600 mt-1">{factura.receptor_email}</p>
            </div>
          </div>

          {/* Concepto */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
              Concepto
            </h3>
            <p className="text-gray-900">{factura.concepto}</p>
          </div>

          {/* Desglose de montos */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
              Desglose de Montos
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">{formatCurrency(factura.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  IVA{factura.iva > 0 ? ` (${factura.iva_porcentaje ?? 19}%)` : ''}
                </span>
                <span className="font-medium text-gray-900">
                  {factura.iva > 0 ? formatCurrency(factura.iva) : 'Exento'}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-primary-600">{formatCurrency(factura.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
              Informacion
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Fecha de emision</p>
                <p className="font-medium text-gray-900">{formatDate(factura.fecha)}</p>
              </div>
              <div>
                <p className="text-gray-500">Fecha de creacion</p>
                <p className="font-medium text-gray-900">{formatDateTime(factura.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Documents (HP-356) */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
              Documentos Fiscales
            </h3>
            <div className="space-y-4">
              {/* PDF */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <IconFileText size={20} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Factura PDF</p>
                    <p className="text-xs text-gray-500">
                      {pdfDescargable ? 'Disponible' : 'No cargado'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {pdfDescargable ? (
                    <>
                      <button
                        onClick={() => handleDownload('pdf')}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Descargar PDF"
                        aria-label="Descargar PDF"
                      >
                        <IconDownload size={16} />
                      </button>
                    </>
                  ) : (
                      <span className="text-xs text-gray-500">Lo emite y archiva Factus</span>
                    ) }
                </div>
              </div>

              {/* XML */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <IconFileText size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Factura XML</p>
                    <p className="text-xs text-gray-500">
                      {xmlDescargable ? 'Disponible' : 'No cargado'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {xmlDescargable ? (
                    <>
                      <button
                        onClick={() => handleDownload('xml')}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Descargar XML"
                        aria-label="Descargar XML"
                      >
                        <IconDownload size={16} />
                      </button>
                    </>
                  ) : (
                      <span className="text-xs text-gray-500">Lo emite y archiva Factus</span>
                    ) }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
