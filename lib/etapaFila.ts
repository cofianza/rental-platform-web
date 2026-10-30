/**
 * Etapa de una fila de la lista de estudios: la misma que el detalle calcula
 * con calcularEtapa, pero solo con lo que trae el RPC de la lista. Pura.
 */

import type { IExpediente, IExpedienteFilters } from '@/types/expediente'
import type { EtapaEstudio } from './etapaEstudio'

const CONTRATO_FIRMADO = ['firmado', 'vigente', 'finalizado']
const CONSULTA = ['en_proceso', 'completado', 'pagado', 'formulario_completado', 'documentos_cargados']

export function etapaDeFila(e: IExpediente): EtapaEstudio {
  if (e.estado === 'rechazado') return 'no_aprobado'
  if (e.estado === 'cerrado') {
    if (e.estado_pre_cancelacion === 'rechazado') return 'no_aprobado'
    return e.estado_pre_cancelacion ? 'cancelado' : 'finalizado'
  }
  if (e.contrato_estado && CONTRATO_FIRMADO.includes(e.contrato_estado)) return 'vigente'
  if (e.contrato_estado === 'pendiente_firma' || e.contrato_estado === 'firma_incompleta') return 'firma'
  const ev = e.estudio_vigente
  if (ev?.coarrendatario_fallido) return 'fallida'
  if (e.estado === 'aprobado') return 'contrato'
  if (e.estado === 'condicionado') return 'decision'
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
 * Lo que hay que hacer cuando depende_de === 'gestor'. En minúscula: sigue a
 * «Su turno:». Las demás etapas no llevan acción, solo «Su turno».
 * ponytail: espejo de las cláusulas (a) a (k) del RPC de la lista. Si se
 * desalinean, que el RPC devuelva el código de la cláusula y la web solo lo traduzca.
 */
export const ACCION_GESTOR: Partial<Record<EtapaEstudio, string>> = {
  habilitar: 'habilitar la evaluación',
  enlace: 'reenviar el enlace',
  pago: 'completar el pago del estudio',
  fallida: 'reintentar la consulta',
  sin_ejecutar: 'ejecutar la consulta',
  contrato: 'crear el contrato',
  firma: 'revisar la firma del contrato',
  vigente: 'cargar el acta de entrega',
}

export function accionDeFila(e: IExpediente, etapa: EtapaEstudio): string | undefined {
  if (e.depende_de !== 'gestor') return undefined
  if (etapa === 'enlace' && e.estudio_vigente?.estado_bloqueo === 'bloqueado_documento') return 'corregir el documento'
  // Con la identidad rechazada solo Cofianza reenvía: el gestor no puede «reenviar el enlace».
  if (etapa === 'enlace' && e.estudio_vigente?.estado_bloqueo === 'identidad_rechazada') return 'comunicarse con Cofianza'
  if (etapa === 'contrato' && !e.inmueble_id) return 'vincular el inmueble'
  // L3: con el contrato en borrador ya no hay que crearlo, sino terminarlo.
  if (etapa === 'contrato' && e.contrato_estado === 'borrador') return 'terminar el contrato'
  return ACCION_GESTOR[etapa]
}

/**
 * U9: «Tomar» solo cuando el turno es de Cofianza: la decisión sin condición de
 * coarrendatario, la consulta fallida y la que no arrancó. En las demás no hay
 * nada que un analista deba tomar.
 */
export function tomarDisponible(e: IExpediente, etapa: EtapaEstudio = etapaDeFila(e)): boolean {
  if (etapa === 'decision') return !e.estudio_vigente?.condicion_coarrendatario
  return etapa === 'fallida' || etapa === 'sin_ejecutar'
}

/**
 * U14: la «Última actividad» solo se pinta de alerta cuando alguien tiene que
 * mover el estudio (el gestor o Cofianza). Con el contrato en firma o vigente,
 * o el estudio terminado, el tiempo quieto no es un atraso.
 */
export function actividadConAlerta(e: IExpediente, etapa: EtapaEstudio = etapaDeFila(e)): boolean {
  if (['vigente', 'firma', 'finalizado', 'no_aprobado', 'cancelado'].includes(etapa)) return false
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
