/**
 * RegistrarResultadoModal
 * Modal para registrar el resultado de un estudio de riesgo crediticio (irreversible)
 */

'use client'

import { useState, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconLoader, IconUpload, IconFileText, IconX, IconCheck } from '@/components/icons'
import { estudioService } from '@/services/estudioService'
import type { IEstudio, IRegistrarResultadoInput } from '@/types/estudio'

interface RegistrarResultadoModalProps {
  isOpen: boolean
  onClose: () => void
  estudio: IEstudio | null
  onSuccess: () => void
}

type ResultadoValue = 'aprobado' | 'rechazado' | 'condicionado'

const RESULTADOS: { value: ResultadoValue; label: string; color: string; bg: string; border: string }[] = [
  { value: 'aprobado', label: 'Aprobado', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-500 ring-green-200' },
  { value: 'rechazado', label: 'Rechazado', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-500 ring-red-200' },
  { value: 'condicionado', label: 'Condicionado', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-500 ring-yellow-200' },
]

const MAX_FILE_SIZE = 20 * 1024 * 1024

export function RegistrarResultadoModal({
  isOpen,
  onClose,
  estudio,
  onSuccess,
}: RegistrarResultadoModalProps) {
  const [resultado, setResultado] = useState<ResultadoValue | null>(null)
  const [score, setScore] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [condiciones, setCondiciones] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setResultado(null)
    setScore('')
    setObservaciones('')
    setMotivoRechazo('')
    setCondiciones('')
    setArchivo(null)
    setUploadProgress(null)
    setIsSubmitting(false)
    setShowConfirm(false)
    setError(null)
  }

  const handleClose = () => {
    if (isSubmitting) return
    resetForm()
    onClose()
  }

  const validate = (): string | null => {
    if (!resultado) return 'Debe seleccionar un resultado'
    if (observaciones.trim().length < 10) return 'Las observaciones deben tener al menos 10 caracteres'
    if (resultado === 'rechazado' && motivoRechazo.trim().length < 10) {
      return 'El motivo de rechazo debe tener al menos 10 caracteres'
    }
    if (resultado === 'condicionado' && condiciones.trim().length < 10) {
      return 'Las condiciones deben tener al menos 10 caracteres'
    }
    if (score && (Number(score) < 0 || Number(score) > 999 || !Number.isInteger(Number(score)))) {
      return 'El score debe ser un numero entero entre 0 y 999'
    }
    return null
  }

  const handlePreSubmit = () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setShowConfirm(true)
  }

  const handleSubmit = async () => {
    if (!estudio || !resultado) return
    setShowConfirm(false)
    setIsSubmitting(true)
    setError(null)

    try {
      let storageKey: string | undefined

      // Upload PDF if provided
      if (archivo) {
        setUploadProgress(0)
        const presigned = await estudioService.getCertificadoPresignedUrl(
          estudio.id,
          archivo.name,
          archivo.size,
        )
        await estudioService.uploadCertificadoToSignedUrl(
          presigned.signed_url,
          archivo,
          setUploadProgress,
        )
        storageKey = presigned.storage_key
        setUploadProgress(100)
      }

      // Register result
      const input: IRegistrarResultadoInput = {
        resultado,
        observaciones: observaciones.trim(),
        ...(score ? { score: Number(score) } : {}),
        ...(resultado === 'rechazado' ? { motivo_rechazo: motivoRechazo.trim() } : {}),
        ...(resultado === 'condicionado' ? { condiciones: condiciones.trim() } : {}),
        ...(storageKey ? { certificado_storage_key: storageKey } : {}),
      }

      await estudioService.registrarResultado(estudio.id, input)
      resetForm()
      onClose()
      onSuccess()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al registrar resultado'
      setError(msg)
    } finally {
      setIsSubmitting(false)
      setUploadProgress(null)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      setError('El archivo no debe superar 20MB')
      return
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Solo se permiten archivos PDF')
      return
    }
    setError(null)
    setArchivo(file)
  }

  if (!estudio) return null

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="Registrar Resultado del Estudio" size="lg">
        <div className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Resultado selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resultado <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {RESULTADOS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setResultado(r.value)}
                  className={`p-3 rounded-lg border-2 text-center font-medium text-sm transition-all ${
                    resultado === r.value
                      ? `${r.bg} ${r.border} ${r.color} ring-2`
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Score <span className="text-gray-400">(opcional, 0-999)</span>
            </label>
            <input
              type="number"
              min={0}
              max={999}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="Ej: 750"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal"> (min. 10 caracteres)</span>
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              maxLength={3000}
              placeholder="Resumen del analisis y hallazgos relevantes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{observaciones.length}/3000</p>
          </div>

          {/* Motivo rechazo (conditional) */}
          {resultado === 'rechazado' && (
            <div>
              <label className="block text-sm font-medium text-red-700 mb-1">
                Motivo de rechazo <span className="text-red-500">*</span>
              </label>
              <textarea
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Explique las razones del rechazo..."
                className="w-full px-3 py-2 border border-red-300 bg-red-50 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              />
            </div>
          )}

          {/* Condiciones (conditional) */}
          {resultado === 'condicionado' && (
            <div>
              <label className="block text-sm font-medium text-yellow-700 mb-1">
                Condiciones <span className="text-red-500">*</span>
              </label>
              <textarea
                value={condiciones}
                onChange={(e) => setCondiciones(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Especifique las condiciones para la aprobacion..."
                className="w-full px-3 py-2 border border-yellow-300 bg-yellow-50 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none"
              />
            </div>
          )}

          {/* Certificado PDF upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Certificado PDF <span className="text-gray-400">(opcional, max 20MB)</span>
            </label>
            {!archivo ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
              >
                <IconUpload size={18} />
                Seleccionar archivo PDF
              </button>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <IconFileText size={20} className="text-primary-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{archivo.name}</p>
                  <p className="text-xs text-gray-400">
                    {(archivo.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {uploadProgress != null ? (
                  <div className="w-20">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-0.5">{uploadProgress}%</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setArchivo(null)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <IconX size={16} />
                  </button>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handlePreSubmit}
              disabled={isSubmitting || !resultado}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <IconLoader size={16} className="animate-spin" />
                  {uploadProgress != null ? 'Subiendo...' : 'Registrando...'}
                </>
              ) : (
                <>
                  <IconCheck size={16} />
                  Registrar resultado
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSubmit}
        title="Confirmar resultado"
        message={`Esta a punto de registrar el estudio como "${resultado}". Esta accion es irreversible y el estudio pasara a estado completado.`}
        confirmLabel="Confirmar resultado"
        variant="default"
        isLoading={isSubmitting}
      />
    </>
  )
}
