/**
 * PagosSection - HP-351
 * Seccion de pagos dentro del detalle de expediente
 * Incluye tabla, filtros, acciones y modales
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { pagoService, type IPago } from '@/services/pagoService'
import { facturacionService } from '@/services/facturacionService'
import { PagoManualModal } from './PagoManualModal'
import { GenerarLinkPagoModal } from './GenerarLinkPagoModal'
import { PagoDetalleModal } from './PagoDetalleModal'
import {
  IconPlus,
  IconRefresh,
  IconLoader,
  IconAlertTriangle,
  IconDollarSign,
  IconClock,
  IconCheck,
  IconX,
} from '@/components/icons'

// ============================================
// Types
// ============================================

interface PagosSectionProps {
  expedienteId: string
}

type PageState = 'loading' | 'ready' | 'error'

// ============================================
// Constants
// ============================================

const CONCEPTOS_LABELS: Record<string, string> = {
  estudio: 'Estudio',
  garantia: 'Garantia',
  primer_canon: 'Primer canon',
  deposito: 'Deposito',
  otro: 'Otro',
}

const METODOS_LABELS: Record<string, string> = {
  pasarela: 'Pasarela',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  cheque: 'Cheque',
}

const ESTADOS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pendiente: { label: 'Pendiente', color: 'text-amber-700', bg: 'bg-amber-100' },
  procesando: { label: 'Procesando', color: 'text-blue-700', bg: 'bg-blue-100' },
  completado: { label: 'Completado', color: 'text-green-700', bg: 'bg-green-100' },
  fallido: { label: 'Fallido', color: 'text-red-700', bg: 'bg-red-100' },
  reembolsado: { label: 'Reembolsado', color: 'text-purple-700', bg: 'bg-purple-100' },
  cancelado: { label: 'Cancelado', color: 'text-gray-700', bg: 'bg-gray-100' },
}

const ITEMS_PER_PAGE = 10

// ============================================
// Helper: Format COP
// ============================================

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ============================================
// Component
// ============================================

export function PagosSection({ expedienteId }: PagosSectionProps) {
  const user = useAuthStore((s) => s.user)
  const canManage = user?.rol === 'administrador' || user?.rol === 'operador_analista'
  // Facturar tiene un permiso más amplio: admin, operador, inmobiliaria y
  // propietario pueden disparar la creación de la factura electrónica.
  const canFacturar =
    user?.rol === 'administrador' ||
    user?.rol === 'operador_analista' ||
    user?.rol === 'inmobiliaria' ||
    user?.rol === 'propietario'

  // Data state
  const [pagos, setPagos] = useState<IPago[]>([])
  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Filters
  const [filterEstado, setFilterEstado] = useState('')
  const [filterConcepto, setFilterConcepto] = useState('')

  // Modals
  const [showManualModal, setShowManualModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showDetalleModal, setShowDetalleModal] = useState(false)
  const [selectedPagoId, setSelectedPagoId] = useState<string | null>(null)

  // Actions state
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Fetch pagos
  const fetchPagos = useCallback(async () => {
    setPageState('loading')
    setErrorMessage('')

    try {
      const result = await pagoService.listByExpediente(expedienteId, {
        page,
        limit: ITEMS_PER_PAGE,
        estado: filterEstado || undefined,
        concepto: filterConcepto || undefined,
      })

      setPagos(result.pagos)
      setTotalPages(result.pagination.totalPages)
      setTotal(result.pagination.total)
      setPageState('ready')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al cargar los pagos')
      setPageState('error')
    }
  }, [expedienteId, page, filterEstado, filterConcepto])

  useEffect(() => {
    fetchPagos()
  }, [fetchPagos])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [filterEstado, filterConcepto])

  // Summary calculations
  const summary = useMemo(() => {
    const totalCobrado = pagos
      .filter((p) => p.estado === 'completado')
      .reduce((sum, p) => sum + p.monto, 0)

    const totalPendiente = pagos
      .filter((p) => ['pendiente', 'procesando'].includes(p.estado))
      .reduce((sum, p) => sum + p.monto, 0)

    const porEstado = pagos.reduce((acc, p) => {
      acc[p.estado] = (acc[p.estado] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return { totalCobrado, totalPendiente, porEstado }
  }, [pagos])

  // Actions
  const handleCopyLink = useCallback(async (pago: IPago) => {
    if (!pago.payment_link_url) return
    try {
      await navigator.clipboard.writeText(pago.payment_link_url)
      toast.success('Link copiado al portapapeles')
    } catch {
      toast.error('Error al copiar el link')
    }
  }, [])

  const handleReenviarLink = useCallback(async (pagoId: string) => {
    setActionLoading(pagoId)
    try {
      await pagoService.reenviarLink(pagoId)
      toast.success('Link reenviado por email')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al reenviar')
    } finally {
      setActionLoading(null)
    }
  }, [])

  const handleFacturar = useCallback((pagoId: string) => {
    toast('¿Generar factura electrónica para este pago?', {
      description: 'Se enviará a Factus / DIAN. La factura se emite con CUFE oficial.',
      duration: 10000,
      action: {
        label: 'Generar',
        onClick: async () => {
          setActionLoading(pagoId)
          try {
            const factura = await facturacionService.facturarPago(pagoId)
            toast.success(`Factura emitida: ${factura.numero}`)
            fetchPagos()
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al generar factura')
          } finally {
            setActionLoading(null)
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {},
      },
    })
  }, [fetchPagos])

  const handleCancelar = useCallback((pagoId: string) => {
    toast('¿Cancelar este pago?', {
      description: 'Esta acción marcará el pago como cancelado. No se puede deshacer.',
      duration: 10000,
      action: {
        label: 'Cancelar pago',
        onClick: async () => {
          setActionLoading(pagoId)
          try {
            await pagoService.cancelar(pagoId)
            toast.success('Pago cancelado')
            fetchPagos()
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al cancelar')
          } finally {
            setActionLoading(null)
          }
        },
      },
      cancel: {
        label: 'Volver',
        onClick: () => {},
      },
    })
  }, [fetchPagos])

  const handleDescargarComprobante = useCallback(async (pagoId: string) => {
    setActionLoading(pagoId)
    try {
      const result = await pagoService.getComprobanteUrl(pagoId)
      window.open(result.url, '_blank')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al descargar')
    } finally {
      setActionLoading(null)
    }
  }, [])

  const handleVerDetalle = useCallback((pagoId: string) => {
    setSelectedPagoId(pagoId)
    setShowDetalleModal(true)
  }, [])

  const handleSuccess = useCallback(() => {
    fetchPagos()
    toast.success('Pago registrado correctamente')
  }, [fetchPagos])

  // ============================================
  // Render: Loading
  // ============================================
  if (pageState === 'loading' && pagos.length === 0) {
    return (
      <div className="space-y-6">
        {/* Skeleton summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-32" />
            </div>
          ))}
        </div>
        {/* Skeleton table */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar pagos</h3>
        <p className="text-sm text-gray-500 mb-4">{errorMessage}</p>
        <button
          onClick={fetchPagos}
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
  if (pagos.length === 0 && !filterEstado && !filterConcepto) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <IconDollarSign size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Sin pagos registrados</h3>
        <p className="text-sm text-gray-500 mb-6">
          Aun no hay pagos en este expediente. Puedes generar un link de pago o registrar un pago manual.
        </p>
        {canManage && (
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setShowLinkModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <IconPlus size={18} />
              Generar Link de Pago
            </button>
            <button
              onClick={() => setShowManualModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <IconPlus size={18} />
              Registrar Pago Manual
            </button>
          </div>
        )}

        {/* Modals */}
        <PagoManualModal
          isOpen={showManualModal}
          onClose={() => setShowManualModal(false)}
          expedienteId={expedienteId}
          onSuccess={handleSuccess}
        />
        <GenerarLinkPagoModal
          isOpen={showLinkModal}
          onClose={() => setShowLinkModal(false)}
          expedienteId={expedienteId}
          onSuccess={handleSuccess}
        />
      </div>
    )
  }

  // ============================================
  // Render: Main Content
  // ============================================
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Cobrado */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <IconCheck size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Cobrado</p>
              <p className="text-xl font-bold text-gray-900">{formatCOP(summary.totalCobrado)}</p>
            </div>
          </div>
        </div>

        {/* Total Pendiente */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <IconClock size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Pendiente</p>
              <p className="text-xl font-bold text-gray-900">{formatCOP(summary.totalPendiente)}</p>
            </div>
          </div>
        </div>

        {/* Pagos por Estado */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <IconDollarSign size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Pagos</p>
              <p className="text-xl font-bold text-gray-900">{total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS_CONFIG).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            value={filterConcepto}
            onChange={(e) => setFilterConcepto(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Todos los conceptos</option>
            {Object.entries(CONCEPTOS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <button
            onClick={fetchPagos}
            disabled={pageState === 'loading'}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Actualizar"
          >
            <IconRefresh size={18} className={pageState === 'loading' ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Action buttons */}
        {canManage && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLinkModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
            >
              <IconPlus size={18} />
              Generar Link
            </button>
            <button
              onClick={() => setShowManualModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <IconPlus size={18} />
              Pago Manual
            </button>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Concepto
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monto
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Metodo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Referencia
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pagos.map((pago) => (
              <PagoTableRow
                onFacturar={canFacturar ? handleFacturar : undefined}
                key={pago.id}
                pago={pago}
                canManage={canManage}
                actionLoading={actionLoading}
                onVerDetalle={handleVerDetalle}
                onCopyLink={handleCopyLink}
                onReenviarLink={handleReenviarLink}
                onCancelar={handleCancelar}
                onDescargarComprobante={handleDescargarComprobante}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {pagos.map((pago) => (
          <PagoCard
            onFacturar={canFacturar ? handleFacturar : undefined}
            key={pago.id}
            pago={pago}
            canManage={canManage}
            actionLoading={actionLoading}
            onVerDetalle={handleVerDetalle}
            onCopyLink={handleCopyLink}
            onReenviarLink={handleReenviarLink}
            onCancelar={handleCancelar}
            onDescargarComprobante={handleDescargarComprobante}
          />
        ))}
      </div>

      {/* Empty filtered state */}
      {pagos.length === 0 && (filterEstado || filterConcepto) && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No se encontraron pagos con los filtros seleccionados.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-sm text-gray-500">
            Mostrando {((page - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(page * ITEMS_PER_PAGE, total)} de {total}
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

      {/* Modals */}
      <PagoManualModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        expedienteId={expedienteId}
        onSuccess={handleSuccess}
      />
      <GenerarLinkPagoModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        expedienteId={expedienteId}
        onSuccess={handleSuccess}
      />
      {selectedPagoId && (
        <PagoDetalleModal
          isOpen={showDetalleModal}
          onClose={() => {
            setShowDetalleModal(false)
            setSelectedPagoId(null)
          }}
          pagoId={selectedPagoId}
        />
      )}
    </div>
  )
}

// ============================================
// Table Row Component
// ============================================

interface PagoRowProps {
  pago: IPago
  canManage: boolean
  actionLoading: string | null
  onVerDetalle: (id: string) => void
  onCopyLink: (pago: IPago) => void
  onReenviarLink: (id: string) => void
  onCancelar: (id: string) => void
  onDescargarComprobante: (id: string) => void
  onFacturar?: (id: string) => void
}

function PagoTableRow({
  pago,
  canManage,
  actionLoading,
  onVerDetalle,
  onCopyLink,
  onReenviarLink,
  onCancelar,
  onDescargarComprobante,
  onFacturar,
}: PagoRowProps) {
  const isLoading = actionLoading === pago.id
  const estadoConfig = ESTADOS_CONFIG[pago.estado] || ESTADOS_CONFIG.pendiente

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 whitespace-nowrap">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {CONCEPTOS_LABELS[pago.concepto] || pago.concepto}
          </p>
          {pago.descripcion && (
            <p className="text-xs text-gray-500 truncate max-w-[200px]">{pago.descripcion}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-right">
        <span className="text-sm font-semibold text-gray-900">{formatCOP(pago.monto)}</span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${estadoConfig.bg} ${estadoConfig.color}`}>
          {estadoConfig.label}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
        {pago.fecha_pago
          ? new Date(pago.fecha_pago).toLocaleDateString('es-CO')
          : new Date(pago.created_at).toLocaleDateString('es-CO')}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
        {METODOS_LABELS[pago.metodo] || pago.metodo}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
        {pago.transaction_ref || pago.referencia_bancaria || '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-1">
          {isLoading ? (
            <IconLoader size={16} className="animate-spin text-gray-400" />
          ) : (
            <>
              <button
                onClick={() => onVerDetalle(pago.id)}
                className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                title="Ver detalle"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>

              {pago.payment_link_url && pago.estado === 'pendiente' && (
                <>
                  <button
                    onClick={() => onCopyLink(pago)}
                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    title="Copiar link"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  {canManage && (
                    <button
                      onClick={() => onReenviarLink(pago.id)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Reenviar link"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}
                </>
              )}

              {pago.estado === 'pendiente' && canManage && (
                <button
                  onClick={() => onCancelar(pago.id)}
                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Cancelar"
                >
                  <IconX size={16} />
                </button>
              )}

              {pago.comprobante_storage_key && pago.estado === 'completado' && (
                <button
                  onClick={() => onDescargarComprobante(pago.id)}
                  className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                  title="Descargar comprobante"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              )}

              {pago.factura?.id ? (
                <Link
                  href={`/facturacion/${pago.factura.id}`}
                  className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                  title={`Ver factura ${pago.factura.numero || ''}`.trim()}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </Link>
              ) : (
                pago.estado === 'completado' && onFacturar && (
                  <button
                    onClick={() => onFacturar(pago.id)}
                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    title="Generar factura electrónica (Factus / DIAN)"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                )
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

// ============================================
// Mobile Card Component
// ============================================

function PagoCard({
  pago,
  canManage,
  actionLoading,
  onVerDetalle,
  onCopyLink,
  onReenviarLink,
  onCancelar,
  onDescargarComprobante,
  onFacturar,
}: PagoRowProps) {
  const isLoading = actionLoading === pago.id
  const estadoConfig = ESTADOS_CONFIG[pago.estado] || ESTADOS_CONFIG.pendiente

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-gray-900">
            {CONCEPTOS_LABELS[pago.concepto] || pago.concepto}
          </p>
          {pago.descripcion && (
            <p className="text-sm text-gray-500 mt-0.5">{pago.descripcion}</p>
          )}
        </div>
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${estadoConfig.bg} ${estadoConfig.color}`}>
          {estadoConfig.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div>
          <p className="text-gray-500">Monto</p>
          <p className="font-semibold text-gray-900">{formatCOP(pago.monto)}</p>
        </div>
        <div>
          <p className="text-gray-500">Fecha</p>
          <p className="text-gray-900">
            {pago.fecha_pago
              ? new Date(pago.fecha_pago).toLocaleDateString('es-CO')
              : new Date(pago.created_at).toLocaleDateString('es-CO')}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Metodo</p>
          <p className="text-gray-900">{METODOS_LABELS[pago.metodo] || pago.metodo}</p>
        </div>
        <div>
          <p className="text-gray-500">Referencia</p>
          <p className="text-gray-900">{pago.transaction_ref || pago.referencia_bancaria || '-'}</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
        {isLoading ? (
          <IconLoader size={16} className="animate-spin text-gray-400" />
        ) : (
          <>
            <button
              onClick={() => onVerDetalle(pago.id)}
              className="px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              Ver detalle
            </button>

            {pago.payment_link_url && pago.estado === 'pendiente' && (
              <>
                <button
                  onClick={() => onCopyLink(pago)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Copiar link
                </button>
                {canManage && (
                  <button
                    onClick={() => onReenviarLink(pago.id)}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Reenviar
                  </button>
                )}
              </>
            )}

            {pago.estado === 'pendiente' && canManage && (
              <button
                onClick={() => onCancelar(pago.id)}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            )}

            {pago.comprobante_storage_key && pago.estado === 'completado' && (
              <button
                onClick={() => onDescargarComprobante(pago.id)}
                className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                Comprobante
              </button>
            )}

            {pago.factura?.id ? (
              <Link
                href={`/facturacion/${pago.factura.id}`}
                className="px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                Ver factura
              </Link>
            ) : (
              pago.estado === 'completado' && onFacturar && (
                <button
                  onClick={() => onFacturar(pago.id)}
                  className="px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  Facturar
                </button>
              )
            )}
          </>
        )}
      </div>
    </div>
  )
}
