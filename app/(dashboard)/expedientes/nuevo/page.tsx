/**
 * Pagina de Creacion de Expediente - HP-247
 * Wizard de 4 pasos para crear un nuevo expediente
 */

'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  WizardStepIndicator,
  WizardNavigation,
  Step1InmuebleSelection,
  Step2Solicitante,
  Step3Configuration,
  Step4Confirmation,
} from '@/components/expedientes/wizard'
import { useExpedienteWizard } from '@/hooks/useExpedienteWizard'
import { inmuebleService } from '@/services/inmuebleService'
import { expedienteService } from '@/services/expedienteService'

// useSearchParams en Next.js 16 requiere estar dentro de Suspense para que
// el render bloqueante no rompa el static export. Wrapper minimo.
export default function NuevoExpedientePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <NuevoExpedienteContent />
    </Suspense>
  )
}

function NuevoExpedienteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inmueblePreseleccionId = searchParams.get('inmueble_id')

  const {
    currentStep,
    data,
    errors,
    isSubmitting,
    submitError,
    existingExpediente,
    nextStep,
    prevStep,
    goToStep,
    updateStep1,
    updateStep2,
    updateStep2Field,
    updateStep3,
    canProceed,
    submitExpediente,
  } = useExpedienteWizard()

  // Pre-seleccion del inmueble cuando se llega via /expedientes/nuevo?inmueble_id=X
  // (eg. desde la pagina de detalle de inmueble). Hace fetch del inmueble +
  // check de expediente activo y avanza al step 2 — el usuario no tiene que
  // volver a buscar lo que ya eligio.
  const prefillRanRef = useRef(false)
  const [prefillLoading, setPrefillLoading] = useState(false)
  // El paso 2 avisa cuando el form de edición de solicitante tiene cambios sin
  // guardar — bloqueamos "Siguiente" hasta que el usuario guarde o cancele.
  const [step2EditDirty, setStep2EditDirty] = useState(false)
  useEffect(() => {
    if (!inmueblePreseleccionId || prefillRanRef.current) return
    prefillRanRef.current = true
    setPrefillLoading(true)
    ;(async () => {
      try {
        const inmueble = await inmuebleService.getInmuebleById(inmueblePreseleccionId)
        let hasActiveExpediente = false
        try {
          const check = await expedienteService.checkActiveExpediente(inmueble.id)
          hasActiveExpediente = !!check.hasActiveExpediente
        } catch {
          // Falla no bloqueante: el step 1 ya valida.
        }
        updateStep1({ inmueble, hasActiveExpediente })

        // Si venimos de un INTERESADO de la vitrina, pre-llenar el solicitante
        // (nuevo) con sus datos de contacto: /expedientes/nuevo?inmueble_id=..&
        // nombre=..&apellido=..&telefono=..&email=.. — el dueño solo completa el
        // documento. No pisa nada si no vienen esos params.
        const preNombre = searchParams.get('nombre')
        const preEmail = searchParams.get('email')
        const preTelefono = searchParams.get('telefono')
        if (preNombre || preEmail || preTelefono) {
          updateStep2({
            solicitante: null,
            isNewSolicitante: true,
            formData: {
              tipo_persona: 'natural',
              nombre: preNombre ?? '',
              apellido: searchParams.get('apellido') ?? '',
              tipo_documento: 'cc',
              numero_documento: '',
              email: preEmail ?? '',
              telefono: preTelefono ?? '',
            },
          })
        }
        goToStep(2)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'No pudimos cargar el inmueble seleccionado',
        )
      } finally {
        setPrefillLoading(false)
      }
    })()
  }, [inmueblePreseleccionId, updateStep1, updateStep2, goToStep, searchParams])

  // Manejar cancelar
  const handleCancel = () => {
    router.push('/expedientes')
  }

  // Renderizar paso actual
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1InmuebleSelection
            data={data.step1}
            errors={errors.step1}
            onUpdate={updateStep1}
          />
        )
      case 2:
        return (
          <Step2Solicitante
            data={data.step2}
            errors={errors.step2}
            onUpdate={updateStep2}
            onUpdateField={updateStep2Field}
            onEditingDirtyChange={setStep2EditDirty}
          />
        )
      case 3:
        return (
          <Step3Configuration
            data={data.step3}
            errors={errors.step3}
            onUpdate={updateStep3}
          />
        )
      case 4:
        return (
          <Step4Confirmation
            data={data}
            isSubmitting={isSubmitting}
            submitError={submitError}
            existingExpediente={existingExpediente}
            onSubmit={submitExpediente}
            onEditStep={goToStep}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Nuevo Expediente
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Complete los pasos para crear un nuevo expediente de arrendamiento
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-6 sm:mb-8">
          <WizardStepIndicator
            currentStep={currentStep}
            onStepClick={goToStep}
          />
        </div>

        {/* Contenido del paso */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          {prefillLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              <p className="text-sm text-gray-500">Cargando inmueble seleccionado...</p>
            </div>
          ) : (
            renderStep()
          )}
        </div>

        {/* Navegacion (no mostrar en paso 4 porque tiene su propio boton) */}
        {currentStep < 4 && (
          <WizardNavigation
            currentStep={currentStep}
            canProceed={canProceed() && !step2EditDirty}
            isSubmitting={isSubmitting}
            onPrevious={prevStep}
            onNext={nextStep}
            onCancel={handleCancel}
          />
        )}

        {/* Boton cancelar en paso 4 */}
        {currentStep === 4 && !isSubmitting && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={prevStep}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
