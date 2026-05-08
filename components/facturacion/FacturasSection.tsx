/**
 * FacturasSection - HP-355, HP-357
 * Tabla de facturas con filtros, paginacion y acciones
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { facturacionService } from '@/services/facturacionService'
import { formatCurrency } from '@/lib/constants'
import { ESTADO_FACTURA_CONFIG } from '@/types/facturacion'
import type { IFactura, EstadoFactura } from '@/types/facturacion'
import {
  IconLoader,
  IconAlertTriangle,
  IconRefresh,
  IconPlus,
  IconSearch,
  IconDownload,
  IconEye,
  IconFileText,
} from '@/components/icons'

// ============================================
// Types
// ============================================

type PageState = 'loading' | 'ready' | 'error' | 'empty'

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

// ============================================
// Component
// ============================================

export function FacturasSection() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.rol === 'administrador'

  // State
  const [facturas, setFacturas] = useState<IFactura[]>([])
  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  // Filters
  const [filterEstado, setFilterEstado] = useState<EstadoFactura | ''>('')
  const [filterBusqueda, setFilterBusqueda] = useState('')
  const [filterFechaDesde, setFilterFechaDesde] = useState('')
  const [filterFechaHasta, setFilterFechaHasta] = useState('')

  // Fetch facturas
  const fetchFacturas = useCallback(async () => {
    setPageState('loading')
    setErrorMessage('')

    try {
      const result = await facturacionService.listFacturas({
        page,
        limit,
        estado: filterEstado || undefined,
        busqueda: filterBusqueda || undefined,
        fecha_desde: filterFechaDesde || undefined,
        fecha_hasta: filterFechaHasta || undefined,
      })

      setFacturas(result.facturas)
      setTotalPages(result.pagination.totalPages)
      setTotal(result.pagination.total)
      setPageState(result.facturas.length === 0 ? 'empty' : 'ready')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al cargar facturas')
      setPageState('error')
    }
  }, [page, limit, filterEstado, filterBusqueda, filterFechaDesde, filterFechaHasta])

  useEffect(() => {
    fetchFacturas()
  }, [fetchFacturas])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [filterEstado, filterBusqueda, filterFechaDesde, filterFechaHasta])

  // Handle download
  const handleDownload = async (factura: IFactura, tipo: 'pdf' | 'xml') => {
    try {
      const result = await facturacionService.getDownloadUrl(factura.id, tipo)
      window.open(result.url, '_blank')
    } catch (err) {
      toast.error(`Error al descargar ${tipo.toUpperCase()}`)
    }
  }

  // ============================================
  // Render: Loading
  // ============================================
  if (pageState === 'loading' && facturas.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <IconLoader size={32} className="animate-spin text-primary-600" />
        </div>
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar facturas</h3>
        <p className="text-sm text-gray-500 mb-4">{errorMessage}</p>
        <button
          onClick={fetchFacturas}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <IconRefresh size={18} />
          Reintentar
        </button>
      </div>
    )
  }

  // ============================================
  // Render: Empty
  // ============================================
  if (pageState === 'empty' && !filterEstado && !filterBusqueda && !filterFechaDesde && !filterFechaHasta) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <IconFileText size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Sin facturas</h3>
        <p className="text-sm text-gray-500 mb-6">
          Aún no tienes facturas registradas en el sistema.
        </p>
        {isAdmin && (
          <button
            onClick={() => toast.info('Funcionalidad disponible cuando el backend este conectado')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <IconPlus size={18} />
            Crear Factura
          </button>
        )}
      </div>
    )
  }

  // ============================================
  // Render: Main Content
  // ============================================
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filterBusqueda}
              onChange={(e) => setFilterBusqueda(e.target.value)}
              placeholder="Buscar por numero, concepto o receptor..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Estado filter */}
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as EstadoFactura | '')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Todos los estados</option>
            <option value="solicitada">Solicitada</option>
            <option value="emitida">Emitida</option>
            <option value="cancelada">Cancelada</option>
          </select>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterFechaDesde}
              onChange={(e) => setFilterFechaDesde(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={filterFechaHasta}
              onChange={(e) => setFilterFechaHasta(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={fetchFacturas}
            disabled={pageState === 'loading'}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Actualizar"
          >
            <IconRefresh size={18} className={pageState === 'loading' ? 'animate-spin' : ''} />
          </button>

          {/* Admin: Create button */}
          {isAdmin && (
            <button
              onClick={() => toast.info('Funcionalidad disponible cuando el backend este conectado')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
            >
              <IconPlus size={18} />
              Crear Factura
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  # Factura
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Concepto
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subtotal
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IVA
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {facturas.map((factura) => {
                const estadoConfig = ESTADO_FACTURA_CONFIG[factura.estado]

                return (
                  <tr key={factura.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{factura.numero}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(factura.fecha)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900 truncate max-w-xs" title={factura.concepto}>
                        {factura.concepto}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(factura.subtotal)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                      {formatCurrency(factura.iva)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(factura.total)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${estadoConfig.bg} ${estadoConfig.color}`}
                      >
                        {estadoConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Ver detalle */}
                        <Link
                          href={`/facturacion/${factura.id}`}
                          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="Ver detalle"
                        >
                          <IconEye size={16} />
                        </Link>

                        {/* Download PDF */}
                        {factura.pdf_url && (
                          <button
                            onClick={() => handleDownload(factura, 'pdf')}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Descargar PDF"
                          >
                            <IconDownload size={16} />
                          </button>
                        )}

                        {/* Download XML */}
                        {factura.xml_url && (
                          <button
                            onClick={() => handleDownload(factura, 'xml')}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Descargar XML"
                          >
                            <IconFileText size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Empty filtered state */}
        {facturas.length === 0 && (filterEstado || filterBusqueda || filterFechaDesde || filterFechaHasta) && (
          <div className="p-8 text-center">
            <p className="text-gray-500">No se encontraron facturas con los filtros seleccionados.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-sm text-gray-500">
            Mostrando {(page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
