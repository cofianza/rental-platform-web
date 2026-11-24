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
  | 'segundo_firmante'
  | 'bloqueado'
  | 'contrato'
  // Aprobado, pero la API dice qué impide crear el contrato (traba_contrato): nunca «crear el contrato».
  | 'canon_excede'
  | 'coarrendatario_pendiente'
  // Bloque 4: el segundo firmante ya aceptó, pero su evaluación sigue en curso o Cofianza lo verifica.
  | 'coarrendatario_en_evaluacion'
  | 'coarrendatario_en_verificacion'
  // Adenda 6 §4: Cofianza termina la verificación de las listas del solicitante (no tiene salida para quien gestiona).
  | 'solicitante_en_verificacion'
  | 'vencido'
  | 'firma'
  | 'firma_incompleta'
  | 'vigente'
  | 'finalizado'
  | 'no_aprobado'
  | 'cancelado'
  // Reporte de Gerencia (21-nov), punto 5: el no aprobable se reabrió por un reemplazo y espera a la persona nueva.
  | 'reapertura'

export const ETAPA_LABEL: Record<EtapaEstudio, string> = {
  visita: 'Visita pendiente',
  habilitar: 'Por habilitar',
  no_habilitada: 'Evaluación no habilitada',
  autorizacion: 'Esperando autorización',
  enlace: 'Enlace vencido o detenido',
  pago: 'Pago pendiente',
  pago_prospecto: 'Esperando el pago',
  consulta: 'En evaluación',
  // «Segundo firmante» en los nombres de etapa: «coarrendatario» queda para la invitación y el rol declarado.
  espera_coarrendatario: 'Esperando al segundo firmante',
  sin_ejecutar: 'Consulta sin ejecutar',
  fallida: 'Consulta fallida',
  // U8: un nombre por situación (lista, detalle y notificación). Con condición
  // de coarrendatario la fila y el detalle ponen su propio rótulo.
  decision: 'En revisión de Cofianza',
  // Solo cuando la API envía `desenlace`; su texto (`desenlace_texto`) manda sobre estos.
  segundo_firmante: 'Aprobado con segundo firmante',
  bloqueado: 'Operación bloqueada',
  contrato: 'Aprobado',
  // Respaldo: con la leyenda «hasta un canon» etiquetaTraba pone la cifra («Aprobado hasta un canon de $X»).
  canon_excede: 'Aprobado · canon mayor al evaluado',
  coarrendatario_pendiente: 'Aprobado · segundo firmante sin responder',
  coarrendatario_en_evaluacion: 'Aprobado · segundo firmante en evaluación',
  coarrendatario_en_verificacion: 'Aprobado · segundo firmante en verificación',
  solicitante_en_verificacion: 'Aprobado · verificación de Cofianza',
  vencido: 'Resultado vencido',
  firma: 'En firma',
  firma_incompleta: 'Firma incompleta',
  vigente: 'Contrato vigente',
  finalizado: 'Finalizado',
  no_aprobado: 'No aprobable',
  cancelado: 'Cancelado',
  // Un solo nombre para el estudio reabierto (la persona nueva puede ser el solicitante o el segundo firmante).
  reapertura: 'Reabierto: esperando a la persona nueva',
}

/**
 * Pasos de la barra del detalle (la lista conserva los suyos). Reporte de Gerencia (21-nov), punto 11:
 * los mismos cuatro en todos los casos (la propuesta de diseño). El nombre del paso no cambia con la
 * etapa: dónde está el estudio lo dice la insignia del encabezado. Solo el resultado se rotula
 * «Segundo firmante» mientras el estudio espera uno (rotuloPaso).
 */
export const PASOS_DETALLE = ['Estudio', 'Resultado', 'Contrato', 'Firma'] as const

/** Índice del paso del resultado en PASOS_DETALLE. */
export const PASO_RESULTADO = 1

/** Paso actual de la barra; PASOS_DETALLE.length = todo completo. */
export const PASO_DE_ETAPA: Record<EtapaEstudio, number> = {
  // Estudio: la visita, la autorización, el pago y la evaluación.
  visita: 0,
  habilitar: 0,
  no_habilitada: 0,
  autorizacion: 0,
  enlace: 0,
  pago: 0,
  pago_prospecto: 0,
  consulta: 0,
  espera_coarrendatario: 0,
  sin_ejecutar: 0,
  fallida: 0,
  // Resultado: por decidir, con segundo firmante, bloqueado o no aprobable.
  decision: PASO_RESULTADO,
  segundo_firmante: PASO_RESULTADO,
  bloqueado: PASO_RESULTADO,
  no_aprobado: PASO_RESULTADO,
  // El resultado ya no sirve: el paso del resultado queda marcado, como el no aprobable.
  vencido: PASO_RESULTADO,
  // Se decide de nuevo con la evaluación de la persona nueva.
  reapertura: PASO_RESULTADO,
  // Contrato: aprobado, también con lo que impide crearlo (canon mayor o el segundo firmante sin terminar).
  contrato: 2,
  canon_excede: 2,
  coarrendatario_pendiente: 2,
  coarrendatario_en_evaluacion: 2,
  coarrendatario_en_verificacion: 2,
  solicitante_en_verificacion: 2,
  firma: 3,
  firma_incompleta: 3,
  vigente: PASOS_DETALLE.length,
  finalizado: PASOS_DETALLE.length,
  cancelado: 0,
}

/** Cómo se pinta el paso actual: rojo (no aprobable), gris (resultado vencido) o el de siempre. */
export type TonoPaso = 'rojo' | 'gris' | 'normal'

/** El tono del paso actual de la barra. Pura. */
export function tonoDelPaso(etapa: EtapaEstudio): TonoPaso {
  if (etapa === 'no_aprobado') return 'rojo'
  if (etapa === 'vencido') return 'gris'
  return 'normal'
}

/**
 * El nombre de un paso de la barra: siempre el de PASOS_DETALLE, salvo el resultado mientras el estudio
 * espera a un segundo firmante («Segundo firmante», la propuesta de Gerencia): aprobado con segundo
 * firmante, la condición de coarrendatario de la Adenda 3 (`conCondicion`) o reabierto por un reemplazo. Pura.
 */
export function rotuloPaso(idx: number, etapa: EtapaEstudio | null | undefined, conCondicion = false): string {
  if (idx === PASO_RESULTADO && etapa && (etapa === 'reapertura' || esEsperaDePersona(etapa, conCondicion))) return 'Segundo firmante'
  return PASOS_DETALLE[idx] ?? ''
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
  /** Resultado que envía la API (`desenlace`). null o ausente = la etapa sale del estado, como siempre. */
  desenlace?: string | null
  /** traba_contrato.codigo del detalle: aprobado, pero algo impide crear el contrato. null o ausente = 'contrato'. */
  trabaCodigo?: string | null
  /** `reapertura_abierta` del expediente: reabierto por un reemplazo, espera a la persona nueva. */
  reaperturaAbierta?: boolean
}

/** Los códigos de traba_contrato que esta versión conoce: cada uno es su propia etapa. */
const ETAPAS_DE_TRABA: EtapaEstudio[] = [
  'canon_excede',
  'coarrendatario_pendiente',
  'coarrendatario_en_evaluacion',
  'coarrendatario_en_verificacion',
  'solicitante_en_verificacion',
  'vencido',
]

/**
 * La etapa de un estudio aprobado con traba_contrato. null sin traba o con un código que esta
 * versión no conoce: queda 'contrato', como siempre. Pura.
 */
export function etapaDeTraba(codigo: string | null | undefined): EtapaEstudio | null {
  return ETAPAS_DE_TRABA.find((e) => e === codigo) ?? null
}

/** Las etapas que salen de traba_contrato. */
export const esEtapaDeTraba = (etapa: EtapaEstudio | null | undefined): boolean => !!etapa && ETAPAS_DE_TRABA.includes(etapa)

/**
 * Trabas del segundo firmante en un estudio ya aprobado (sin responder, en evaluación o en verificación):
 * quien gestiona puede esperarlo o seguir sin él.
 */
export const ETAPAS_SEGUNDO_FIRMANTE_EN_CURSO: EtapaEstudio[] = [
  'coarrendatario_pendiente',
  'coarrendatario_en_evaluacion',
  'coarrendatario_en_verificacion',
]

/** Pesos sin decimales y sin el espacio duro de Intl (como formatCurrency, sin importar constants: es pura). */
const pesos = (cop: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })
    .format(cop)
    .replace(/\u00a0/g, '')

/** Con cuántos días o menos para vencer, el vencimiento del resultado se pinta de alerta. */
export const DIAS_ALERTA_VIGENCIA = 7

export interface VigenciaResultado {
  texto: string
  tono: 'gris' | 'ambar' | 'rojo'
  /** La fecha exacta, para el title. */
  titulo: string
}

const BOGOTA = 'America/Bogota'
const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/

/** Medianoche UTC del día de calendario de Colombia en que cae el instante (una fecha sola ya es ese día). */
function diaBogota(iso: string): number | null {
  if (SOLO_FECHA.test(iso)) return Date.parse(iso)
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  return Date.parse(new Date(t).toLocaleDateString('en-CA', { timeZone: BOGOTA }))
}

/**
 * «30 de noviembre de 2026», en hora de Colombia (una fecha sola, tal cual: en UTC no se corre de día).
 * Con `ahoraMs`, sin el año cuando es el año en curso.
 */
function fechaLegible(iso: string, ahoraMs?: number): string {
  const soloFecha = SOLO_FECHA.test(iso)
  const timeZone = soloFecha ? 'UTC' : BOGOTA
  const fecha = new Date(soloFecha ? Date.parse(iso) : iso)
  const anio = (d: Date, tz: string) => d.toLocaleDateString('en-CA', { year: 'numeric', timeZone: tz })
  const mismoAnio = ahoraMs !== undefined && anio(fecha, timeZone) === anio(new Date(ahoraMs), BOGOTA)
  return fecha.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    ...(mismoAnio ? {} : { year: 'numeric' }),
    timeZone,
  })
}

/** Etapas en que el resultado todavía tiene que servir para el contrato. */
const CON_VIGENCIA: EtapaEstudio[] = ['contrato', 'canon_excede', ...ETAPAS_SEGUNDO_FIRMANTE_EN_CURSO, 'solicitante_en_verificacion']

/** Días de calendario de Colombia que faltan hasta la fecha, y si ya pasó (una fecha sola sirve todo ese día). null sin fecha válida. */
function plazoHasta(iso: string, ahoraMs: number): { vencido: boolean; dias: number } | null {
  const dia = diaBogota(iso)
  const hoy = diaBogota(new Date(ahoraMs).toISOString())
  if (dia === null || hoy === null) return null
  const vencido = SOLO_FECHA.test(iso) ? dia < hoy : Date.parse(iso) <= ahoraMs
  return { vencido, dias: Math.round((dia - hoy) / 86_400_000) }
}

const venceEn = (dias: number) => (dias <= 0 ? 'Vence hoy' : `Vence en ${dias} ${dias === 1 ? 'día' : 'días'}`)

/**
 * Hasta cuándo sirve el resultado (punto 7 del reporte de Gerencia, 21-nov), en días de calendario de
 * Colombia; ámbar con DIAS_ALERTA_VIGENCIA o menos, rojo vencido.
 * - Con `firmarHasta` (la API: fin de la vigencia menos el margen que necesita la firma), las dos fechas
 *   (Adenda 6 §7): «Vence en 8 días · envíe a firma antes del 10 de diciembre» o «Vence en 3 días · envíe a
 *   firma hoy»; el tono se cuenta contra la de la firma, que es la que de verdad le queda a quien gestiona.
 *   Pasada esa fecha sin que la API haya marcado la traba, «Vence en N días · ya no alcanza para firmar».
 * - Sin `firmarHasta` (API anterior): «Vence en N días», «Vence hoy» o «Vencido», contra el fin de la vigencia.
 * - Con la etapa 'vencido': «Vencido» (gris, como la etapa) o, si todavía no vence pero ya no alcanza para
 *   firmar (`sinMargen`), «Vence en N días · ya no alcanza para firmar»: nunca un plazo como si sirviera.
 * null en las demás etapas (en firma o con contrato ya no aplica) o sin la fecha. Pura.
 */
export function vigenciaResultado(
  etapa: EtapaEstudio,
  o: { hasta?: string | null; firmarHasta?: string | null; vencioEn?: string | null; sinMargen?: boolean; ahoraMs: number },
): VigenciaResultado | null {
  if (etapa === 'vencido') {
    const fecha = o.vencioEn ?? o.hasta
    const plazo = fecha ? plazoHasta(fecha, o.ahoraMs) : null
    if (fecha && plazo && o.sinMargen && !plazo.vencido) {
      return {
        texto: `${venceEn(plazo.dias)} · ya no alcanza para firmar`,
        tono: 'ambar',
        titulo: `El resultado vence el ${fechaLegible(fecha)} y ya no alcanza el tiempo para firmar el contrato`,
      }
    }
    return { texto: 'Vencido', tono: 'gris', titulo: fecha && plazo ? `El resultado venció el ${fechaLegible(fecha)}` : 'El resultado venció' }
  }
  if (!CON_VIGENCIA.includes(etapa) || !o.hasta) return null
  const plazo = plazoHasta(o.hasta, o.ahoraMs)
  if (!plazo) return null
  if (plazo.vencido) return { texto: 'Vencido', tono: 'rojo', titulo: `El resultado venció el ${fechaLegible(o.hasta)}` }
  const firma = o.firmarHasta ? plazoHasta(o.firmarHasta, o.ahoraMs) : null
  if (o.firmarHasta && firma) {
    if (firma.vencido) {
      return {
        texto: `${venceEn(plazo.dias)} · ya no alcanza para firmar`,
        tono: 'ambar',
        titulo: `El resultado vence el ${fechaLegible(o.hasta)} y ya no alcanza el tiempo para firmar el contrato`,
      }
    }
    return {
      texto: `${venceEn(plazo.dias)} · ${firma.dias <= 0 ? 'envíe a firma hoy' : `envíe a firma antes del ${fechaLegible(o.firmarHasta, o.ahoraMs)}`}`,
      tono: firma.dias <= DIAS_ALERTA_VIGENCIA ? 'ambar' : 'gris',
      titulo: `Después de esa fecha ya no alcanza el tiempo para firmar; el resultado vence el ${fechaLegible(o.hasta)}`,
    }
  }
  return {
    texto: venceEn(plazo.dias),
    tono: plazo.dias <= DIAS_ALERTA_VIGENCIA ? 'ambar' : 'gris',
    titulo: `El resultado sirve hasta el ${fechaLegible(o.hasta)}`,
  }
}

/** Lo de traba_contrato que cambia el nombre de la etapa (todo opcional: una API anterior no lo envía). */
export interface DatosTrabaEtiqueta {
  canon_habilitado_cop?: number | null
  hasta_canon?: boolean
  sin_margen?: boolean
  /** El canon supera el tope que Cofianza afianza (la API solo lo manda con true). */
  sobre_tope?: boolean
}

/** Nombre de la traba del canon cuando lo que se supera es el tope que Cofianza afianza (no lo evaluado). */
export const ETIQUETA_SOBRE_TOPE = 'Aprobado · canon sobre el tope'

/**
 * La traba del canon es por el tope de la destinación (lo decide la Gerencia General), no por lo evaluado:
 * `traba_contrato.sobre_tope` de la API. Sin el campo (una API anterior), el nombre de siempre.
 */
export const esTrabaPorTope = (traba?: DatosTrabaEtiqueta | null): boolean => traba?.sobre_tope === true

/**
 * El nombre de la etapa de traba, el mismo en la lista, el encabezado y la barra:
 * - canon_excede por el tope de Cofianza: «Aprobado · canon sobre el tope»;
 * - canon_excede con la leyenda «hasta un canon»: «Aprobado hasta un canon de $X» (sin la cifra, «Aprobado hasta un canon menor»);
 *   sin la leyenda (canon mayor al evaluado, se puede evaluar de nuevo): «Aprobado · canon mayor al evaluado».
 *   Sin hasta_canon (API anterior) decide la cifra.
 * - vencido que todavía no vence pero ya no alcanza para firmar: «Resultado por vencer».
 */
export function etiquetaTraba(etapa: EtapaEstudio, traba?: DatosTrabaEtiqueta | null): string {
  if (etapa === 'canon_excede') {
    if (esTrabaPorTope(traba)) return ETIQUETA_SOBRE_TOPE
    const canon = typeof traba?.canon_habilitado_cop === 'number' && traba.canon_habilitado_cop > 0 ? traba.canon_habilitado_cop : null
    const hasta = traba?.hasta_canon ?? canon !== null
    if (!hasta) return ETAPA_LABEL.canon_excede
    return canon !== null ? `Aprobado hasta un canon de ${pesos(canon)}` : 'Aprobado hasta un canon menor'
  }
  if (etapa === 'vencido' && traba?.sin_margen) return 'Resultado por vencer'
  return ETAPA_LABEL[etapa]
}

/**
 * La etapa de un estudio condicionado: con `desenlace`, la que él dice; sin él
 * (o con un valor que esta versión no conoce), «decision», como siempre. Pura.
 */
export function etapaCondicionado(desenlace: string | null | undefined): EtapaEstudio {
  if (desenlace === 'aprobado_segundo_firmante') return 'segundo_firmante'
  if (desenlace === 'bloqueado_listas') return 'bloqueado'
  return 'decision'
}

/**
 * «Aprobado con segundo firmante» sin nada que hacer por ahora: la API lo dice con `siguiente_accion: 'ninguna'`
 * (Cofianza verifica al segundo firmante ya presentado) y su `siguiente_accion_texto` lo explica. Mientras tanto
 * no se pide presentar a nadie ni se muestra el plazo; al prospecto se le dice «En revisión». Pura.
 */
export const sinAccionSegundoFirmante = (e: { desenlace?: string | null; siguiente_accion?: string | null } | null | undefined): boolean =>
  e?.desenlace === 'aprobado_segundo_firmante' && e.siguiente_accion === 'ninguna'

/** El nombre genérico del condicionado cuando no se sabe cuál de los resultados es (punto 6: sin «Condicionado»). */
export const ETIQUETA_CONDICIONADO = 'En revisión o con segundo firmante'

/**
 * El nombre del resultado 'condicionado' de una evaluación: con el resultado de la Adenda 5, el suyo; la
 * del coarrendatario, «En revisión» (Adenda 3 V2 §7); sin datos, el genérico. Pura.
 */
export function etiquetaCondicionado(e: { desenlace?: string | null; tipo?: string | null }): string {
  if (e.desenlace === 'aprobado_segundo_firmante') return 'Aprobado con segundo firmante'
  if (e.desenlace === 'bloqueado_listas') return 'Bloqueado por listas'
  if (e.tipo === 'con_coarrendatario') return 'En revisión'
  return ETIQUETA_CONDICIONADO
}

/** Etapas en que el estudio espera a que se presente otra persona con un plazo. */
export const esEsperaDePersona = (etapa: EtapaEstudio | null | undefined, conCondicion: boolean): boolean =>
  etapa === 'segundo_firmante' || (etapa === 'decision' && conCondicion)

/** Pura. */
export function calcularEtapa(d: DatosEtapa): EtapaEstudio {
  // Reabierto por un reemplazo: nunca «No aprobable» ni «En evaluación» mientras espera a la persona nueva.
  if (d.reaperturaAbierta && d.estado !== 'cerrado') return 'reapertura'
  if (d.estado === 'rechazado') return 'no_aprobado'
  if (d.estado === 'cerrado') {
    if (d.estadoPreCancelacion === 'rechazado') return 'no_aprobado'
    return d.estadoPreCancelacion ? 'cancelado' : 'finalizado'
  }
  if (d.contratosEstados.some((e) => ['firmado', 'vigente', 'finalizado'].includes(e))) return 'vigente'
  if (d.contratosEstados.includes('pendiente_firma')) return 'firma'
  // El proceso ya cerró: nadie puede firmar, le toca actuar a la inmobiliaria.
  if (d.contratosEstados.includes('firma_incompleta')) return 'firma_incompleta'
  if (d.estado === 'aprobado') return etapaDeTraba(d.trabaCodigo) ?? 'contrato'
  if (d.estado === 'condicionado') return etapaCondicionado(d.desenlace)
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

/** Lo que decide el turno del «aprobado con segundo firmante» (todo opcional: sin leer, no hay turno). */
export interface DatosTurnoSegundoFirmante {
  /** El coarrendatario está en curso: invitación vigente o evaluación sin terminar. null o ausente = no se sabe todavía. */
  coarrendatarioEnCurso?: boolean | null
  /** Hay una apelación radicada: la decide Cofianza. */
  apelacion?: boolean
  /**
   * Cofianza verifica al segundo firmante ya evaluado (`segundo_en_verificacion` de la API, o su evaluación
   * terminada «En verificación»): quien gestiona no puede invitar ni reemplazar a nadie mientras tanto.
   */
  enVerificacion?: boolean
}

/**
 * El turno del «aprobado con segundo firmante», con el criterio de depende_de de la lista: con apelación
 * radicada o con el segundo firmante en verificación, Cofianza; con el coarrendatario en curso, se le
 * espera; si no, quien gestiona lo invita o lo reemplaza. null mientras no se sabe si hay coarrendatario
 * en curso. Pura.
 */
export function turnoSegundoFirmante(o: DatosTurnoSegundoFirmante = {}): Turno | null {
  if (o.apelacion || o.enVerificacion) return 'cofianza'
  if (o.coarrendatarioEnCurso === true) return 'prospecto'
  if (o.coarrendatarioEnCurso === false) return 'gestor'
  return null
}

/**
 * Mismo criterio que depende_de del RPC de la lista, para que
 * lista y detalle digan lo mismo: la visita tampoco la cuenta el RPC. null = no
 * hay turno (cerrado o sin paso pendiente de alguien). `segundo`: lo que decide el
 * turno del aprobado con segundo firmante (turnoSegundoFirmante).
 */
export function turnoDeEtapa(etapa: EtapaEstudio, conCondicion: boolean, segundo: DatosTurnoSegundoFirmante = {}): Turno | null {
  if (etapa === 'segundo_firmante') return turnoSegundoFirmante(segundo)
  switch (etapa) {
    case 'habilitar':
    case 'enlace':
    case 'pago':
    case 'sin_ejecutar':
    case 'fallida':
    case 'contrato':
    // Lo que impide el contrato lo resuelve quien gestiona: ajustar el canon o reasignar, o esperar al
    // segundo firmante (sin responder, en evaluación o en verificación) o seguir sin él. El vencido no es
    // turno de nadie (la API: depende_de null, no «requiere su acción»); la franja solo dice cómo seguir.
    case 'canon_excede':
    case 'coarrendatario_pendiente':
    case 'coarrendatario_en_evaluacion':
    case 'coarrendatario_en_verificacion':
    case 'firma_incompleta':
    // Quien gestiona el estudio debe retirar a la persona indicada.
    case 'bloqueado':
      return 'gestor'
    case 'autorizacion':
    case 'pago_prospecto':
    case 'espera_coarrendatario':
    // La persona nueva acepta, autoriza y se evalúa.
    case 'reapertura':
      return 'prospecto'
    case 'consulta':
    // Adenda 6 §4: Cofianza termina la verificación de las listas del solicitante; quien gestiona solo espera.
    case 'solicitante_en_verificacion':
      return 'cofianza'
    case 'decision':
      return conCondicion ? 'prospecto' : 'cofianza'
    case 'firma':
      return 'firmas'
    default:
      return null
  }
}
