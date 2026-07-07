/**
 * Hook para manejar el estado del wizard de creacion de expedientes - HP-247
 */

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { IInmueble } from '@/types/inmueble'
import type { ISolicitante, ISolicitanteCreateData } from '@/types/solicitante'
import { solicitanteService } from '@/services/solicitanteService'
import { expedienteService } from '@/services/expedienteService'
import { ApiClientError } from '@/lib/api'

// ============================================
// Tipos del Wizard
// ============================================

export interface WizardStep1Data {
  inmueble: IInmueble | null
  hasActiveExpediente: boolean
}

export interface WizardStep2Data {
  solicitante: ISolicitante | null
  isNewSolicitante: boolean
  formData: ISolicitanteCreateData | null
}

export interface WizardStep3Data {
  notas: string
  analista_id: string
  /** Miembro de la inmobiliaria responsable (multi-tenant Fase 3.1). '' = sin asignar/auto. */
  miembro_responsable_id: string
  /** Nombre legible del miembro responsable (solo para mostrarlo en Confirmación). */
  miembro_responsable_nombre?: string
}

export interface WizardData {
  step1: WizardStep1Data
  step2: WizardStep2Data
  step3: WizardStep3Data
}

export interface WizardErrors {
  step1: Record<string, string>
  step2: Record<string, string>
  step3: Record<string, string>
}

// ============================================
// Estado inicial
// ============================================

const initialStep1: WizardStep1Data = {
  inmueble: null,
  hasActiveExpediente: false,
}

const initialStep2: WizardStep2Data = {
  solicitante: null,
  isNewSolicitante: false,
  formData: null,
}

const initialStep3: WizardStep3Data = {
  notas: '',
  analista_id: '',
  miembro_responsable_id: '',
  miembro_responsable_nombre: '',
}

const initialData: WizardData = {
  step1: initialStep1,
  step2: initialStep2,
  step3: initialStep3,
}

const initialErrors: WizardErrors = {
  step1: {},
  step2: {},
  step3: {},
}

// ============================================
// Validadores
// ============================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Celular colombiano (con o sin +57) — atajo local.
const PHONE_CO_REGEX = /^(\+57)?3\d{9}$/
// Cualquier número internacional en E.164: '+' + código de país + 7 a 14 dígitos.
const PHONE_INTL_REGEX = /^\+\d{8,15}$/

/** Acepta celular CO local (3XXXXXXXXX) o internacional con código de país (+52...). */
function isValidPhone(raw: string): boolean {
  const limpio = raw.replace(/[\s-]/g, '')
  return PHONE_CO_REGEX.test(limpio) || PHONE_INTL_REGEX.test(limpio)
}

function validateStep1(data: WizardStep1Data): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!data.inmueble) {
    errors.inmueble = 'Debe seleccionar un inmueble'
  }

  return errors
}

function validateStep2(data: WizardStep2Data): Record<string, string> {
  const errors: Record<string, string> = {}

  // Si no hay solicitante existente ni es nuevo
  if (!data.solicitante && !data.isNewSolicitante) {
    errors.solicitante = 'Debe buscar o crear un solicitante'
    return errors
  }

  // Si es nuevo solicitante, validar formulario
  if (data.isNewSolicitante && data.formData) {
    const form = data.formData

    if (!form.tipo_persona) {
      errors.tipo_persona = 'Tipo de persona requerido'
    }
    if (!form.nombre?.trim()) {
      errors.nombre = 'Nombre requerido'
    }
    if (!form.apellido?.trim()) {
      errors.apellido = 'Apellido requerido'
    }
    if (!form.tipo_documento) {
      errors.tipo_documento = 'Tipo de documento requerido'
    }
    if (!form.numero_documento?.trim()) {
      errors.numero_documento = 'Numero de documento requerido'
    }
    if (!form.email?.trim()) {
      errors.email = 'Email requerido'
    } else if (!EMAIL_REGEX.test(form.email)) {
      errors.email = 'Email invalido'
    }
    if (!form.telefono?.trim()) {
      errors.telefono = 'Teléfono requerido: a este WhatsApp le llega el enlace para firmar el contrato.'
    } else if (!isValidPhone(form.telefono)) {
      errors.telefono = 'Celular colombiano (3XXXXXXXXX) o internacional con código de país (ej. +52 1234567890)'
    }
  }

  return errors
}

function validateStep3(data: WizardStep3Data): Record<string, string> {
  const errors: Record<string, string> = {}

  if (data.notas && data.notas.length > 5000) {
    errors.notas = 'Las notas no deben exceder 5000 caracteres'
  }

  return errors
}

// ============================================
// Hook principal
// ============================================

export function useExpedienteWizard() {
  const router = useRouter()

  // Estado del wizard
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<WizardData>(initialData)
  const [errors, setErrors] = useState<WizardErrors>(initialErrors)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // 3.1: si el solicitante ya tiene un expediente activo para este inmueble, el
  // backend devuelve el expediente existente para que ofrezcamos "Ver expediente".
  const [existingExpediente, setExistingExpediente] = useState<{ id: string; numero: string | null } | null>(null)

  // ============================================
  // Navegacion
  // ============================================

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= 4) {
      setCurrentStep(step)
    }
  }, [])

  const nextStep = useCallback(() => {
    // Validar paso actual
    let stepErrors: Record<string, string> = {}

    if (currentStep === 1) {
      stepErrors = validateStep1(data.step1)
      setErrors(prev => ({ ...prev, step1: stepErrors }))
    } else if (currentStep === 2) {
      stepErrors = validateStep2(data.step2)
      setErrors(prev => ({ ...prev, step2: stepErrors }))
    } else if (currentStep === 3) {
      stepErrors = validateStep3(data.step3)
      setErrors(prev => ({ ...prev, step3: stepErrors }))
    }

    // Si hay errores, no avanzar
    if (Object.keys(stepErrors).length > 0) {
      return false
    }

    // Avanzar
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1)
      return true
    }
    return false
  }, [currentStep, data])

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  // ============================================
  // Actualizacion de datos
  // ============================================

  const updateStep1 = useCallback((newData: Partial<WizardStep1Data>) => {
    setData(prev => ({
      ...prev,
      step1: { ...prev.step1, ...newData }
    }))
    // Limpiar errores del campo actualizado
    if (newData.inmueble !== undefined) {
      setErrors(prev => ({ ...prev, step1: {} }))
    }
  }, [])

  const updateStep2 = useCallback((newData: Partial<WizardStep2Data>) => {
    setData(prev => ({
      ...prev,
      step2: { ...prev.step2, ...newData }
    }))
  }, [])

  const updateStep2Field = useCallback((field: string, value: unknown) => {
    setData(prev => ({
      ...prev,
      step2: {
        ...prev.step2,
        formData: {
          ...prev.step2.formData,
          [field]: value
        } as ISolicitanteCreateData
      }
    }))
    // Limpiar error del campo
    if (errors.step2[field]) {
      setErrors(prev => {
        const newStep2 = { ...prev.step2 }
        delete newStep2[field]
        return { ...prev, step2: newStep2 }
      })
    }
  }, [errors.step2])

  const updateStep3 = useCallback((newData: Partial<WizardStep3Data>) => {
    setData(prev => ({
      ...prev,
      step3: { ...prev.step3, ...newData }
    }))
    // Limpiar errores
    setErrors(prev => ({ ...prev, step3: {} }))
  }, [])

  // ============================================
  // Validacion
  // ============================================

  const validateCurrentStep = useCallback((): boolean => {
    let stepErrors: Record<string, string> = {}

    if (currentStep === 1) {
      stepErrors = validateStep1(data.step1)
      setErrors(prev => ({ ...prev, step1: stepErrors }))
    } else if (currentStep === 2) {
      stepErrors = validateStep2(data.step2)
      setErrors(prev => ({ ...prev, step2: stepErrors }))
    } else if (currentStep === 3) {
      stepErrors = validateStep3(data.step3)
      setErrors(prev => ({ ...prev, step3: stepErrors }))
    }

    return Object.keys(stepErrors).length === 0
  }, [currentStep, data])

  const canProceed = useCallback((): boolean => {
    if (currentStep === 1) {
      return !!data.step1.inmueble
    }
    if (currentStep === 2) {
      if (data.step2.solicitante) return true
      if (data.step2.isNewSolicitante && data.step2.formData) {
        const form = data.step2.formData
        return !!(
          form.tipo_persona &&
          form.nombre?.trim() &&
          form.apellido?.trim() &&
          form.tipo_documento &&
          form.numero_documento?.trim() &&
          form.email?.trim()
        )
      }
      return false
    }
    if (currentStep === 3) {
      return true // Paso 3 es opcional
    }
    return true
  }, [currentStep, data])

  // ============================================
  // Submit
  // ============================================

  const submitExpediente = useCallback(async (): Promise<string | null> => {
    setIsSubmitting(true)
    setSubmitError(null)
    setExistingExpediente(null)

    try {
      let solicitanteId = data.step2.solicitante?.id

      // Si es nuevo solicitante, crearlo primero. Si el documento ya existía,
      // el backend reutiliza la ficha (3.1) y avisamos al gestor para que
      // verifique los datos y las solicitudes previas de esa persona.
      if (data.step2.isNewSolicitante && data.step2.formData) {
        const newSolicitante = await solicitanteService.createSolicitante(data.step2.formData)
        solicitanteId = newSolicitante.id
        if (newSolicitante.reutilizado) {
          toast.warning(
            'Esta persona ya estaba registrada; reutilizamos su ficha. Revisa sus datos y sus solicitudes previas por si esta es una nueva.',
            { duration: 8000 },
          )
        }
      }

      if (!solicitanteId) {
        throw new Error('No se pudo obtener el ID del solicitante')
      }

      // Crear expediente
      const expediente = await expedienteService.createExpediente({
        inmueble_id: data.step1.inmueble!.id,
        solicitante_id: solicitanteId,
        analista_id: data.step3.analista_id || undefined,
        miembro_responsable_id: data.step3.miembro_responsable_id || undefined,
        notas: data.step3.notas || undefined,
      })

      toast.success('Expediente creado exitosamente')
      router.push(`/expedientes/${expediente.id}`)

      return expediente.id
    } catch (err) {
      let message = 'Error al crear expediente'

      if (err instanceof ApiClientError) {
        // Manejar errores especificos del backend
        if (err.code === 'INMUEBLE_CON_EXPEDIENTE_ACTIVO') {
          message = 'Este inmueble ya tiene un expediente activo. Por favor seleccione otro inmueble.'
        } else {
          message = err.message
        }
        // 3.1: el backend adjunta el expediente activo existente → guardamos su
        // id/numero para ofrecer "Ver expediente" en la confirmación.
        if (err.code === 'EXPEDIENTE_ACTIVO_DUPLICADO') {
          const det = err.details as unknown as { expediente_id?: string; expediente_numero?: string | null } | undefined
          if (det?.expediente_id) {
            setExistingExpediente({ id: det.expediente_id, numero: det.expediente_numero ?? null })
          }
        }
      } else if (err instanceof Error) {
        message = err.message
      }

      setSubmitError(message)
      toast.error(message)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [data, router])

  // ============================================
  // Reset
  // ============================================

  const resetWizard = useCallback(() => {
    setCurrentStep(1)
    setData(initialData)
    setErrors(initialErrors)
    setIsSubmitting(false)
    setSubmitError(null)
    setExistingExpediente(null)
  }, [])

  // ============================================
  // Return
  // ============================================

  return {
    // Estado
    currentStep,
    data,
    errors,
    isSubmitting,
    submitError,
    existingExpediente,

    // Navegacion
    goToStep,
    nextStep,
    prevStep,

    // Actualizacion
    updateStep1,
    updateStep2,
    updateStep2Field,
    updateStep3,

    // Validacion
    validateCurrentStep,
    canProceed,

    // Submit
    submitExpediente,

    // Reset
    resetWizard,
  }
}
