/**
 * Badges de Inmueble - HP-174
 * Componentes de badges para estado y tipo
 */

import type { EstadoInmueble, TipoInmueble } from '@/types/inmueble'
import { ESTADO_LABELS, ESTADO_BADGE_CLASSES, TIPO_LABELS, TIPO_BADGE_CLASSES } from './constants'

interface EstadoBadgeProps {
  estado: EstadoInmueble
}

/**
 * Badge de estado con colores distintivos
 * - Disponible: verde
 * - En Estudio: amarillo
 * - Ocupado: azul
 * - Inactivo: gris
 */
export function EstadoBadge({ estado }: EstadoBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE_CLASSES[estado]}`}
    >
      {ESTADO_LABELS[estado]}
    </span>
  )
}

interface TipoBadgeProps {
  tipo: TipoInmueble
}

/**
 * Badge de tipo de inmueble
 */
export function TipoBadge({ tipo }: TipoBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TIPO_BADGE_CLASSES[tipo]}`}
    >
      {TIPO_LABELS[tipo]}
    </span>
  )
}

interface EstratoBadgeProps {
  estrato: number
}

/**
 * Badge de estrato socioeconómico
 */
export function EstratoBadge({ estrato }: EstratoBadgeProps) {
  const colors: Record<number, string> = {
    1: 'bg-red-100 text-red-800',
    2: 'bg-orange-100 text-orange-800',
    3: 'bg-yellow-100 text-yellow-800',
    4: 'bg-lime-100 text-lime-800',
    5: 'bg-emerald-100 text-emerald-800',
    6: 'bg-teal-100 text-teal-800',
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[estrato] || 'bg-gray-100 text-gray-800'}`}
    >
      E{estrato}
    </span>
  )
}
