/**
 * ReEvaluacionSection
 * Seccion para subir documentos soporte y solicitar re-evaluacion
 * Visible solo cuando estudio.estado === 'completado' y resultado in [rechazado, condicionado]
 */

'use client'

import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  IconUpload,
  IconFileText,
  IconLoader,
  IconTrash,
  IconAlertTriangle,
  IconCheck,
  IconEye,
} from '@/components/icons'
import { cn } from '@/lib/utils'
import { estudioService } from '@/services/estudioService'
import type { IEstudio, IDocumentoSoporte, PropositoSoporte, IEstudioHistorial } from '@/types/estudio'

// ============================================
// Constants
// ============================================

const PROPOSITO_LABELS: Record<PropositoSoporte, string> = {
  certificacion_laboral: 'Certificacion laboral',
  extractos_bancarios: 'Extractos bancarios',
  declaracion_renta: 'Declaracion de renta',
  carta_referencia: 'Carta de referencia',
  codeudor: 'Codeudor / avalista',
  poliza: 'Póliza de arrendamiento',
  otros_soportes: 'Otros soportes',
}

const MIME_TYPES_ALLOWED = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_REEVALUACIONES = 2

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ============================================
// Props
// ============================================

interface ReEvaluacionSectionProps {
  estudio: IEstudio
  historial: IEstudioHistorial | null
  onReEvaluacionCreated: (estudio: IEstudio) => void
  onDocumentoAdded: () => void
}

export function ReEvaluacionSection({
  estudio,
  historial,
  onReEvaluacionCreated,
  onDocumentoAdded,
}: ReEvaluacionSectionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [proposito, setProposito] = useState<PropositoSoporte>('certificacion_laboral')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [observaciones, setObservaciones] = useState('')
  const [requesting, setRequesting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Derived state
  const isReevaluable =
    estudio.estado === 'completado' &&
    (estudio.resultado === 'rechazado' || estudio.resultado === 'condicionado')

  if (!isReevaluable) return null

  // Get documents for current estudio from historial
  const currentHistorialItem = historial?.historial.find((h) => h.id === estudio.id)
  const documentosSoporte = currentHistorialItem?.documentos_soporte || []
  const puedeReevaluar = historial?.puede_reevaluar ?? false
  const totalEnCadena = historial?.total_en_cadena ?? 1

  // Check if a child re-evaluation already exists
  const hasChildReeval = historial?.historial.some(
    (h) => h.estudio_padre_id === estudio.id,
  ) ?? false

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!MIME_TYPES_ALLOWED.includes(file.type)) {
      toast.error('Solo se permiten archivos PDF, JPG o PNG')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('El archivo no debe exceder 10MB')
      return
    }
    setSelectedFile(file)
  }

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return

    setUploading(true)
    setUploadProgress(0)

    try {
      // 1. Get presigned URL
      const { signedUrl, storage_key } = await estudioService.getSoportePresignedUrl(estudio.id, {
        nombre_original: selectedFile.name,
        tipo_mime: selectedFile.type,
        tamano_bytes: selectedFile.size,
        proposito,
      })

      // 2. Upload file via XHR
      await estudioService.uploadCertificadoToSignedUrl(signedUrl, selectedFile, (pct) => {
        setUploadProgress(pct)
      })

      // 3. Confirm upload
      await estudioService.confirmarSoporte(estudio.id, {
        storage_key,
        nombre_original: selectedFile.name,
        tipo_mime: selectedFile.type,
        tamano_bytes: selectedFile.size,
        proposito,
      })

      toast.success('Documento soporte subido correctamente')
      setSelectedFile(null)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onDocumentoAdded()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al subir documento'
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }, [selectedFile, proposito, estudio.id, onDocumentoAdded])

  const handleSolicitarReEvaluacion = async () => {
    setRequesting(true)
    try {
      const nuevoEstudio = await estudioService.solicitarReEvaluacion(
        estudio.id,
        observaciones || undefined,
      )
      toast.success('Re-evaluacion solicitada correctamente')
      setShowConfirm(false)
      setObservaciones('')
      onReEvaluacionCreated(nuevoEstudio)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al solicitar re-evaluacion'
      toast.error(msg)
    } finally {
      setRequesting(false)
    }
  }

  const handleViewDoc = async (doc: IDocumentoSoporte) => {
    if (doc.archivo_url) {
      window.open(doc.archivo_url, '_blank')
      return
    }
    toast.info('URL no disponible. Recargue la pagina.')
  }

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div
        className={cn(
          'flex items-start gap-3 p-4 rounded-lg border',
          estudio.resultado === 'rechazado'
            ? 'bg-red-50 border-red-200'
            : 'bg-yellow-50 border-yellow-200',
        )}
      >
        <IconAlertTriangle
          size={20}
          className={estudio.resultado === 'rechazado' ? 'text-red-500 mt-0.5' : 'text-yellow-500 mt-0.5'}
        />
        <div>
          <p className={cn('text-sm font-medium', estudio.resultado === 'rechazado' ? 'text-red-800' : 'text-yellow-800')}>
            Este estudio fue {estudio.resultado === 'rechazado' ? 'rechazado' : 'condicionado'}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Puede subir documentos adicionales para solicitar una re-evaluacion.
            {totalEnCadena > 1 && ` Re-evaluacion ${totalEnCadena - 1} de ${MAX_REEVALUACIONES}.`}
          </p>
        </div>
      </div>

      {/* Documentos soporte lista */}
      {documentosSoporte.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Documentos soporte</h4>
          <div className="space-y-2">
            {documentosSoporte.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <IconFileText size={18} className="text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.nombre_original}</p>
                    <p className="text-xs text-gray-500">
                      {PROPOSITO_LABELS[doc.proposito as PropositoSoporte] || doc.proposito} &middot;{' '}
                      {formatFileSize(doc.tamano_bytes)} &middot; {formatDate(doc.created_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleViewDoc(doc)}
                  className="shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded transition-colors"
                >
                  <IconEye size={14} />
                  Ver
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload section - only show if can still re-evaluate and no child exists */}
      {!hasChildReeval && puedeReevaluar && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Subir documento soporte</h4>

          {/* Proposito selector */}
          <select
            value={proposito}
            onChange={(e) => setProposito(e.target.value as PropositoSoporte)}
            disabled={uploading}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            {Object.entries(PROPOSITO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* File input */}
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <IconUpload size={16} />
              Seleccionar archivo
            </button>
            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <IconFileText size={16} />
                <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                <span className="text-gray-400">({formatFileSize(selectedFile.size)})</span>
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <IconTrash size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Subiendo...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload button */}
          {selectedFile && !uploading && (
            <button
              onClick={handleUpload}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              <IconUpload size={16} />
              Subir documento
            </button>
          )}
        </div>
      )}

      {/* Request re-evaluation button */}
      {!hasChildReeval && puedeReevaluar && (
        <div className="pt-2 border-t border-gray-100">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={documentosSoporte.length === 0}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors',
              documentosSoporte.length > 0
                ? 'text-white bg-primary-600 hover:bg-primary-700'
                : 'text-gray-400 bg-gray-100 cursor-not-allowed',
            )}
          >
            <IconCheck size={16} />
            Solicitar re-evaluacion
          </button>
          {documentosSoporte.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Debe subir al menos un documento soporte antes de solicitar re-evaluacion
            </p>
          )}
        </div>
      )}

      {/* Already has child re-eval */}
      {hasChildReeval && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <IconCheck size={16} className="text-blue-600" />
          <p className="text-sm text-blue-800">
            Ya se solicito una re-evaluacion para este estudio.
          </p>
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => { setShowConfirm(false); setObservaciones('') }}
        onConfirm={handleSolicitarReEvaluacion}
        title="Solicitar re-evaluacion"
        message={`Se creara un nuevo estudio vinculado al actual con los ${documentosSoporte.length} documento(s) soporte adjuntos. Esta accion no se puede deshacer.`}
        confirmLabel="Solicitar"
        isLoading={requesting}
      />
    </div>
  )
}
