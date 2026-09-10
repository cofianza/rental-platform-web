/**
 * EstudioResultadoBadge — badge tipo pill (punto + label) del estado/resultado
 * del estudio de un expediente. Compartido por la columna "Estudio" del listado
 * fusionado y donde se necesite. Si no hay evaluación → "Sin evaluación".
 */

'use client'

import type { EstadoEstudio, ResultadoEstudio } from '@/types/estudio'

type BadgeKind = 'aprobado' | 'rechazado' | 'condicionado' | 'procesando' | 'esperando' | 'expirado' | 'sin'

const BADGE_STYLE: Record<BadgeKind, { wrap: string; dot: string }> = {
  aprobado: { wrap: 'bg-primary-50 text-primary-700', dot: 'bg-primary-600' },
  rechazado: { wrap: 'bg-red-50 text-red-500', dot: 'bg-red-500' },
  condicionado: { wrap: 'bg-coral-50 text-coral-600', dot: 'bg-coral-500' },
  procesando: { wrap: 'bg-blue-50 text-blue-600', dot: 'bg-blue-600 animate-pulse' },
  esperando: { wrap: 'bg-gray-50 text-gray-600 border border-gray-200', dot: 'bg-gray-400' },
  expirado: { wrap: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  sin: { wrap: 'bg-gray-50 text-gray-400 border border-dashed border-gray-300', dot: 'bg-gray-300' },
}

function resolveBadge(
  estado?: EstadoEstudio | null,
  resultado?: ResultadoEstudio | null,
  expirado?: boolean,
): { kind: BadgeKind; label: string } {
  if (!estado && !resultado) return { kind: 'sin', label: 'Sin evaluación' }
  // Flujo §11/§12: el prospecto no autorizó dentro del plazo. Sin esto seguía
  // diciendo "Esperando autorización" para siempre.
  if (expirado && (!resultado || resultado === 'pendiente')) return { kind: 'expirado', label: 'Expirado' }
  if (resultado === 'aprobado') return { kind: 'aprobado', label: 'Aprobado' }
  if (resultado === 'rechazado') return { kind: 'rechazado', label: 'No aprobable' }
  if (resultado === 'condicionado') return { kind: 'condicionado', label: 'Condicionado' }
  // "Esperando" a secas no decia esperando QUE: el gestor tenia que abrir el
  // estudio para saber si le tocaba a el, al prospecto o al buro.
  switch (estado) {
    case 'solicitado':
      return { kind: 'esperando', label: 'Esperando autorización' }
    case 'pago_pendiente':
      return { kind: 'esperando', label: 'Esperando pago' }
    case 'autorizado':
    case 'formulario_enviado':
      return { kind: 'esperando', label: 'Esperando datos del prospecto' }
    case 'pagado':
    case 'formulario_completado':
    case 'documentos_cargados':
    case 'en_proceso':
      return { kind: 'procesando', label: 'Consultando buró' }
    case 'completado':
      return { kind: 'procesando', label: 'Completado' }
    case 'fallido':
      return { kind: 'rechazado', label: 'Consulta fallida' }
    case 'cancelado':
      return { kind: 'esperando', label: 'Cancelado' }
    default:
      return { kind: 'esperando', label: 'Esperando' }
  }
}

export function EstudioResultadoBadge({
  estado,
  resultado,
  score,
  expirado,
  className = '',
}: {
  estado?: EstadoEstudio | null
  resultado?: ResultadoEstudio | null
  score?: number | null
  expirado?: boolean
  className?: string
}) {
  const { kind, label } = resolveBadge(estado, resultado, expirado)
  const style = BADGE_STYLE[kind]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.wrap} ${className}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
      {label}
      {typeof score === 'number' && kind !== 'sin' && (
        <span className="text-[10px] opacity-70">· {score}</span>
      )}
    </span>
  )
}
