/**
 * ExpedienteBadges - HP-229
 * Componentes de badge específicos para estados de expediente
 */

import { Badge } from '@/components/ui/Badge'
import { ESTADOS_EXPEDIENTE, type EstadoExpediente } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { PROCESS_STEPS, getProcessStep } from '@/lib/expedienteProcessStep'

export interface ExpedienteBadgeProps {
  estado: EstadoExpediente
  className?: string
  size?: 'sm' | 'md'
}

/**
 * Badge de estado de expediente
 */
export function ExpedienteBadge({ estado, className, size = 'md' }: ExpedienteBadgeProps) {
  return (
    <Badge
      estado={estado}
      className={cn(size === 'sm' && 'text-[10px] px-2 py-0.5', className)}
    />
  )
}

export interface ProcessStepBadgeProps {
  estado: EstadoExpediente
  citaRealizada: boolean
  className?: string
}

/**
 * Badge compacto que muestra el paso del flujo (Solicitud → ... → Listo) en
 * lugar del estado formal. Pensado para la lista de expedientes — el detalle
 * usa el ExpedienteProgressBar full.
 *
 * Estados especiales:
 * - rechazado → pill rojo "Rechazado".
 * - condicionado → pill amber "Condicionado".
 * - cualquier otro → "Paso N · Label" con tinte segun avance.
 */
export function ProcessStepBadge({ estado, citaRealizada, className }: ProcessStepBadgeProps) {
  if (estado === 'rechazado') {
    return (
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-red-50 text-red-700 border-red-200',
          className,
        )}
      >
        Rechazado
      </span>
    )
  }

  if (estado === 'condicionado') {
    return (
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200',
          className,
        )}
      >
        Condicionado
      </span>
    )
  }

  const idx = getProcessStep(estado, citaRealizada)
  const step = PROCESS_STEPS[idx]
  if (!step) return null

  // Tinte segun avance: cerrado/listo en verde, intermedio en primary.
  const isFinal = idx >= PROCESS_STEPS.length - 1
  const tone = isFinal
    ? 'bg-green-50 text-green-700 border-green-200'
    : 'bg-primary-50 text-primary-700 border-primary-200'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
        tone,
        className,
      )}
      title={`Paso ${idx + 1} de ${PROCESS_STEPS.length}: ${step.label}`}
    >
      <span className="font-semibold">{idx + 1}/{PROCESS_STEPS.length}</span>
      <span>{step.label}</span>
    </span>
  )
}

export interface EstadoChipProps {
  estado: EstadoExpediente
  isSelected: boolean
  onClick: () => void
  count?: number
}

/**
 * Chip seleccionable para filtro multi-select de estados
 */
export function EstadoChip({ estado, isSelected, onClick, count }: EstadoChipProps) {
  const config = ESTADOS_EXPEDIENTE[estado]

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
        isSelected
          ? `${config.bgColor} ${config.textColor} ${config.borderColor}`
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          isSelected ? config.textColor.replace('text-', 'bg-') : 'bg-gray-400'
        )}
      />
      {config.label}
      {count !== undefined && (
        <span
          className={cn(
            'ml-1 px-1.5 py-0.5 rounded-full text-[10px]',
            isSelected ? 'bg-white/30' : 'bg-gray-100'
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}
