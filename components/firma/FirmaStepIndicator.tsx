/**
 * FirmaStepIndicator - HP-342
 * Indicador visual de pasos para el wizard de firma
 * Mobile-first con iconos descriptivos
 */

'use client'

import { IconCheck } from '@/components/icons'

interface FirmaStepIndicatorProps {
  currentStep: number
  steps: string[]
  completedSteps: number
}

export function FirmaStepIndicator({
  currentStep,
  steps,
  completedSteps,
}: FirmaStepIndicatorProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* Mobile: compact horizontal */}
      <div className="flex items-center justify-between">
        {steps.map((label, index) => {
          const stepNum = index + 1
          const isCompleted = stepNum <= completedSteps
          const isCurrent = stepNum === currentStep
          const isPending = stepNum > currentStep

          return (
            <div key={label} className="flex items-center flex-1">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    transition-colors duration-200
                    ${isCompleted
                      ? 'bg-green-600 text-white'
                      : isCurrent
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }
                  `}
                >
                  {isCompleted ? (
                    <IconCheck size={16} />
                  ) : (
                    stepNum
                  )}
                </div>
                {/* Label - visible on sm+ */}
                <span
                  className={`
                    hidden sm:block mt-1 text-xs text-center
                    ${isCurrent ? 'text-primary-600 font-medium' : 'text-gray-500'}
                  `}
                >
                  {label}
                </span>
              </div>

              {/* Connector line (except for last step) */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-0.5 mx-2
                    ${stepNum < currentStep ? 'bg-green-600' : 'bg-gray-200'}
                  `}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile: current step label */}
      <div className="sm:hidden mt-3 text-center">
        <span className="text-sm text-gray-600">
          Paso {currentStep} de {steps.length}:
        </span>
        <span className="ml-1 text-sm font-medium text-primary-600">
          {steps[currentStep - 1]}
        </span>
      </div>
    </div>
  )
}
