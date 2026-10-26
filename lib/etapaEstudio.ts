/**
 * Etapa del estudio para el detalle (revisión del Resumen, 23-oct). El estado
 * formal del expediente no alcanza: «borrador» cubre la visita, la
 * autorización, el pago y la consulta. Pura: la lee useEtapaEstudio.
 */

import type { EstadoExpediente } from '@/lib/constants'

export type EtapaEstudio =
  | 'visita'
  | 'habilitar'
  | 'no_habilitada'
  | 'autorizacion'
  | 'enlace'
  | 'pago'
  | 'consulta'
  | 'sin_ejecutar'
  | 'fallida'
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
  no_habilitada: 'Evaluación no habilitada',
  autorizacion: 'Esperando autorización',
  enlace: 'Enlace vencido o detenido',
  pago: 'Pago pendiente',
  consulta: 'En evaluación',
  sin_ejecutar: 'Consulta sin ejecutar',
  fallida: 'Consulta fallida',
  // Mismo nombre que la lista y la pestaña «Condicionados» (la pestaña «En revisión» es otro estado).
  decision: 'Condicionado',
  contrato: 'Aprobado',
  firma: 'En firma',
  vigente: 'Contrato vigente',
  finalizado: 'Finalizado',
  no_aprobado: 'No aprobable',
  cancelado: 'Cancelado',
}

/** Pasos de la barra del detalle (la lista conserva los suyos). */
export const PASOS_DETALLE = ['Visita', 'Autorización', 'Pago', 'Evaluación', 'Resultado', 'Contrato', 'Firma'] as const

/** Paso actual de la barra; PASOS_DETALLE.length = todo completo. */
export const PASO_DE_ETAPA: Record<EtapaEstudio, number> = {
  visita: 0,
  habilitar: 1,
  no_habilitada: 1,
  autorizacion: 1,
  enlace: 1,
  pago: 2,
  consulta: 3,
  sin_ejecutar: 3,
  fallida: 3,
  decision: 4,
  no_aprobado: 4,
  contrato: 5,
  firma: 6,
  vigente: PASOS_DETALLE.length,
  finalizado: PASOS_DETALLE.length,
  cancelado: 0,
}

const CONSULTA_INICIADA = ['en_proceso', 'completado']
// Autorizó y está pagada pero no arrancó: la tarjeta de la evaluación la ejecuta (esPendienteDeEjecutar).
const SIN_EJECUTAR = ['formulario_completado', 'documentos_cargados']

export interface DatosEtapa {
  estado: EstadoExpediente
  estadoPreCancelacion?: EstadoExpediente | null
  habilitado: boolean
  /** «No habilitar» tras la visita: el expediente sigue en borrador, pero no continúa. */
  estudioRechazado?: boolean
  citaResuelta: boolean
  tieneInmueble: boolean
  autorizacionEstado: string | null
  /** El enlace del titular venció o se detuvo (expiracion.expirado de la API). */
  enlaceVencido?: boolean
  /** null = sin acceso o sin leer. */
  pago: { estado: string; puede_avanzar: boolean; paga?: 'gestor' | 'arrendatario' | null } | null
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
  if (d.estudioRechazado) return 'no_habilitada'
  if (!d.habilitado) return d.citaResuelta || !d.tieneInmueble ? 'habilitar' : 'visita'
  if (d.titularEstado === 'fallido') return 'fallida'
  // Sin la firma del titular (pagado antes de autorizar) no falta la consulta: falta el prospecto.
  if (d.titularEstado && SIN_EJECUTAR.includes(d.titularEstado) && d.autorizacionEstado === 'autorizado') return 'sin_ejecutar'
  if (d.titularEstado && CONSULTA_INICIADA.includes(d.titularEstado)) return 'consulta'
  if (d.enlaceVencido) return 'enlace'
  if (d.pago?.estado === 'sin_definir') return 'pago'
  // Opción B: paga la inmobiliaria y el enlace sale después del pago (Adenda 2 §7).
  if (d.pago?.paga === 'gestor' && !d.pago.puede_avanzar) return 'pago'
  // Gerencia no lee el pago: el estado del titular lo dice.
  if (!d.pago && d.titularEstado === 'pago_pendiente') return 'pago'
  if (d.autorizacionEstado !== 'autorizado') return 'autorizacion'
  if (d.pago && !d.pago.puede_avanzar) return 'pago'
  return 'consulta'
}
