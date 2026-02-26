/**
 * DocumentosSection - HP-295
 * Seccion de documentos del expediente con upload drag & drop
 * Estados: pendiente, aprobado, rechazado, reemplazado
 * Flujo: presigned URL -> upload directo -> confirmar
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  IconLoader,
  IconRefresh,
  IconUpload,
  IconFileText,
  IconImage,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconTrash,
  IconDownload,
  IconEye,
} from '@/components/icons'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { documentoService } from '@/services/documentoService'
import type {
  IDocumento,
  ITipoDocumento,
  EstadoDocumento,
  UploadStatus,
} from '@/types/documento'

// ============================================
// Helpers
// ============================================

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getEstadoBadgeClass(estado: EstadoDocumento): string {
  switch (estado) {
    case 'aprobado':
      return 'bg-green-100 text-green-700'
    case 'rechazado':
      return 'bg-red-100 text-red-700'
    case 'pendiente':
      return 'bg-yellow-100 text-yellow-700'
    case 'reemplazado':
      return 'bg-gray-100 text-gray-500'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function getEstadoLabel(estado: EstadoDocumento): string {
  switch (estado) {
    case 'aprobado':
      return 'Aprobado'
    case 'rechazado':
      return 'Rechazado'
    case 'pendiente':
      return 'Pendiente'
    case 'reemplazado':
      return 'Reemplazado'
    default:
      return estado
  }
}

function getAcceptedFormatsText(formatos: string[]): string {
  return formatos
    .map((f) => {
      const parts = f.split('/')
      return parts[1]?.toUpperCase() || f
    })
    .join(', ')
}

// ============================================
// Types
// ============================================

interface DocumentCardState {
  tipoDocumento: ITipoDocumento
  documento: IDocumento | null
  status: UploadStatus
  progress: number
  error: string | null
  file: File | null
}

// ============================================
// DocumentUploadCard subcomponent
// ============================================

interface DocumentUploadCardProps {
  state: DocumentCardState
  expedienteId: string
  onUploadStart: (tipoId: string, file: File) => void
  onUploadComplete: (tipoId: string, documento: IDocumento) => void
  onUploadError: (tipoId: string, error: string) => void
  onDelete: (documento: IDocumento) => void
}

function DocumentUploadCard({
  state,
  expedienteId,
  onUploadStart,
  onUploadComplete,
  onUploadError,
  onDelete,
}: DocumentUploadCardProps) {
  const { tipoDocumento, documento, status, progress, error } = state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const hasDocument = documento && documento.estado !== 'reemplazado'
  const canUpload = !hasDocument || documento?.estado === 'rechazado'
  const isUploading = status === 'uploading'

  // Download handler - fetches file and triggers download
  const handleDownload = async () => {
    if (!documento?.archivo_url || isDownloading) return

    setIsDownloading(true)
    try {
      const response = await fetch(documento.archivo_url)
      if (!response.ok) throw new Error('Error al descargar')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = documento.nombre_original
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      toast.error('Error al descargar el archivo')
    } finally {
      setIsDownloading(false)
    }
  }

  // File validation and upload
  const handleFile = useCallback(
    async (file: File) => {
      const validationError = documentoService.validateFile(file, tipoDocumento)
      if (validationError) {
        onUploadError(tipoDocumento.id, validationError)
        return
      }

      onUploadStart(tipoDocumento.id, file)

      try {
        const newDoc = await documentoService.uploadDocument(
          expedienteId,
          tipoDocumento.id,
          file,
          (prog) => {
            // Progress is handled through state updates
          }
        )
        onUploadComplete(tipoDocumento.id, newDoc)
        toast.success(`${tipoDocumento.nombre} subido correctamente`)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error al subir el archivo'
        onUploadError(tipoDocumento.id, message)
        toast.error(message)
      }
    },
    [expedienteId, tipoDocumento, onUploadStart, onUploadComplete, onUploadError]
  )

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (canUpload && !isUploading) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    if (!canUpload || isUploading) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  // File input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Click to upload
  const handleClick = () => {
    if (canUpload && !isUploading && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const isImage = documento?.tipo_mime?.startsWith('image/')
  const isPdf = documento?.tipo_mime === 'application/pdf'
  const canPreview = isImage || isPdf

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            {tipoDocumento.nombre}
          </span>
          {tipoDocumento.es_obligatorio && (
            <span className="text-xs text-red-500">*Obligatorio</span>
          )}
        </div>
        {hasDocument && documento && (
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${getEstadoBadgeClass(
              documento.estado
            )}`}
          >
            {getEstadoLabel(documento.estado)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Show existing document info */}
        {hasDocument && documento ? (
          <div className="space-y-3">
            {/* Document info */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                {isImage ? (
                  <IconImage size={24} className="text-gray-600" />
                ) : (
                  <IconFileText size={24} className="text-gray-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {documento.nombre_original}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(documento.tamano_bytes)} • v{documento.version}
                </p>
              </div>
            </div>

            {/* Rejection reason */}
            {documento.estado === 'rechazado' && documento.motivo_rechazo && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                <IconAlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-red-700">Motivo del rechazo:</p>
                  <p className="text-xs text-red-600">{documento.motivo_rechazo}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              {canPreview && (
                <button
                  onClick={() => setShowPreview(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <IconEye size={14} />
                  Ver
                </button>
              )}
              {documento.archivo_url && (
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {isDownloading ? (
                    <IconLoader size={14} className="animate-spin" />
                  ) : (
                    <IconDownload size={14} />
                  )}
                  {isDownloading ? 'Descargando...' : 'Descargar'}
                </button>
              )}
              {documento.estado === 'pendiente' && (
                <button
                  onClick={() => onDelete(documento)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors ml-auto"
                >
                  <IconTrash size={14} />
                  Eliminar
                </button>
              )}
            </div>

            {/* Reupload button for rejected */}
            {documento.estado === 'rechazado' && (
              <button
                onClick={handleClick}
                disabled={isUploading}
                className="w-full mt-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <IconUpload size={16} />
                Subir nuevo documento
              </button>
            )}
          </div>
        ) : (
          /* Upload zone */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${isDragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}
              ${isUploading ? 'pointer-events-none opacity-70' : ''}
              ${error ? 'border-red-300 bg-red-50' : ''}
            `}
          >
            {isUploading ? (
              <div className="space-y-3">
                <IconLoader size={32} className="mx-auto text-primary-600 animate-spin" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Subiendo...</p>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{progress}%</p>
                </div>
              </div>
            ) : error ? (
              <div className="space-y-2">
                <IconX size={32} className="mx-auto text-red-500" />
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClick()
                  }}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  Intentar de nuevo
                </button>
              </div>
            ) : (
              <>
                <IconUpload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-900">
                  Arrastra un archivo o haz clic para seleccionar
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Formatos: {getAcceptedFormatsText(tipoDocumento.formatos_aceptados)}
                </p>
                <p className="text-xs text-gray-500">
                  Max: {tipoDocumento.tamano_maximo_mb}MB
                </p>
              </>
            )}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={tipoDocumento.formatos_aceptados.join(',')}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Preview modal (simple implementation) */}
      {showPreview && documento && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 z-10"
            >
              <IconX size={20} />
            </button>
            {isImage && documento.archivo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={documento.archivo_url}
                alt={documento.nombre_original}
                className="max-w-full max-h-[85vh] object-contain"
              />
            )}
            {isPdf && documento.archivo_url && (
              <iframe
                src={documento.archivo_url}
                className="w-[800px] h-[80vh]"
                title={documento.nombre_original}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Main component
// ============================================

export interface DocumentosSectionProps {
  expedienteId: string
}

export function DocumentosSection({ expedienteId }: DocumentosSectionProps) {
  // State
  const [tiposDocumento, setTiposDocumento] = useState<ITipoDocumento[]>([])
  const [documentos, setDocumentos] = useState<IDocumento[]>([])
  const [cardStates, setCardStates] = useState<Map<string, DocumentCardState>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<IDocumento | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ============================================
  // Fetch data
  // ============================================

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch tipos and documentos in parallel
      const [tipos, docsResult] = await Promise.all([
        documentoService.getTiposDocumento(),
        documentoService.getDocumentosByExpediente(expedienteId, { limit: 100 }),
      ])

      setTiposDocumento(tipos)
      setDocumentos(docsResult.documentos)

      // Initialize card states
      const states = new Map<string, DocumentCardState>()
      tipos.forEach((tipo) => {
        // Find the most recent non-replaced document for this type
        const tipoDoc = docsResult.documentos.find(
          (d) => d.tipo_documento_id === tipo.id && d.estado !== 'reemplazado'
        )
        states.set(tipo.id, {
          tipoDocumento: tipo,
          documento: tipoDoc || null,
          status: 'idle',
          progress: 0,
          error: null,
          file: null,
        })
      })
      setCardStates(states)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al cargar documentos'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [expedienteId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ============================================
  // Upload handlers
  // ============================================

  const handleUploadStart = useCallback((tipoId: string, file: File) => {
    setCardStates((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(tipoId)
      if (current) {
        newMap.set(tipoId, {
          ...current,
          status: 'uploading',
          progress: 0,
          error: null,
          file,
        })
      }
      return newMap
    })
  }, [])

  const handleUploadComplete = useCallback((tipoId: string, documento: IDocumento) => {
    setCardStates((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(tipoId)
      if (current) {
        newMap.set(tipoId, {
          ...current,
          documento,
          status: 'success',
          progress: 100,
          error: null,
          file: null,
        })
      }
      return newMap
    })
    setDocumentos((prev) => [documento, ...prev])
  }, [])

  const handleUploadError = useCallback((tipoId: string, error: string) => {
    setCardStates((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(tipoId)
      if (current) {
        newMap.set(tipoId, {
          ...current,
          status: 'error',
          progress: 0,
          error,
          file: null,
        })
      }
      return newMap
    })
  }, [])

  // ============================================
  // Delete handler
  // ============================================

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || isDeleting) return

    setIsDeleting(true)
    const toDelete = deleteTarget
    setDeleteTarget(null)

    try {
      await documentoService.deleteDocumento(toDelete.id)

      // Update card state
      setCardStates((prev) => {
        const newMap = new Map(prev)
        const current = newMap.get(toDelete.tipo_documento_id)
        if (current) {
          newMap.set(toDelete.tipo_documento_id, {
            ...current,
            documento: null,
            status: 'idle',
            progress: 0,
            error: null,
          })
        }
        return newMap
      })

      // Remove from documentos list
      setDocumentos((prev) => prev.filter((d) => d.id !== toDelete.id))

      toast.success('Documento eliminado')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al eliminar documento'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  // ============================================
  // Progress summary
  // ============================================

  const getProgressSummary = () => {
    const obligatorios = tiposDocumento.filter((t) => t.es_obligatorio)
    const obligatoriosCompletados = obligatorios.filter((t) => {
      const state = cardStates.get(t.id)
      return state?.documento && state.documento.estado !== 'rechazado'
    })

    const totalSubidos = Array.from(cardStates.values()).filter(
      (s) => s.documento && s.documento.estado !== 'rechazado'
    ).length

    return {
      total: tiposDocumento.length,
      subidos: totalSubidos,
      obligatoriosTotal: obligatorios.length,
      obligatoriosCompletados: obligatoriosCompletados.length,
    }
  }

  // ============================================
  // Render
  // ============================================

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Skeleton */}
        <div className="flex items-center justify-between animate-pulse">
          <div className="h-5 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
              <div className="h-24 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <IconAlertTriangle size={48} className="mx-auto text-red-300 mb-4" />
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <IconRefresh size={16} />
          Reintentar
        </button>
      </div>
    )
  }

  const progress = getProgressSummary()

  return (
    <div className="space-y-6">
      {/* Progress summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Documentos del Expediente
          </h3>
          <p className="text-sm text-gray-500">
            Carga los documentos requeridos para el estudio
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="font-medium text-gray-900">
              {progress.subidos} / {progress.total}
            </span>
            <span className="text-gray-500"> subidos</span>
          </div>
          {progress.obligatoriosTotal > 0 && (
            <div
              className={`text-sm ${
                progress.obligatoriosCompletados === progress.obligatoriosTotal
                  ? 'text-green-600'
                  : 'text-yellow-600'
              }`}
            >
              <span className="font-medium">
                {progress.obligatoriosCompletados} / {progress.obligatoriosTotal}
              </span>
              <span> obligatorios</span>
              {progress.obligatoriosCompletados === progress.obligatoriosTotal && (
                <IconCheck size={16} className="inline ml-1" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Document cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from(cardStates.values())
          .sort((a, b) => a.tipoDocumento.orden - b.tipoDocumento.orden)
          .map((state) => (
            <DocumentUploadCard
              key={state.tipoDocumento.id}
              state={state}
              expedienteId={expedienteId}
              onUploadStart={handleUploadStart}
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              onDelete={setDeleteTarget}
            />
          ))}
      </div>

      {tiposDocumento.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <IconFileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-sm">No hay tipos de documento configurados</p>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar documento"
        message={`¿Estas seguro de eliminar "${deleteTarget?.nombre_original}"? Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
