/**
 * DocumentosSection - HP-295, HP-327
 * Seccion de documentos del expediente con upload drag & drop
 * Estados: pendiente, aprobado, rechazado, reemplazado
 * Flujo: presigned URL -> upload directo -> confirmar
 * HP-327: Soporte para captura de selfie con camara
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
  IconEye,
  IconHistory,
  IconChevronUp,
  IconChevronDown,
  IconCamera,
  IconCompare,
} from '@/components/icons'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DocumentViewer } from '@/components/ui/DocumentViewer'
import { RevisionPanel } from './RevisionPanel'
import { SelfieCapture } from './SelfieCapture'
import { SelfieComparisonView } from './SelfieComparisonView'
import { documentoService } from '@/services/documentoService'
import type {
  IDocumento,
  ITipoDocumento,
  EstadoDocumento,
  UploadStatus,
  IVersionEntry,
  IDocumentoMetadatos,
} from '@/types/documento'

// HP-327: Codigos de tipos de documento para selfie
const SELFIE_CODIGO = 'selfie_con_id'
const ID_FRONTAL_CODIGO = 'id_frontal'

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
// VersionHistoryPanel subcomponent
// ============================================

function VersionHistoryPanel({ documentoId }: { documentoId: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [versiones, setVersiones] = useState<IVersionEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggle = async () => {
    if (!isExpanded && versiones.length === 0) {
      setIsLoading(true)
      setError(null)
      try {
        const result = await documentoService.getVersiones(documentoId)
        setVersiones(result.versiones)
      } catch {
        setError('Error al cargar historial')
      } finally {
        setIsLoading(false)
      }
    }
    setIsExpanded((prev) => !prev)
  }

  return (
    <div className="mt-3">
      <button
        onClick={handleToggle}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        <IconHistory size={14} />
        Historial de versiones
        {isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {isLoading ? (
            <div className="flex items-center gap-2 py-2">
              <IconLoader size={14} className="animate-spin text-gray-400" />
              <span className="text-xs text-gray-500">Cargando...</span>
            </div>
          ) : error ? (
            <p className="text-xs text-red-500">{error}</p>
          ) : versiones.length === 0 ? (
            <p className="text-xs text-gray-500">Sin historial</p>
          ) : (
            versiones.map((v) => {
              const isCurrent = v.estado !== 'reemplazado' && v.estado !== 'rechazado'
              return (
                <div
                  key={v.id}
                  className={`p-2 rounded-lg border text-xs ${
                    isCurrent
                      ? 'bg-primary-50 border-primary-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-gray-700">v{v.version}</span>
                    <span className={`px-1.5 py-0.5 rounded-full font-medium ${getEstadoBadgeClass(v.estado)}`}>
                      {getEstadoLabel(v.estado)}
                    </span>
                    {isCurrent && (
                      <span className="text-primary-600 font-medium">(actual)</span>
                    )}
                  </div>
                  <div className="mt-1 text-gray-500">
                    <span className="truncate">{v.nombre_original}</span>
                    {' · '}
                    {new Date(v.created_at).toLocaleDateString('es-CO')}
                    {v.subidor && (
                      <span> · {v.subidor.nombre} {v.subidor.apellido}</span>
                    )}
                  </div>
                  {v.estado === 'rechazado' && v.motivo_rechazo && (
                    <p className="mt-1 text-red-600">Motivo: {v.motivo_rechazo}</p>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// DocumentUploadCard subcomponent
// ============================================

interface DocumentUploadCardProps {
  state: DocumentCardState
  expedienteId: string
  onUploadStart: (tipoId: string, file: File) => void
  onUploadComplete: (tipoId: string, documento: IDocumento) => void
  onUploadProgress: (tipoId: string, progress: number) => void
  onUploadError: (tipoId: string, error: string) => void
  onDelete: (documento: IDocumento) => void
  onView: (documento: IDocumento) => void
  onCameraCapture?: (tipoId: string) => void // HP-327
  isSelfieType?: boolean // HP-327
}

function DocumentUploadCard({
  state,
  expedienteId,
  onUploadStart,
  onUploadComplete,
  onUploadProgress,
  onUploadError,
  onDelete,
  onView,
  onCameraCapture,
  isSelfieType = false,
}: DocumentUploadCardProps) {
  const { tipoDocumento, documento, status, progress, error } = state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const hasDocument = documento && documento.estado !== 'reemplazado'
  const canUpload = !hasDocument || documento?.estado === 'rechazado'
  const isUploading = status === 'uploading'

  // HP-327: Camera capture handler
  const handleCameraClick = () => {
    if (onCameraCapture) {
      onCameraCapture(tipoDocumento.id)
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

      // CR HP-327: Enviar metadatos para uploads de archivo (especialmente selfie)
      const metadatos: IDocumentoMetadatos | undefined = isSelfieType ? {
        metodo_captura: 'archivo',
        timestamp_captura: new Date().toISOString(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      } : undefined

      try {
        let newDoc: IDocumento
        if (documento?.estado === 'rechazado') {
          // Use dedicated replacement flow
          newDoc = await documentoService.replaceDocument(
            documento.id,
            file,
            (p) => onUploadProgress(tipoDocumento.id, p)
          )
        } else {
          newDoc = await documentoService.uploadDocument(
            expedienteId,
            tipoDocumento.id,
            file,
            (p) => onUploadProgress(tipoDocumento.id, p),
            metadatos
          )
        }
        onUploadComplete(tipoDocumento.id, newDoc)
        toast.success(`${tipoDocumento.nombre} subido correctamente`)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error al subir el archivo'
        onUploadError(tipoDocumento.id, message)
        toast.error(message)
      }
    },
    [expedienteId, tipoDocumento, documento, isSelfieType, onUploadStart, onUploadComplete, onUploadProgress, onUploadError]
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
                  onClick={() => onView(documento)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <IconEye size={14} />
                  Ver
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
                Resubir documento
              </button>
            )}

            {/* Version history panel */}
            {(documento.version > 1 || documento.estado === 'rechazado') && (
              <VersionHistoryPanel key={documento.id} documentoId={documento.id} />
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
                {/* HP-327: Show camera option for selfie types */}
                {isSelfieType ? (
                  <div className="space-y-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCameraClick()
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <IconCamera size={20} />
                      Tomar selfie con camara
                    </button>
                    <div className="flex items-center gap-2 text-gray-400">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs">o</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <div className="text-center">
                      <IconUpload size={24} className="mx-auto text-gray-400 mb-1" />
                      <p className="text-xs text-gray-500">
                        Subir imagen existente
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <IconUpload size={32} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm font-medium text-gray-900">
                      Arrastra un archivo o haz clic para seleccionar
                    </p>
                  </>
                )}
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

    </div>
  )
}

// ============================================
// Main component
// ============================================

export interface DocumentosSectionProps {
  expedienteId: string
  userRole?: string
  onPendientesChange?: (count: number) => void
}

export function DocumentosSection({ expedienteId, userRole, onPendientesChange }: DocumentosSectionProps) {
  // State
  const [tiposDocumento, setTiposDocumento] = useState<ITipoDocumento[]>([])
  const [documentos, setDocumentos] = useState<IDocumento[]>([])
  const [cardStates, setCardStates] = useState<Map<string, DocumentCardState>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Viewer
  const [viewerDoc, setViewerDoc] = useState<IDocumento | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<IDocumento | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // HP-327: Selfie capture state
  const [showSelfieCapture, setShowSelfieCapture] = useState(false)
  const [selfieTargetTipoId, setSelfieTargetTipoId] = useState<string | null>(null)
  const [isUploadingSelfie, setIsUploadingSelfie] = useState(false)

  // HP-327: Comparison view state
  const [showComparison, setShowComparison] = useState(false)

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

      // Notify parent of pendientes count
      const pendientesCount = docsResult.documentos.filter(
        (d) => d.estado === 'pendiente'
      ).length
      onPendientesChange?.(pendientesCount)

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

  const handleUploadProgress = useCallback((tipoId: string, progress: number) => {
    setCardStates((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(tipoId)
      if (current && current.status === 'uploading') {
        newMap.set(tipoId, { ...current, progress })
      }
      return newMap
    })
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
  // HP-327: Camera capture handlers
  // ============================================

  const handleCameraCapture = useCallback((tipoId: string) => {
    setSelfieTargetTipoId(tipoId)
    setShowSelfieCapture(true)
  }, [])

  const handleSelfieCancel = useCallback(() => {
    setShowSelfieCapture(false)
    setSelfieTargetTipoId(null)
  }, [])

  const handleSelfieCapture = useCallback(async (file: File) => {
    if (!selfieTargetTipoId) return

    setIsUploadingSelfie(true)

    // Prepare metadatos for selfie
    const metadatos: IDocumentoMetadatos = {
      metodo_captura: 'camara',
      timestamp_captura: new Date().toISOString(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    }

    // Update card state
    handleUploadStart(selfieTargetTipoId, file)

    try {
      const documento = await documentoService.uploadDocument(
        expedienteId,
        selfieTargetTipoId,
        file,
        undefined,
        metadatos
      )
      handleUploadComplete(selfieTargetTipoId, documento)
      toast.success('Selfie capturada y subida correctamente')
      setShowSelfieCapture(false)
      setSelfieTargetTipoId(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al subir selfie'
      handleUploadError(selfieTargetTipoId, message)
      toast.error(message)
    } finally {
      setIsUploadingSelfie(false)
    }
  }, [selfieTargetTipoId, expedienteId, handleUploadStart, handleUploadComplete, handleUploadError])

  // HP-327: Get selfie and ID frontal documents for comparison
  const getSelfieDoc = useCallback(() => {
    const selfieType = tiposDocumento.find(t => t.codigo === SELFIE_CODIGO)
    if (!selfieType) return null
    return documentos.find(d => d.tipo_documento_id === selfieType.id && d.estado !== 'reemplazado') || null
  }, [tiposDocumento, documentos])

  const getIdFrontalDoc = useCallback(() => {
    const idType = tiposDocumento.find(t => t.codigo === ID_FRONTAL_CODIGO)
    if (!idType) return null
    return documentos.find(d => d.tipo_documento_id === idType.id && d.estado !== 'reemplazado') || null
  }, [tiposDocumento, documentos])

  // HP-327: Check if comparison is available (both selfie and ID frontal exist)
  const canShowComparison = useCallback(() => {
    return getSelfieDoc() !== null && getIdFrontalDoc() !== null
  }, [getSelfieDoc, getIdFrontalDoc])

  // HP-327 CR: Handlers for approve/reject from comparison view
  const handleComparisonApprove = useCallback(async (documentoId: string) => {
    await documentoService.aprobarDocumento(documentoId)
    toast.success('Selfie aprobado')
    fetchData() // Refresh documents
  }, [fetchData])

  const handleComparisonReject = useCallback(async (documentoId: string, motivo: string) => {
    await documentoService.rechazarDocumento(documentoId, motivo)
    toast.success('Selfie rechazado')
    fetchData() // Refresh documents
  }, [fetchData])

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

      {/* HP-327: Comparison button for operators */}
      {(userRole === 'administrador' || userRole === 'operador_analista') && canShowComparison() && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowComparison(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <IconCompare size={18} />
            Comparar Selfie con ID
          </button>
        </div>
      )}

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
              onUploadProgress={handleUploadProgress}
              onUploadError={handleUploadError}
              onDelete={setDeleteTarget}
              onView={setViewerDoc}
              onCameraCapture={handleCameraCapture}
              isSelfieType={state.tipoDocumento.codigo === SELFIE_CODIGO}
            />
          ))}
      </div>

      {tiposDocumento.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <IconFileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-sm">No hay tipos de documento configurados</p>
        </div>
      )}

      {/* Panel de revision para operadores/admin */}
      {(userRole === 'administrador' || userRole === 'operador_analista') && (
        <RevisionPanel
          expedienteId={expedienteId}
          onRevisionChange={fetchData}
        />
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

      {/* Document viewer */}
      <DocumentViewer
        documento={viewerDoc}
        isOpen={!!viewerDoc}
        onClose={() => setViewerDoc(null)}
      />

      {/* HP-327: Selfie capture modal */}
      {showSelfieCapture && (
        <SelfieCapture
          onCapture={handleSelfieCapture}
          onCancel={handleSelfieCancel}
          isUploading={isUploadingSelfie}
        />
      )}

      {/* HP-327: Comparison view */}
      <SelfieComparisonView
        selfieDoc={getSelfieDoc()}
        idFrontalDoc={getIdFrontalDoc()}
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
        onApprove={handleComparisonApprove}
        onReject={handleComparisonReject}
      />
    </div>
  )
}
