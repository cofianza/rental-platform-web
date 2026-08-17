/**
 * SoportesCondicionadoSection — Lista los documentos soporte subidos al
 * expediente cuando el estudio quedó condicionado.
 *
 * Visible para solicitante (sus propios docs) y propietario (revisa y
 * descarga). Si el caller permite subir, expone botones para hacerlo.
 *
 * Componente reusable montado dentro de SoportesCondicionadoCard
 * (solicitante) y AprobarCondicionadoCard (propietario).
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { expedienteSoportesService, type SoporteListItem, type PresignedUrlInput } from '@/services/expedienteSoportesService'
import type { PropositoSoporte } from '@/types/estudio'

const PROPOSITO_LABELS: Record<PropositoSoporte, string> = {
  certificacion_laboral: 'Certificación laboral',
  extractos_bancarios: 'Extractos bancarios',
  declaracion_renta: 'Declaración de renta',
  carta_referencia: 'Carta de referencia',
  codeudor: 'Codeudor / avalista',
  poliza: 'Póliza de arrendamiento',
  otros_soportes: 'Otros soportes',
}

const PROPOSITO_OPCIONES: PropositoSoporte[] = [
  'codeudor',
  'poliza',
  'certificacion_laboral',
  'extractos_bancarios',
  'declaracion_renta',
  'carta_referencia',
  'otros_soportes',
]

const MIME_VALIDOS = ['application/pdf', 'image/jpeg', 'image/png'] as const
const MAX_BYTES = 10 * 1024 * 1024

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface SoportesCondicionadoSectionProps {
  expedienteId: string
  /** Si true, muestra botón para subir (solicitante); si false, solo lista (propietario / lectura). */
  permitirSubir: boolean
}

export function SoportesCondicionadoSection({
  expedienteId,
  permitirSubir,
}: SoportesCondicionadoSectionProps) {
  const [soportes, setSoportes] = useState<SoporteListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [proposito, setProposito] = useState<PropositoSoporte>('codeudor')
  const [file, setFile] = useState<File | null>(null)

  const fetchSoportes = useCallback(async () => {
    try {
      const data = await expedienteSoportesService.listar(expedienteId)
      setSoportes(data)
      setFetchError(false)
    } catch {
      // Distinguir "no hay documentos" de "no se pudo consultar": un 429/red
      // aquí mostraba 'el solicitante aún no ha subido documentos' con
      // documentos ya subidos — y el gestor decide con ese dato.
      setSoportes([])
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => { fetchSoportes() }, [fetchSoportes])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    if (!f) {
      setFile(null)
      return
    }
    if (!(MIME_VALIDOS as readonly string[]).includes(f.type)) {
      toast.error('Tipo de archivo no permitido. Solo PDF, JPG o PNG.')
      e.target.value = ''
      setFile(null)
      return
    }
    if (f.size > MAX_BYTES) {
      toast.error('Archivo demasiado grande (máximo 10MB).')
      e.target.value = ''
      setFile(null)
      return
    }
    setFile(f)
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Selecciona un archivo.')
      return
    }
    setUploading(true)
    try {
      const presigned = await expedienteSoportesService.presignedUrl(expedienteId, {
        nombre_original: file.name,
        tipo_mime: file.type as PresignedUrlInput['tipo_mime'],
        tamano_bytes: file.size,
        proposito,
      })
      await expedienteSoportesService.uploadToSignedUrl(presigned.signed_url, file)
      await expedienteSoportesService.confirmar(expedienteId, {
        storage_key: presigned.storage_key,
        nombre_original: file.name,
        tipo_mime: file.type as PresignedUrlInput['tipo_mime'],
        tamano_bytes: file.size,
        proposito,
      })
      toast.success('Documento subido correctamente.')
      setShowUploadForm(false)
      setFile(null)
      setProposito('codeudor')
      await fetchSoportes()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al subir el documento.'
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <p className="text-xs text-gray-500">Cargando documentos…</p>
    )
  }

  return (
    <div className="space-y-3">
      {fetchError ? (
        <p className="text-sm text-red-700">
          No se pudieron cargar los documentos.{' '}
          <button type="button" onClick={fetchSoportes} className="underline font-medium">
            Reintentar
          </button>
        </p>
      ) : soportes.length === 0 ? (
        <p className="text-sm text-gray-600 italic">
          {permitirSubir
            ? 'Aún no has subido documentos adicionales.'
            : 'El solicitante aún no ha subido documentos adicionales.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {soportes.map((doc) => (
            <li key={doc.id} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
              <svg className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.nombre_original}</p>
                <p className="text-xs text-gray-500">
                  {PROPOSITO_LABELS[doc.proposito]} · {formatFileSize(doc.tamano_bytes)}
                  {doc.subido_por_nombre && ` · subido por ${doc.subido_por_nombre}`}
                </p>
              </div>
              {doc.archivo_url && (
                <a
                  href={doc.archivo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-medium text-primary-700 hover:text-primary-800 hover:underline"
                >
                  Ver
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {permitirSubir && !showUploadForm && (
        <button
          onClick={() => setShowUploadForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Subir documento
        </button>
      )}

      {permitirSubir && showUploadForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <label htmlFor="soporte-proposito" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de documento <span className="text-red-500">*</span>
            </label>
            <select
              id="soporte-proposito"
              value={proposito}
              onChange={(e) => setProposito(e.target.value as PropositoSoporte)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {PROPOSITO_OPCIONES.map((p) => (
                <option key={p} value={p}>{PROPOSITO_LABELS[p]}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="soporte-archivo" className="block text-sm font-medium text-gray-700 mb-1">
              Archivo <span className="text-red-500">*</span>
            </label>
            <input
              id="soporte-archivo"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            <p className="text-xs text-gray-500 mt-1">PDF, JPG o PNG · máximo 10MB.</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleUpload}
              disabled={uploading || !file}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {uploading ? 'Subiendo…' : 'Subir'}
            </button>
            <button
              onClick={() => {
                setShowUploadForm(false)
                setFile(null)
              }}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
