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
import { documentoService } from '@/services/documentoService'
import type { IDocumento } from '@/types/documento'

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
        setError('Error al cargar imagen')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUrl()
  }, [documento])

  const metadatos = documento?.metadatos
  const metodoCapturaLabel = metadatos?.metodo_captura === 'camara'
    ? 'Captura con camara'
    : metadatos?.metodo_captura === 'archivo'
      ? 'Subida de archivo'
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
          <div className="absolute inset-0 flex items-center justify-center">
            <IconLoader size={32} className="text-gray-400 animate-spin" />
          </div>
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
              Capturado: {new Date(metadatos.timestamp_captura).toLocaleString('es-CO')}
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
    if (!selfieDoc || !onApprove) return
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
    if (!selfieDoc || !onReject || !rejectMotivo.trim()) return
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
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 bg-gray-900 border-b border-gray-800">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-white">
            Comparacion de Identidad
          </h2>
          <p className="text-xs md:text-sm text-gray-400">
            Verifica que la persona del selfie coincida con la identificacion
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <IconX size={24} />
        </button>
      </div>

      {/* CR: Zoom controls - sincronizados */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800">
        <span className="text-xs text-gray-400 mr-2">Zoom sincronizado:</span>
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 0.5}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
          title="Reducir"
        >
          <IconZoomOut size={18} />
        </button>
        <button
          onClick={handleResetZoom}
          className="px-3 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors min-w-[60px]"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 3}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
          title="Ampliar"
        >
          <IconZoomIn size={18} />
        </button>
      </div>

      {/* CR: Comparison panels - responsive layout (flex-col en tablet, flex-row en desktop) */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 overflow-hidden min-h-0">
        {/* Selfie panel */}
        <ImagePanel
          documento={selfieDoc}
          title="Selfie del Solicitante"
          icon={<IconUser size={20} className="text-primary-400" />}
          emptyMessage="No se ha cargado selfie"
          zoom={zoom}
        />

        {/* ID Frontal panel */}
        <ImagePanel
          documento={idFrontalDoc}
          title="Identificacion Frontal"
          icon={<IconId size={20} className="text-blue-400" />}
          emptyMessage="No se ha cargado identificacion frontal"
          zoom={zoom}
        />
      </div>

      {/* Footer with tips and actions */}
      <div className="px-4 md:px-6 py-4 bg-gray-900 border-t border-gray-800">
        {/* Reject input */}
        {showRejectInput && (
          <div className="mb-4 p-3 bg-gray-800 rounded-lg">
            <label className="block text-sm text-gray-300 mb-2">
              Motivo del rechazo:
            </label>
            <textarea
              value={rejectMotivo}
              onChange={(e) => setRejectMotivo(e.target.value)}
              placeholder="Describe por que rechazas el selfie..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={2}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  setShowRejectInput(false)
                  setRejectMotivo('')
                }}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectMotivo.trim() || isRejecting}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isRejecting ? 'Rechazando...' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-start gap-4">
          {/* Tips */}
          <div className="flex-1 text-sm text-gray-400">
            <p className="font-medium text-gray-300 mb-1">Puntos a verificar:</p>
            <ul className="list-disc list-inside space-y-1 text-xs md:text-sm">
              <li>Los rasgos faciales coinciden entre ambas imagenes</li>
              <li>La foto del documento no presenta alteraciones visibles</li>
              <li>El selfie fue tomado recientemente (verificar metadatos)</li>
            </ul>
          </div>

          {/* CR: Action buttons - aprobar/rechazar */}
          <div className="flex gap-2 shrink-0">
            {canTakeAction && !showRejectInput && (
              <>
                <button
                  onClick={() => setShowRejectInput(true)}
                  disabled={isApproving}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  <IconX size={16} className="inline mr-1" />
                  Rechazar
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  {isApproving ? (
                    <IconLoader size={16} className="inline mr-1 animate-spin" />
                  ) : (
                    <IconCheck size={16} className="inline mr-1" />
                  )}
                  Aprobar
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
