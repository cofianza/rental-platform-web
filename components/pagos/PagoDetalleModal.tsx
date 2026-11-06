/**
 * PagoDetalleModal - HP-351
 * Modal de detalle de pago con timeline de eventos
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { SkeletonDetail } from '@/components/ui/Skeleton'
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
  IconCopy,
  IconDownload,
  IconFileText,
} from '@/components/icons'
import { abrirEnPestana } from '@/lib/utils'

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
  estudio: 'Estudio de arrendamiento',
  garantia: 'Prima de vinculación de la fianza',
  primer_canon: 'Primer canon de arrendamiento',
  deposito: 'Depósito de garantía',
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
  link_sent: 'Enlace enviado por correo',
  link_resent: 'Enlace reenviado',
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
  const [descargando, setDescargando] = useState(false)

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

  const estadoConfig = pago ? ESTADOS_CONFIG[pago.estado] || ESTADOS_CONFIG.pendiente : null
  const EstadoIcon = estadoConfig?.icon

  const copiarEnlace = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Enlace copiado.')
    } catch {
      toast.error('No se pudo copiar el enlace. Selecciónelo y cópielo a mano.')
    }
  }

  const descargarComprobante = async (id: string) => {
    if (descargando) return
    setDescargando(true)
    try {
      await abrirEnPestana(async () => (await pagoService.getComprobanteUrl(id)).url)
    } catch {
      toast.error('No se pudo abrir el comprobante. Intente de nuevo.')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Detalle del pago"
      description={pago && pageState === 'ready' ? `${CONCEPTOS_LABELS[pago.concepto] || pago.concepto} · ${formatCOP(pago.monto)}` : undefined}
      size="lg"
      closeOnBackdrop
      footer={
        <ModalAcciones>
          {pageState === 'error' && (
            <button type="button" onClick={() => void fetchPago()} className={botonModal('secondary')}>
              <IconRefresh size={16} />
              Reintentar
            </button>
          )}
          <button type="button" onClick={handleClose} className={botonModal('primary')}>
            Cerrar
          </button>
        </ModalAcciones>
      }
    >
      {pageState === 'loading' && (
        <SkeletonDetail bloques={1} etiqueta="Cargando el detalle del pago…" className="py-2" />
      )}

      {pageState === 'error' && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <IconAlertTriangle size={20} className="mt-0.5 shrink-0 text-red-600" />
          <div>
            <p className="font-medium">No se pudo cargar el detalle del pago.</p>
            {errorMessage && <p className="mt-1 text-red-700">{errorMessage}</p>}
            <p className="mt-1 text-red-700">Revise su conexión y pulse «Reintentar».</p>
          </div>
        </div>
      )}

      {pageState === 'ready' && pago && estadoConfig && EstadoIcon && (
        <div className="space-y-6">
          {/* Concepto y estado */}
          <div className="flex flex-col gap-3 rounded-lg bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
                {CONCEPTOS_LABELS[pago.concepto] || pago.concepto}
              </h3>
              {pago.descripcion && <p className="mt-0.5 text-sm text-gray-600">{pago.descripcion}</p>}
            </div>
            <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${estadoConfig.bg} ${estadoConfig.color}`}>
              <EstadoIcon size={16} />
              {estadoConfig.label}
            </span>
          </div>

          {/* Monto y método */}
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <dt className="mb-1 text-sm text-gray-600">Monto</dt>
              <dd className="text-xl font-bold tabular-nums text-gray-900">{formatCOP(pago.monto)}</dd>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <dt className="mb-1 text-sm text-gray-600">Método</dt>
              <dd className="text-lg font-medium text-gray-900">{METODOS_LABELS[pago.metodo] || pago.metodo}</dd>
            </div>
          </dl>

          {/* Datos */}
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-600">Fecha de creación</dt>
              <dd className="font-medium text-gray-900">{formatDateTime(pago.created_at)}</dd>
            </div>
            {pago.fecha_pago && (
              <div>
                <dt className="text-gray-600">Fecha de pago</dt>
                <dd className="font-medium text-gray-900">{formatDateTime(pago.fecha_pago)}</dd>
              </div>
            )}
            {pago.nombre_pagador && (
              <div>
                <dt className="text-gray-600">Nombre de quien pagó</dt>
                <dd className="break-words font-medium text-gray-900">{pago.nombre_pagador}</dd>
              </div>
            )}
            {pago.email_pagador && (
              <div>
                <dt className="text-gray-600">Correo de quien pagó</dt>
                <dd className="break-all font-medium text-gray-900">{pago.email_pagador}</dd>
              </div>
            )}
            {pago.transaction_ref && (
              <div className="sm:col-span-2">
                <dt className="text-gray-600">Referencia de la transacción</dt>
                <dd className="break-all font-mono text-xs font-medium text-gray-900">{pago.transaction_ref}</dd>
              </div>
            )}
            {pago.referencia_bancaria && (
              <div>
                <dt className="text-gray-600">Referencia bancaria</dt>
                <dd className="break-all font-medium text-gray-900">{pago.referencia_bancaria}</dd>
              </div>
            )}
            {pago.external_id && (
              <div className="sm:col-span-2">
                <dt className="text-gray-600">Identificador en la pasarela</dt>
                <dd className="break-all font-mono text-xs font-medium text-gray-900">{pago.external_id}</dd>
              </div>
            )}
          </dl>

          {pago.notas && (
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="mb-1 text-sm font-medium text-gray-700">Notas</p>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{pago.notas}</p>
            </div>
          )}

          {pago.payment_link_url && (
            <div className="rounded-lg border border-gray-200 p-4">
              <label htmlFor="pago-detalle-enlace" className="mb-2 block text-sm font-medium text-gray-700">
                Enlace de pago
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  id="pago-detalle-enlace"
                  type="text"
                  readOnly
                  value={pago.payment_link_url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-h-10 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-800"
                />
                <button type="button" onClick={() => void copiarEnlace(pago.payment_link_url!)} className={botonModal('secondary')}>
                  <IconCopy size={16} />
                  Copiar enlace
                </button>
              </div>
            </div>
          )}

          {pago.comprobante_storage_key && (
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="mb-2 text-sm font-medium text-gray-700">Comprobante adjunto</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <IconFileText size={20} className="shrink-0 text-gray-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{pago.comprobante_nombre_original || 'Comprobante'}</p>
                    {pago.comprobante_tipo_mime && <p className="text-xs text-gray-600">{pago.comprobante_tipo_mime}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void descargarComprobante(pago.id)}
                  disabled={descargando}
                  aria-busy={descargando || undefined}
                  className={botonModal('secondary')}
                >
                  {descargando ? <IconLoader size={16} className="animate-spin" /> : <IconDownload size={16} />}
                  {descargando ? 'Abriendo…' : 'Ver comprobante'}
                </button>
              </div>
            </div>
          )}

          <div>
            <h4 className="mb-3 text-sm font-medium text-gray-900">Historial de eventos</h4>
            {pago.eventos && pago.eventos.length > 0 ? (
              <ol className="space-y-0">
                {[...pago.eventos]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((evento, index) => (
                    <EventoTimelineItem key={evento.id} evento={evento} isLast={index === pago.eventos!.length - 1} />
                  ))}
              </ol>
            ) : (
              <p className="text-sm text-gray-600">Este pago todavía no tiene eventos registrados.</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

// ============================================
// Timeline Item Component
// ============================================

// Detalles del evento: solo las claves con etiqueta en español. Las técnicas
// (ids de usuario, de pasarela, de lote, marcas de simulación) no se muestran.
const DETALLE_LABELS: Record<string, string> = {
  estado_anterior: 'Estado anterior',
  estado_nuevo: 'Estado nuevo',
  motivo: 'Motivo',
  metodo: 'Método',
  email: 'Correo',
  email_anterior: 'Correo anterior',
  provider: 'Pasarela',
  gateway: 'Pasarela',
  transaction_ref: 'Referencia de la transacción',
  saldo_restante: 'Cupos restantes',
  devolucion: 'Devolución',
  cancelado_por: 'Cancelado por',
}

const VALOR_LABELS: Record<string, string> = {
  sistema: 'El sistema',
  mercadopago: 'Mercado Pago',
  stripe: 'Stripe',
  credito: 'Cupo del paquete',
  credito_inmobiliaria: 'Cupo de la inmobiliaria',
  reemplazado_por_nuevo_cobro: 'Reemplazado por un cobro nuevo',
  gestor_paga_por_pasarela: 'El gestor paga por la pasarela',
  inmobiliaria_libera_credito: 'La inmobiliaria liberó el cupo',
}

const PARECE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function detallesLegibles(detalles: IPagoEvento['detalles']): [string, string][] {
  if (!detalles || typeof detalles !== 'object') return []
  const filas: [string, string][] = []
  for (const [clave, valor] of Object.entries(detalles as Record<string, unknown>)) {
    const etiqueta = DETALLE_LABELS[clave]
    if (!etiqueta || valor === null || valor === undefined || valor === '' || typeof valor === 'object') continue
    const texto = String(valor)
    if (PARECE_ID.test(texto)) continue
    const legible =
      clave === 'estado_anterior' || clave === 'estado_nuevo'
        ? ESTADOS_CONFIG[texto]?.label ?? texto
        : VALOR_LABELS[texto] ?? texto
    filas.push([etiqueta, legible])
  }
  return filas
}

interface EventoTimelineItemProps {
  evento: IPagoEvento
  isLast: boolean
}

function EventoTimelineItem({ evento, isLast }: EventoTimelineItemProps) {
  const detallesVisibles = detallesLegibles(evento.detalles)
  const config = EVENTO_ICONS[evento.tipo] || { icon: IconClock, color: 'text-gray-500' }
  const Icon = config.icon
  const label = EVENTO_LABELS[evento.tipo] || evento.tipo

  return (
    <li className="flex gap-3">
      {/* Icon and line */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ${config.color}`} aria-hidden="true">
          <Icon size={16} />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-4">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatDateTime(evento.created_at)}
          {evento.origen && evento.origen !== 'system' && (
            <span className="ml-2 text-gray-500">({evento.origen})</span>
          )}
        </p>
        {detallesVisibles.length > 0 && (
          <dl className="mt-2 break-words rounded bg-gray-50 p-2 text-xs text-gray-600">
            {detallesVisibles.map(([etiqueta, valor]) => (
              <div key={etiqueta} className="flex flex-wrap gap-x-1">
                <dt className="font-medium">{etiqueta}:</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </li>
  )
}
