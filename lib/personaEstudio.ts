/**
 * Lo que se dice de cada persona del estudio (el solicitante y el
 * coarrendatario) en el Resumen, la pestaña Evaluación y la tarjeta del
 * coarrendatario, coherente con el estado del estudio (reporte de Gerencia,
 * punto 4).
 *
 *  - Con la Adenda 5 la API manda `persona_a5d` en cada evaluación: el papel de
 *    la persona en el estudio (§11: titular es quien pasa, con independencia del
 *    rol con que se declaró), una etiqueta y un texto ya redactados. Se muestran
 *    tal cual; la web no los reescribe.
 *  - Sin él (estudios anteriores a la Adenda 5 o una API anterior) quedan los
 *    textos de la Adenda 3 V2 §7, pero condicionados al estado del estudio: si
 *    terminó sin aprobar o se cerró, ninguna evaluación dice que «sigue con el
 *    titular», que «se decide con los dos» ni que «la revisa un analista», ni
 *    sale «Válido» o «Aprobado» en verde junto a «terminó sin aprobar».
 *
 * Puro, sin React.
 */
import type { IPersonaA5d, IVerificacionSegundoFirmante, PapelPersonaA5d } from '@/types/estudio'

/**
 * En qué quedó el estudio, para lo que se dice de cada persona:
 *  - 'no_aprobable': el estudio está «no aprobable»;
 *  - 'cerrado_sin_aprobar': se cerró después de estar no aprobable;
 *  - 'cerrado': se cerró por otra razón (con contrato, cancelado...);
 *  - null: sigue en curso.
 */
export type CierreEstudio = 'no_aprobable' | 'cerrado_sin_aprobar' | 'cerrado' | null

export function cierreDelEstudio(expedienteEstado?: string | null, estadoPreCancelacion?: string | null): CierreEstudio {
  if (expedienteEstado === 'rechazado') return 'no_aprobable'
  if (expedienteEstado === 'cerrado') return estadoPreCancelacion === 'rechazado' ? 'cerrado_sin_aprobar' : 'cerrado'
  return null
}

/** El estudio terminó sin aprobar (no aprobable, o cerrado después de estarlo). */
export const terminoSinAprobar = (c: CierreEstudio): boolean => c === 'no_aprobable' || c === 'cerrado_sin_aprobar'

/** El estudio está cerrado, con cualquier estado anterior. */
export const estaCerrado = (c: CierreEstudio): boolean => c === 'cerrado' || c === 'cerrado_sin_aprobar'

/** Lo que dice una evaluación que ya no cuenta porque el estudio terminó sin aprobar. */
export const TEXTO_TERMINO_SIN_APROBAR = 'Esta evaluación no cambia el resultado: el estudio terminó sin aprobar.'

/** Lo que dice una evaluación con el estudio cerrado (cualquier estado anterior). */
export const TEXTO_ESTUDIO_CERRADO = 'El estudio se cerró: esta evaluación ya no cambia nada.'

/** El rótulo de una evaluación que ya no cuenta: esperaba revisión o pasó, pero el estudio terminó. */
export const ROTULO_SIN_EFECTO = 'Sin efecto'

/**
 * Estudio reabierto por un reemplazo (`reapertura_abierta`): lo que se espera de la persona nueva. Con el
 * mismo nombre del estado («Reabierto: esperando a la persona nueva», ETAPA_LABEL.reapertura).
 */
export const TEXTO_REAPERTURA = 'El estudio está reabierto: se decide de nuevo cuando la persona nueva acepte, autorice y termine su evaluación.'

/** Rótulo de la evaluación anterior mientras el estudio reabierto espera a la persona nueva. */
export const ROTULO_EN_ESPERA = 'En espera'

/** Texto de esa evaluación: corto, porque la franja «Qué sigue» ya dice cuándo se decide de nuevo. */
export const TEXTO_EN_ESPERA = 'Esta evaluación queda en espera mientras se evalúa a la persona nueva.'

/** Texto de la evaluación terminada cuando el estudio ya no sigue; null si sigue en curso. */
export function textoEstudioTerminado(c: CierreEstudio): string | null {
  if (estaCerrado(c)) return TEXTO_ESTUDIO_CERRADO
  if (terminoSinAprobar(c)) return TEXTO_TERMINO_SIN_APROBAR
  return null
}

/**
 * `persona_a5d` solo se usa completo (etiqueta y texto con contenido): una
 * respuesta a medias no reemplaza los textos de siempre por uno vacío.
 */
export function personaA5dUsable(p: IPersonaA5d | null | undefined): IPersonaA5d | null {
  if (!p || typeof p.etiqueta !== 'string' || typeof p.texto !== 'string') return null
  if (!p.etiqueta.trim() || !p.texto.trim()) return null
  return p
}

const normalizar = (t: string) => t.trim().toLocaleLowerCase('es-CO')

/** La etiqueta de la API es esta (sin distinguir mayúsculas ni espacios de más). */
export const etiquetaEs = (p: Pick<IPersonaA5d, 'etiqueta'> | null | undefined, etiqueta: string): boolean =>
  !!p && normalizar(p.etiqueta) === normalizar(etiqueta)

/** La evaluación es de alguien que ya fue reemplazado (etiqueta «Salió del estudio» de la API). */
export const esSalidaDelEstudio = (p: Pick<IPersonaA5d, 'etiqueta'> | null | undefined): boolean => etiquetaEs(p, 'Salió del estudio')

/** Cofianza verifica a la persona (etiqueta «En verificación» de la API). */
export const estaEnVerificacion = (p: Pick<IPersonaA5d, 'etiqueta'> | null | undefined): boolean => etiquetaEs(p, 'En verificación')

/**
 * A esta persona se la puede reemplazar hoy (`persona_a5d.puede_reemplazar` de la API, que solo lo manda con
 * true y a quien puede hacer el cambio). Sin el campo (una API anterior) no se afirma nada.
 */
export const ofreceReemplazo = (p: Pick<IPersonaA5d, 'puede_reemplazar'> | null | undefined): boolean => p?.puede_reemplazar === true

/** Rótulo del coarrendatario sin `persona_a5d` (Adenda 3 V2 §7: válido o no califica; nunca «no aprobable»). null = no aplica. */
export function rotuloCoarrendatario(resultado: string | null | undefined, cierre: CierreEstudio): string | null {
  // Con el estudio no aprobable, ni «Válido» (en verde) ni «En revisión»: no tiene efecto.
  if (resultado === 'aprobado') return terminoSinAprobar(cierre) ? ROTULO_SIN_EFECTO : 'Válido'
  if (resultado === 'rechazado') return 'No califica'
  if (resultado === 'condicionado') return cierre ? ROTULO_SIN_EFECTO : 'En revisión'
  return null
}

/** Texto de la evaluación terminada del coarrendatario, sin `persona_a5d`. */
export function textoCoarrendatario(resultado: string | null | undefined, cierre: CierreEstudio): string {
  const terminado = textoEstudioTerminado(cierre)
  if (terminado) return terminado
  // Adenda 3 V2 §7: la evaluación del coarrendatario no decide el estudio: suma o no suma.
  if (resultado === 'aprobado') return 'El coarrendatario es válido: suma su puntaje y su ingreso. El estudio se decide con los dos.'
  if (resultado === 'rechazado') return 'El coarrendatario no califica: no aporta puntos ni ingreso, y el estudio sigue con el titular.'
  return 'La evaluación del coarrendatario la revisa un analista de Cofianza.'
}

/**
 * Titular sin `persona_a5d`, con el estudio terminado: el rótulo y el texto de
 * la evaluación que no lo negó (aprobada, o en revisión sin decidir). null = se
 * dice lo de siempre (estudio en curso, evaluación no aprobable, o el
 * resultado que envía la API o la condición del coarrendatario dicen lo suyo).
 */
export function titularEstudioTerminado(
  e: { estado: string; resultado: string; decision_cofianza?: string | null; desenlace?: string | null; condicion_coarrendatario?: unknown },
  cierre: CierreEstudio,
): { rotulo: string; texto: string } | null {
  if (!cierre || e.estado !== 'completado' || e.desenlace || e.condicion_coarrendatario) return null
  if (e.resultado === 'rechazado' || e.decision_cofianza === 'negado') return null
  const enRevision = e.resultado === 'condicionado' && e.decision_cofianza !== 'aprobado'
  const aprobada = e.resultado === 'aprobado' || (e.resultado === 'condicionado' && e.decision_cofianza === 'aprobado')
  // Estudio cerrado con la evaluación aprobada (p. ej. con contrato): sigue siendo «Aprobado».
  if (aprobada && !terminoSinAprobar(cierre)) return null
  if (!enRevision && !aprobada) return null
  return { rotulo: ROTULO_SIN_EFECTO, texto: textoEstudioTerminado(cierre) ?? TEXTO_TERMINO_SIN_APROBAR }
}

const PAPEL: Record<PapelPersonaA5d, string | null> = {
  titular: 'Titular del estudio',
  segundo_firmante: 'Segundo firmante',
  sin_papel: null,
}

/** El papel de la persona en el estudio, para junto a su nombre. Sin papel (o uno desconocido): null. */
export function papelEnElEstudio(p: Pick<IPersonaA5d, 'papel'>): string | null {
  return PAPEL[p.papel] ?? null
}

/** La insignia: la etiqueta de la API, salvo que repita el papel que ya va junto al nombre. */
export function insigniaPersona(p: IPersonaA5d): string | null {
  const etiqueta = p.etiqueta.trim()
  if (!etiqueta) return null
  const papel = papelEnElEstudio(p)
  return papel && normalizar(papel) === normalizar(etiqueta) ? null : etiqueta
}

/** Etiquetas sin papel que van en rojo: hay que actuar (reemplazar o retirar). «No aprobado» es la de una API anterior. */
const ETIQUETAS_ROJAS = ['no pasó', 'no aprobado', 'bloquea la operación']
/** Etiquetas sin papel de una evaluación que ya no cuenta (gris, con una X). */
const ETIQUETAS_CERRADAS = ['sin efecto', 'salió del estudio', 'plazo vencido']

/** Lo del estudio que cambia el color de una persona. */
export interface ContextoTono {
  /** El estudio está aprobado: quien no califica no lo bloquea. */
  estudioAprobado?: boolean
  cierre?: CierreEstudio
}

/**
 * «No califica» va en rojo solo cuando hay que actuar (reemplazarla): con el
 * estudio aprobado no bloquea nada, y con el estudio cerrado ya no hay qué hacer.
 */
export const noCalificaEnRojo = (ctx: ContextoTono = {}): boolean => !ctx.estudioAprobado && !estaCerrado(ctx.cierre ?? null)

/**
 * El tono de la persona: 'exito' (segundo firmante), 'alerta' (no pasó,
 * bloquea, o no califica cuando hay que actuar), 'cerrada' (sin efecto, salió,
 * plazo vencido) o 'neutro' (en espera, en verificación, evaluada, no alcanza,
 * no califica sin nada que hacer...). null = titular: lo dice el resultado de
 * su evaluación, como siempre.
 */
export function tonoPersonaA5d(p: IPersonaA5d, ctx: ContextoTono = {}): 'exito' | 'alerta' | 'cerrada' | 'neutro' | null {
  if (p.papel === 'titular') return null
  if (p.papel === 'segundo_firmante') return 'exito'
  const e = normalizar(p.etiqueta)
  if (ETIQUETAS_ROJAS.includes(e)) return 'alerta'
  if (e === 'no califica') return noCalificaEnRojo(ctx) ? 'alerta' : 'neutro'
  if (ETIQUETAS_CERRADAS.includes(e)) return 'cerrada'
  return 'neutro'
}

/**
 * Cómo se presentó la persona, como dato secundario: solo cuando su papel en el
 * estudio no es el que declaró (Adenda 5 §11) o no tiene papel.
 */
export function comoSePresento(p: Pick<IPersonaA5d, 'papel'>, esCoarrendatario: boolean): string | null {
  const natural: PapelPersonaA5d = esCoarrendatario ? 'segundo_firmante' : 'titular'
  if (p.papel === natural) return null
  return esCoarrendatario ? 'Se presentó como coarrendatario' : 'Se presentó como solicitante'
}

/** El rol con que se declaró la persona: el mismo en todas las filas de la pestaña Evaluación y el detalle. */
export function rolDeclarado(esCoarrendatario: boolean): string {
  return esCoarrendatario ? 'Coarrendatario' : 'Solicitante'
}

/** Nombre de una evaluación del solicitante que ya no es el actual (fue reemplazado). */
export const SOLICITANTE_ANTERIOR = 'Solicitante anterior'

const documentoLimpio = (v: unknown): string => (typeof v === 'string' ? v.replace(/[^0-9a-z]/gi, '').toUpperCase() : '')

/**
 * La evaluación del solicitante es de otra persona (la que salió por un
 * reemplazo): la API la marca «Salió del estudio», o el documento evaluado no
 * es el del solicitante actual. Sin los dos documentos no se afirma nada.
 */
export function evaluacionDeOtroSolicitante(
  datosFormulario: unknown,
  documentoActual: string | null | undefined,
  persona?: Pick<IPersonaA5d, 'etiqueta'> | null,
): boolean {
  if (esSalidaDelEstudio(persona)) return true
  const evaluado = documentoLimpio((datosFormulario as { numero_documento?: unknown } | null | undefined)?.numero_documento)
  const actual = documentoLimpio(documentoActual)
  return !!evaluado && !!actual && evaluado !== actual
}

const TEXTO_LISTAS_POR_CONFIRMAR =
  'Coincidencia en listas restrictivas por confirmar. Ábrala en «Ver detalle» para confirmarla o descartarla antes de decidir.'
const TEXTO_REVISE_Y_DECIDA = 'Revise el motivo y decida si lo aprueba.'

/**
 * Al analista (administrador u operador), con la persona «En verificación»: qué hacer, no el texto para quien
 * gestiona. Con la verificación del segundo firmante que manda la API (`verificacion`), lo que ofrecen sus
 * botones (no «decida si lo aprueba»: ahí no hay «Aprobar estudio»); si no ofrece ninguno, nada: su motivo
 * ya dice por qué.
 */
export function textoVerificacionAnalista(
  listasEstado: string | null | undefined,
  verificacion?: Pick<IVerificacionSegundoFirmante, 'puede_dar_por_verificado' | 'puede_reintentar'> | null,
): string {
  if (listasEstado === 'por_confirmar') return TEXTO_LISTAS_POR_CONFIRMAR
  if (!verificacion) return TEXTO_REVISE_Y_DECIDA
  if (verificacion.puede_dar_por_verificado && verificacion.puede_reintentar) {
    return 'Puede darla por verificada (con constancia) o pedir de nuevo la consulta.'
  }
  if (verificacion.puede_dar_por_verificado) return 'Puede darla por verificada (con constancia).'
  if (verificacion.puede_reintentar) return 'Puede pedir de nuevo la consulta.'
  return ''
}

/**
 * Lo que pasa cuando el segundo firmante queda verificado. Con el estudio ya aprobado no se «decide» nada, y
 * tampoco se promete que quede vinculada: verificada, puede no resultar válida como segundo firmante.
 */
export const efectoVerificacionSegundo = (estudioAprobado: boolean): string =>
  estudioAprobado
    ? 'si es válida como segundo firmante, queda vinculada al contrato; si no, el contrato sigue solo con el titular'
    : 'el estudio se decide con las dos personas'

/** Lo mismo cuando la resuelve sola la respuesta limpia de la consulta: la frase completa. */
export const fraseResultadoLimpio = (estudioAprobado: boolean): string =>
  estudioAprobado
    ? 'Si el resultado llega limpio y la persona es válida como segundo firmante, queda vinculada al contrato; si no, el contrato sigue solo con el titular.'
    : 'Si el resultado llega limpio, el estudio se decide solo.'

/** «30 de noviembre de 2026», en hora de Colombia. null si la fecha no es válida. */
export function fechaColombia(iso: string | null | undefined): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  return new Date(t).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' })
}

/** Hasta cuándo debe autorizar la persona nueva de un estudio reabierto (la fecha la manda la API). null sin fecha. */
export function textoPlazoReapertura(venceReapertura: string | null | undefined): string | null {
  const fecha = fechaColombia(venceReapertura)
  return fecha ? `La persona nueva debe autorizar a más tardar el ${fecha}.` : null
}

/**
 * Adenda 6 §7: hasta cuándo el resultado del estudio permite enviar el contrato a firma, con la hora (es un instante:
 * el fin del resultado menos lo que necesita el proceso de firma). La fecha la manda la API (`firmar_hasta` de la
 * cotización del cambio de persona); el cambio no la amplía. null sin fecha.
 */
export function textoFirmarHastaCambio(firmarHasta: string | null | undefined): string | null {
  const fecha = fechaColombia(firmarHasta)
  if (!fecha) return null
  const hora = new Date(Date.parse(firmarHasta as string)).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' })
  return `El resultado de este estudio permite enviar el contrato a firma hasta el ${fecha} a las ${hora}; cambiar a la persona no amplía ese plazo.`
}

/** Antes de reemplazar a una persona en un estudio no aprobable: qué pasa al cargar a la nueva. */
export const TEXTO_AVISO_REAPERTURA = 'Al cargar a la persona nueva, el estudio se reabre y se decide de nuevo con su evaluación.'

/**
 * Estudio rechazado: lo que pasa al reemplazar a una persona (punto 5 del
 * reporte). Manda el aviso de la API: si ya dice que el estudio vuelve a
 * revisión (o llega `vuelve_a_revision`) no se repite, y el plazo es solo el
 * que manda la API (`vence_reapertura`), nunca uno calculado aquí. null = el
 * aviso de la API ya lo dice todo.
 */
export function avisoReemplazoEnRechazado(c: { aviso: string; vuelve_a_revision?: boolean; vence_reapertura?: string | null }): string | null {
  const partes: string[] = []
  if (!c.vuelve_a_revision && !/vuelve a (?:revisión|revision)|se reabre/i.test(c.aviso)) {
    partes.push(TEXTO_AVISO_REAPERTURA)
  }
  const plazo = /a más tardar|vence en/i.test(c.aviso) ? null : textoPlazoReapertura(c.vence_reapertura)
  if (plazo) partes.push(plazo)
  return partes.length > 0 ? partes.join(' ') : null
}

/** Cancelar el cambio que reabrió un estudio rechazado. */
export const TEXTO_CANCELAR_REAPERTURA =
  'El estudio vuelve a quedar no aprobado y, si la consulta no se hizo, el valor pagado no se pierde. La persona anterior no vuelve al estudio.'

/**
 * Cancelar la invitación de la persona nueva de un estudio reabierto: el diálogo, el aviso y el enlace vencido.
 * La devolución, siempre condicionada: no todo cambio de persona cobra una consulta adicional.
 */
export const TEXTO_CANCELAR_INVITACION_REAPERTURA =
  'Si la cancela, el cambio de persona se cierra, el estudio vuelve a quedar no aprobado y, si pagó la consulta adicional, el valor pagado no se pierde.'
export const TOAST_INVITACION_CANCELADA_REAPERTURA = 'Invitación cancelada. El estudio volvió a quedar no aprobado.'
export const TEXTO_ENLACE_VENCIDO_REAPERTURA =
  'Venció el enlace: el cambio se cierra y el estudio vuelve a quedar no aprobado; si pagó la consulta adicional, el valor pagado no se pierde.'

/** Etiquetas de la API de un coarrendatario que todavía no terminó: lo verifica Cofianza, espera o debe salir. */
const ETIQUETAS_VIVAS = ['en verificación', 'en revisión', 'en espera', 'bloquea la operación']

/** Lo que hace falta del coarrendatario para saber si sigue en curso (de ICoarrendatario). */
export interface CoarrendatarioEnResumen {
  estado: string
  estudio?: { estado: string; resultado?: string | null; persona_a5d?: IPersonaA5d | null } | null
  /** Vence el enlace de la invitación. */
  token_expiracion?: string | null
}

/**
 * Invitación vigente o evaluación sin terminar: el criterio de la API para esperar al segundo firmante
 * (depende_de 'prospecto'). Una invitación vencida ya no está en curso: reenviarla le toca a quien
 * gestiona. Pura.
 */
export function coarrendatarioEnCurso(coa: CoarrendatarioEnResumen | null | undefined, ahoraMs: number = Date.now()): boolean {
  if (!coa) return false
  if (coa.estado === 'pendiente_aceptacion') {
    const vence = coa.token_expiracion ? Date.parse(coa.token_expiracion) : NaN
    return !(Number.isFinite(vence) && vence < ahoraMs)
  }
  return coa.estado === 'aceptado' && coa.estudio?.estado !== 'completado'
}

/**
 * Cofianza verifica al segundo firmante ya evaluado: el respaldo de la web cuando la API no manda
 * `segundo_en_verificacion` en el estudio. Su evaluación terminó y la API la marca «En verificación»; sin
 * `persona_a5d`, la que quedó en revisión (resultado 'condicionado'). Pura.
 */
export function coarrendatarioEnVerificacion(coa: CoarrendatarioEnResumen | null | undefined): boolean {
  if (!coa || coa.estudio?.estado !== 'completado') return false
  if (coa.estado !== 'aceptado' && coa.estado !== 'estudio_completado') return false
  const persona = personaA5dUsable(coa.estudio.persona_a5d)
  return persona ? estaEnVerificacion(persona) : coa.estudio.resultado === 'condicionado'
}

/**
 * El coarrendatario sigue vivo, y su tarjeta va en el Resumen, no en «Pasos anteriores» (reporte de
 * Gerencia, 21-nov, punto 10): invitación sin responder (también vencida, que se puede reenviar),
 * evaluación sin terminar (también fallida, que se reintenta) o terminada pero en verificación, en
 * revisión o en espera. No lo está cuando terminó (válido, no califica, salió), declinó, o la invitación
 * ya no tiene efecto (`sinEfecto`: el estudio se resolvió sin él) o el estudio terminó (`cierre`). Pura.
 */
export function coarrendatarioSigueVivo(coa: CoarrendatarioEnResumen | null | undefined, o: { sinEfecto: boolean; cierre: CierreEstudio }): boolean {
  if (!coa || o.cierre) return false
  if (coa.estudio?.estado === 'completado') {
    const persona = personaA5dUsable(coa.estudio.persona_a5d)
    if (persona) return ETIQUETAS_VIVAS.includes(normalizar(persona.etiqueta))
    // Sin `persona_a5d`: «En revisión» (rotuloCoarrendatario) mientras no la decida un analista.
    return coa.estudio.resultado === 'condicionado'
  }
  if (coa.estado === 'pendiente_aceptacion' || coa.estado === 'aceptado') return !o.sinEfecto
  return false
}
