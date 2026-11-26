/**
 * Etapa de una fila de la lista de estudios: la misma que el detalle calcula
 * con calcularEtapa, pero solo con lo que trae el RPC de la lista. Pura.
 */

import type { IExpediente, IExpedienteFilters } from '@/types/expediente'
import { ETAPAS_SEGUNDO_FIRMANTE_EN_CURSO, etapaCondicionado, etapaDeTraba, type EtapaEstudio } from './etapaEstudio'
import { ACCION_CARGA_NOTARIA } from './turnoEstudio'

const CONTRATO_FIRMADO = ['firmado', 'vigente', 'finalizado']
const CONSULTA = ['en_proceso', 'completado', 'pagado', 'formulario_completado', 'documentos_cargados']

export function etapaDeFila(e: IExpediente): EtapaEstudio {
  // Reabierto por un reemplazo (como calcularEtapa): espera a la persona nueva.
  if (e.reapertura_abierta && e.estado !== 'cerrado') return 'reapertura'
  if (e.estado === 'rechazado') return 'no_aprobado'
  if (e.estado === 'cerrado') {
    if (e.estado_pre_cancelacion === 'rechazado') return 'no_aprobado'
    return e.estado_pre_cancelacion ? 'cancelado' : 'finalizado'
  }
  if (e.contrato_estado && CONTRATO_FIRMADO.includes(e.contrato_estado)) return 'vigente'
  if (e.contrato_estado === 'pendiente_firma') return 'firma'
  if (e.contrato_estado === 'firma_incompleta') return 'firma_incompleta'
  const ev = e.estudio_vigente
  // Un resultado vencido ya no sirve para nada: ni reintentar la consulta del coarrendatario.
  if (e.estado === 'aprobado' && e.traba_contrato?.codigo === 'vencido') return 'vencido'
  if (ev?.coarrendatario_fallido) return 'fallida'
  // Reporte de Gerencia (21-nov): lo que impide el contrato lo dice la API; sin traba, 'contrato' como siempre.
  if (e.estado === 'aprobado') return etapaDeTraba(e.traba_contrato?.codigo) ?? 'contrato'
  if (e.estado === 'condicionado') return etapaCondicionado(ev?.desenlace)
  if (!ev || ev.estado === 'cancelado') {
    if (!e.cita_realizada) return 'visita'
    return e.depende_de === 'gestor' ? 'habilitar' : 'no_habilitada'
  }
  if (ev.estado === 'fallido') return 'fallida'
  if (ev.sin_ejecutar) return 'sin_ejecutar'
  if (ev.espera_coarrendatario_hasta) return 'espera_coarrendatario'
  if (ev.expirado) return 'enlace'
  if (CONSULTA.includes(ev.estado)) return 'consulta'
  if (ev.estado === 'pago_pendiente' || (ev.estado === 'solicitado' && e.depende_de === 'gestor')) {
    return e.depende_de === 'prospecto' ? 'pago_prospecto' : 'pago'
  }
  return 'autorizacion'
}

/**
 * Adenda 6 §2 y 6.1 §4: el contrato V3 de la fila está en firma esperando el registro del contrato firmado en notaría
 * (`firma_notaria` del RPC). El turno es de quien gestiona, no «Esperando las firmas». Pura.
 */
export const esperaCargaNotaria = (e: Pick<IExpediente, 'contrato_estado' | 'firma_notaria'>): boolean =>
  e.contrato_estado === 'pendiente_firma' && e.firma_notaria === true

/**
 * Lo que hay que hacer cuando depende_de === 'gestor'. En minúscula y en infinitivo: sigue a
 * «Su turno:» o a «Turno del gestor:». Las demás etapas no llevan acción, solo «Su turno».
 * ponytail: espejo de lo que el RPC de la lista cuenta como turno de quien gestiona. Si se
 * desalinean, que el RPC devuelva el código de su regla y la web solo lo traduzca.
 */
export const ACCION_GESTOR: Partial<Record<EtapaEstudio, string>> = {
  habilitar: 'habilitar la evaluación',
  enlace: 'reenviar el enlace',
  pago: 'completar el pago del estudio',
  fallida: 'reintentar la consulta',
  sin_ejecutar: 'ejecutar la consulta',
  contrato: 'crear el contrato',
  // Reporte de Gerencia (21-nov): con la traba nunca «crear el contrato».
  canon_excede: 'ajustar el canon o reasignar el estudio',
  coarrendatario_pendiente: 'esperar al segundo firmante o seguir sin él',
  // «el resultado», no «la evaluación en curso»: la misma traba cubre la consulta que falló (lo dice el texto de la API).
  coarrendatario_en_evaluacion: 'esperar el resultado del segundo firmante o seguir sin él',
  coarrendatario_en_verificacion: 'esperar la verificación del segundo firmante o seguir sin él',
  firma: 'revisar la firma del contrato',
  firma_incompleta: 'revisar la firma incompleta',
  vigente: 'cargar el acta de entrega',
  // Qué hacer exactamente lo dice el texto de la API, en el detalle.
  bloqueado: 'revisar el bloqueo en el detalle',
  // Sin coarrendatario en curso (la API da el turno a quien gestiona): lo dice accionSegundoFirmante.
  segundo_firmante: 'invitar al segundo firmante',
}

/** Lo del resultado que decide la acción del «aprobado con segundo firmante» (de la fila o de la evaluación del titular). */
export interface DatosAccionSegundoFirmante {
  siguiente_accion?: string | null
  siguiente_accion_texto?: string | null
  /** El canal no admite segundo firmante (propietario directo). La API solo lo manda con true. */
  canal_sin_segundo_firmante?: boolean
}

/**
 * La acción de quien gestiona en el «aprobado con segundo firmante», cuando el turno es suyo:
 * - ninguna (undefined) si no hay nada que pueda hacer: el canal no admite segundo firmante
 *   (`canal_sin_segundo_firmante` de la API: propietario directo) o la API no pide acción ('ninguna', p. ej.
 *   con el segundo firmante en verificación). Ahí el texto de la API dice por qué;
 * - «reemplazar al segundo firmante» solo si ya hay uno evaluado que no alcanza (la API: sustituir). Si a
 *   quien hay que cambiar es al solicitante, «reemplazar al solicitante»: la API no trae un campo para
 *   distinguirlo, así que se lee del inicio de su texto; si no se reconoce, queda «al segundo firmante»;
 * - «invitar al segundo firmante» si falta presentarlo.
 * Con una API anterior (sin `canal_sin_segundo_firmante`) el propietario directo ve «invitar al segundo
 * firmante», como antes. Pura.
 */
export function accionSegundoFirmante(ev: DatosAccionSegundoFirmante | null | undefined): string | undefined {
  if (ev?.canal_sin_segundo_firmante === true || ev?.siguiente_accion === 'ninguna') return undefined
  if (ev?.siguiente_accion === 'sustituir_segundo_firmante') {
    return /^El solicitante no cumple/i.test(ev.siguiente_accion_texto?.trim() ?? '') ? 'reemplazar al solicitante' : 'reemplazar al segundo firmante'
  }
  return ACCION_GESTOR.segundo_firmante
}

/**
 * Etapas de traba en que el turno es siempre de quien gestiona, diga lo que diga depende_de (el RPC puede
 * contar al segundo firmante en curso como turno del prospecto o de Cofianza: la decisión de esperarlo o de
 * seguir sin él es del gestor).
 */
export const TURNO_GESTOR_TRABA: EtapaEstudio[] = ['canon_excede', ...ETAPAS_SEGUNDO_FIRMANTE_EN_CURSO]

export function accionDeFila(e: IExpediente, etapa: EtapaEstudio): string | undefined {
  // Adenda 6.1 §4: en notaría no hay firma que revisar ni firmas que esperar: hay que registrar el contrato firmado.
  if (etapa === 'firma' && esperaCargaNotaria(e)) return ACCION_CARGA_NOTARIA
  if (e.depende_de !== 'gestor' && !(e.depende_de && TURNO_GESTOR_TRABA.includes(etapa))) return undefined
  if (etapa === 'segundo_firmante') return accionSegundoFirmante(e.estudio_vigente)
  if (etapa === 'enlace' && e.estudio_vigente?.estado_bloqueo === 'bloqueado_documento') return 'corregir el documento'
  // Con la identidad rechazada solo Cofianza reenvía: el gestor no puede «reenviar el enlace».
  if (etapa === 'enlace' && e.estudio_vigente?.estado_bloqueo === 'identidad_rechazada') return 'comunicarse con Cofianza'
  if (etapa === 'contrato' && !e.inmueble_id) return 'vincular el inmueble'
  // L3: con el contrato en borrador ya no hay que crearlo, sino terminarlo.
  if (etapa === 'contrato' && e.contrato_estado === 'borrador') return 'terminar el contrato'
  return ACCION_GESTOR[etapa]
}

/** Cofianza verifica al segundo firmante ya evaluado (lo dice la API en la fila; ausente con una API anterior). */
export const segundoEnVerificacion = (e: Pick<IExpediente, 'segundo_en_verificacion'>): boolean => e.segundo_en_verificacion === true

/**
 * U9: «Tomar» solo cuando el turno es de Cofianza: la decisión sin condición de
 * coarrendatario, la verificación del segundo firmante, la consulta fallida y la que no
 * arrancó. En las demás no hay nada que un analista deba tomar.
 */
export function tomarDisponible(e: IExpediente, etapa: EtapaEstudio = etapaDeFila(e)): boolean {
  if (etapa === 'decision') return !e.estudio_vigente?.condicion_coarrendatario
  if (etapa === 'coarrendatario_en_verificacion') return true
  // Adenda 6 §4: el analista registra la verificación de las listas del solicitante.
  if (etapa === 'solicitante_en_verificacion') return true
  if (etapa === 'segundo_firmante') return segundoEnVerificacion(e)
  return etapa === 'fallida' || etapa === 'sin_ejecutar'
}

/**
 * U14: la «Última actividad» solo se pinta de alerta cuando alguien tiene que
 * mover el estudio (el gestor o Cofianza). Con el contrato en firma o vigente,
 * o el estudio terminado, el tiempo quieto no es un atraso.
 */
export function actividadConAlerta(e: IExpediente, etapa: EtapaEstudio = etapaDeFila(e)): boolean {
  // Vencido: el resultado ya no sirve; el tiempo quieto no es un atraso de nadie.
  if (['vigente', 'firma', 'finalizado', 'no_aprobado', 'cancelado', 'vencido'].includes(etapa)) return false
  return e.depende_de === 'gestor' || e.depende_de === 'cofianza'
}

/**
 * L4: «En revisión hace N días» para Cofianza, desde las 24 h (la alerta del
 * barrido); rojo desde los 3 días. null antes de las 24 h o sin el dato.
 */
export function revisionDemorada(desde: string | null | undefined, ahoraMs: number): { texto: string; tono: 'ambar' | 'rojo' } | null {
  if (!desde) return null
  const t = Date.parse(desde)
  if (!Number.isFinite(t)) return null
  const dias = Math.floor((ahoraMs - t) / 86_400_000)
  if (dias < 1) return null
  return { texto: `En revisión hace ${dias} ${dias === 1 ? 'día' : 'días'}`, tono: dias >= 3 ? 'rojo' : 'ambar' }
}

/**
 * X5: el ciclo del encabezado «Actividad» de la lista, con orden explícito en
 * cada paso: actividad reciente → actividad antigua → creación reciente →
 * creación antigua → actividad reciente. Desde otra columna empieza por
 * actividad reciente. Pura.
 */
export function siguienteOrdenActividad(
  sortBy: IExpedienteFilters['sortBy'],
  sortOrder: IExpedienteFilters['sortOrder'],
): { sortBy: IExpedienteFilters['sortBy']; sortOrder: IExpedienteFilters['sortOrder'] } {
  if (sortBy === 'updated_at') return sortOrder === 'desc' ? { sortBy: 'updated_at', sortOrder: 'asc' } : { sortBy: 'created_at', sortOrder: 'desc' }
  if (sortBy === 'created_at' && sortOrder === 'desc') return { sortBy: 'created_at', sortOrder: 'asc' }
  return { sortBy: 'updated_at', sortOrder: 'desc' }
}
