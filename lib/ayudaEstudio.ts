/**
 * Textos de las burbujas de ayuda del detalle del estudio (pedido del 23-oct).
 * Un solo lugar para que digan lo mismo en todas las tarjetas. Sin nombres de
 * centrales: también los lee la inmobiliaria.
 */

import type { EtapaEstudio } from './etapaEstudio'

export const AYUDA = {
  autorizacion:
    'Es el permiso de la persona para consultar sus datos en las centrales de riesgo (Ley 1581). Le llega por WhatsApp y correo, vence a los 15 días y, sin él, no se consulta a nadie.',
  reenviar:
    'Envía un enlace nuevo a la persona y el anterior deja de servir. Úselo si no le llegó, si venció o después de corregir sus datos. Cuenta dentro de los reenvíos permitidos.',
  corregir:
    'Si el nombre o el documento quedaron mal escritos, corríjalos antes de que la persona autorice y reenvíele el enlace. Corregir solo el nombre no gasta corrección del documento.',
  evaluacion:
    'Es la consulta a las centrales de riesgo y el cálculo del puntaje de Cofianza. Corre sola cuando la persona autoriza y el estudio está pagado; el resultado llega en minutos.',
  evaluaciones:
    'Las consultas a las centrales de riesgo de este estudio: la del titular y, si hay, la del coarrendatario. Cada persona se consulta apenas autoriza.',
  coarrendatario:
    'Persona que vive con el titular y firma el contrato como arrendataria (no es fiador). Si califica, suma puntos e ingreso al titular y el estudio se decide con los dos. Un coarrendatario va incluido en el precio.',
  pago:
    'Quién cubre el estudio: un cupo del paquete de la inmobiliaria o el prospecto con el enlace de pago. Sin pago no se consulta a las centrales.',
  cupo:
    'El cupo queda reservado al habilitar el estudio y se descuenta solo cuando la consulta da resultado. Si no se llega a consultar, vuelve al saldo de la inmobiliaria.',
  visita:
    'La visita al inmueble va antes de habilitar la evaluación. Si ya se hizo por fuera (WhatsApp u otro medio), se puede marcar como omitida.',
  contrato:
    'El contrato de arrendamiento afianzado por Cofianza. Se firma por medios electrónicos: arrendatario, arrendador y Cofianza.',
  condicionado:
    'El estudio no se aprobó solo. «Está cerca»: la persona tiene 15 días para sumar un coarrendatario. En revisión: lo decide un analista de Cofianza con la información completa.',
  responsable:
    'La persona de su equipo que sigue este estudio: recibe los avisos y los pendientes.',
} as const

/** Qué significa la etapa del chip del encabezado. */
export const AYUDA_ETAPA: Record<EtapaEstudio, string> = {
  visita: 'Falta la visita al inmueble, o marcarla como omitida si se hizo por fuera.',
  // Neutro: con la inmobiliaria, al habilitar a la persona no le llega nada todavía (antes se elige quién paga).
  habilitar: 'La visita ya se resolvió: falta decidir si se habilita la evaluación crediticia de la persona.',
  no_habilitada: 'Después de la visita se decidió no habilitar la evaluación: no se consultó a las centrales de riesgo y el estudio no continúa.',
  autorizacion: 'Se envió el enlace: falta que la persona autorice la consulta a las centrales de riesgo.',
  // Sin prometer reenvío: según el bloqueo, lo reenvía el equipo o solo Cofianza.
  enlace: 'El enlace de autorización venció o se detuvo y la persona ya no puede firmarlo. En «Autorización Habeas Data» está cómo seguir.',
  pago: 'Falta el pago del estudio: sin él no se consulta a las centrales de riesgo.',
  consulta: 'La consulta a las centrales de riesgo está en curso o por arrancar: el resultado llega en minutos.',
  sin_ejecutar: 'La persona autorizó y el estudio está pagado, pero la consulta a las centrales de riesgo no arrancó. Se ejecuta desde la tarjeta de la evaluación.',
  fallida: 'La consulta a las centrales de riesgo no se completó (no es un rechazo de crédito). En la tarjeta de la evaluación está cómo seguir.',
  decision: 'El estudio no se aprobó solo: espera un coarrendatario o la decisión de un analista de Cofianza.',
  contrato: 'Estudio aprobado: el siguiente paso es crear el contrato.',
  firma: 'El contrato está enviado a firma electrónica: falta que firmen todas las partes.',
  vigente: 'El contrato está firmado y vigente.',
  finalizado: 'El estudio terminó.',
  no_aprobado: 'Con la información disponible el estudio no quedó aprobable.',
  cancelado: 'El estudio se cerró antes de terminar.',
}

/** Adenda 3 §6: la etapa «decision» con condición de coarrendatario (no la decide un analista). */
export const AYUDA_CON_CONDICION =
  'Aprobado con condición: la persona tiene un plazo para sumar un coarrendatario. Mientras la condición esté vigente no lo decide un analista.'
