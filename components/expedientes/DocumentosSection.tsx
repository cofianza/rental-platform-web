/**
 * DocumentosSection - HP-295, HP-327
 * Seccion de documentos del expediente: una lista con una fila por tipo de
 * documento (estado, archivo, ver, cargar, eliminar y, para Cofianza, aprobar o
 * rechazar). La revisión vivía en un panel aparte que repetía cada documento.
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
  IconClock,
} from '@/components/icons'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DocumentViewer } from '@/components/ui/DocumentViewer'
import { RechazoModal } from './RechazoModal'
import { SelfieCapture } from './SelfieCapture'
import { SelfieComparisonView } from './SelfieComparisonView'
import { documentoService } from '@/services/documentoService'
import { usePermissions } from '@/hooks/usePermissions'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import type {
  IDocumento,
  ITipoDocumento,
  EstadoDocumento,
  UploadStatus,
  IVersionEntry,
  IDocumentoMetadatos,
} from '@/types/documento'
import { Skeleton } from '@/components/ui/Skeleton'

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

/** Marca de la fila: el estado se lee en el texto de la pastilla; el ícono y el color lo refuerzan. */
const MARCA_ESTADO: Record<EstadoDocumento | 'sin_cargar', { label: string; chip: string; circulo: string; icono: React.ReactNode }> = {
  aprobado: {
    label: 'Aprobado',
    chip: 'bg-green-100 text-green-800',
    circulo: 'bg-green-100 text-green-700',
    icono: <IconCheck size={16} />,
  },
  pendiente: {
    label: 'Pendiente',
    chip: 'bg-amber-100 text-amber-900',
    circulo: 'bg-amber-100 text-amber-800',
    icono: <IconClock size={16} />,
  },
  rechazado: {
    label: 'Rechazado',
    chip: 'bg-red-100 text-red-800',
    circulo: 'bg-red-100 text-red-700',
    icono: <IconX size={16} />,
  },
  reemplazado: {
    label: 'Reemplazado',
    chip: 'bg-gray-100 text-gray-600',
    circulo: 'bg-gray-100 text-gray-500',
    icono: <IconHistory size={16} />,
  },
  sin_cargar: {
    label: 'Sin cargar',
    chip: 'bg-gray-100 text-gray-700',
    circulo: 'border border-dashed border-gray-300 bg-white text-gray-500',
    icono: <IconUpload size={16} />,
  },
}

function formatFechaRevision(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
    <div className="mt-2">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        className="-ml-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <IconHistory size={14} />
        Historial de versiones
        {isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {isLoading ? (
            <div role="status" className="space-y-2 py-2">
              <span className="sr-only">Cargando versiones…</span>
              <Skeleton className="h-8 w-full rounded" />
              <Skeleton className="h-8 w-full rounded" />
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
// DocumentoFila subcomponent
// ============================================

/**
 * Una fila por tipo de documento: qué es, en qué estado está y qué se puede
 * hacer con él (ver, revisar, cargar, eliminar). Antes cada documento salía
 * dos veces: en una tarjeta de carga y otra vez en el panel de revisión.
 */
interface DocumentoFilaProps {
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
  puedeSubir: boolean
  puedeEliminar: boolean
  /** Analista o administrador: aprueba o rechaza los pendientes desde la fila. */
  puedeRevisar: boolean
  onAprobar: (documento: IDocumento) => void
  onRechazar: (documento: IDocumento) => void
  revisando: boolean
}

const BOTON_FILA =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50'

function DocumentoFila({
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
  puedeSubir,
  puedeEliminar,
  puedeRevisar,
  onAprobar,
  onRechazar,
  revisando,
}: DocumentoFilaProps) {
  const { tipoDocumento, documento, status, progress, error } = state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const hasDocument = documento && documento.estado !== 'reemplazado'
  const canUpload = puedeSubir && (!hasDocument || documento?.estado === 'rechazado')
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
          // Use dedicated replacement flow (D1 CR: pass metadatos)
          newDoc = await documentoService.replaceDocument(
            documento.id,
            file,
            (p) => onUploadProgress(tipoDocumento.id, p),
            metadatos
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

  // Arrastrar y soltar: la fila entera recibe el archivo cuando se puede cargar.
  const handleDragOver = (e: React.DragEvent) => {
    if (!canUpload || isUploading) return
    e.preventDefault()
    setIsDragOver(true)
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

  const handleClick = () => {
    if (canUpload && !isUploading && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const isImage = documento?.tipo_mime?.startsWith('image/')
  const isPdf = documento?.tipo_mime === 'application/pdf'
  const canPreview = isImage || isPdf
  const estado: EstadoDocumento | 'sin_cargar' = hasDocument && documento ? documento.estado : 'sin_cargar'
  const marca = MARCA_ESTADO[estado] ?? MARCA_ESTADO.sin_cargar
  const formatos = `${getAcceptedFormatsText(tipoDocumento.formatos_aceptados)} · máx. ${tipoDocumento.tamano_maximo_mb} MB`

  return (
    <li
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex gap-3 px-4 py-4 transition-colors sm:px-5',
        isDragOver && 'bg-primary-50 outline-2 -outline-offset-2 outline-dashed outline-primary-500',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', marca.circulo)}
      >
        {marca.icono}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {/* Qué es y en qué estado está */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h4 className="text-sm font-semibold text-gray-900">{tipoDocumento.nombre}</h4>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', marca.chip)}>
                {estado === 'pendiente' ? 'Pendiente de revisión' : marca.label}
              </span>
              {tipoDocumento.es_obligatorio && (
                <span className="text-xs text-gray-500">Obligatorio</span>
              )}
            </div>

            {hasDocument && documento ? (
              <>
                <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-gray-600">
                  {isImage ? (
                    <IconImage size={14} className="shrink-0 text-gray-500" />
                  ) : (
                    <IconFileText size={14} className="shrink-0 text-gray-500" />
                  )}
                  <span className="truncate" title={documento.nombre_original}>{documento.nombre_original}</span>
                  <span className="shrink-0 text-gray-500">
                    · {formatFileSize(documento.tamano_bytes)} · v{documento.version}
                  </span>
                </p>
                {documento.fecha_revision && documento.validador && documento.estado !== 'pendiente' && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    Revisado por {documento.validador.nombre} {documento.validador.apellido} el{' '}
                    {formatFechaRevision(documento.fecha_revision)}
                  </p>
                )}
              </>
            ) : !puedeSubir ? (
              <p className="mt-1 text-xs text-gray-500">Aún no se ha cargado</p>
            ) : !isUploading && !error ? (
              <p className="mt-1 text-xs text-gray-500">
                <span className="hidden sm:inline">Arrastre el archivo a esta fila o selecciónelo. </span>
                {formatos}
              </p>
            ) : null}
          </div>

          {/* Qué se puede hacer */}
          {!isUploading && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {puedeEliminar && documento?.estado === 'pendiente' && (
                <button
                  type="button"
                  onClick={() => onDelete(documento)}
                  aria-label={`Eliminar ${documento.nombre_original}`}
                  className={cn(BOTON_FILA, 'text-red-700 hover:bg-red-50')}
                >
                  <IconTrash size={16} />
                  Eliminar
                </button>
              )}
              {hasDocument && documento && canPreview && (
                <button
                  type="button"
                  onClick={() => onView(documento)}
                  aria-label={`Ver ${tipoDocumento.nombre}`}
                  className={cn(BOTON_FILA, 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50')}
                >
                  <IconEye size={16} />
                  Ver
                </button>
              )}
              {puedeRevisar && documento?.estado === 'pendiente' && (
                <>
                  <button
                    type="button"
                    onClick={() => onRechazar(documento)}
                    disabled={revisando}
                    aria-label={`Rechazar ${tipoDocumento.nombre}`}
                    className={cn(BOTON_FILA, 'border border-red-200 bg-white text-red-700 hover:bg-red-50')}
                  >
                    <IconX size={16} />
                    Rechazar
                  </button>
                  <button
                    type="button"
                    onClick={() => onAprobar(documento)}
                    disabled={revisando}
                    aria-label={`Aprobar ${tipoDocumento.nombre}`}
                    className={cn(BOTON_FILA, 'bg-primary-700 font-semibold text-white hover:bg-primary-800')}
                  >
                    <IconCheck size={16} />
                    Aprobar
                  </button>
                </>
              )}
              {/* Sin archivo, o rechazado: cargarlo (de nuevo). La selfie ofrece primero la cámara. */}
              {canUpload && !error && (
                isSelfieType ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCameraClick}
                      className={cn(BOTON_FILA, 'bg-primary-700 font-semibold text-white hover:bg-primary-800')}
                    >
                      <IconCamera size={16} />
                      {hasDocument ? 'Tomar nueva selfie' : 'Tomar selfie'}
                    </button>
                    <button
                      type="button"
                      onClick={handleClick}
                      className={cn(BOTON_FILA, 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50')}
                    >
                      <IconUpload size={16} />
                      Subir imagen
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleClick}
                    className={cn(
                      BOTON_FILA,
                      hasDocument
                        ? 'bg-primary-700 font-semibold text-white hover:bg-primary-800'
                        : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    <IconUpload size={16} />
                    {hasDocument ? 'Cargar de nuevo' : 'Seleccionar archivo'}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Motivo del rechazo */}
        {documento?.estado === 'rechazado' && documento.motivo_rechazo && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2">
            <IconAlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
            <p className="text-sm text-red-800">
              <span className="font-medium">Motivo del rechazo:</span> {documento.motivo_rechazo}
            </p>
          </div>
        )}
        {puedeRevisar && documento?.estado === 'rechazado' && (
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500">
            <IconClock size={14} />
            Esperando que se cargue una versión nueva
          </p>
        )}

        {/* Cargando */}
        {isUploading && (
          <div className="mt-3" role="status">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <IconLoader size={14} className="animate-spin text-primary-700" />
                Subiendo…
              </span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-200">
              <div
                className="h-1.5 rounded-full bg-primary-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error al cargar */}
        {error && !isUploading && (
          <div role="alert" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-red-50 px-3 py-2">
            <p className="flex-1 text-sm text-red-800">{error}</p>
            <button
              type="button"
              onClick={handleClick}
              className={cn(BOTON_FILA, 'border border-red-200 bg-white text-red-700 hover:bg-red-100')}
            >
              <IconRefresh size={16} />
              Intentar de nuevo
            </button>
          </div>
        )}

        {/* Version history panel */}
        {hasDocument && documento && (documento.version > 1 || documento.estado === 'rechazado') && (
          <VersionHistoryPanel key={documento.id} documentoId={documento.id} />
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={tipoDocumento.formatos_aceptados.join(',')}
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
    </li>
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
  // Solo se ofrece lo que el API permite (P19): subir con documentos:create y
  // eliminar lo que el listado marca `eliminable` (la regla de estado y de
  // dueño vive en el API). Antes la tarjeta ofrecía las dos cosas a todos y el
  // intento terminaba en un 403.
  const { canAccess } = usePermissions()
  const puedeEditar = usePuedeEditar()
  const puedeSubir = puedeEditar && canAccess('documentos', 'create')

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

  // Revisión (analista o administrador): aprobar con confirmación, rechazar con motivo.
  const puedeRevisar = userRole === 'administrador' || userRole === 'operador_analista'
  const [aprobarTarget, setAprobarTarget] = useState<IDocumento | null>(null)
  const [isAprobando, setIsAprobando] = useState(false)
  const [rechazarTarget, setRechazarTarget] = useState<IDocumento | null>(null)
  const [isRechazando, setIsRechazando] = useState(false)

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
  // D2 CR: Added try/catch with toast.error()
  const handleComparisonApprove = useCallback(async (documentoId: string) => {
    try {
      await documentoService.aprobarDocumento(documentoId)
      toast.success('Selfie aprobada')
      fetchData() // Refresh documents
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al aprobar selfie'
      toast.error(message)
      throw err // Re-throw so SelfieComparisonView can handle it
    }
  }, [fetchData])

  const handleComparisonReject = useCallback(async (documentoId: string, motivo: string) => {
    try {
      await documentoService.rechazarDocumento(documentoId, motivo)
      toast.success('Selfie rechazada')
      fetchData() // Refresh documents
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al rechazar selfie'
      toast.error(message)
      throw err // Re-throw so SelfieComparisonView can handle it
    }
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
      toast.success('Documento eliminado')

      // Re-fetch all data so the card shows the correct state.
      // If this was a replacement (v2+), the backend reverted the original
      // to 'rechazado' — fetchData will pick it up and show "Resubir documento".
      await fetchData()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al eliminar documento'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  // ============================================
  // Revisión: aprobar / rechazar desde la fila del documento
  // ============================================

  const handleAprobar = async () => {
    if (!aprobarTarget || isAprobando) return

    setIsAprobando(true)
    const target = aprobarTarget
    setAprobarTarget(null)

    try {
      await documentoService.aprobarDocumento(target.id)
      toast.success(`"${target.nombre_original}" aprobado`)
      // Se espera la recarga antes de soltar el botón: si no, la fila sigue
      // «Pendiente de revisión» un instante y un segundo clic da error.
      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al aprobar')
    } finally {
      setIsAprobando(false)
    }
  }

  const handleRechazar = async (motivo: string) => {
    if (!rechazarTarget || isRechazando) return

    setIsRechazando(true)
    const target = rechazarTarget

    try {
      await documentoService.rechazarDocumento(target.id, motivo)
      toast.success(`"${target.nombre_original}" rechazado`)
      setRechazarTarget(null)
      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al rechazar')
    } finally {
      setIsRechazando(false)
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

    const porRevisar = Array.from(cardStates.values()).filter(
      (s) => s.documento?.estado === 'pendiente'
    ).length
    const rechazados = Array.from(cardStates.values()).filter(
      (s) => s.documento?.estado === 'rechazado'
    ).length

    return {
      total: tiposDocumento.length,
      subidos: totalSubidos,
      porRevisar,
      rechazados,
      obligatoriosTotal: obligatorios.length,
      obligatoriosCompletados: obligatoriosCompletados.length,
    }
  }

  // ============================================
  // Render
  // ============================================

  // Esqueleto solo en la primera carga: en las recargas (aprobar, rechazar,
  // subir) la lista sigue a la vista y no se pierde el lugar.
  if (isLoading && tiposDocumento.length === 0) {
    return (
      <div role="status" className="space-y-4">
        <span className="sr-only">Cargando documentos…</span>
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3 px-4 py-4 sm:px-5">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert" className="py-8 text-center">
        <IconAlertTriangle size={32} className="mx-auto mb-3 text-red-500" />
        <p className="mb-4 text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={fetchData}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <IconRefresh size={16} />
          Reintentar
        </button>
      </div>
    )
  }

  const progress = getProgressSummary()
  const obligatoriosListos =
    progress.obligatoriosTotal > 0 && progress.obligatoriosCompletados === progress.obligatoriosTotal

  return (
    <div className="space-y-4">
      {/* Encabezado: cuánto falta y, para Cofianza, cuánto hay por revisar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">Documentos del estudio</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
            {progress.obligatoriosTotal > 0 && (
              <span className={cn('inline-flex items-center gap-1', obligatoriosListos ? 'text-green-800' : 'text-gray-700')}>
                {obligatoriosListos && <IconCheck size={16} aria-hidden="true" />}
                <span className="font-semibold tabular-nums">
                  {progress.obligatoriosCompletados} de {progress.obligatoriosTotal}
                </span>{' '}
                obligatorios cargados
              </span>
            )}
            <span className="tabular-nums">
              {progress.subidos} de {progress.total} en total
            </span>
            {puedeRevisar && progress.porRevisar > 0 && (
              <span className="font-medium text-amber-900">
                <span className="tabular-nums">{progress.porRevisar}</span> por revisar
              </span>
            )}
            {progress.rechazados > 0 && (
              <span className="text-red-800">
                <span className="tabular-nums">{progress.rechazados}</span> rechazado{progress.rechazados === 1 ? '' : 's'}
              </span>
            )}
          </p>
        </div>

        {/* HP-327: comparar la selfie con el documento (solo Cofianza) */}
        {puedeRevisar && canShowComparison() && (
          <button
            type="button"
            onClick={() => setShowComparison(true)}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <IconCompare size={18} />
            Comparar selfie con el documento
          </button>
        )}
      </div>

      {/* Una fila por tipo de documento */}
      {tiposDocumento.length > 0 ? (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {Array.from(cardStates.values())
            .sort((a, b) => a.tipoDocumento.orden - b.tipoDocumento.orden)
            .map((state) => (
              <DocumentoFila
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
                puedeSubir={puedeSubir}
                puedeEliminar={puedeEditar && state.documento?.eliminable === true}
                puedeRevisar={puedeRevisar}
                onAprobar={setAprobarTarget}
                onRechazar={setRechazarTarget}
                revisando={isAprobando || isRechazando}
              />
            ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-gray-600">
          <IconFileText size={32} className="mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No hay tipos de documento configurados</p>
        </div>
      )}

      {/* Aprobar: confirmación */}
      <ConfirmDialog
        isOpen={!!aprobarTarget}
        onClose={() => setAprobarTarget(null)}
        onConfirm={handleAprobar}
        title="Aprobar documento"
        message={`¿Confirma que el documento "${aprobarTarget?.nombre_original}" cumple con los requisitos?`}
        confirmLabel="Aprobar"
        isLoading={isAprobando}
      />

      {/* Rechazar: pide el motivo */}
      <RechazoModal
        isOpen={!!rechazarTarget}
        onClose={() => setRechazarTarget(null)}
        onConfirm={handleRechazar}
        documentoNombre={rechazarTarget?.nombre_original ?? ''}
        isLoading={isRechazando}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar documento"
        message={`¿Está seguro de eliminar "${deleteTarget?.nombre_original}"? Esta acción no se puede deshacer.`}
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
