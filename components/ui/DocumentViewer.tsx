/**
 * DocumentViewer - Overlay fullscreen para visualizar documentos
 * Delega a ImageViewer o PdfViewer segun el tipo MIME
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { IconX, IconDownload, IconLoader } from '@/components/icons'
import { ApiClientError } from '@/lib/api'
import { documentoService } from '@/services/documentoService'
import type { IDocumento } from '@/types/documento'
import { ImageViewer } from './ImageViewer'

const PdfViewer = dynamic(
  () => import('./PdfViewer').then((m) => ({ default: m.PdfViewer })),
  { ssr: false }
)

interface DocumentViewerProps {
  documento: IDocumento | null
  isOpen: boolean
  onClose: () => void
}

const PROACTIVE_REFRESH_MS = 13 * 60 * 1000

function getDocumentoErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    switch (error.statusCode) {
      case 404:
        if (error.code === 'STORAGE_FILE_NOT_FOUND') {
          return 'El archivo no se encuentra en el almacenamiento. Puede haber sido eliminado.'
        }
        return 'Documento no encontrado.'
      case 403:
        return 'No tienes permiso para ver este documento.'
      case 0:
        return 'Error de conexion. Verifica tu conexion a internet.'
      default:
        return error.message || 'Error al obtener el documento.'
    }
  }
  return 'Error al obtener la URL del documento.'
}

export function DocumentViewer({ documento, isOpen, onClose }: DocumentViewerProps) {
  const [viewUrl, setViewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  // Fetch view URL when opened
  const fetchViewUrl = useCallback(async (doc: IDocumento) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await documentoService.getViewUrl(doc.id)
      setViewUrl(data.url)
    } catch (err) {
      setError(getDocumentoErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isOpen || !documento) {
      setViewUrl(null)
      setError(null)
      return
    }

    let cancelled = false

    documentoService
      .getViewUrl(documento.id)
      .then((data) => {
        if (!cancelled) {
          setViewUrl(data.url)
          setIsLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(getDocumentoErrorMessage(err))
          setIsLoading(false)
        }
      })

    setIsLoading(true)
    setError(null)

    return () => {
      cancelled = true
    }
  }, [isOpen, documento])

  // Proactive URL refresh before expiry
  useEffect(() => {
    if (!viewUrl || !documento || !isOpen) return

    const timer = setTimeout(async () => {
      try {
        const data = await documentoService.getViewUrl(documento.id)
        setViewUrl(data.url)
      } catch {
        // Silent - lazy cache invalidation is the fallback
      }
    }, PROACTIVE_REFRESH_MS)

    return () => clearTimeout(timer)
  }, [viewUrl, documento, isOpen])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleDownload = useCallback(async () => {
    if (!documento || isDownloading) return
    setIsDownloading(true)
    try {
      const data = await documentoService.getDownloadUrl(documento.id)
      const response = await fetch(data.url)
      if (!response.ok) throw new Error(`Download failed: ${response.status}`)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = data.nombre_original || documento.nombre_original
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      toast.error(getDocumentoErrorMessage(err))
    } finally {
      setIsDownloading(false)
    }
  }, [documento, isDownloading])

  const handleRetry = useCallback(() => {
    if (documento) fetchViewUrl(documento)
  }, [documento, fetchViewUrl])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose]
  )

  if (!isOpen || !documento) return null

  const isImage = documento.tipo_mime?.startsWith('image/') || false
  const isPdf = documento.tipo_mime === 'application/pdf'

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col"
      onClick={handleBackdropClick}
    >
      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/40">
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="text-sm text-white/90 font-medium truncate">
            {documento.nombre_original}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Descargar"
          >
            {isDownloading ? (
              <IconLoader size={16} className="animate-spin" />
            ) : (
              <IconDownload size={16} />
            )}
            <span className="hidden sm:inline">Descargar</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0" onClick={(e) => e.stopPropagation()}>
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <IconLoader size={40} className="text-white/70 animate-spin" />
            <span className="text-sm text-white/60">Cargando documento...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-sm text-red-400">{error}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRetry}
                className="text-sm text-blue-400 hover:text-blue-300 underline"
              >
                Reintentar
              </button>
              <button
                onClick={onClose}
                className="text-sm text-white/60 hover:text-white underline"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {viewUrl && !isLoading && !error && (
          <>
            {isImage && <ImageViewer url={viewUrl} alt={documento.nombre_original} />}
            {isPdf && <PdfViewer url={viewUrl} />}
            {!isImage && !isPdf && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <p className="text-sm text-white/60">
                  Este tipo de archivo no se puede previsualizar
                </p>
                <button
                  onClick={handleDownload}
                  className="text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  Descargar archivo
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
