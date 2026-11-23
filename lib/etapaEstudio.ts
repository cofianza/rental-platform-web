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
  espera_coarrendatario: 'Esperando al coarrendatario',
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
  coarrendatario_pendiente: 'Aprobado · coarrendatario sin responder',
  vencido: 'Resultado vencido',
  firma: 'En firma',
  firma_incompleta: 'Firma incompleta',
  vigente: 'Contrato vigente',
  finalizado: 'Finalizado',
  no_aprobado: 'No aprobable',
  cancelado: 'Cancelado',
  reapertura: 'Esperando al nuevo segundo firmante',
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
  segundo_firmante: 4,
  bloqueado: 4,
  no_aprobado: 4,
  contrato: 5,
  canon_excede: 5,
  coarrendatario_pendiente: 5,
  // El resultado ya no sirve: el paso del resultado queda marcado, como el no aprobable.
  vencido: 4,
  firma: 6,
  firma_incompleta: 6,
  vigente: PASOS_DETALLE.length,
  finalizado: PASOS_DETALLE.length,
  cancelado: 0,
  // Se decide de nuevo con la evaluación de la persona nueva.
  reapertura: 3,
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

/**
 * La etapa de un estudio aprobado con traba_contrato. null sin traba o con un código que esta
 * versión no conoce: queda 'contrato', como siempre. Pura.
 */
export function etapaDeTraba(codigo: string | null | undefined): EtapaEstudio | null {
  if (codigo === 'canon_excede' || codigo === 'coarrendatario_pendiente' || codigo === 'vencido') return codigo
  return null
}

/** Las etapas que salen de traba_contrato. */
export const esEtapaDeTraba = (etapa: EtapaEstudio | null | undefined): boolean =>
  etapa === 'canon_excede' || etapa === 'coarrendatario_pendiente' || etapa === 'vencido'

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
const CON_VIGENCIA: EtapaEstudio[] = ['contrato', 'canon_excede', 'coarrendatario_pendiente']

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
 * Hasta cuándo sirve el resultado (punto 7 del reporte de Gerencia, 21-nov): «Vence en N días»,
 * «Vence hoy» o «Vencido», en días de calendario de Colombia; ámbar con DIAS_ALERTA_VIGENCIA o
 * menos, rojo vencido. Con la etapa 'vencido': «Vencido» (gris, como la etapa) o, si todavía no
 * vence pero ya no alcanza para firmar (`sinMargen`), «Vence en N días · ya no alcanza para firmar»:
 * nunca un plazo como si el resultado sirviera. null en las demás etapas (en firma o con contrato ya no
 * aplica) o sin la fecha. Pura.
 */
export function vigenciaResultado(
  etapa: EtapaEstudio,
  o: { hasta?: string | null; vencioEn?: string | null; sinMargen?: boolean; ahoraMs: number },
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
}

/**
 * El nombre de la etapa de traba, el mismo en la lista, el encabezado y la barra:
 * - canon_excede con la leyenda «hasta un canon»: «Aprobado hasta un canon de $X» (sin la cifra, «Aprobado hasta un canon menor»);
 *   sin la leyenda (canon mayor al evaluado, se puede evaluar de nuevo): «Aprobado · canon mayor al evaluado».
 *   Sin hasta_canon (API anterior) decide la cifra.
 * - vencido que todavía no vence pero ya no alcanza para firmar: «Resultado por vencer».
 */
export function etiquetaTraba(etapa: EtapaEstudio, traba?: DatosTrabaEtiqueta | null): string {
  if (etapa === 'canon_excede') {
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
    // Lo que impide el contrato lo resuelve quien gestiona: ajustar el canon o reasignar, o esperar al
    // coarrendatario o seguir sin él. El vencido no es turno de nadie (la API: depende_de null, no
    // «requiere su acción»); la franja solo dice cómo seguir.
    case 'canon_excede':
    case 'coarrendatario_pendiente':
    case 'firma_incompleta':
    // Quien gestiona el estudio debe retirar a la persona indicada.
    case 'bloqueado':
      return 'gestor'
    case 'autorizacion':
    case 'pago_prospecto':
    case 'espera_coarrendatario':
    case 'segundo_firmante':
    // La persona nueva acepta, autoriza y se evalúa.
    case 'reapertura':
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
