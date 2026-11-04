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

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { expedienteSoportesService, type SoporteListItem, type PresignedUrlInput } from '@/services/expedienteSoportesService'
import type { PropositoSoporte } from '@/types/estudio'
import { IconFileText, IconPlus } from '@/components/icons'
import { SkeletonText } from '@/components/ui/Skeleton'

const PROPOSITO_LABELS: Record<PropositoSoporte, string> = {
  certificacion_laboral: 'Certificación laboral',
  extractos_bancarios: 'Extractos bancarios',
  declaracion_renta: 'Declaración de renta',
  carta_referencia: 'Carta de referencia',
  codeudor: 'Respaldo de un tercero',
  poliza: 'Póliza de arrendamiento',
  otros_soportes: 'Otros soportes',
  // Adenda 5 §7: el candidato lo carga por su enlace; la API no se lo lista ni se lo
  // firma a la inmobiliaria ni al propietario (§10: revela acreedor y monto).
  paz_y_salvo: 'Paz y salvo',
}

// Sin 'paz_y_salvo': lo carga el candidato desde su enlace personal, no desde aquí.
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
  /** Solo los soportes de este propósito (p. ej. 'paz_y_salvo' en el requisito de la Adenda 5). */
  soloProposito?: PropositoSoporte
  /** Lo que se leyó, para que quien monta la sección no lo pida otra vez. */
  onSoportes?: (soportes: SoporteListItem[]) => void
  /** Sube al acreditar o recargar: vuelve a leer la lista. */
  version?: number
}

export function SoportesCondicionadoSection({
  expedienteId,
  permitirSubir,
  soloProposito,
  onSoportes,
  version = 0,
}: SoportesCondicionadoSectionProps) {
  const [soportes, setSoportes] = useState<SoporteListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [proposito, setProposito] = useState<PropositoSoporte>('codeudor')
  const [file, setFile] = useState<File | null>(null)
  // El aviso a quien monta la sección no vuelve a disparar la lectura si cambia la función.
  const avisar = useRef(onSoportes)
  useEffect(() => {
    avisar.current = onSoportes
  }, [onSoportes])

  const fetchSoportes = useCallback(async () => {
    try {
      const todos = await expedienteSoportesService.listar(expedienteId)
      const data = soloProposito ? todos.filter((s) => s.proposito === soloProposito) : todos
      setSoportes(data)
      setFetchError(false)
      avisar.current?.(data)
    } catch {
      // Distinguir "no hay documentos" de "no se pudo consultar": un 429/red
      // aquí mostraba 'el solicitante aún no ha subido documentos' con
      // documentos ya subidos — y el gestor decide con ese dato.
      setSoportes([])
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [expedienteId, soloProposito])

  // `version` vuelve a pedir la lista (p. ej. después de acreditar el paz y salvo).
  useEffect(() => { fetchSoportes() }, [fetchSoportes, version])

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
      toast.error('Seleccione un archivo.')
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
      <div role="status" className="space-y-2">
        <span className="sr-only">Cargando documentos…</span>
        <SkeletonText lineas={2} />
      </div>
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
          {soloProposito === 'paz_y_salvo'
            ? 'El candidato aún no ha cargado el paz y salvo.'
            : permitirSubir
              ? 'Aún no ha subido documentos adicionales.'
              : 'El solicitante aún no ha subido documentos adicionales.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {soportes.map((doc) => (
            <li key={doc.id} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
              <IconFileText size={20} className="text-gray-500 shrink-0 mt-0.5" />
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
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 transition-colors"
        >
          <IconPlus size={16} />
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
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50 transition-colors"
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
