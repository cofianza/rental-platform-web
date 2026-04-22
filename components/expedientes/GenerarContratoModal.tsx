'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { IconX, IconLoader } from '@/components/icons'
import { plantillaContratoService } from '@/services/plantillaContratoService'
import { contratoService } from '@/services/contratoService'
import { expedienteService } from '@/services/expedienteService'
import { inmuebleService } from '@/services/inmuebleService'
import type { IPlantillaContrato } from '@/types/plantilla-contrato'

interface GenerarContratoModalProps {
  isOpen: boolean
  expedienteId: string
  onClose: () => void
  onGenerated: () => void
}

export function GenerarContratoModal({
  isOpen,
  expedienteId,
  onClose,
  onGenerated,
}: GenerarContratoModalProps) {
  // Step: 'choose_source' | 'select' | 'variables' | 'generating'
  const [step, setStep] = useState<'choose_source' | 'select' | 'variables' | 'generating'>('choose_source')

  // Detección contrato tipo del inmueble
  const [detectingContratoTipo, setDetectingContratoTipo] = useState(false)
  const [contratoTipoInfo, setContratoTipoInfo] = useState<{
    nombreArchivo: string | null
    tamanoBytes: number | null
  } | null>(null)

  // Plantillas
  const [plantillas, setPlantillas] = useState<IPlantillaContrato[]>([])
  const [isLoadingPlantillas, setIsLoadingPlantillas] = useState(false)
  const [selectedPlantilla, setSelectedPlantilla] = useState<IPlantillaContrato | null>(null)

  // Variables
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [fechaInicio, setFechaInicio] = useState('')
  const [duracionMeses, setDuracionMeses] = useState('12')

  // Generation
  const [isGenerating, setIsGenerating] = useState(false)

  // Load plantillas when modal opens
  const fetchPlantillas = useCallback(async () => {
    setIsLoadingPlantillas(true)
    try {
      const result = await plantillaContratoService.getPlantillas({
        activa: 'true',
        limit: 100,
      })
      setPlantillas(result.data)
    } catch {
      toast.error('Error al cargar plantillas')
    } finally {
      setIsLoadingPlantillas(false)
    }
  }, [])

  // Detectar si el inmueble del expediente tiene contrato tipo subido.
  // Arranca en 'choose_source' y pasa a 'select' directo si no hay PDF (única opción).
  const detectContratoTipo = useCallback(async () => {
    setDetectingContratoTipo(true)
    setContratoTipoInfo(null)
    try {
      const exp = await expedienteService.getExpedienteDetalle(expedienteId)
      const inmuebleId = exp.inmueble?.id
      if (!inmuebleId) {
        setStep('select')
        return
      }
      const inmueble = await inmuebleService.getInmuebleById(inmuebleId)
      if (inmueble.contrato_tipo_storage_key) {
        setContratoTipoInfo({
          nombreArchivo: inmueble.contrato_tipo_nombre_archivo ?? null,
          tamanoBytes: inmueble.contrato_tipo_tamano_bytes ?? null,
        })
        setStep('choose_source')
      } else {
        // Sin PDF → saltar directo al selector de plantilla.
        setStep('select')
      }
    } catch {
      // Si falla la detección, caer al flujo clásico para no bloquear.
      setStep('select')
    } finally {
      setDetectingContratoTipo(false)
    }
  }, [expedienteId])

  useEffect(() => {
    if (isOpen) {
      setStep('choose_source')
      setSelectedPlantilla(null)
      setVariables({})
      setFechaInicio(new Date().toISOString().split('T')[0])
      setDuracionMeses('12')
      setContratoTipoInfo(null)
      detectContratoTipo()
      fetchPlantillas()
    }
  }, [isOpen, detectContratoTipo, fetchPlantillas])

  function handleSelectPlantilla(plantilla: IPlantillaContrato) {
    setSelectedPlantilla(plantilla)
    // Initialize variables from plantilla's variable list
    const vars: Record<string, string> = {}
    for (const v of plantilla.variables || []) {
      vars[v] = ''
    }
    setVariables(vars)
    setStep('variables')
  }

  function handleVariableChange(key: string, value: string) {
    setVariables((prev) => ({ ...prev, [key]: value }))
  }

  async function handleGenerar() {
    if (!selectedPlantilla) return

    setIsGenerating(true)
    setStep('generating')
    try {
      // Filter out empty variables (let backend auto-fill)
      const overrides: Record<string, string> = {}
      for (const [k, v] of Object.entries(variables)) {
        if (v.trim()) overrides[k] = v.trim()
      }

      await contratoService.generarContrato(expedienteId, {
        plantilla_id: selectedPlantilla.id,
        variables: Object.keys(overrides).length > 0 ? overrides : undefined,
        fecha_inicio: fechaInicio || undefined,
        duracion_meses: duracionMeses ? Number(duracionMeses) : undefined,
      })

      toast.success('Contrato generado correctamente')
      onGenerated()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al generar el contrato'
      toast.error(message)
      setStep('variables')
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * Usar el PDF subido por el propietario. Backend detecta que el inmueble
   * tiene contrato_tipo_storage_key y lo copia como contrato del expediente
   * sin compilar plantilla. plantilla_id se omite del payload.
   */
  async function handleUsarContratoTipo() {
    setIsGenerating(true)
    setStep('generating')
    try {
      await contratoService.generarContrato(expedienteId, {
        fecha_inicio: fechaInicio || undefined,
        duracion_meses: duracionMeses ? Number(duracionMeses) : undefined,
      })
      toast.success('Contrato generado desde el PDF del propietario')
      onGenerated()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al generar el contrato'
      toast.error(message)
      setStep('choose_source')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 'choose_source' && 'Origen del contrato'}
            {step === 'select' && 'Seleccionar Plantilla'}
            {step === 'variables' && 'Configurar Variables'}
            {step === 'generating' && 'Generando Contrato...'}
          </h2>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Step 0: Choose source — se muestra cuando el inmueble tiene contrato tipo subido.
              Si no tiene, detectContratoTipo salta directo a 'select'. */}
          {step === 'choose_source' && (
            <div>
              {detectingContratoTipo ? (
                <div className="flex items-center justify-center py-8">
                  <IconLoader size={24} className="animate-spin text-primary-600" />
                </div>
              ) : contratoTipoInfo ? (
                <div className="space-y-5">
                  <p className="text-sm text-gray-600">
                    Este inmueble tiene un contrato tipo subido por el propietario. Elige cómo generar el contrato del expediente:
                  </p>

                  {/* Fechas (aplican a ambas opciones) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
                      <input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duración (meses)</label>
                      <input
                        type="number"
                        value={duracionMeses}
                        onChange={(e) => setDuracionMeses(e.target.value)}
                        min={1}
                        max={120}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Opción A: PDF del propietario */}
                  <button
                    onClick={handleUsarContratoTipo}
                    disabled={isGenerating}
                    className="w-full text-left p-4 border-2 border-primary-300 bg-primary-50/40 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded bg-red-100 flex items-center justify-center shrink-0">
                        <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Usar el PDF del propietario</p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {contratoTipoInfo.nombreArchivo || 'contrato-tipo.pdf'}
                        </p>
                        <p className="text-xs text-primary-700 mt-1 font-medium">Recomendado — se usa tal cual, sin compilar variables.</p>
                      </div>
                    </div>
                  </button>

                  {/* Opción B: plantilla con variables */}
                  <button
                    onClick={() => setStep('select')}
                    disabled={isGenerating}
                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center shrink-0">
                        <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Usar una plantilla de Cofianza</p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          Genera el PDF compilando una plantilla con las variables del expediente.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {/* Step 1: Select plantilla */}
          {step === 'select' && (
            <div>
              {isLoadingPlantillas ? (
                <div className="flex items-center justify-center py-8">
                  <IconLoader size={24} className="animate-spin text-primary-600" />
                </div>
              ) : plantillas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay plantillas activas disponibles</p>
                  <p className="text-sm mt-1">Crea una plantilla primero en la seccion de Plantillas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-4">
                    Selecciona la plantilla que deseas usar para generar el contrato:
                  </p>
                  {plantillas.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPlantilla(p)}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{p.nombre}</p>
                          {p.descripcion && (
                            <p className="text-sm text-gray-500 mt-0.5">{p.descripcion}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            v{p.version}
                          </span>
                          <span className="text-xs text-gray-500">
                            {p.variables?.length || 0} vars
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Configure variables */}
          {step === 'variables' && selectedPlantilla && (
            <div className="space-y-5">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <span className="font-medium">Plantilla:</span> {selectedPlantilla.nombre}
                <span className="text-gray-500 ml-2">(v{selectedPlantilla.version})</span>
              </div>

              {/* Fecha inicio + duracion */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de inicio
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duracion (meses)
                  </label>
                  <input
                    type="number"
                    value={duracionMeses}
                    onChange={(e) => setDuracionMeses(e.target.value)}
                    min={1}
                    max={120}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  />
                </div>
              </div>

              {/* Variables */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Variables de la plantilla
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Los campos vacios se llenaran automaticamente con datos del expediente.
                </p>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {Object.entries(variables).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {`{{${key}}}`}
                      </label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleVariableChange(key, e.target.value)}
                        placeholder="Auto-llenado desde expediente"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={() => setStep('select')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cambiar plantilla
                </button>
                <button
                  onClick={handleGenerar}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Generar Contrato PDF
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Generating */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12">
              <IconLoader size={32} className="animate-spin text-primary-600 mb-4" />
              <p className="text-gray-600">Generando PDF del contrato...</p>
              <p className="text-sm text-gray-400 mt-1">Esto puede tomar unos segundos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
