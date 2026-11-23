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
import type { IPersonaA5d, PapelPersonaA5d } from '@/types/estudio'

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

/** Estudio reabierto por un reemplazo (`reapertura_abierta`): lo que se espera de la persona nueva. */
export const TEXTO_REAPERTURA = 'El estudio se decide de nuevo cuando la persona nueva acepte, autorice y termine su evaluación.'

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

/** Al analista (administrador u operador), con la persona «En verificación»: qué hacer, no el texto para quien gestiona. */
export function textoVerificacionAnalista(listasEstado: string | null | undefined): string {
  return listasEstado === 'por_confirmar' ? TEXTO_LISTAS_POR_CONFIRMAR : TEXTO_REVISE_Y_DECIDA
}

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
 * Estudio rechazado: lo que pasa al reemplazar a una persona (punto 5 del
 * reporte). Manda el aviso de la API: si ya dice que el estudio vuelve a
 * revisión (o llega `vuelve_a_revision`) no se repite, y el plazo es solo el
 * que manda la API (`vence_reapertura`), nunca uno calculado aquí. null = el
 * aviso de la API ya lo dice todo.
 */
export function avisoReemplazoEnRechazado(c: { aviso: string; vuelve_a_revision?: boolean; vence_reapertura?: string | null }): string | null {
  const partes: string[] = []
  if (!c.vuelve_a_revision && !/vuelve a (?:revisión|revision)/i.test(c.aviso)) {
    partes.push('El estudio vuelve a revisión y se decide de nuevo con la persona nueva.')
  }
  const plazo = /a más tardar|vence en/i.test(c.aviso) ? null : textoPlazoReapertura(c.vence_reapertura)
  if (plazo) partes.push(plazo)
  return partes.length > 0 ? partes.join(' ') : null
}

/** Cancelar el cambio que reabrió un estudio rechazado. */
export const TEXTO_CANCELAR_REAPERTURA =
  'El estudio vuelve a quedar no aprobable y Cofianza devuelve el pago si la consulta no se hizo. La persona anterior no vuelve al estudio.'

/** Cancelar la invitación de la persona nueva de un estudio reabierto: el diálogo, el aviso y el enlace vencido. */
export const TEXTO_CANCELAR_INVITACION_REAPERTURA =
  'Si la cancela, el cambio de persona se cierra, el estudio vuelve a quedar no aprobable y Cofianza devuelve el pago.'
export const TOAST_INVITACION_CANCELADA_REAPERTURA = 'Invitación cancelada. El estudio volvió a no aprobable.'
export const TEXTO_ENLACE_VENCIDO_REAPERTURA = 'Venció el enlace: el cambio se cerró y Cofianza devolverá el pago.'
