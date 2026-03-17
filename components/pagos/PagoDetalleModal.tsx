/**
 * PagoDetalleModal - HP-351
 * Modal de detalle de pago con timeline de eventos
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { pagoService, type IPago, type IPagoEvento } from '@/services/pagoService'
import {
  IconLoader,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconClock,
  IconDollarSign,
  IconMail,
  IconRefresh,
} from '@/components/icons'

// ============================================
// Types
// ============================================

interface PagoDetalleModalProps {
  isOpen: boolean
  onClose: () => void
  pagoId: string
}

type PageState = 'loading' | 'ready' | 'error'

// ============================================
// Constants
// ============================================

const CONCEPTOS_LABELS: Record<string, string> = {
  estudio: 'Estudio de riesgo crediticio',
  garantia: 'Garantia de arrendamiento',
  primer_canon: 'Primer canon de arrendamiento',
  deposito: 'Deposito de garantia',
  otro: 'Otro',
}

const METODOS_LABELS: Record<string, string> = {
  pasarela: 'Pasarela de pagos',
  transferencia: 'Transferencia bancaria',
  efectivo: 'Efectivo',
  cheque: 'Cheque',
}

const ESTADOS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof IconCheck }> = {
  pendiente: { label: 'Pendiente', color: 'text-amber-700', bg: 'bg-amber-100', icon: IconClock },
  procesando: { label: 'Procesando', color: 'text-blue-700', bg: 'bg-blue-100', icon: IconLoader },
  completado: { label: 'Completado', color: 'text-green-700', bg: 'bg-green-100', icon: IconCheck },
  fallido: { label: 'Fallido', color: 'text-red-700', bg: 'bg-red-100', icon: IconX },
  reembolsado: { label: 'Reembolsado', color: 'text-purple-700', bg: 'bg-purple-100', icon: IconRefresh },
  cancelado: { label: 'Cancelado', color: 'text-gray-700', bg: 'bg-gray-100', icon: IconX },
}

const EVENTO_ICONS: Record<string, { icon: typeof IconCheck; color: string }> = {
  created: { icon: IconDollarSign, color: 'text-blue-500' },
  link_sent: { icon: IconMail, color: 'text-blue-500' },
  link_resent: { icon: IconMail, color: 'text-blue-500' },
  payment_started: { icon: IconClock, color: 'text-amber-500' },
  payment_completed: { icon: IconCheck, color: 'text-green-500' },
  payment_failed: { icon: IconX, color: 'text-red-500' },
  cancelled: { icon: IconX, color: 'text-gray-500' },
  refunded: { icon: IconRefresh, color: 'text-purple-500' },
  manual_registered: { icon: IconCheck, color: 'text-green-500' },
}

const EVENTO_LABELS: Record<string, string> = {
  created: 'Pago creado',
  link_sent: 'Link enviado por email',
  link_resent: 'Link reenviado',
  payment_started: 'Pago iniciado',
  payment_completed: 'Pago completado',
  payment_failed: 'Pago fallido',
  cancelled: 'Pago cancelado',
  refunded: 'Pago reembolsado',
  manual_registered: 'Pago manual registrado',
}

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

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

// ============================================
// Component
// ============================================

export function PagoDetalleModal({ isOpen, onClose, pagoId }: PagoDetalleModalProps) {
  const [pago, setPago] = useState<IPago | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const fetchPago = useCallback(async () => {
    setPageState('loading')
    setErrorMessage('')

    try {
      const data = await pagoService.getById(pagoId)
      setPago(data)
      setPageState('ready')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al cargar el detalle')
      setPageState('error')
    }
  }, [pagoId])

  useEffect(() => {
    if (isOpen && pagoId) {
      fetchPago()
    }
  }, [isOpen, pagoId, fetchPago])

  const handleClose = useCallback(() => {
    setPago(null)
    setPageState('loading')
    onClose()
  }, [onClose])

  // ============================================
  // Render: Loading
  // ============================================
  if (pageState === 'loading') {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Detalle del Pago" size="lg">
        <div className="flex items-center justify-center py-12">
          <IconLoader size={32} className="animate-spin text-primary-600" />
        </div>
      </Modal>
    )
  }

  // ============================================
  // Render: Error
  // ============================================
  if (pageState === 'error') {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Detalle del Pago" size="lg">
        <div className="text-center py-8">
          <IconAlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
          <p className="text-gray-600 mb-4">{errorMessage}</p>
          <button
            onClick={fetchPago}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </Modal>
    )
  }

  if (!pago) return null

  const estadoConfig = ESTADOS_CONFIG[pago.estado] || ESTADOS_CONFIG.pendiente
  const EstadoIcon = estadoConfig.icon

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Detalle del Pago" size="lg">
      {/* Scrollable content container */}
      <div className="max-h-[70vh] overflow-y-auto space-y-6 pr-1">
        {/* Header with status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {CONCEPTOS_LABELS[pago.concepto] || pago.concepto}
            </h3>
            {pago.descripcion && (
              <p className="text-sm text-gray-500 mt-0.5">{pago.descripcion}</p>
            )}
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full ${estadoConfig.bg} ${estadoConfig.color}`}>
            <EstadoIcon size={16} />
            {estadoConfig.label}
          </span>
        </div>

        {/* Main info grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Monto</p>
            <p className="text-xl font-bold text-gray-900">{formatCOP(pago.monto)}</p>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Metodo</p>
            <p className="text-lg font-medium text-gray-900">
              {METODOS_LABELS[pago.metodo] || pago.metodo}
            </p>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Fecha de creacion</p>
            <p className="font-medium text-gray-900">{formatDateTime(pago.created_at)}</p>
          </div>
          {pago.fecha_pago && (
            <div>
              <p className="text-gray-500">Fecha de pago</p>
              <p className="font-medium text-gray-900">{formatDateTime(pago.fecha_pago)}</p>
            </div>
          )}
          {pago.nombre_pagador && (
            <div>
              <p className="text-gray-500">Nombre del pagador</p>
              <p className="font-medium text-gray-900">{pago.nombre_pagador}</p>
            </div>
          )}
          {pago.email_pagador && (
            <div>
              <p className="text-gray-500">Email del pagador</p>
              <p className="font-medium text-gray-900">{pago.email_pagador}</p>
            </div>
          )}
          {pago.transaction_ref && (
            <div className="col-span-2">
              <p className="text-gray-500">Referencia de transaccion</p>
              <p className="font-medium text-gray-900 font-mono text-xs break-all">{pago.transaction_ref}</p>
            </div>
          )}
          {pago.referencia_bancaria && (
            <div>
              <p className="text-gray-500">Referencia bancaria</p>
              <p className="font-medium text-gray-900">{pago.referencia_bancaria}</p>
            </div>
          )}
          {pago.external_id && (
            <div className="col-span-2">
              <p className="text-gray-500">ID externo</p>
              <p className="font-medium text-gray-900 font-mono text-xs break-all">{pago.external_id}</p>
            </div>
          )}
        </div>

        {/* Notes */}
        {pago.notas && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notas</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{pago.notas}</p>
          </div>
        )}

        {/* Payment link */}
        {pago.payment_link_url && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-600 uppercase tracking-wide mb-1">Link de pago</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={pago.payment_link_url}
                className="flex-1 text-sm bg-white border border-blue-200 rounded px-2 py-1 font-mono text-xs"
              />
              <button
                onClick={() => navigator.clipboard.writeText(pago.payment_link_url!)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Copiar
              </button>
            </div>
          </div>
        )}

        {/* Comprobante */}
        {pago.comprobante_storage_key && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-600 uppercase tracking-wide mb-2">Comprobante adjunto</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {pago.comprobante_nombre_original || 'Comprobante'}
                </p>
                {pago.comprobante_tipo_mime && (
                  <p className="text-xs text-gray-500">{pago.comprobante_tipo_mime}</p>
                )}
              </div>
              <button
                onClick={async () => {
                  try {
                    const result = await pagoService.getComprobanteUrl(pago.id)
                    window.open(result.url, '_blank')
                  } catch {
                    // Handle error silently
                  }
                }}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Descargar
              </button>
            </div>
          </div>
        )}

        {/* Timeline */}
        {pago.eventos && pago.eventos.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Historial de eventos</h4>
            <div className="space-y-0">
              {pago.eventos
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((evento, index) => (
                  <EventoTimelineItem
                    key={evento.id}
                    evento={evento}
                    isLast={index === pago.eventos!.length - 1}
                  />
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Close button - outside scrollable area */}
      <div className="flex justify-end pt-4 mt-4 border-t border-gray-200">
        <button
          onClick={handleClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </Modal>
  )
}

// ============================================
// Timeline Item Component
// ============================================

interface EventoTimelineItemProps {
  evento: IPagoEvento
  isLast: boolean
}

function EventoTimelineItem({ evento, isLast }: EventoTimelineItemProps) {
  const config = EVENTO_ICONS[evento.tipo] || { icon: IconClock, color: 'text-gray-500' }
  const Icon = config.icon
  const label = EVENTO_LABELS[evento.tipo] || evento.tipo

  return (
    <div className="flex gap-3">
      {/* Icon and line */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ${config.color}`}>
          <Icon size={16} />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-4 ${isLast ? '' : ''}`}>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatDateTime(evento.created_at)}
          {evento.origen && evento.origen !== 'system' && (
            <span className="ml-2 text-gray-400">({evento.origen})</span>
          )}
        </p>
        {evento.detalles && Object.keys(evento.detalles).length > 0 && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
            {Object.entries(evento.detalles).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium">{key}:</span> {String(value)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
