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
  | 'pago_prospecto'
  | 'consulta'
  | 'espera_coarrendatario'
  | 'sin_ejecutar'
  | 'fallida'
  | 'decision'
  | 'contrato'
  | 'firma'
  | 'firma_incompleta'
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
  pago_prospecto: 'Esperando el pago',
  consulta: 'En evaluación',
  espera_coarrendatario: 'Esperando al coarrendatario',
  sin_ejecutar: 'Consulta sin ejecutar',
  fallida: 'Consulta fallida',
  // U8: un nombre por situación (lista, detalle y notificación). Con condición
  // de coarrendatario la fila y el detalle ponen su propio rótulo.
  decision: 'En revisión de Cofianza',
  contrato: 'Aprobado',
  firma: 'En firma',
  firma_incompleta: 'Firma incompleta',
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
  pago_prospecto: 2,
  consulta: 3,
  espera_coarrendatario: 3,
  sin_ejecutar: 3,
  fallida: 3,
  decision: 4,
  no_aprobado: 4,
  contrato: 5,
  firma: 6,
  firma_incompleta: 6,
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
  /** pago_por de la evaluación del titular: quién paga cuando el rol no lee el pago (Gerencia). */
  pagoPor?: string | null
  /** Adenda 4 §12: el titular ya consultado espera a que autorice el coarrendatario (espera_autorizacion.hasta). */
  esperaHasta?: string | null
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
  if (d.contratosEstados.includes('pendiente_firma')) return 'firma'
  // El proceso ya cerró: nadie puede firmar, le toca actuar a la inmobiliaria.
  if (d.contratosEstados.includes('firma_incompleta')) return 'firma_incompleta'
  if (d.estado === 'aprobado') return 'contrato'
  if (d.estado === 'condicionado') return 'decision'
  if (d.estudioRechazado) return 'no_habilitada'
  if (!d.habilitado) return d.citaResuelta || !d.tieneInmueble ? 'habilitar' : 'visita'
  if (d.titularEstado === 'fallido') return 'fallida'
  // Sin la firma del titular (pagado antes de autorizar) no falta la consulta: falta el prospecto.
  if (d.titularEstado && SIN_EJECUTAR.includes(d.titularEstado) && d.autorizacionEstado === 'autorizado') return 'sin_ejecutar'
  // Sin esto el titular retenido hasta 48 h se leía «En evaluación… llega en minutos».
  if (d.esperaHasta && d.titularEstado === 'en_proceso') return 'espera_coarrendatario'
  if (d.titularEstado && CONSULTA_INICIADA.includes(d.titularEstado)) return 'consulta'
  if (d.enlaceVencido) return 'enlace'
  if (d.pago?.estado === 'sin_definir') return 'pago'
  // Opción B: paga la inmobiliaria y el enlace sale después del pago (Adenda 2 §7).
  if (d.pago?.paga === 'gestor' && !d.pago.puede_avanzar) return 'pago'
  // Gerencia no lee el pago: el estado del titular lo dice, y pago_por quién paga (como el RPC de la lista).
  if (!d.pago && d.titularEstado === 'pago_pendiente') return d.pagoPor === 'arrendatario' ? 'pago_prospecto' : 'pago'
  if (d.autorizacionEstado !== 'autorizado') return 'autorizacion'
  if (d.pago && !d.pago.puede_avanzar) return d.pago.paga === 'arrendatario' ? 'pago_prospecto' : 'pago'
  return 'consulta'
}

/** De quién es el siguiente paso. */
export type Turno = 'gestor' | 'prospecto' | 'cofianza' | 'firmas'

/** Quién mira: gestor = quien gestiona el estudio; cofianza = roles internos; equipo = sin edición (solo lectura). */
export type VistaTurno = 'gestor' | 'cofianza' | 'equipo'

/**
 * Mismo criterio que depende_de del RPC de la lista (20261027000002), para que
 * lista y detalle digan lo mismo: la visita tampoco la cuenta el RPC. null = no
 * hay turno (cerrado o sin paso pendiente de alguien).
 */
export function turnoDeEtapa(etapa: EtapaEstudio, conCondicion: boolean): Turno | null {
  switch (etapa) {
    case 'habilitar':
    case 'enlace':
    case 'pago':
    case 'sin_ejecutar':
    case 'fallida':
    case 'contrato':
    case 'firma_incompleta':
      return 'gestor'
    case 'autorizacion':
    case 'pago_prospecto':
    case 'espera_coarrendatario':
      return 'prospecto'
    case 'consulta':
      return 'cofianza'
    case 'decision':
      return conCondicion ? 'prospecto' : 'cofianza'
    case 'firma':
      return 'firmas'
    default:
      return null
  }
}
