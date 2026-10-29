/**
 * Etapa de una fila de la lista de estudios: la misma que el detalle calcula
 * con calcularEtapa, pero solo con lo que trae el RPC de la lista. Pura.
 */

import type { IExpediente } from '@/types/expediente'
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
  if (etapa === 'contrato' && !e.inmueble_id) return 'vincular el inmueble'
  return ACCION_GESTOR[etapa]
}
