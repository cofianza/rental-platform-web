/**
 * WizardStepIndicator - HP-247
 * Indicador visual de pasos del wizard
 */

'use client'

import { IconCheck } from '@/components/icons'
import { WIZARD_STEPS } from './constants'
import { cn } from '@/lib/utils'

interface WizardStepIndicatorProps {
  currentStep: number
}

export function WizardStepIndicator({ currentStep }: WizardStepIndicatorProps) {
  return (
    <div className="w-full">
      {/* Mobile: solo texto del paso actual */}
      <div className="sm:hidden text-center mb-4">
        <span className="text-sm text-gray-500">
          Paso {currentStep} de {WIZARD_STEPS.length}
        </span>
        <h3 className="text-lg font-medium text-gray-900">
          {WIZARD_STEPS[currentStep - 1]}
        </h3>
      </div>

      {/* Desktop: indicador visual completo */}
      <div className="hidden sm:flex items-center justify-center">
        {WIZARD_STEPS.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          const isPending = stepNumber > currentStep

          return (
            <div key={step} className="flex items-center">
              {/* Circulo del paso */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                    isCompleted && 'bg-primary-600 border-primary-600',
                    isCurrent && 'bg-white border-primary-600',
                    isPending && 'bg-white border-gray-300'
                  )}
                >
                  {isCompleted ? (
                    <IconCheck size={20} className="text-white" />
                  ) : (
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        isCurrent && 'text-primary-600',
                        isPending && 'text-gray-400'
                      )}
                    >
                      {stepNumber}
                    </span>
                  )}
                </div>
                {/* Label del paso */}
                <span
                  className={cn(
                    'mt-2 text-xs font-medium text-center whitespace-nowrap',
                    isCompleted && 'text-primary-600',
                    isCurrent && 'text-primary-600',
                    isPending && 'text-gray-400'
                  )}
                >
                  {step}
                </span>
              </div>

              {/* Linea conectora (excepto ultimo paso) */}
              {index < WIZARD_STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-16 lg:w-24 h-0.5 mx-2 mt-[-1.5rem]',
                    stepNumber < currentStep ? 'bg-primary-600' : 'bg-gray-300'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
