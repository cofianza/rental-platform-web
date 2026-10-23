/**
 * Etapa del estudio para el detalle (revisión del Resumen, 23-oct). El estado
 * formal del expediente no alcanza: «borrador» cubre la visita, la
 * autorización, el pago y la consulta. Pura: la lee useEtapaEstudio.
 */

import type { EstadoExpediente } from '@/lib/constants'

export type EtapaEstudio =
  | 'visita'
  | 'habilitar'
  | 'autorizacion'
  | 'pago'
  | 'consulta'
  | 'decision'
  | 'contrato'
  | 'firma'
  | 'vigente'
  | 'finalizado'
  | 'no_aprobado'
  | 'cancelado'

export const ETAPA_LABEL: Record<EtapaEstudio, string> = {
  visita: 'Visita pendiente',
  habilitar: 'Por habilitar',
  autorizacion: 'Esperando autorización',
  pago: 'Pago pendiente',
  consulta: 'En evaluación',
  decision: 'En revisión',
  contrato: 'Aprobado',
  firma: 'En firma',
  vigente: 'Contrato vigente',
  finalizado: 'Finalizado',
  no_aprobado: 'No aprobado',
  cancelado: 'Cancelado',
}

/** Pasos de la barra del detalle (la lista conserva los suyos). */
export const PASOS_DETALLE = ['Visita', 'Autorización', 'Pago', 'Evaluación', 'Resultado', 'Contrato', 'Firma'] as const

/** Paso actual de la barra; PASOS_DETALLE.length = todo completo. */
export const PASO_DE_ETAPA: Record<EtapaEstudio, number> = {
  visita: 0,
  habilitar: 1,
  autorizacion: 1,
  pago: 2,
  consulta: 3,
  decision: 4,
  no_aprobado: 4,
  contrato: 5,
  firma: 6,
  vigente: PASOS_DETALLE.length,
  finalizado: PASOS_DETALLE.length,
  cancelado: 0,
}

const CONSULTA_INICIADA = ['en_proceso', 'formulario_completado', 'documentos_cargados', 'completado', 'fallido']

export interface DatosEtapa {
  estado: EstadoExpediente
  estadoPreCancelacion?: EstadoExpediente | null
  habilitado: boolean
  citaResuelta: boolean
  tieneInmueble: boolean
  autorizacionEstado: string | null
  /** null = sin acceso o sin leer. */
  pago: { estado: string; puede_avanzar: boolean } | null
  titularEstado: string | null
  contratosEstados: string[]
}

/** Pura. */
export function calcularEtapa(d: DatosEtapa): EtapaEstudio {
  if (d.estado === 'rechazado') return 'no_aprobado'
  if (d.estado === 'cerrado') {
    if (d.estadoPreCancelacion === 'rechazado') return 'no_aprobado'
    return d.estadoPreCancelacion ? 'cancelado' : 'finalizado'
  }
  if (d.contratosEstados.some((e) => ['firmado', 'vigente', 'finalizado'].includes(e))) return 'vigente'
  if (d.contratosEstados.some((e) => e === 'pendiente_firma' || e === 'firma_incompleta')) return 'firma'
  if (d.estado === 'aprobado') return 'contrato'
  if (d.estado === 'condicionado') return 'decision'
  if (!d.habilitado) return d.citaResuelta || !d.tieneInmueble ? 'habilitar' : 'visita'
  if (d.titularEstado && CONSULTA_INICIADA.includes(d.titularEstado)) return 'consulta'
  if (d.pago?.estado === 'sin_definir') return 'pago'
  if (d.autorizacionEstado !== 'autorizado') return 'autorizacion'
  if (d.pago && !d.pago.puede_avanzar) return 'pago'
  return 'consulta'
}

