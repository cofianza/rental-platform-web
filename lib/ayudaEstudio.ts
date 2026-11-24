/**
 * Textos de las burbujas de ayuda del detalle del estudio (pedido del 23-oct).
 * Un solo lugar para que digan lo mismo en todas las tarjetas. Sin nombres de
 * centrales: también los lee la inmobiliaria.
 */

import { esEtapaDeTraba, type EtapaEstudio, type VistaTurno } from './etapaEstudio'
import { TEXTO_REAPERTURA } from './personaEstudio'

export const AYUDA = {
  autorizacion:
    // Sin el plazo en días: es calibrable (DIAS_EXPIRACION_ESTUDIO); la fecha real sale en la tarjeta.
    'Es el permiso de la persona para consultar sus datos en las centrales de riesgo (Ley 1581). Le llega por WhatsApp y correo; cuando se envía, en esta tarjeta aparece la fecha en que vence. Sin él no se consulta a nadie.',
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
    'Segundo firmante del estudio. No es fiador ni necesita finca raíz: firma el contrato con el titular y los dos responden solidariamente por todas las obligaciones del contrato. Si califica, suma puntos e ingreso al titular y el estudio se decide con los dos. Un coarrendatario va incluido en el precio.',
  pago:
    'Quién cubre el estudio: un cupo del paquete de la inmobiliaria o el prospecto con el enlace de pago. Sin pago no se consulta a las centrales.',
  // El propietario no tiene paquetes de cupos: paga él con Mercado Pago o le envía el cobro al prospecto.
  pagoPropietario:
    'Quién cubre el estudio: usted, con Mercado Pago (tarjeta o PSE), o el prospecto con el enlace de pago. Sin pago no se consulta a las centrales.',
  cupo:
    'El cupo queda reservado al habilitar el estudio y se descuenta solo cuando una consulta da resultado, la del titular o la del coarrendatario. Si no se llega a consultar, vuelve al saldo de la inmobiliaria, salvo que el paquete ya haya vencido.',
  visita:
    'La visita al inmueble va antes de habilitar la evaluación. Si ya se hizo por fuera (WhatsApp u otro medio), se puede marcar como hecha.',
  contrato:
    'El contrato de arrendamiento afianzado por Cofianza. Se firma por medios electrónicos entre las partes: arrendatario, coarrendatario si lo hay y arrendador.',
  // Sin el plazo en días: es calibrable.
  condicionado:
    'El estudio no se aprobó solo. Puede estar aprobado con condición (la persona tiene un plazo para sumar un coarrendatario) o en revisión (lo decide un analista de Cofianza con la información completa).',
  responsable:
    'La persona de su equipo que sigue este estudio: recibe los avisos y los pendientes.',
  responsableAnalista:
    'El analista de Cofianza que sigue este estudio: recibe los avisos y los pendientes de la revisión.',
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
    // Veraz con la API: correo a quien creó el inmueble (propietario_id) y aviso en la plataforma al responsable.
    'Lo decide un analista de Cofianza y le avisamos a quien creó el inmueble y al responsable del estudio cuando decida. Mientras tanto puede reforzar el caso con soportes de ingreso.',
  // Respaldo: cuando la API envía el texto de qué hacer, se muestra ese.
  segundo_firmante: 'El estudio quedó aprobado con segundo firmante: falta presentarlo antes de que venza el plazo. Puede invitarlo en la tarjeta del coarrendatario, aquí abajo.',
  bloqueado: 'La operación está bloqueada. En «Evaluación crediticia», aquí abajo, está qué hacer para continuar.',
  contrato: 'El estudio está aprobado: cree el contrato aquí abajo.',
  // Respaldo de las etapas de traba_contrato: cuando la API envía su texto, se muestra ese.
  canon_excede:
    'El canon de la propiedad es mayor al que cubre el estudio. Cree el contrato con un canon igual o menor al aprobado, o reasigne el estudio a una propiedad de ese canon.',
  coarrendatario_pendiente:
    'El estudio está aprobado, pero el segundo firmante invitado aún no responde. Puede esperar su respuesta o seguir sin él: el contrato se hará solo con el titular.',
  // Sin decir «en curso»: la misma traba cubre la consulta que falló (la API lo distingue en su texto, que es el que se muestra).
  coarrendatario_en_evaluacion:
    'El estudio está aprobado, pero el segundo firmante que aceptó todavía no tiene resultado. Puede esperarlo o seguir sin él: el contrato se hará solo con el titular.',
  coarrendatario_en_verificacion:
    'El estudio está aprobado. Cofianza está verificando al segundo firmante: puede esperar el resultado o seguir sin él (sale del estudio y el contrato se hará solo con el titular).',
  solicitante_en_verificacion:
    'El estudio está aprobado. Cofianza está terminando una verificación del solicitante: cuando termine, podrá continuar con el contrato desde este estudio.',
  vencido:
    'El resultado del estudio ya no sirve para el contrato: venció o ya no alcanza el tiempo para firmar. Para continuar, cree un estudio nuevo.',
  firma: 'El contrato está en firma electrónica: falta que firmen todas las partes.',
  firma_incompleta: 'La firma quedó incompleta y la fianza no opera. Abra el contrato: allí verá qué aviso aceptar y si puede reenviarlo o debe cancelarlo.',
  vigente: 'El contrato está firmado y vigente.',
  finalizado: 'El estudio terminó y queda para consulta.',
  no_aprobado: 'El estudio no quedó aprobable. Abajo están el motivo y, si aplica, cómo apelar.',
  cancelado: 'El estudio se canceló y no continúa.',
  // Punto 5 del reporte: el mismo texto para todos (lo que falta lo hace la persona nueva).
  reapertura: TEXTO_REAPERTURA,
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
  canon_excede:
    'El canon de la propiedad es mayor al que cubre el estudio. Falta que la inmobiliaria o el propietario ajusten el canon del contrato o reasignen el estudio.',
  coarrendatario_pendiente:
    'El estudio está aprobado, pero el segundo firmante invitado aún no responde. La inmobiliaria o el propietario pueden esperarlo o seguir sin él.',
  coarrendatario_en_evaluacion:
    'El estudio está aprobado, pero el segundo firmante que aceptó todavía no tiene resultado. La inmobiliaria o el propietario pueden esperarlo o seguir sin él.',
  coarrendatario_en_verificacion:
    'El estudio está aprobado. Cofianza verifica al segundo firmante antes de vincularlo al contrato; la inmobiliaria o el propietario pueden esperar el resultado o seguir sin él.',
  solicitante_en_verificacion:
    'El estudio está aprobado. Cofianza termina una verificación del solicitante antes de que se pueda crear el contrato; la inmobiliaria o el propietario solo esperan.',
  vencido:
    'El resultado del estudio ya no sirve para el contrato: venció o ya no alcanza el tiempo para firmar. Para continuar hace falta un estudio nuevo.',
  firma_incompleta: 'La firma quedó incompleta y la fianza no opera. Falta que la inmobiliaria o el propietario la reenvíen o cancelen el contrato.',
}

/**
 * Qué sigue para el miembro de solo lectura de la inmobiliaria (vista 'equipo'): lo que
 * falta lo hace alguien de su propio equipo, no «la inmobiliaria o el propietario».
 */
export const AYUDA_ETAPA_EQUIPO: Partial<Record<EtapaEstudio, string>> = {
  visita: 'Falta que alguien de su equipo con permiso de edición agende la visita o indique que ya se hizo por fuera.',
  habilitar: 'Falta que alguien de su equipo con permiso de edición decida si habilita la evaluación crediticia.',
  autorizacion:
    'La persona debe abrir el enlace que le llegó por WhatsApp y correo y autorizar la consulta a las centrales de riesgo.',
  enlace: 'El enlace de autorización venció o se detuvo. Alguien de su equipo con permiso de edición puede reenviarlo.',
  pago: 'Falta que alguien de su equipo con permiso de edición defina o complete el pago del estudio. Sin el pago no se consulta a las centrales de riesgo.',
  sin_ejecutar:
    'La persona autorizó y el estudio está pagado, pero la consulta no arrancó sola. Alguien de su equipo con permiso de edición puede ejecutarla.',
  fallida:
    'La consulta a las centrales no se completó (no es un rechazo de crédito). Alguien de su equipo con permiso de edición puede corregir los datos y reintentarla.',
  decision: 'Lo decide un analista de Cofianza; avisamos a quien creó el inmueble y al responsable del estudio cuando decida.',
  contrato: 'El estudio está aprobado. Falta que alguien de su equipo con permiso de edición cree el contrato.',
  canon_excede:
    'El canon de la propiedad es mayor al que cubre el estudio. Falta que alguien de su equipo con permiso de edición ajuste el canon del contrato o reasigne el estudio.',
  coarrendatario_pendiente:
    'El estudio está aprobado, pero el segundo firmante invitado aún no responde. Alguien de su equipo con permiso de edición puede esperarlo o seguir sin él.',
  coarrendatario_en_evaluacion:
    'El estudio está aprobado, pero el segundo firmante que aceptó todavía no tiene resultado. Alguien de su equipo con permiso de edición puede esperarlo o seguir sin él.',
  coarrendatario_en_verificacion:
    'El estudio está aprobado. Cofianza está verificando al segundo firmante: alguien de su equipo con permiso de edición puede esperar el resultado o seguir sin él.',
  solicitante_en_verificacion:
    'El estudio está aprobado. Cofianza está terminando una verificación del solicitante: cuando termine, alguien de su equipo con permiso de edición podrá crear el contrato.',
  vencido:
    'El resultado del estudio ya no sirve para el contrato: venció o ya no alcanza el tiempo para firmar. Alguien de su equipo con permiso de edición puede crear un estudio nuevo.',
  firma_incompleta:
    'La firma quedó incompleta y la fianza no opera. Falta que alguien de su equipo con permiso de edición la reenvíe o cancele el contrato.',
}

/**
 * «Aprobado con segundo firmante» con el segundo firmante ya evaluado y en verificación de Cofianza, cuando la
 * API todavía no lo dice con su propio texto (una API anterior). Sin prometer nada sobre el plazo: eso solo lo
 * afirma el texto de la API.
 */
export const TEXTO_SEGUNDO_EN_VERIFICACION =
  'Cofianza está verificando al segundo firmante presentado. No tiene que hacer nada por ahora: el resultado aparecerá aquí.'

/** El respaldo para Cofianza sin edición (Gerencia): no es «usted presentó». */
const TEXTO_SEGUNDO_EN_VERIFICACION_TERCERO = 'Cofianza verifica al segundo firmante; mientras tanto, quien gestiona el estudio no tiene que hacer nada.'

/**
 * Al analista (administrador u operador): la verificación se resuelve en la evaluación del segundo firmante. Sin
 * nombrar los botones: cuáles hay (dar por verificado, reintentar, ninguno) lo dice la API allí mismo.
 */
export const TEXTO_VERIFICAR_SEGUNDO_FIRMANTE =
  'Verifique al segundo firmante en su evaluación, aquí abajo: allí están las acciones disponibles.'

/** Adenda 6 §4: al analista, con las listas del solicitante sin verificar en un estudio aprobado. */
export const TEXTO_REGISTRAR_LISTAS_SOLICITANTE =
  'Faltan las listas restrictivas del solicitante: verifíquelas en Auco y registre la verificación en su evaluación, aquí abajo.'

/**
 * No aprobable, cuando alguna persona se puede reemplazar: la salida va antes que la apelación. La apelación,
 * «si todavía aplica»: su plazo pudo vencer o agotarse (lo dice el banner de abajo).
 */
const NO_APROBADO_CON_REEMPLAZO: Record<VistaTurno, string> = {
  gestor:
    'El estudio no quedó aprobable. Puede reemplazar a una persona en «Personas del estudio», aquí abajo, o, si todavía aplica, el solicitante puede apelar (vea abajo).',
  equipo:
    'El estudio no quedó aprobable. Alguien de su equipo con permiso de edición puede reemplazar a una persona en «Personas del estudio», aquí abajo, o, si todavía aplica, el solicitante puede apelar (vea abajo).',
  cofianza:
    'El estudio no quedó aprobable. La inmobiliaria o el propietario pueden reemplazar a una persona o, si todavía aplica, el solicitante puede apelar (vea abajo).',
}

/**
 * El aviso de un estudio que acaba de quedar aprobado. Con algo que impide crear el contrato (el texto de
 * traba_contrato, redactado por la API) se dice eso; sin propiedad, que falta vincularla; si no, que ya
 * puede crearlo. Pura.
 */
export function avisoEstudioAprobado(traba?: { texto?: string | null } | null, o: { sinInmueble?: boolean } = {}): string {
  const texto = traba?.texto?.trim()
  if (texto) return `Estudio aprobado. ${texto}`
  if (o.sinInmueble) return 'Estudio aprobado. Para crear el contrato, primero vincule el inmueble.'
  return 'Estudio aprobado. Ya puede crear el contrato.'
}

function textoEspera(plazo: string, gestor: boolean): string {
  // «Segundo firmante», como el nombre de la etapa («Esperando al segundo firmante»).
  const base = `Ya se consultaron las centrales de riesgo. La decisión espera ${plazo} a que el segundo firmante autorice; después se decide con quienes hayan autorizado.`
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
    /** Visita: ya hay una cita solicitada o confirmada (falta hacerla, no agendarla). */
    citaActiva?: boolean
    /** Miembro de la inmobiliaria con el perfil personal incompleto: no actúa hasta completarlo. */
    perfilIncompleto?: boolean
    /** En una lista (burbuja de la etapa): «aquí abajo» no apunta a nada; se dice «en el detalle del estudio». */
    enLista?: boolean
    /** Qué hacer, redactado por la API (`siguiente_accion_texto`). Manda en las etapas que salen del resultado. */
    textoApi?: string | null
    /**
     * traba_contrato.texto, redactado por la API para quien gestiona: manda en las etapas que salen de él
     * (canon, coarrendatario, vencido), solo en la vista del gestor que puede actuar.
     */
    textoTraba?: string | null
    /**
     * Cofianza verifica al segundo firmante ya evaluado. 'api' = lo dice la API (`segundo_en_verificacion`) y su
     * `siguiente_accion_texto` ya es el de esa situación; 'web' = lo dedujo la web de la evaluación del segundo
     * firmante (una API anterior): el texto de la API todavía pediría presentar a alguien, y no se usa.
     */
    segundoEnVerificacion?: 'api' | 'web' | false
    /** No aprobable: alguna persona del estudio se puede reemplazar (lo dice el texto de `persona_a5d`). */
    reemplazoPosible?: boolean
  },
): string {
  const analista = o.vista === 'cofianza' && o.analista
  // Al analista, con el segundo firmante en verificación (también con el estudio ya aprobado): qué le toca.
  if (analista && (etapa === 'coarrendatario_en_verificacion' || (etapa === 'segundo_firmante' && o.segundoEnVerificacion))) {
    return o.enLista ? paraLista(TEXTO_VERIFICAR_SEGUNDO_FIRMANTE) : TEXTO_VERIFICAR_SEGUNDO_FIRMANTE
  }
  if (analista && etapa === 'solicitante_en_verificacion') {
    return o.enLista ? paraLista(TEXTO_REGISTRAR_LISTAS_SOLICITANTE) : TEXTO_REGISTRAR_LISTAS_SOLICITANTE
  }
  if (etapa === 'segundo_firmante' && o.segundoEnVerificacion) {
    // La API redacta el texto de cada rol (quien gestiona, Cofianza); el respaldo, solo si lo dedujo la web.
    if (o.segundoEnVerificacion === 'api' && o.textoApi) return o.textoApi
    return o.vista === 'cofianza' ? TEXTO_SEGUNDO_EN_VERIFICACION_TERCERO : TEXTO_SEGUNDO_EN_VERIFICACION
  }
  if ((etapa === 'segundo_firmante' || etapa === 'bloqueado') && o.textoApi) return o.textoApi
  if (etapa === 'no_aprobado' && o.reemplazoPosible) {
    const texto = NO_APROBADO_CON_REEMPLAZO[o.vista]
    return o.enLista ? paraLista(texto) : texto
  }
  if (esEtapaDeTraba(etapa) && o.vista === 'gestor') {
    // Con el perfil incompleto no puede actuar: el texto de la API le diría que haga algo que no puede.
    if (o.perfilIncompleto) return 'Complete su perfil para poder actuar en este estudio.'
    // Tal cual; en una lista solo se corrige «aquí abajo», que ahí no apunta a nada.
    if (o.textoTraba) return o.enLista ? paraLista(o.textoTraba) : o.textoTraba
  }
  // Cofianza, Gerencia y solo lectura: los textos propios de su vista (AYUDA_ETAPA_TERCERO / _EQUIPO).
  const base = queSigueBase(etapa, o)
  const texto = o.enLista ? paraLista(base) : base
  // Sin edición por el perfil incompleto, «alguien de su equipo con permiso de edición» no le decía qué hacer.
  if (o.vista === 'equipo' && o.perfilIncompleto && /permiso de edición/.test(texto)) {
    return 'Complete su perfil para poder actuar en este estudio.'
  }
  return texto
}

/** Las frases del detalle señalan tarjetas «aquí abajo»; en una lista esas tarjetas están en el detalle. */
const EN_LISTA: Array<[RegExp, string]> = [
  [/en la tarjeta del pago, aquí abajo/g, 'en la tarjeta del pago, en el detalle del estudio'],
  [/en la tarjeta de la cita, aquí abajo/g, 'en la tarjeta de la cita, en el detalle del estudio'],
  [/en la tarjeta de abajo/g, 'en el detalle del estudio'],
  [/\(vea abajo\)/g, '(vea el detalle del estudio)'],
  [/aquí abajo/g, 'en el detalle del estudio'],
  [/en el detalle;/g, 'en el detalle del estudio;'],
  [/^Abajo están/, 'En el detalle del estudio están'],
]

export function paraLista(texto: string): string {
  return EN_LISTA.reduce((t, [re, por]) => t.replace(re, por), texto)
}

function queSigueBase(etapa: EtapaEstudio, o: Parameters<typeof queSigue>[1]): string {
  const gestor = o.vista === 'gestor'
  if (etapa === 'visita' && o.citaActiva && o.vista !== 'cofianza') {
    return o.vista === 'gestor'
      ? 'La visita ya está agendada. Cuando se haga, márquela como realizada en la tarjeta de la cita, aquí abajo.'
      : o.vista === 'equipo'
        ? 'La visita ya está agendada. Cuando se haga, alguien de su equipo con permiso de edición la marca como realizada.'
        : AYUDA_ETAPA.visita
  }
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
      : o.vista === 'equipo'
        ? `Falta un coarrendatario antes del ${o.fechaCondicion}. La persona puede agregarlo desde su enlace, o alguien de su equipo con permiso de edición puede invitarlo.`
        : `Falta que la persona sume un coarrendatario antes del ${o.fechaCondicion}.`
  }
  if (etapa === 'decision' && !gestor && o.analista) return 'Revise el caso y decida si lo aprueba.'
  // U2: el analista también puede ejecutar la consulta que no arrancó.
  if (etapa === 'sin_ejecutar' && !gestor && o.analista) {
    return 'La persona autorizó y el estudio está pagado, pero la consulta no arrancó sola. Ejecútela en «Evaluación crediticia», en el detalle; quien tramita el arriendo también puede hacerlo.'
  }
  if (o.vista === 'equipo' && AYUDA_ETAPA_EQUIPO[etapa]) return AYUDA_ETAPA_EQUIPO[etapa]
  return (!gestor && AYUDA_ETAPA_TERCERO[etapa]) || AYUDA_ETAPA[etapa]
}
