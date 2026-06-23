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
  const total = WIZARD_STEPS.length
  const pct = Math.round((currentStep / total) * 100)

  return (
    <div className="w-full">
      {/* Mobile: paso actual + barra de progreso */}
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            {WIZARD_STEPS[currentStep - 1]}
          </h3>
          <span className="text-xs font-medium text-gray-500">
            Paso {currentStep} de {total}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-primary-600 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Desktop: indicador visual completo (conectores fluidos con flex-1) */}
      <div className="hidden sm:flex">
        {WIZARD_STEPS.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          const isPending = stepNumber > currentStep
          const isLast = index === total - 1

          return (
            <div key={step} className="relative flex flex-1 flex-col items-center">
              {/* Conector hacia el siguiente paso (línea detrás del círculo) */}
              {!isLast && (
                <div
                  className={cn(
                    'absolute top-5 left-1/2 h-0.5 w-full -translate-y-1/2 transition-colors',
                    stepNumber < currentStep ? 'bg-primary-600' : 'bg-gray-200'
                  )}
                />
              )}
              {/* Círculo del paso */}
              <div
                className={cn(
                  'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white transition-all',
                  isCompleted && 'border-primary-600 bg-primary-600',
                  isCurrent && 'border-primary-600 ring-2 ring-primary-100',
                  isPending && 'border-gray-300'
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
              {/* Label */}
              <span
                className={cn(
                  'mt-2 px-1 text-center text-[11px] font-medium leading-tight lg:text-xs',
                  (isCompleted || isCurrent) && 'text-primary-600',
                  isPending && 'text-gray-400'
                )}
              >
                {step}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
