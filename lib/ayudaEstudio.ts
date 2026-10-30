/**
 * Textos de las burbujas de ayuda del detalle del estudio (pedido del 23-oct).
 * Un solo lugar para que digan lo mismo en todas las tarjetas. Sin nombres de
 * centrales: también los lee la inmobiliaria.
 */

import type { EtapaEstudio, VistaTurno } from './etapaEstudio'

export const AYUDA = {
  autorizacion:
    'Es el permiso de la persona para consultar sus datos en las centrales de riesgo (Ley 1581). Le llega por WhatsApp y correo, vence a los 15 días y, sin él, no se consulta a nadie.',
  reenviar:
    'Envía un enlace nuevo a la persona y el anterior deja de servir. Úselo si no le llegó, si venció o después de corregir sus datos. Cuenta dentro de los reenvíos permitidos.',
  corregir:
    'Si el nombre o el documento quedaron mal escritos, corríjalos antes de que la persona autorice y reenvíele el enlace. Corregir solo el nombre no gasta corrección del documento.',
  // Sin cortes ni números (Política §2).
  evaluacion:
    'Cofianza revisa primero las condiciones que no admiten excepción, como una mora actual o aparecer en listas restrictivas. Si se cumplen, calcula su propio puntaje con el historial de pagos, el endeudamiento y el canon frente al ingreso; por eso un buen puntaje de la central no basta por sí solo. El resultado puede ser aprobado, aprobado con la condición de sumar un coarrendatario, en revisión de un analista o no aprobable. Normalmente llega en minutos; si hay coarrendatario, la decisión espera un tiempo limitado a que autorice.',
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
  // Sin el plazo en días: es calibrable.
  condicionado:
    'El estudio no se aprobó solo. Puede estar aprobado con condición (la persona tiene un plazo para sumar un coarrendatario) o en revisión (lo decide un analista de Cofianza con la información completa).',
  responsable:
    'La persona de su equipo que sigue este estudio: recibe los avisos y los pendientes.',
} as const

/** Qué sigue en cada etapa, para quien gestiona el estudio (franja del detalle y la lista). */
export const AYUDA_ETAPA: Record<EtapaEstudio, string> = {
  visita: 'Agende la visita al inmueble o, si ya se hizo por fuera, indíquelo en la tarjeta de abajo.',
  // Con la inmobiliaria, al habilitar a la persona no le llega nada todavía (antes se elige quién paga).
  habilitar: 'Decida si habilita la evaluación crediticia de la persona. Hasta entonces no se le envía nada.',
  no_habilitada: 'Se decidió no habilitar la evaluación: no se consultó a las centrales de riesgo y el estudio no continúa.',
  autorizacion:
    'La persona debe abrir el enlace que le llegó por WhatsApp y correo y autorizar la consulta a las centrales de riesgo. Usted no tiene que hacer nada; si no le llegó, reenvíelo en «Autorización Habeas Data», aquí abajo.',
  // Sin prometer reenvío: según el bloqueo, lo reenvía el equipo o solo Cofianza.
  enlace: 'El enlace de autorización venció o se detuvo y la persona ya no puede usarlo. En «Autorización Habeas Data», aquí abajo, está cómo seguir.',
  pago: 'Defina quién paga el estudio o complete el pago en la tarjeta del pago, aquí abajo. Sin el pago no se consulta a las centrales de riesgo.',
  pago_prospecto:
    'La persona debe pagar el estudio con el enlace que recibió por correo y WhatsApp. Sin el pago no se consulta a las centrales de riesgo.',
  consulta: 'Se están consultando las centrales de riesgo; el resultado suele llegar en minutos. No hay que hacer nada.',
  espera_coarrendatario: textoEspera('un plazo limitado', true),
  sin_ejecutar:
    'La persona autorizó y el estudio está pagado, pero la consulta no arrancó sola. Ejecútela en «Evaluación crediticia», aquí abajo.',
  fallida:
    'La consulta a las centrales no se completó (no es un rechazo de crédito). En «Evaluación crediticia», aquí abajo, está qué corregir y cómo reintentarla.',
  decision:
    'Lo decide un analista de Cofianza y le avisamos cuando decida. Mientras tanto puede reforzar el caso con soportes de ingreso.',
  contrato: 'El estudio está aprobado: cree el contrato aquí abajo.',
  firma: 'El contrato está en firma electrónica: falta que firmen todas las partes.',
  vigente: 'El contrato está firmado y vigente.',
  finalizado: 'El estudio terminó y queda para consulta.',
  no_aprobado: 'El estudio no quedó aprobable. Abajo están el motivo y, si aplica, cómo apelar.',
  cancelado: 'El estudio se canceló y no continúa.',
}

/** Qué sigue para quien no gestiona (Cofianza, Gerencia, solo lectura). Sin texto aquí, se usa el de AYUDA_ETAPA. */
export const AYUDA_ETAPA_TERCERO: Partial<Record<EtapaEstudio, string>> = {
  visita: 'Falta que la inmobiliaria o el propietario agenden la visita o indiquen que ya se hizo por fuera.',
  habilitar: 'Falta que la inmobiliaria o el propietario decidan si habilitan la evaluación crediticia.',
  autorizacion:
    'La persona debe abrir el enlace que le llegó por WhatsApp y correo y autorizar la consulta a las centrales de riesgo.',
  pago: 'Falta que la inmobiliaria o el propietario definan o completen el pago del estudio. Sin el pago no se consulta a las centrales de riesgo.',
  espera_coarrendatario: textoEspera('un plazo limitado', false),
  sin_ejecutar:
    'La persona autorizó y el estudio está pagado, pero la consulta no arrancó sola. Se ejecuta desde «Evaluación crediticia», aquí abajo.',
  decision: 'Lo decide un analista de Cofianza.',
  contrato: 'Falta que la inmobiliaria o el propietario creen el contrato.',
}

function textoEspera(plazo: string, gestor: boolean): string {
  const base = `Ya se consultaron las centrales de riesgo. La decisión espera ${plazo} a que el coarrendatario autorice; después se decide con quienes hayan autorizado.`
  return gestor ? `${base} Si no lo va a hacer, reenvíele la invitación o cancélela aquí abajo.` : base
}

/**
 * La frase de la franja «Qué sigue» del detalle. `fechaCondicion` llega ya
 * formateada; `analista`: administrador u operador, que deciden la revisión.
 */
export function queSigue(
  etapa: EtapaEstudio,
  o: {
    vista: VistaTurno
    analista: boolean
    fechaCondicion: string | null
    esperaHasta: string | null
    sinInmueble: boolean
  },
): string {
  const gestor = o.vista === 'gestor'
  if (etapa === 'contrato' && o.sinInmueble) {
    return 'El estudio está aprobado: falta vincular el inmueble que eligió la persona; después se crea el contrato.'
  }
  if (etapa === 'espera_coarrendatario' && o.esperaHasta) {
    const hasta = new Date(o.esperaHasta).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' })
    return textoEspera(`hasta el ${hasta}`, gestor)
  }
  if (etapa === 'decision' && o.fechaCondicion) {
    return gestor
      ? `Falta un coarrendatario antes del ${o.fechaCondicion}. La persona puede agregarlo desde su enlace, o usted puede invitarlo aquí abajo.`
      : `Falta que la persona sume un coarrendatario antes del ${o.fechaCondicion}.`
  }
  if (etapa === 'decision' && !gestor && o.analista) return 'Revise el caso y decida si lo aprueba.'
  // U2: el analista también puede ejecutar la consulta que no arrancó.
  if (etapa === 'sin_ejecutar' && !gestor && o.analista) {
    return 'La persona autorizó y el estudio está pagado, pero la consulta no arrancó sola. Ejecútela en «Evaluación crediticia», en el detalle; quien tramita el arriendo también puede hacerlo.'
  }
  return (!gestor && AYUDA_ETAPA_TERCERO[etapa]) || AYUDA_ETAPA[etapa]
}
