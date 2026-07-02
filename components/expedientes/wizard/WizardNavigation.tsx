/**
 * WizardNavigation - HP-247
 * Botones de navegacion del wizard
 */

'use client'

import { IconLoader, IconArrowLeft, IconArrowRight } from '@/components/icons'
import { WIZARD_MESSAGES, WIZARD_STEPS } from './constants'

interface WizardNavigationProps {
  currentStep: number
  onPrevious: () => void
  onNext: () => void
  onCancel: () => void
  canProceed: boolean
  isSubmitting?: boolean
  onSubmit?: () => void
}

export function WizardNavigation({
  currentStep,
  onPrevious,
  onNext,
  onCancel,
  canProceed,
  isSubmitting = false,
  onSubmit,
}: WizardNavigationProps) {
  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === WIZARD_STEPS.length

  const handleNextClick = () => {
    if (isLastStep && onSubmit) {
      onSubmit()
    } else {
      onNext()
    }
  }

  return (
    <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
      {/* Lado izquierdo: Cancelar o Anterior */}
      {isFirstStep ? (
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
        >
          {WIZARD_MESSAGES.CANCEL}
        </button>
      ) : (
        <button
          type="button"
          onClick={onPrevious}
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
        >
          <IconArrowLeft size={16} />
          {WIZARD_MESSAGES.PREVIOUS}
        </button>
      )}

      {/* Lado derecho: Siguiente o Crear */}
      <button
        type="button"
        onClick={handleNextClick}
        disabled={!canProceed || isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {isSubmitting ? (
          <>
            <IconLoader size={16} className="animate-spin" />
            {WIZARD_MESSAGES.CREATING}
          </>
        ) : isLastStep ? (
          WIZARD_MESSAGES.CONFIRM_CREATE
        ) : (
          <>
            {WIZARD_MESSAGES.NEXT}
            <IconArrowRight size={16} />
          </>
        )}
      </button>
    </div>
  )
}
