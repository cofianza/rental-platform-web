/**
 * Mapeo del estado formal del expediente al paso del flujo del usuario
 * (Solicitud → Cita previa → Estudio → Aprobacion → Contrato → Firma → Listo).
 *
 * Estado formal != paso. Un expediente en 'borrador' puede estar en cualquier
 * paso entre 1-3 dependiendo de si la cita ya se realizo. Este helper combina
 * `estado` + `cita_realizada` para devolver el paso real.
 */

import type { EstadoExpediente } from '@/lib/constants'

export const PROCESS_STEPS = [
  { id: 'solicitud', label: 'Solicitud' },
  { id: 'cita', label: 'Cita previa' },
  { id: 'estudio', label: 'Estudio' },
  { id: 'aprobacion', label: 'Aprobacion' },
  { id: 'contrato', label: 'Contrato' },
  { id: 'firma', label: 'Firma' },
  { id: 'listo', label: 'Listo' },
] as const

export type ProcessStepId = (typeof PROCESS_STEPS)[number]['id']

/**
 * Devuelve el indice del paso actual (0-6). Usado por la barra de progreso
 * y el badge compacto de la lista. Para 'rechazado' y 'condicionado' la
 * funcion devuelve un indice; el caller decide si renderizarlo o mostrar un
 * badge especial (ver ExpedienteProgressBar para el comportamiento detalle).
 */
export function getProcessStep(
  estado: EstadoExpediente,
  citaRealizada: boolean,
): number {
  // Pre-cita: cualquier estado inicial sin cita realizada esta en paso 1
  if (
    !citaRealizada
    && (estado === 'borrador' || estado === 'en_revision' || estado === 'informacion_incompleta')
  ) {
    return 1
  }

  switch (estado) {
    case 'borrador': return 2
    case 'en_revision': return 2
    case 'informacion_incompleta': return 2
    case 'aprobado': return 4
    case 'condicionado': return 3
    case 'rechazado': return 3
    // 'cerrado' = expediente finalizado: TODOS los pasos completados,
    // incluido "Listo". Devolver 7 (fuera de rango) hace que el stepper
    // marque idx 0-6 como complete (verdes) en lugar de dejar "Listo"
    // en amarillo "current".
    case 'cerrado': return 7
    default: return 0
  }
}

export function getProcessStepLabel(
  estado: EstadoExpediente,
  citaRealizada: boolean,
): string {
  if (estado === 'rechazado') return 'Rechazado'
  if (estado === 'condicionado') return 'Condicionado'
  const idx = getProcessStep(estado, citaRealizada)
  return PROCESS_STEPS[idx]?.label ?? 'Solicitud'
}
