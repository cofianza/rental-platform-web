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
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import { pagoService, type IPago } from '@/services/pagoService'
import { facturacionService } from '@/services/facturacionService'
import { PagoManualModal } from './PagoManualModal'
import { GenerarLinkPagoModal } from './GenerarLinkPagoModal'
import { PagoDetalleModal } from './PagoDetalleModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  IconPlus,
  IconRefresh,
  IconLoader,
  IconAlertTriangle,
  IconDollarSign,
  IconClock,
  IconCheck,
  IconX,
  IconCopy,
  IconDownload,
  IconEye,
  IconFileText,
  IconMail,
} from '@/components/icons'
import { abrirEnPestana, cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/constants'
import { SkeletonText, SkeletonTable } from '@/components/ui/Skeleton'

// ============================================
// Types
// ============================================

interface PagosSectionProps {
  expedienteId: string
  /** Tras cancelar, reenviar o registrar un pago: el Resumen (montado aparte) se refresca. */
  onPagoActualizado?: () => void
}

type PageState = 'loading' | 'ready' | 'error'

// ============================================
// Constants
// ============================================

const CONCEPTOS_LABELS: Record<string, string> = {
  estudio: 'Evaluación',
  garantia: 'Prima de vinculación',
  primer_canon: 'Primer canon',
  deposito: 'Depósito',
  otro: 'Otro',
}

const METODOS_LABELS: Record<string, string> = {
  pasarela: 'Pasarela',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  cheque: 'Cheque',
}

// Marca de cada estado: círculo + pastilla, con la paleta corta de Documentos y Contratos.
const ESTADOS_CONFIG: Record<string, { label: string; chip: string; circulo: string; icono: React.ReactNode }> = {
  pendiente: { label: 'Pendiente', chip: 'bg-amber-100 text-amber-900', circulo: 'bg-amber-100 text-amber-800', icono: <IconClock size={16} /> },
  procesando: { label: 'Procesando', chip: 'bg-blue-100 text-blue-800', circulo: 'bg-blue-100 text-blue-700', icono: <IconLoader size={16} /> },
  completado: { label: 'Completado', chip: 'bg-green-100 text-green-800', circulo: 'bg-green-100 text-green-700', icono: <IconCheck size={16} /> },
  fallido: { label: 'Fallido', chip: 'bg-red-100 text-red-800', circulo: 'bg-red-100 text-red-700', icono: <IconAlertTriangle size={16} /> },
  reembolsado: { label: 'Reembolsado', chip: 'bg-gray-100 text-gray-700', circulo: 'bg-gray-100 text-gray-600', icono: <IconRefresh size={16} /> },
  cancelado: { label: 'Cancelado', chip: 'bg-gray-100 text-gray-700', circulo: 'bg-gray-100 text-gray-500', icono: <IconX size={16} /> },
}

// El mismo botón de fila que Documentos: 40 px de alto, con texto.
const BOTON_FILA =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50'
const BOTON_SECUNDARIO = 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
const BOTON_PRINCIPAL = 'bg-primary-700 text-white hover:bg-primary-800'

const ITEMS_PER_PAGE = 10

// ============================================
// Component
// ============================================

export function PagosSection({ expedienteId, onPagoActualizado }: PagosSectionProps) {
  const user = useAuthStore((s) => s.user)
  const canManage = user?.rol === 'administrador' || user?.rol === 'operador_analista'
  // Facturar tiene un permiso más amplio: admin, operador, inmobiliaria y
  // propietario pueden disparar la creación de la factura electrónica; el
  // miembro solo lectura no (el API le da 403).
  const puedeEditar = usePuedeEditar()
  const canFacturar =
    puedeEditar &&
    (user?.rol === 'administrador' ||
      user?.rol === 'operador_analista' ||
      user?.rol === 'inmobiliaria' ||
      user?.rol === 'propietario')

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

  // Los totales se calculan sobre el lote que hay en pantalla, asi que con un
  // filtro puesto o mas de una pagina NO son el total del expediente.
  const hayRecorte = !!filterEstado || !!filterConcepto || total > pagos.length

  // Actions
  const handleCopyLink = useCallback(async (pago: IPago) => {
    if (!pago.payment_link_url) return
    try {
      await navigator.clipboard.writeText(pago.payment_link_url)
      toast.success('Enlace copiado al portapapeles')
    } catch {
      toast.error('No se pudo copiar el enlace')
    }
  }, [])

  const handleReenviarLink = useCallback(async (pagoId: string) => {
    setActionLoading(pagoId)
    try {
      await pagoService.reenviarLink(pagoId)
      toast.success('Enlace reenviado por correo')
      onPagoActualizado?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al reenviar')
    } finally {
      setActionLoading(null)
    }
  }, [onPagoActualizado])

  // Emitir la factura DIAN o cancelar un pago: confirmación en diálogo, no en un toast que se va solo.
  const [confirmar, setConfirmar] = useState<{ accion: 'facturar' | 'cancelar'; pagoId: string } | null>(null)
  const handleFacturar = useCallback((pagoId: string) => setConfirmar({ accion: 'facturar', pagoId }), [])
  const handleCancelar = useCallback((pagoId: string) => setConfirmar({ accion: 'cancelar', pagoId }), [])

  const ejecutarConfirmado = async () => {
    if (!confirmar) return
    const { accion, pagoId } = confirmar
    setActionLoading(pagoId)
    try {
      if (accion === 'facturar') {
        const factura = await facturacionService.facturarPago(pagoId)
        toast.success(`Factura emitida: ${factura.numero}`)
      } else {
        await pagoService.cancelar(pagoId)
        toast.success('Pago cancelado')
        onPagoActualizado?.()
      }
      // Se espera la relectura antes de soltar el botón: sin esto se podía
      // volver a pulsar sobre la fila vieja (doble factura o doble cancelación).
      await fetchPagos()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : accion === 'facturar' ? 'No se pudo generar la factura' : 'No se pudo cancelar el pago')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDescargarComprobante = useCallback(async (pagoId: string) => {
    setActionLoading(pagoId)
    try {
      await abrirEnPestana(async () => (await pagoService.getComprobanteUrl(pagoId)).url)
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
    onPagoActualizado?.()
    toast.success('Pago registrado correctamente')
  }, [fetchPagos, onPagoActualizado])

  // ============================================
  // Render: Loading
  // ============================================
  if (pageState === 'loading' && pagos.length === 0) {
    return (
      <div className="space-y-4">
        <SkeletonText lineas={2} className="max-w-sm" />
        <SkeletonTable filas={4} columnas={4} etiqueta="Cargando pagos…" />
      </div>
    )
  }

  // ============================================
  // Render: Error
  // ============================================
  if (pageState === 'error') {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex min-w-0 items-start gap-2">
          <IconAlertTriangle size={18} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-red-900">No pudimos cargar los pagos de este estudio.</p>
            {errorMessage && <p className="mt-0.5 text-sm text-red-800">{errorMessage}</p>}
          </div>
        </div>
        <button type="button" onClick={fetchPagos} className={cn(BOTON_FILA, 'border border-red-300 bg-white text-red-800 hover:bg-red-100')}>
          <IconRefresh size={16} />
          Reintentar
        </button>
      </div>
    )
  }

  const modales = (
    <>
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
    </>
  )

  const accionesCrear = canManage && (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => setShowManualModal(true)} className={cn(BOTON_FILA, BOTON_SECUNDARIO)}>
        <IconPlus size={16} />
        Registrar pago manual
      </button>
      <button type="button" onClick={() => setShowLinkModal(true)} className={cn(BOTON_FILA, BOTON_PRINCIPAL)}>
        <IconPlus size={16} />
        Generar enlace de pago
      </button>
    </div>
  )

  // ============================================
  // Render: Empty
  // ============================================
  if (pagos.length === 0 && !filterEstado && !filterConcepto) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Pagos del estudio</h3>
        <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <IconDollarSign size={20} />
          </span>
          <p className="mt-3 text-sm font-semibold text-gray-900">Sin pagos registrados</p>
          <p className="mt-1 max-w-md text-sm text-gray-600">
            Aún no hay pagos en este estudio.
            {/* Solo quien ve los botones de abajo puede generarlos. */}
            {canManage && ' Puede generar un enlace de pago o registrar un pago manual.'}
          </p>
          {accionesCrear && <div className="mt-5">{accionesCrear}</div>}
        </div>
        {modales}
      </div>
    )
  }

  // ============================================
  // Render: Main Content
  // ============================================
  const cantidadPendientes = (summary.porEstado.pendiente ?? 0) + (summary.porEstado.procesando ?? 0)
  return (
    <div className="space-y-4">
      {/* Encabezado: cuánto se cobró, cuánto falta y las acciones de Cofianza */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">Pagos del estudio</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
            <span>
              Cobrado{hayRecorte ? ' en esta vista' : ''}:{' '}
              <span className="font-semibold text-gray-900 tabular-nums">{formatCurrency(summary.totalCobrado)}</span>
            </span>
            {cantidadPendientes > 0 && (
              <span className="text-amber-900">
                Pendiente{hayRecorte ? ' en esta vista' : ''}:{' '}
                <span className="font-semibold tabular-nums">{formatCurrency(summary.totalPendiente)}</span>
              </span>
            )}
            <span>
              <span className="tabular-nums">{total}</span> {total === 1 ? 'pago' : 'pagos'}
            </span>
          </p>
        </div>
        {accionesCrear}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="pagos-filtro-estado" className="sr-only">Filtrar por estado</label>
        <select
          id="pagos-filtro-estado"
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="min-h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS_CONFIG).map(([value, { label }]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <label htmlFor="pagos-filtro-concepto" className="sr-only">Filtrar por concepto</label>
        <select
          id="pagos-filtro-concepto"
          value={filterConcepto}
          onChange={(e) => setFilterConcepto(e.target.value)}
          className="min-h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Todos los conceptos</option>
          {Object.entries(CONCEPTOS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={fetchPagos}
          disabled={pageState === 'loading'}
          className={cn(BOTON_FILA, 'text-gray-700 hover:bg-gray-100')}
        >
          <IconRefresh size={16} className={pageState === 'loading' ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Una fila por pago */}
      {pagos.length > 0 ? (
        <ul
          className={cn(
            'divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white transition-opacity',
            pageState === 'loading' && 'pointer-events-none opacity-60',
          )}
          aria-busy={pageState === 'loading'}
        >
          {pagos.map((pago) => (
            <PagoFila
              key={pago.id}
              pago={pago}
              canManage={canManage}
              actionLoading={actionLoading}
              onVerDetalle={handleVerDetalle}
              onCopyLink={handleCopyLink}
              onReenviarLink={handleReenviarLink}
              onCancelar={handleCancelar}
              onDescargarComprobante={handleDescargarComprobante}
              onFacturar={canFacturar ? handleFacturar : undefined}
            />
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
          <p className="text-sm text-gray-600">No hay pagos con los filtros seleccionados.</p>
          <button
            type="button"
            onClick={() => { setFilterEstado(''); setFilterConcepto('') }}
            className={cn(BOTON_FILA, 'mt-3 text-primary-800 hover:bg-primary-50')}
          >
            Quitar filtros
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav aria-label="Páginas de pagos" className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600 tabular-nums">
            {((page - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(page * ITEMS_PER_PAGE, total)} de {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={cn(BOTON_FILA, BOTON_SECUNDARIO)}
            >
              Anterior
            </button>
            <span className="text-sm text-gray-600 tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={cn(BOTON_FILA, BOTON_SECUNDARIO)}
            >
              Siguiente
            </button>
          </div>
        </nav>
      )}

      {/* Modals */}
      {modales}
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
      <ConfirmDialog
        isOpen={!!confirmar}
        onClose={() => setConfirmar(null)}
        onConfirm={ejecutarConfirmado}
        isLoading={actionLoading !== null}
        title={confirmar?.accion === 'cancelar' ? '¿Cancelar este pago?' : '¿Generar la factura electrónica de este pago?'}
        message={
          confirmar?.accion === 'cancelar'
            ? 'El pago queda cancelado y no se puede deshacer.'
            : 'Se envía a Factus y la DIAN la emite con CUFE oficial. Una factura emitida solo se anula con una nota crédito.'
        }
        confirmLabel={confirmar?.accion === 'cancelar' ? 'Cancelar pago' : 'Generar factura'}
        cancelLabel="Volver"
        variant={confirmar?.accion === 'cancelar' ? 'danger' : 'default'}
      />
    </div>
  )
}

// ============================================
// Fila de un pago (escritorio y móvil)
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

function PagoFila({
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
  const concepto = CONCEPTOS_LABELS[pago.concepto] || pago.concepto
  const referencia = pago.transaction_ref || pago.referencia_bancaria

  return (
    <li className="flex gap-3 px-4 py-4 sm:px-5">
      <span
        aria-hidden="true"
        className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', estadoConfig.circulo)}
      >
        {estadoConfig.icono}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        {/* Qué pago es, cuánto y en qué estado está */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h4 className="text-sm font-semibold text-gray-900">{concepto}</h4>
            <span className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(pago.monto)}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', estadoConfig.chip)}>{estadoConfig.label}</span>
          </div>
          {pago.descripcion && <p className="mt-1 break-words text-sm text-gray-700">{pago.descripcion}</p>}
          <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-gray-600">
            <span>
              {pago.fecha_pago ? `Pagado el ${formatDate(pago.fecha_pago)}` : `Creado el ${formatDate(pago.created_at)}`}
            </span>
            <span aria-hidden="true">·</span>
            <span>{METODOS_LABELS[pago.metodo] || pago.metodo}</span>
            {referencia && (
              <>
                <span aria-hidden="true">·</span>
                <span className="break-all">Ref. {referencia}</span>
              </>
            )}
          </p>
        </div>

        {/* Qué se puede hacer */}
        {isLoading ? (
          <span role="status" className="inline-flex min-h-10 items-center gap-2 text-sm text-gray-600">
            <IconLoader size={16} className="animate-spin" />
            Un momento…
          </span>
        ) : (
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => onVerDetalle(pago.id)}
              aria-label={`Ver detalle del pago de ${concepto}`}
              className={cn(BOTON_FILA, BOTON_SECUNDARIO)}
            >
              <IconEye size={16} />
              Ver detalle
            </button>

            {pago.payment_link_url && pago.estado === 'pendiente' && (
              <>
                <button type="button" onClick={() => onCopyLink(pago)} className={cn(BOTON_FILA, BOTON_SECUNDARIO)}>
                  <IconCopy size={16} />
                  Copiar enlace
                </button>
                {canManage && (
                  <button type="button" onClick={() => onReenviarLink(pago.id)} className={cn(BOTON_FILA, BOTON_SECUNDARIO)}>
                    <IconMail size={16} />
                    Reenviar enlace
                  </button>
                )}
              </>
            )}

            {/* 'fallido' también: MP deja pagar el mismo checkout, y un pago manual del concepto lo exige cerrado */}
            {(pago.estado === 'pendiente' || pago.estado === 'fallido') && canManage && (
              <button type="button" onClick={() => onCancelar(pago.id)} className={cn(BOTON_FILA, 'text-red-700 hover:bg-red-50')}>
                <IconX size={16} />
                Cancelar pago
              </button>
            )}

            {pago.comprobante_storage_key && pago.estado === 'completado' && (
              <button type="button" onClick={() => onDescargarComprobante(pago.id)} className={cn(BOTON_FILA, BOTON_SECUNDARIO)}>
                <IconDownload size={16} />
                Comprobante
              </button>
            )}

            {pago.factura?.id ? (
              <Link href={`/facturacion/${pago.factura.id}`} className={cn(BOTON_FILA, BOTON_SECUNDARIO)}>
                <IconFileText size={16} />
                {pago.factura.numero ? `Factura ${pago.factura.numero}` : 'Ver factura'}
              </Link>
            ) : (
              pago.estado === 'completado' && onFacturar && (
                <button
                  type="button"
                  onClick={() => onFacturar(pago.id)}
                  title="Generar la factura electrónica (Factus / DIAN)"
                  className={cn(BOTON_FILA, BOTON_PRINCIPAL)}
                >
                  <IconFileText size={16} />
                  Facturar
                </button>
              )
            )}
          </div>
        )}
      </div>
    </li>
  )
}
