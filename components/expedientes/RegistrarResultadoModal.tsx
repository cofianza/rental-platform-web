/**
 * RegistrarResultadoModal
 * Modal para registrar el resultado de un estudio de riesgo crediticio (irreversible)
 */

'use client'

import { useState, useRef } from 'react'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconLoader, IconUpload, IconFileText, IconX, IconCheck } from '@/components/icons'
import { estudioService } from '@/services/estudioService'
import { PROVEEDOR_LABELS } from '@/components/estudios/constants'
import { formatCurrency } from '@/lib/constants'
import type { IEstudio, IMotivosElegidos, IRegistrarResultadoInput } from '@/types/estudio'
import { useMotivosDecision } from '@/hooks/useMotivosDecision'
import { useUsuarioVista } from '@/components/expedientes/VerComo'
import { CargandoMotivos, LoVeLaInmobiliaria, SelectorMotivos, errorMotivos, motivosParaEnviar } from './SelectorMotivos'

const SIN_MOTIVOS: IMotivosElegidos = { motivos: [] }

interface RegistrarResultadoModalProps {
  isOpen: boolean
  onClose: () => void
  estudio: IEstudio | null
  onSuccess: () => void
}

type ResultadoValue = 'aprobado' | 'rechazado' | 'condicionado'

const RESULTADOS: { value: ResultadoValue; label: string; ayuda: string; color: string; bg: string; border: string }[] = [
  { value: 'aprobado', label: 'Aprobado', ayuda: 'Cumple la política.', color: 'text-green-800', bg: 'bg-green-50', border: 'border-green-600' },
  { value: 'rechazado', label: 'No aprobable', ayuda: 'Pide los motivos.', color: 'text-red-800', bg: 'bg-red-50', border: 'border-red-600' },
  { value: 'condicionado', label: 'Condicionado', ayuda: 'Pide las condiciones.', color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-600' },
]

const MAX_FILE_SIZE = 20 * 1024 * 1024

/** Datos que el prospecto declaró en el formulario de la evaluación. */
interface DatosFormulario {
  nombre_completo?: string
  tipo_documento?: string
  numero_documento?: string
  ingresos_mensuales?: number
}

/** Fila del resumen: sin valor no se pinta, para no dejar guiones sueltos. */
function DatoResumen({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-gray-900">{value}</dd>
    </div>
  )
}

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
  const [fundamento, setFundamento] = useState('')
  const [condiciones, setCondiciones] = useState('')
  // H58/H103: con el catálogo del API, rechazo y condiciones se eligen de una
  // lista; sin él (API anterior), siguen los campos de texto.
  // B11: solo Cofianza decide; a los demás roles el API les responde 403.
  const rol = useUsuarioVista()?.rol
  const { catalogo, cargando: cargandoMotivos } = useMotivosDecision(rol === 'administrador' || rol === 'operador_analista')
  const [motivos, setMotivos] = useState<IMotivosElegidos>(SIN_MOTIVOS)
  // B14: rechazo y condicionado irán con lista, pero el catálogo aún no llega.
  const esperaLista = cargandoMotivos && (resultado === 'rechazado' || resultado === 'condicionado')
  const tipoLista = catalogo && resultado === 'rechazado' ? 'rechazar' : catalogo && resultado === 'condicionado' ? 'condicionar' : null
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
    setFundamento('')
    setCondiciones('')
    setMotivos(SIN_MOTIVOS)
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
    if (esperaLista) return 'Espere a que carguen los motivos.'
    if (tipoLista) {
      const e = catalogo ? errorMotivos(tipoLista, motivos, catalogo) : null
      if (e) return e
    } else if (resultado === 'rechazado' && fundamento.trim().length < 10) {
      return 'El fundamento interno debe tener al menos 10 caracteres'
    }
    if (!tipoLista && resultado === 'rechazado' && motivoRechazo.trim().length < 10) {
      return 'El motivo para la inmobiliaria o el propietario debe tener al menos 10 caracteres'
    }
    if (!tipoLista && resultado === 'condicionado' && condiciones.trim().length < 10) {
      return 'Las condiciones deben tener al menos 10 caracteres'
    }
    if (score && (Number(score) < 0 || Number(score) > 999 || !Number.isInteger(Number(score)))) {
      return 'El puntaje de la central debe ser un número entero entre 0 y 999'
    }
    return null
  }

  const handlePreSubmit = () => {
    if (isSubmitting) return
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
        // Con la lista, el API arma motivo_rechazo, fundamento y condiciones.
        ...(tipoLista && catalogo
          ? motivosParaEnviar(tipoLista, motivos, catalogo)
          : resultado === 'rechazado'
            ? { motivo_rechazo: motivoRechazo.trim(), fundamento: fundamento.trim() }
            : resultado === 'condicionado'
              ? { condiciones: condiciones.trim() }
              : {}),
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
      setError('El archivo no debe superar 20 MB.')
      return
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Solo se admiten archivos PDF.')
      return
    }
    setError(null)
    setArchivo(file)
  }

  if (!estudio) return null

  // El analista decidía aprobado/rechazado/condicionado —irreversible— sin ver
  // nada del caso: tenía que abrir otra pestaña o fiarse de la memoria. Este
  // resumen de solo lectura pone delante lo que el estudio ya sabe.
  const datos = (estudio.datos_formulario ?? {}) as DatosFormulario
  const documento = [datos.tipo_documento, datos.numero_documento].filter(Boolean).join(' ')
  const canon = estudio.canon_evaluado != null ? Number(estudio.canon_evaluado) : null

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Registrar resultado de la evaluación"
        description="Revise el caso y registre el resultado. Una vez registrado no se puede cambiar."
        size="lg"
        footer={
          <div className="space-y-2">
            {error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            )}
            <ModalAcciones>
              <button type="button" onClick={handleClose} disabled={isSubmitting} className={botonModal('secondary')}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePreSubmit}
                disabled={isSubmitting || !resultado || esperaLista}
                aria-busy={isSubmitting || undefined}
                className={botonModal('primary')}
              >
                {isSubmitting ? <IconLoader size={16} className="animate-spin" /> : <IconCheck size={16} />}
                {isSubmitting ? (uploadProgress != null ? 'Subiendo…' : 'Registrando…') : 'Registrar resultado'}
              </button>
            </ModalAcciones>
          </div>
        }
      >
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-3 sm:gap-x-6 sm:p-4">
            <DatoResumen label="Persona evaluada" value={datos.nombre_completo} />
            <DatoResumen label="Documento" value={documento} />
            <DatoResumen
              label="Central de riesgo"
              value={PROVEEDOR_LABELS[estudio.proveedor] ?? estudio.proveedor}
            />
            <DatoResumen
              label="Canon evaluado"
              value={canon != null && Number.isFinite(canon) ? formatCurrency(canon) : null}
            />
            <DatoResumen
              label="Ingresos declarados"
              value={
                typeof datos.ingresos_mensuales === 'number'
                  ? formatCurrency(datos.ingresos_mensuales)
                  : null
              }
            />
            <DatoResumen label="Score actual" value={estudio.score ?? null} />
            {estudio.observaciones && (
              <div className="col-span-2 min-w-0 sm:col-span-3">
                <dt className="text-xs text-gray-500">Observaciones</dt>
                <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-gray-900">{estudio.observaciones}</dd>
              </div>
            )}
          </dl>

          {/* Resultado selector */}
          <div>
            <p id="registrar-resultado-modal-resultado" className="block text-sm font-medium text-gray-700 mb-2">
              Resultado <span className="text-red-600" aria-hidden="true">*</span>
            </p>
            <div role="group" aria-labelledby="registrar-resultado-modal-resultado" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {RESULTADOS.map((r) => {
                const activo = resultado === r.value
                return (
                  <button
                    key={r.value}
                    type="button"
                    
                    aria-pressed={activo}
                    disabled={isSubmitting}
                    onClick={() => {
                      // M3: los motivos de rechazo no pasan a condicionado (ni al revés).
                      if (r.value !== resultado) setMotivos(SIN_MOTIVOS)
                      setResultado(r.value)
                    }}
                    className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 ${
                      activo ? `${r.bg} ${r.border}` : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        activo ? `${r.border} bg-white ${r.color}` : 'border-gray-300 bg-white'
                      }`}
                    >
                      {activo && <IconCheck size={12} />}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${activo ? r.color : 'text-gray-900'}`}>{r.label}</span>
                      <span className="block text-xs text-gray-600">{r.ayuda}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Score */}
          <div>
            <label htmlFor="registrar-resultado-modal-score-opcional-0-999" className="block text-sm font-medium text-gray-700 mb-1">
              Puntaje de la central <span className="text-gray-500">(opcional, 0-999)</span>
            </label>
            <input id="registrar-resultado-modal-score-opcional-0-999"
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
            <LoVeLaInmobiliaria />
            <label htmlFor="registrar-resultado-modal-observaciones-min-10-caracteres" className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones <span className="text-red-600" aria-hidden="true">*</span>
              <span className="text-gray-500 font-normal"> (min. 10 caracteres)</span>
            </label>
            <textarea id="registrar-resultado-modal-observaciones-min-10-caracteres"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              maxLength={3000}
              placeholder="Resumen del análisis y hallazgos relevantes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {observaciones.length}/3000 · Las ven la inmobiliaria o el propietario en el detalle de la evaluación.
            </p>
          </div>

          {esperaLista && <CargandoMotivos />}

          {tipoLista && catalogo && (
            <SelectorMotivos tipo={tipoLista} catalogo={catalogo} value={motivos} onChange={setMotivos} disabled={isSubmitting} />
          )}

          {/* Rechazo (P34): fundamento interno y motivo corto para el gestor (API sin lista) */}
          {!tipoLista && !esperaLista && resultado === 'rechazado' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="registrar-resultado-modal-fundamento" className="block text-sm font-medium text-gray-700 mb-1">
                  Fundamento interno <span className="text-red-600" aria-hidden="true">*</span>
                </label>
                <textarea id="registrar-resultado-modal-fundamento"
                  value={fundamento}
                  onChange={(e) => setFundamento(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Por qué no es aprobable..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">Solo lo ve Cofianza: queda en el historial del estudio.</p>
              </div>
              <div>
                <LoVeLaInmobiliaria />
                <label htmlFor="registrar-resultado-modal-motivo-de-rechazo" className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo para la inmobiliaria o el propietario <span className="text-red-600" aria-hidden="true">*</span>
                </label>
                <textarea id="registrar-resultado-modal-motivo-de-rechazo"
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Ej.: El caso no cumple la política de evaluación de Cofianza."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lo verán en el estudio. Escríbalo corto, sin cifras de las centrales de riesgo ni datos del coarrendatario.
                </p>
              </div>
            </div>
          )}

          {/* Condiciones (API sin lista) */}
          {!tipoLista && !esperaLista && resultado === 'condicionado' && (
            <div>
              <LoVeLaInmobiliaria />
              <label htmlFor="registrar-resultado-modal-condiciones" className="block text-sm font-medium text-gray-700 mb-1">
                Condiciones <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <textarea id="registrar-resultado-modal-condiciones"
                value={condiciones}
                onChange={(e) => setCondiciones(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Especifique las condiciones para la aprobación..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              />
            </div>
          )}

          {/* Certificado PDF upload */}
          <div>
            <label htmlFor="registrar-resultado-certificado" className="block text-sm font-medium text-gray-700 mb-1">
              Certificado PDF <span className="text-gray-500">(opcional, máx. 20 MB)</span>
            </label>
            {!archivo ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex min-h-12 items-center justify-center gap-2 px-4 py-3 border border-dashed border-gray-300 rounded-lg text-sm text-gray-700 hover:border-primary-400 hover:text-primary-700 transition-colors"
              >
                <IconUpload size={18} />
                Seleccionar archivo PDF
              </button>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <IconFileText size={20} className="text-primary-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{archivo.name}</p>
                  <p className="text-xs text-gray-500">
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
                    aria-label={`Quitar ${archivo.name}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-red-700"
                  >
                    <IconX size={16} />
                  </button>
                )}
              </div>
            )}
            <input
              id="registrar-resultado-certificado"
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSubmit}
        title="¿Registrar el resultado?"
        message={`Va a registrar la evaluación como «${RESULTADOS.find((r) => r.value === resultado)?.label ?? resultado}». No se puede deshacer y la evaluación quedará completada.`}
        confirmLabel="Confirmar resultado"
        variant="default"
        isLoading={isSubmitting}
      />
    </>
  )
}
