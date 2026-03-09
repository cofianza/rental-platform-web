/**
 * Badge - Muestra el estado con color y etiqueta legible
 * Server Component - no requiere interactividad
 */

import { cn } from '@/lib/utils'
import {
  ESTADOS_EXPEDIENTE,
  ESTADOS_INMUEBLE,
  ESTADOS_ESTUDIO,
  ESTADOS_RESULTADO_ESTUDIO,
  type EstadoExpediente,
  type EstadoInmueble,
  type EstadoEstudioType,
  type ResultadoEstudioType,
} from '@/lib/constants'

export interface BadgeProps {
  estado: EstadoExpediente | EstadoInmueble | string
  className?: string
}

/**
 * Convierte nombres snake_case a formato legible
 * Ej: "en_revision" -> "En Revisión"
 */
function formatLabel(estado: string): string {
  return estado
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function Badge({ estado, className }: BadgeProps) {
  // Intentar obtener configuración desde constantes
  const config =
    ESTADOS_EXPEDIENTE[estado as EstadoExpediente] ||
    ESTADOS_INMUEBLE[estado as EstadoInmueble] ||
    ESTADOS_ESTUDIO[estado as EstadoEstudioType] ||
    ESTADOS_RESULTADO_ESTUDIO[estado as ResultadoEstudioType]

  // Si no hay configuración, usar valores por defecto
  const label = config?.label || formatLabel(estado)
  const bgColor = config?.bgColor || 'bg-gray-100'
  const textColor = config?.textColor || 'text-gray-700'
  const borderColor = config?.borderColor || 'border-gray-300'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        bgColor,
        textColor,
        borderColor,
        className
      )}
    >
      {/* Círculo de color */}
      <span className={cn('w-1.5 h-1.5 rounded-full', textColor.replace('text-', 'bg-'))} />
      {label}
    </span>
  )
}
