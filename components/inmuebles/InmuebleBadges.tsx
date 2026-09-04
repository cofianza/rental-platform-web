/**
 * Badges de Inmueble - HP-174
 * Componentes de badges para estado y tipo
 */

import type { EstadoInmueble, TipoInmueble } from '@/types/inmueble'
import { IconClipboardList } from '@/components/icons'
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

interface EstudiosActivosBadgeProps {
  /** Estudios en curso sobre el inmueble (IInmueble.estudios_activos). */
  count?: number | null
  /** Reservado: un candidato aprobado ya tiene el contrato en proceso. */
  reservado?: boolean | null
  /** Arrendado: hay un contrato vigente. */
  arrendado?: boolean | null
}

/**
 * Indicador de estudios en curso — Flujo de Gerencia §4.2: "Si la propiedad ya
 * tiene estudios en curso, se muestra un indicador con el número de estudios
 * activos, SIN impedir la selección."
 *
 * Es informativo y nada más: no deshabilita, no bloquea, no cambia el estado.
 * Una inmobiliaria muestra el mismo inmueble a varios interesados a la vez y
 * los evalúa en paralelo; este badge le dice cuántos van, que es justo el dato
 * que el viejo estado 'en_estudio' escondía detrás de un booleano.
 *
 * Con 0 estudios NO se pinta nada (un "0 estudios" es ruido).
 *
 * OJO con el copy: los estudios perdedores NO se cancelan al reservarse la
 * propiedad (la reasignación es §4.3, otra fase), así que toda propiedad
 * reservada o arrendada sigue arrastrando estudios en curso y por tanto este
 * badge. Si en ese estado dijera "puedes iniciar otro estudio" estaría
 * mintiendo: el backend responde 409 INMUEBLE_RESERVADO. Por eso el tooltip
 * depende del contexto, y por eso llega en props en vez de dejar que cada
 * pantalla lo adivine — el gate ad-hoc solo estaba en una de las cinco.
 *
 * Único componente del badge: se escribe aquí una vez y lo consumen la tabla de
 * admin, la vista de inmobiliaria, el detalle y las listas del asistente, para
 * que el copy no se bifurque en cinco sitios.
 */
export function EstudiosActivosBadge({ count, reservado, arrendado }: EstudiosActivosBadgeProps) {
  if (!count || count < 1) return null
  const comprometido = !!reservado || !!arrendado
  const title = arrendado
    ? 'La propiedad ya está arrendada: no admite estudios nuevos.'
    : reservado
      ? 'Reservada para un candidato aprobado con contrato en proceso: no admite estudios nuevos.'
      : 'Puedes iniciar otro estudio. La propiedad solo se reserva cuando uno queda aprobado.'
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        comprometido ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-700'
      }`}
    >
      <IconClipboardList size={12} />
      {count === 1 ? '1 estudio en curso' : `${count} estudios en curso`}
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
    7: 'bg-cyan-100 text-cyan-800',
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[estrato] || 'bg-gray-100 text-gray-800'}`}
    >
      E{estrato}
    </span>
  )
}
