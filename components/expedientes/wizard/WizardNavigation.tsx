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
    <div className="flex items-center justify-between pt-6 border-t border-gray-200">
      {/* Lado izquierdo: Cancelar o Anterior */}
      <div>
        {isFirstStep ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {WIZARD_MESSAGES.CANCEL}
          </button>
        ) : (
          <button
            type="button"
            onClick={onPrevious}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <IconArrowLeft size={16} />
            {WIZARD_MESSAGES.PREVIOUS}
          </button>
        )}
      </div>

      {/* Lado derecho: Siguiente o Crear */}
      <div>
        <button
          type="button"
          onClick={handleNextClick}
          disabled={!canProceed || isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  )
}
