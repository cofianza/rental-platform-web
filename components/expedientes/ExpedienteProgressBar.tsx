/**
 * ExpedienteProgressBar - HP-243
 * Barra de progreso visual del flujo de estados del expediente
 */

import { ESTADOS_EXPEDIENTE, type EstadoExpediente } from '@/lib/constants'
import { IconCheck } from '@/components/icons'
import { cn } from '@/lib/utils'

/**
 * Orden del flujo de estados (workflow)
 * Define el orden en que se muestran los estados en la barra de progreso
 */
const WORKFLOW_ESTADOS: EstadoExpediente[] = [
  'borrador',
  'en_revision',
  'aprobado',
]

/**
 * Estados que representan finalizaciones alternativas (no en el flujo principal)
 */
const ESTADOS_FINALES: EstadoExpediente[] = [
  'informacion_incompleta',
  'rechazado',
  'condicionado',
  'cerrado',
]

export interface ExpedienteProgressBarProps {
  estadoActual: EstadoExpediente
  className?: string
}

export function ExpedienteProgressBar({
  estadoActual,
  className,
}: ExpedienteProgressBarProps) {
  // Determinar si el estado actual está en el flujo principal
  const estadoEnFlujo = WORKFLOW_ESTADOS.includes(estadoActual)
  const indiceActual = estadoEnFlujo
    ? WORKFLOW_ESTADOS.indexOf(estadoActual)
    : -1

  // Si está en un estado final alternativo, mostrarlo especialmente
  const esEstadoFinal = ESTADOS_FINALES.includes(estadoActual)
  const configEstadoActual = ESTADOS_EXPEDIENTE[estadoActual]

  return (
    <div className={cn('w-full', className)}>
      {/* Flujo principal */}
      <div className="flex items-center justify-between">
        {WORKFLOW_ESTADOS.map((estado, index) => {
          const config = ESTADOS_EXPEDIENTE[estado]
          const esActual = estado === estadoActual
          const esCompletado = estadoEnFlujo && index < indiceActual
          const esPendiente = !esActual && !esCompletado

          return (
            <div key={estado} className="flex items-center flex-1">
              {/* Nodo del estado */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                    esActual && `${config.bgColor} ${config.borderColor}`,
                    esCompletado && 'bg-green-500 border-green-500',
                    esPendiente && 'bg-gray-100 border-gray-300'
                  )}
                >
                  {esCompletado ? (
                    <IconCheck size={20} className="text-white" />
                  ) : (
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        esActual && config.textColor,
                        esPendiente && 'text-gray-400'
                      )}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium text-center max-w-[80px]',
                    esActual && config.textColor,
                    esCompletado && 'text-green-600',
                    esPendiente && 'text-gray-400'
                  )}
                >
                  {config.label}
                </span>
              </div>

              {/* Línea conectora (excepto el último) */}
              {index < WORKFLOW_ESTADOS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-1 mx-2 rounded',
                    index < indiceActual ? 'bg-green-500' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Mostrar estado final alternativo si aplica */}
      {esEstadoFinal && (
        <div className="mt-4 flex items-center justify-center">
          <div
            className={cn(
              'px-4 py-2 rounded-lg border-2 flex items-center gap-2',
              configEstadoActual.bgColor,
              configEstadoActual.borderColor
            )}
          >
            <span
              className={cn(
                'w-3 h-3 rounded-full',
                configEstadoActual.textColor.replace('text-', 'bg-')
              )}
            />
            <span className={cn('text-sm font-semibold', configEstadoActual.textColor)}>
              {configEstadoActual.label}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
