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
import { contratoService } from '@/services/contratoService'
import type { EstadoExpediente } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { PROCESS_STEPS, getProcessStep } from '@/lib/expedienteProcessStep'

export interface ExpedienteProgressBarProps {
  expedienteId: string
  estadoActual: EstadoExpediente
  /** Estado anterior a la cancelacion. Cuando esta presente, el stepper marca
   *  los pasos hasta ese estado como completados y los siguientes en rojo
   *  (no completados). Sin esto, un expediente cancelado se ve identico a uno
   *  cerrado naturalmente — todos los pasos en verde. */
  estadoPreCancelacion?: EstadoExpediente | null
  className?: string
}

export function ExpedienteProgressBar({
  expedienteId,
  estadoActual,
  estadoPreCancelacion,
  className,
}: ExpedienteProgressBarProps) {
  const [citaRealizada, setCitaRealizada] = useState(false)
  // El paso "Firma"/"Listo" NO se refleja en expediente.estado: el expediente
  // sigue en 'aprobado' mientras el contrato se firma, y solo pasa a 'cerrado'
  // al final. Por eso, estando aprobado, miramos el estado del CONTRATO para
  // avanzar el stepper. null = sin override (no aplica / aún sin cargar).
  const [contratoStep, setContratoStep] = useState<number | null>(null)

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

  useEffect(() => {
    // Solo importa en 'aprobado': antes el contrato no existe; en 'cerrado' ya
    // está todo completo (paso 7). Evita fetches innecesarios en otros estados.
    if (estadoActual !== 'aprobado') {
      setContratoStep(null)
      return
    }
    let cancelled = false
    contratoService.getContratosForExpediente(expedienteId, { limit: 20 })
      .then(({ data }) => {
        if (cancelled) return
        const firmado = data.some((c) => ['firmado', 'vigente', 'finalizado'].includes(c.estado))
        const enFirma = data.some((c) => c.estado === 'pendiente_firma')
        // 6 = Listo, 5 = Firma (índices de PROCESS_STEPS).
        setContratoStep(firmado ? 6 : enFirma ? 5 : null)
      })
      .catch(() => { if (!cancelled) setContratoStep(null) })
    return () => { cancelled = true }
  }, [expedienteId, estadoActual])

  const isRejected = estadoActual === 'rechazado'
  const isConditioned = estadoActual === 'condicionado'
  const isCancelled = estadoActual === 'cerrado' && !!estadoPreCancelacion
  // Si fue cancelado, "currentStep" se calcula desde el estado pre-cancelacion
  // — los pasos completados son hasta ahi, no hasta el final.
  const baseStep = isCancelled
    ? getProcessStep(estadoPreCancelacion!, citaRealizada)
    : getProcessStep(estadoActual, citaRealizada)
  // El estado del contrato puede ADELANTAR el paso (Firma/Listo) cuando el
  // expediente sigue en 'aprobado'. No aplica si el expediente fue cancelado.
  const currentStep = !isCancelled && contratoStep !== null
    ? Math.max(baseStep, contratoStep)
    : baseStep

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
        <p className="text-sm font-semibold text-amber-700">Estudio condicionado</p>
        <p className="text-xs text-amber-600 mt-0.5">Invita a un co-arrendatario para que los respaldemos juntos.</p>
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center gap-1">
        {PROCESS_STEPS.map((step, idx) => {
          const isComplete = idx < currentStep
          const isCurrent = idx === currentStep
          // Si fue cancelado, los pasos no completados se marcan en rojo en
          // lugar de gris claro — comunica visualmente "este paso no se
          // alcanzo porque el expediente fue cancelado".
          const isFailed = isCancelled && !isComplete
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                    isComplete && 'bg-primary-600 text-white',
                    isCurrent && !isFailed && 'bg-amber-100 text-amber-700 ring-2 ring-amber-500',
                    isFailed && 'bg-red-100 text-red-600 ring-2 ring-red-300',
                    !isComplete && !isCurrent && !isFailed && 'bg-gray-100 text-gray-400',
                  )}
                >
                  {isComplete ? (
                    <IconCheck size={18} />
                  ) : isFailed ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] mt-1.5 text-center leading-tight max-w-16',
                    isCurrent && !isFailed ? 'text-amber-700 font-semibold'
                      : isFailed ? 'text-red-600 font-medium'
                      : isComplete ? 'text-primary-700 font-medium'
                      : 'text-gray-400',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {idx < PROCESS_STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-1 mt-[-18px] rounded',
                    isComplete ? 'bg-primary-600'
                      : isFailed ? 'bg-red-200'
                      : 'bg-gray-200',
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
