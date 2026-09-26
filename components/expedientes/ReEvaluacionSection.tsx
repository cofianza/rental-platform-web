/**
 * ReEvaluacionSection
 * Seccion para subir documentos soporte y solicitar re-evaluacion
 * Visible solo cuando estudio.estado === 'completado' y resultado === 'rechazado'
 * (P33: es la apelación del no aprobado; el condicionado se resuelve con la
 * revisión manual).
 */

'use client'

import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { MotivoDialog } from '@/components/ui/MotivoDialog'
import {
  IconUpload,
  IconFileText,
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
  certificacion_laboral: 'Certificación laboral',
  extractos_bancarios: 'Extractos bancarios',
  declaracion_renta: 'Declaración de renta',
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
  const [requesting, setRequesting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Todos los hooks van antes de la salida temprana: con el return null
  // primero, si isReevaluable cambiaba con la sección montada React veía
  // un número distinto de hooks entre renders (rules-of-hooks).
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

  // Derived state
  // A4: el no aprobado EFECTIVO — rechazo del buró o condicionado que Cofianza negó.
  const isReevaluable =
    estudio.estado === 'completado' &&
    (estudio.resultado === 'rechazado' ||
      (estudio.resultado === 'condicionado' &&
        estudio.tipo !== 'con_coarrendatario' &&
        estudio.decision_cofianza === 'negado'))

  if (!isReevaluable) return null

  // Get documents for current estudio from historial
  const currentHistorialItem = historial?.historial.find((h) => h.id === estudio.id)
  const documentosSoporte = currentHistorialItem?.documentos_soporte || []
  const puedeReevaluar = historial?.puede_reevaluar ?? false
  const plazoVencido = historial?.plazo_vencido ?? false
  const totalEnCadena = historial?.total_en_cadena ?? 1

  // Check if a child re-evaluation already exists
  const hasChildReeval = historial?.historial.some(
    (h) => h.estudio_padre_id === estudio.id,
  ) ?? false

  // Política §11: 15 días hábiles desde la notificación del rechazo para
  // radicar la apelación (el primer soporte); radicada a tiempo, Cofianza
  // responde en 10 aunque ya haya pasado el día 15. Fechas 'AAAA-MM-DD':
  // al mediodía local para que no se corran un día.
  const dia = (d: string) => formatDate(`${d}T12:00:00`)
  const apelarHasta = historial?.apelar_hasta
  const responderHasta = historial?.responder_hasta
  const avisoPlazo = hasChildReeval
    ? 'Puedes subir documentos adicionales para solicitar una reevaluación.'
    : plazoVencido
      ? `Venció el plazo para apelar${apelarHasta ? ` (${dia(apelarHasta)})` : ''}: son 15 días hábiles desde la notificación del rechazo y no se radicó a tiempo. Para volver a evaluar al solicitante, habilita una evaluación nueva.`
      : responderHasta
        ? `Apelación radicada a tiempo. Cofianza responde a más tardar el ${dia(responderHasta)}; la reevaluación se puede registrar aunque ya haya pasado el día 15.`
        : apelarHasta
          ? `El solicitante puede apelar hasta el ${dia(apelarHasta)} (15 días hábiles desde la notificación del rechazo). Sube los documentos soporte para radicar la apelación.`
          : 'Puedes subir documentos adicionales para solicitar una reevaluación.'

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

  // `false` le dice a MotivoDialog que falló: conserva el fundamento escrito.
  const handleSolicitarReEvaluacion = async (fundamento: string) => {
    setRequesting(true)
    try {
      const nuevoEstudio = await estudioService.solicitarReEvaluacion(estudio.id, fundamento)
      toast.success('Reevaluación solicitada correctamente')
      setShowConfirm(false)
      onReEvaluacionCreated(nuevoEstudio)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al solicitar la reevaluación'
      toast.error(msg)
      return false
    } finally {
      setRequesting(false)
    }
  }

  const handleViewDoc = async (doc: IDocumentoSoporte) => {
    if (doc.archivo_url) {
      window.open(doc.archivo_url, '_blank')
      return
    }
    toast.info('URL no disponible. Recarga la página.')
  }

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg border bg-red-50 border-red-200">
        <IconAlertTriangle size={20} className="text-red-500 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-800">Esta evaluación fue rechazada</p>
          <p className="text-sm text-gray-600 mt-1">
            {avisoPlazo}
            {totalEnCadena > 1 && ` Reevaluación ${totalEnCadena - 1} de ${MAX_REEVALUACIONES}.`}
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
                  <IconFileText size={18} className="text-gray-500 shrink-0" />
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
                <span className="text-gray-500">({formatFileSize(selectedFile.size)})</span>
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="text-gray-500 hover:text-gray-600"
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
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800"
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
                ? 'text-white bg-primary-700 hover:bg-primary-800'
                : 'text-gray-400 bg-gray-100 cursor-not-allowed',
            )}
          >
            <IconCheck size={16} />
            Solicitar reevaluación
          </button>
          {documentosSoporte.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Debes subir al menos un documento soporte antes de solicitar la reevaluación.
            </p>
          )}
        </div>
      )}

      {/* Already has child re-eval */}
      {hasChildReeval && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <IconCheck size={16} className="text-blue-600" />
          <p className="text-sm text-blue-800">
            Ya se solicitó una reevaluación.
          </p>
        </div>
      )}

      {/* Fundamento obligatorio (P33): queda en el historial con tu usuario. */}
      <MotivoDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSolicitarReEvaluacion}
        title="Solicitar reevaluación"
        descripcion={`Se creará una nueva evaluación vinculada a la actual con los ${documentosSoporte.length} documento(s) soporte adjuntos. Esta acción no se puede deshacer.`}
        label="Fundamento de la reevaluación"
        placeholder="Qué aportan los soportes y por qué pueden cambiar el resultado…"
        minLength={10}
        confirmLabel="Solicitar"
        isLoading={requesting}
      />
    </div>
  )
}
