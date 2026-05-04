/**
 * ExpedienteProgressBar
 * Barra de progreso visual del flujo del usuario (7 pasos):
 * Solicitud → Cita previa → Estudio → Aprobacion → Contrato → Firma → Listo
 *
 * Calcula el paso actual combinando el estado del expediente y si tiene
 * cita realizada (consulta automatica al servicio de citas).
 */

'use client'

import { useEffect, useState } from 'react'
import { IconCheck } from '@/components/icons'
import { citaService } from '@/services/citaService'
import type { EstadoExpediente } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { PROCESS_STEPS, getProcessStep } from '@/lib/expedienteProcessStep'

export interface ExpedienteProgressBarProps {
  expedienteId: string
  estadoActual: EstadoExpediente
  className?: string
}

export function ExpedienteProgressBar({
  expedienteId,
  estadoActual,
  className,
}: ExpedienteProgressBarProps) {
  const [citaRealizada, setCitaRealizada] = useState(false)

  useEffect(() => {
    let cancelled = false
    citaService.getCitasByExpediente(expedienteId)
      .then((citas) => {
        if (!cancelled) {
          setCitaRealizada(citas.some((c) => c.estado === 'realizada'))
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [expedienteId, estadoActual])

  const isRejected = estadoActual === 'rechazado'
  const isConditioned = estadoActual === 'condicionado'
  const currentStep = getProcessStep(estadoActual, citaRealizada)

  if (isRejected) {
    return (
      <div className={cn('bg-red-50 border border-red-200 rounded-lg p-4', className)}>
        <p className="text-sm font-semibold text-red-700">Estudio no aprobado</p>
        <p className="text-xs text-red-600 mt-0.5">El expediente fue rechazado tras el estudio crediticio.</p>
      </div>
    )
  }

  if (isConditioned) {
    return (
      <div className={cn('bg-amber-50 border border-amber-200 rounded-lg p-4', className)}>
        <p className="text-sm font-semibold text-amber-700">Se requieren documentos adicionales</p>
        <p className="text-xs text-amber-600 mt-0.5">Sube los documentos solicitados para continuar con la evaluacion.</p>
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center gap-1">
        {PROCESS_STEPS.map((step, idx) => {
          const isComplete = idx < currentStep
          const isCurrent = idx === currentStep
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                    isComplete && 'bg-primary-600 text-white',
                    isCurrent && 'bg-amber-100 text-amber-700 ring-2 ring-amber-500',
                    !isComplete && !isCurrent && 'bg-gray-100 text-gray-400',
                  )}
                >
                  {isComplete ? <IconCheck size={18} /> : idx + 1}
                </div>
                <span
                  className={cn(
                    'text-[10px] mt-1.5 text-center leading-tight max-w-16',
                    isCurrent ? 'text-amber-700 font-semibold' : isComplete ? 'text-primary-700 font-medium' : 'text-gray-400',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {idx < PROCESS_STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-1 mt-[-18px] rounded',
                    isComplete ? 'bg-primary-600' : 'bg-gray-200',
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
