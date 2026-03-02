/**
 * SelfieComparisonView - HP-327
 * Vista comparativa lado a lado: Selfie vs Identificacion frontal
 * Para operadores durante la revision de documentos
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
  IconMaximize,
  IconCamera,
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
}

// ============================================
// Image Panel subcomponent
// ============================================

interface ImagePanelProps {
  documento: IDocumento | null
  title: string
  icon: React.ReactNode
  emptyMessage: string
}

function ImagePanel({ documento, title, icon, emptyMessage }: ImagePanelProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5))
  const handleResetZoom = () => setZoom(1)

  const metadatos = documento?.metadatos
  const metodoCapturaLabel = metadatos?.metodo_captura === 'camara'
    ? 'Captura con camara'
    : metadatos?.metodo_captura === 'archivo'
      ? 'Subida de archivo'
      : null

  return (
    <div className="flex-1 flex flex-col bg-gray-900 rounded-lg overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2 text-white">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        {documento && imageUrl && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Reducir"
            >
              <IconZoomOut size={18} />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Ampliar"
            >
              <IconZoomIn size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Image content */}
      <div className="flex-1 relative overflow-auto bg-gray-950">
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
          <div
            className="min-h-full flex items-center justify-center p-4"
            style={{ cursor: zoom > 1 ? 'move' : 'default' }}
          >
            <img
              src={imageUrl}
              alt={title}
              className="max-w-full h-auto transition-transform duration-200"
              style={{ transform: `scale(${zoom})` }}
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
}: SelfieComparisonViewProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Comparacion de Identidad
          </h2>
          <p className="text-sm text-gray-400">
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

      {/* Comparison panels */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Selfie panel */}
        <ImagePanel
          documento={selfieDoc}
          title="Selfie del Solicitante"
          icon={<IconUser size={20} className="text-primary-400" />}
          emptyMessage="No se ha cargado selfie"
        />

        {/* ID Frontal panel */}
        <ImagePanel
          documento={idFrontalDoc}
          title="Identificacion Frontal"
          icon={<IconId size={20} className="text-blue-400" />}
          emptyMessage="No se ha cargado identificacion frontal"
        />
      </div>

      {/* Footer with tips */}
      <div className="px-6 py-4 bg-gray-900 border-t border-gray-800">
        <div className="flex items-start gap-4 text-sm text-gray-400">
          <div className="flex-1">
            <p className="font-medium text-gray-300 mb-1">Puntos a verificar:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Los rasgos faciales coinciden entre ambas imagenes</li>
              <li>La foto del documento no presenta alteraciones visibles</li>
              <li>El selfie fue tomado recientemente (verificar metadatos)</li>
            </ul>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
