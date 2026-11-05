/**
 * SelfieComparisonView - HP-327
 * Vista comparativa lado a lado: Selfie vs Identificacion frontal
 * Para operadores durante la revision de documentos
 *
 * CR Fixes:
 * - Zoom sincronizado entre ambos paneles
 * - Botones aprobar/rechazar
 * - Layout responsive (apilado en tablet, lado a lado en desktop)
 */

'use client'

import { useState, useEffect } from 'react'
import {
  IconX,
  IconLoader,
  IconAlertTriangle,
  IconUser,
  IconId,
  IconZoomIn,
  IconZoomOut,
  IconCamera,
  IconCheck,
} from '@/components/icons'
import { Modal, botonModal } from '@/components/ui/Modal'
import { documentoService } from '@/services/documentoService'
import type { IDocumento } from '@/types/documento'
import { formatDateTime } from '@/lib/constants'
import { Skeleton } from '@/components/ui/Skeleton'

// ============================================
// Types
// ============================================

interface SelfieComparisonViewProps {
  selfieDoc: IDocumento | null
  idFrontalDoc: IDocumento | null
  isOpen: boolean
  onClose: () => void
  onApprove?: (documentoId: string) => Promise<void>
  onReject?: (documentoId: string, motivo: string) => Promise<void>
}

// ============================================
// Image Panel subcomponent
// ============================================

interface ImagePanelProps {
  documento: IDocumento | null
  title: string
  icon: React.ReactNode
  emptyMessage: string
  zoom: number // CR: Zoom controlado desde padre
}

function ImagePanel({ documento, title, icon, emptyMessage, zoom }: ImagePanelProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!documento) {
      setImageUrl(null)
      return
    }

    // Use archivo_url if available
    if (documento.archivo_url) {
      setImageUrl(documento.archivo_url)
      return
    }

    // Otherwise fetch signed URL
    const fetchUrl = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await documentoService.getViewUrl(documento.id)
        setImageUrl(result.url)
      } catch {
        setError('No se pudo cargar la imagen.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUrl()
  }, [documento])

  const metadatos = documento?.metadatos
  const metodoCapturaLabel = metadatos?.metodo_captura === 'camara'
    ? 'Tomada con la cámara'
    : metadatos?.metodo_captura === 'archivo'
      ? 'Subida como archivo'
      : null

  return (
    <div className="flex-1 flex flex-col bg-gray-900 rounded-lg overflow-hidden min-h-0">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2 text-white">
          {icon}
          <span className="font-medium text-sm md:text-base">{title}</span>
        </div>
        {documento && (
          <span className="text-xs text-gray-400">
            {Math.round(zoom * 100)}%
          </span>
        )}
      </div>

      {/* Image content */}
      <div className="flex-1 relative overflow-auto bg-gray-950 min-h-0">
        {!documento ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                {icon}
              </div>
              <p className="text-sm">{emptyMessage}</p>
            </div>
          </div>
        ) : isLoading ? (
          <Skeleton className="absolute inset-0 rounded-none" />
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-red-400">
              <IconAlertTriangle size={32} className="mx-auto mb-2" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : imageUrl ? (
          <div className="min-h-full flex items-center justify-center p-4 overflow-auto">
            <img
              src={imageUrl}
              alt={title}
              className="max-w-full h-auto transition-transform duration-200"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              draggable={false}
            />
          </div>
        ) : null}
      </div>

      {/* Panel footer with metadata */}
      {documento && (
        <div className="px-4 py-2 bg-gray-800 border-t border-gray-700">
          <div className="flex items-center justify-between text-xs">
            <div className="text-gray-400 truncate flex-1">
              {documento.nombre_original}
            </div>
            {metodoCapturaLabel && (
              <div className="flex items-center gap-1 text-gray-500 ml-2">
                <IconCamera size={12} />
                <span>{metodoCapturaLabel}</span>
              </div>
            )}
          </div>
          {metadatos?.timestamp_captura && (
            <div className="text-xs text-gray-500 mt-1">
              Capturada: {formatDateTime(metadatos.timestamp_captura)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export function SelfieComparisonView({
  selfieDoc,
  idFrontalDoc,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: SelfieComparisonViewProps) {
  // CR: Zoom sincronizado - estado levantado al padre
  const [zoom, setZoom] = useState(1)
  const [isApproving, setIsApproving] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectMotivo, setRejectMotivo] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setZoom(1)
      setShowRejectInput(false)
      setRejectMotivo('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5))
  const handleResetZoom = () => setZoom(1)

  // Approve selfie document
  const handleApprove = async () => {
    if (!selfieDoc || !onApprove || isApproving) return
    setIsApproving(true)
    try {
      await onApprove(selfieDoc.id)
      onClose()
    } catch {
      // Error handled by parent
    } finally {
      setIsApproving(false)
    }
  }

  // Reject selfie document
  const handleReject = async () => {
    if (!selfieDoc || !onReject || !rejectMotivo.trim() || isRejecting) return
    setIsRejecting(true)
    try {
      await onReject(selfieDoc.id, rejectMotivo.trim())
      onClose()
    } catch {
      // Error handled by parent
    } finally {
      setIsRejecting(false)
    }
  }

  const canTakeAction = selfieDoc?.estado === 'pendiente' && onApprove && onReject

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      bare
      encima
      ariaLabel="Comparación de identidad"
      className="h-full max-h-none bg-black/90 shadow-none flex flex-col"
    >
      {/* Encabezado: título, para qué sirve, zoom y cerrar en una sola franja. */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-800 bg-gray-900 py-3 pl-4 pr-2 md:pl-6 md:pr-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-white md:text-lg">Comparación de identidad</h2>
          <p className="text-xs text-gray-300 md:text-sm">Verifique que la persona de la selfie coincida con la de la identificación.</p>
        </div>
        <div className="order-last flex w-full items-center justify-center gap-1 md:order-none md:w-auto" role="group" aria-label="Zoom de las dos imágenes">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            aria-label="Reducir zoom"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          >
            <IconZoomOut size={18} />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            aria-label={`Zoom ${Math.round(zoom * 100)} %. Volver al 100 %`}
            className="h-10 min-w-16 rounded-lg px-3 text-sm tabular-nums text-gray-200 transition-colors hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          >
            {Math.round(zoom * 100)} %
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            aria-label="Ampliar zoom"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          >
            <IconZoomIn size={18} />
          </button>
        </div>
        <button
          type="button"
          data-modal-close
          onClick={onClose}
          aria-label="Cerrar"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        >
          <IconX size={22} />
        </button>
      </div>

      {/* CR: Comparison panels - responsive layout (flex-col en tablet, flex-row en desktop) */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 overflow-hidden min-h-0">
        {/* Selfie panel */}
        <ImagePanel
          documento={selfieDoc}
          title="Selfie del solicitante"
          icon={<IconUser size={20} className="text-primary-400" />}
          emptyMessage="Aún no se ha cargado la selfie."
          zoom={zoom}
        />

        {/* ID Frontal panel */}
        <ImagePanel
          documento={idFrontalDoc}
          title="Identificación (cara frontal)"
          icon={<IconId size={20} className="text-blue-400" />}
          emptyMessage="Aún no se ha cargado la cara frontal de la identificación."
          zoom={zoom}
        />
      </div>

      {/* Pie: qué revisar y la decisión. */}
      <div className="shrink-0 border-t border-gray-800 bg-gray-900 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6">
        {showRejectInput ? (
          <div className="space-y-2">
            <label htmlFor="selfie-comparison-view-motivo-del-rechazo" className="block text-sm font-medium text-gray-100">
              Motivo del rechazo <span className="text-red-300" aria-hidden="true">*</span>
            </label>
            <textarea
              id="selfie-comparison-view-motivo-del-rechazo"
              autoFocus
              value={rejectMotivo}
              onChange={(e) => setRejectMotivo(e.target.value)}
              placeholder="Por ejemplo: la persona de la selfie no coincide con la foto del documento."
              required
              disabled={isRejecting}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
              rows={2}
            />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
              <button
                type="button"
                onClick={() => {
                  setShowRejectInput(false)
                  setRejectMotivo('')
                }}
                disabled={isRejecting}
                className={botonModal('secondary', 'border-gray-600 bg-gray-800 text-gray-100 hover:bg-gray-700')}
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={!rejectMotivo.trim() || isRejecting}
                aria-busy={isRejecting || undefined}
                className={botonModal('danger')}
              >
                {isRejecting && <IconLoader size={16} className="animate-spin" />}
                {isRejecting ? 'Rechazando…' : 'Rechazar selfie'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="text-sm text-gray-300">
              <p className="mb-1 font-medium text-gray-100">Puntos a verificar</p>
              <ul className="list-disc space-y-0.5 pl-5 text-xs md:text-sm">
                <li>Los rasgos faciales coinciden entre ambas imágenes.</li>
                <li>La foto del documento no presenta alteraciones visibles.</li>
                <li>La selfie fue tomada recientemente (revise la fecha de captura).</li>
              </ul>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row [&>*]:w-full sm:[&>*]:w-auto">
              <button
                type="button"
                onClick={onClose}
                className={botonModal('secondary', 'border-gray-600 bg-gray-800 text-gray-100 hover:bg-gray-700')}
              >
                Cerrar
              </button>
              {canTakeAction && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowRejectInput(true)}
                    disabled={isApproving}
                    className={botonModal('secondary', 'border-red-400/60 bg-gray-800 text-red-200 hover:bg-red-950')}
                  >
                    <IconX size={16} />
                    Rechazar
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isApproving}
                    aria-busy={isApproving || undefined}
                    className={botonModal('primary')}
                  >
                    {isApproving ? <IconLoader size={16} className="animate-spin" /> : <IconCheck size={16} />}
                    Aprobar selfie
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
