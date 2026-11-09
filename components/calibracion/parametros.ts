/**
 * Qué es cada valor de la calibración, dicho para la Gerencia: nombre, qué
 * hace en el flujo real, un ejemplo con los valores vigentes, la sección y
 * cuándo cambia algo (según las reglas encendidas). Los textos se verificaron
 * contra el código del API; el API sigue mandando la descripción técnica y la
 * advertencia de cada parámetro.
 *
 * Los textos no llevan el valor escrito: lo que depende del valor va en
 * `ejemplo`, que se calcula con los valores vigentes.
 */

import type { IParametroCalibracion } from '@/services/calibracionService'
import { sinReferenciasInternas } from '@/lib/utils'

export type Valores = Record<string, number>

// 'criterio': 1 = el mayor, 0 = el menor (CRITERIO_SELECCION_INGRESO). Como
// 'onoff', es de dos valores. 'mes' = AAAAMM (TARIFA_COBRO_DESDE).
export type Unidad =
  | 'cop'
  | 'pct'
  | 'puntos'
  | 'horas'
  | 'dias'
  | 'dias_habiles'
  | 'meses'
  | 'mes'
  | 'onoff'
  | 'criterio'
  | 'factor'
  | 'veces'
  | 'consultas'
  | 'obligaciones'
  // Fracción del canon (0,20 = 20 %): las bandas de la razón de mora.
  | 'fraccion'
  | 'num'

export type SeccionId =
  | 'aprobacion'
  | 'ingreso'
  | 'coarrendatarios'
  | 'capacidad'
  | 'precios'
  | 'plazos'
  | 'contratos'
  | 'migracion'
  | 'otros'
  // Adenda 5 definitiva: un grupo propio en el menú.
  | 'a5d_motor'
  | 'a5d_score'
  | 'a5d_segundo'
  | 'a5d_mora'
  | 'a5d_sustituciones'
  | 'a5d_precio'

/**
 * Cuándo el valor cambia algún resultado: siempre, solo con un paquete de
 * reglas encendido (o apagado), nunca (retirado) o en parte (`notaRige` dice
 * dónde). Con lo que no rige hoy, la sección lo pliega al final. 'a5d' = solo
 * con la Adenda 5 definitiva encendida (ADENDA5_DEF).
 */
export type Rige = 'siempre' | 'v2' | 'sin_v2' | 'a4' | 'v2_a4' | 'a5d' | 'nunca' | 'parcial'

export interface MetaParametro {
  nombre: string
  seccion: SeccionId
  /** Subtema dentro de la sección. */
  sub?: string
  unidad: Unidad
  /** Resumen corto de la regla (qué pasa por debajo / por encima, o encendido / apagado). */
  queHace: string
  /**
   * Las excepciones a la regla del resumen, una por viñeta: «condición → qué
   * pasa». La tarjeta las pliega; el diálogo y la búsqueda las leen enteras.
   */
  excepciones?: string[]
  /** Cómo se nombran en el plegable si no son excepciones: [singular, plural]. */
  etiquetaExcepciones?: [string, string]
  ejemplo?: (v: Valores) => string | null
  rige: Rige
  notaRige?: string
  /** Algo más que conviene saber (p. ej. un orden obligado entre interruptores). */
  nota?: string
  /** El API exige escribir el motivo (queda en el historial como constancia). */
  motivo?: boolean
  /** Cambia decisiones: antes de moverlo, Tecnología valida la matriz de casos. */
  matriz?: boolean
  /** Valores admitidos cuando no es un rango (se eligen con botones). */
  opciones?: number[]
  /**
   * Rige hoy y deja de aplicar al encender la Adenda 5 definitiva: qué lo
   * reemplaza. No se oculta mientras esté apagada.
   */
  saleConA5d?: string
  /** Sigue rigiendo con la Adenda 5 definitiva, pero cambia lo que hace: cómo. */
  conA5d?: string
}

export interface Seccion {
  id: SeccionId
  titulo: string
  ayuda: string
  /** 'a5d': va en el grupo «Adenda 5 definitiva» del menú. */
  grupo?: 'a5d'
  /** Valores de otras secciones que también usa esta (se listan al final, en corto). */
  relacionados?: { titulo: string; claves: string[] }
}

const TAMBIEN_A5D = 'Siguen como están y también rigen con la Adenda 5 (se cambian en su sección)'

export const SECCIONES: Seccion[] = [
  {
    id: 'aprobacion',
    titulo: 'Quién se aprueba',
    ayuda: 'Los puntajes con los que un estudio se aprueba solo, va a un analista o se rechaza.',
  },
  {
    id: 'ingreso',
    titulo: 'Cómo se mide el ingreso',
    ayuda: 'Cómo se ajusta el ingreso que estima la central antes de medir el canon y las deudas.',
  },
  {
    id: 'coarrendatarios',
    titulo: 'Coarrendatarios',
    ayuda: 'Cuándo se le pide un coarrendatario al solicitante, en qué plazo y cuánto aporta.',
  },
  {
    id: 'capacidad',
    titulo: 'Capacidad de pago',
    ayuda: 'Cuando el ingreso no está comprobado con documentos: cómo se mira la forma en que la persona paga sus deudas.',
  },
  { id: 'precios', titulo: 'Precios y cobros', ayuda: 'Lo que se cobra por el estudio y por la fianza, y las reglas de los paquetes.' },
  {
    id: 'plazos',
    titulo: 'Autorización y plazos',
    ayuda: 'Cuánto duran el enlace de autorización, el estudio y el certificado, y los límites del documento.',
  },
  { id: 'contratos', titulo: 'Canon y contratos', ayuda: 'Hasta qué canon se afianza, cuánto puede subir y los plazos del contrato.' },
  { id: 'migracion', titulo: 'Migración de cartera', ayuda: 'Reglas para traer contratos que ya estaban afianzados por fuera de la plataforma.' },
  { id: 'otros', titulo: 'Otros', ayuda: 'Valores sin sección asignada.' },
  {
    id: 'a5d_motor',
    grupo: 'a5d',
    titulo: 'Interruptor y motor',
    ayuda: 'El interruptor de la Adenda 5 definitiva y cómo decide sobre cada persona: aprobada, aprobada con segundo firmante o rechazada.',
    relacionados: {
      titulo: TAMBIEN_A5D,
      claves: [
        'UMBRAL_SCORE_RECHAZO',
        'FACTOR_AJUSTE_INGRESO_CANON',
        'FACTOR_AJUSTE_INGRESO_DTI',
        'MESES_VENTANA_COMPORTAMIENTO',
        'FACTOR_CUOTA_MINIMA_TARJETA',
        'CONSULTAS_APELACION_ASUMIDAS',
        'DIAS_CADUCIDAD_ESTUDIO',
      ],
    },
  },
  {
    id: 'a5d_score',
    grupo: 'a5d',
    titulo: 'Score',
    ayuda: 'Cómo el score de la central se convierte en puntos, y qué variables se dan por cumplidas mientras no se puedan verificar.',
    relacionados: { titulo: TAMBIEN_A5D, claves: ['UMBRAL_SCORE_RECHAZO'] },
  },
  {
    id: 'a5d_segundo',
    grupo: 'a5d',
    titulo: 'Segundo firmante',
    ayuda: 'Cuándo se pide un segundo firmante (coarrendatario, deudor solidario o codeudor), cuándo es válido y cuánto aporta.',
    relacionados: {
      titulo: 'Valores de «Coarrendatarios» que también rigen al segundo firmante',
      claves: [
        'PUNTAJE_MINIMO_COARRENDATARIO',
        'BONO_COARRENDATARIO_70_79',
        'BONO_COARRENDATARIO_80_89',
        'BONO_COARRENDATARIO_90_100',
        'VIGENCIA_CONDICION_COARRENDATARIO_DIAS',
        'HORAS_ESPERA_AUTORIZACION',
      ],
    },
  },
  {
    id: 'a5d_mora',
    grupo: 'a5d',
    titulo: 'Mora no financiera',
    ayuda: 'Cómo se trata la mora vigente de telefonía, televisión, internet, comercio y servicios públicos. Toda mora financiera vigente sigue rechazando.',
  },
  {
    id: 'a5d_sustituciones',
    grupo: 'a5d',
    titulo: 'Sustituciones y consulta adicional',
    ayuda: 'Cuántas veces se puede cambiar a una persona del estudio, cuánto cuesta consultar a la persona nueva y cuánto se reutiliza un reporte.',
    relacionados: { titulo: TAMBIEN_A5D, claves: ['TARIFA_IVA'] },
  },
  {
    id: 'a5d_precio',
    grupo: 'a5d',
    titulo: 'Precio',
    ayuda: 'La prima de vinculación, la tarifa mensual única de la fianza y el cashback.',
    relacionados: { titulo: TAMBIEN_A5D, claves: ['TARIFA_IVA'] },
  },
]

/** El título con su grupo, para donde la sección se nombra sola (búsqueda, encabezado). */
export const tituloSeccion = (s: Seccion) => (s.grupo === 'a5d' ? `Adenda 5 definitiva · ${s.titulo}` : s.titulo)
export const grupoDe = (id: string) => SECCIONES.find((s) => s.id === id)?.grupo

// es-CO: coma decimal y punto de miles («1,15», «3.000.000»).
export const fmt = (n: number, entero = false) => n.toLocaleString('es-CO', { maximumFractionDigits: entero ? 0 : 4 })
const pesos = (n: number) => `$${fmt(Math.round(n), true)}`

/** 209912 = «nunca»: es el valor con el que el cobro queda apagado. */
export const MES_APAGADO = 209912
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const DECISION = { matriz: true } as const

// ── Adenda 5 definitiva ───────────────────────────────────────────────────
// Todos aplican solo con ADENDA5_DEF encendido (rige 'a5d'), salvo el propio
// interruptor. Mientras esté apagado, sus secciones los muestran como «aplica
// al encender la Adenda 5» y no los pliegan. Los textos siguen las
// descripciones del API (src/lib/calibracion.ts).

/** 0,20 → «0,20»: las bandas se escriben con dos decimales, como en la adenda. */
const fraccion = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
/** Canon de los casos de prueba de la adenda. */
const CANON_CASO = 1_300_000
const obligaciones = (n: number) => `${n} ${n === 1 ? 'obligación financiera' : 'obligaciones financieras'}`

/** Los 7 anclajes del score: el score de la central (0 a 999) y sus puntos (de 50). */
export const N_ANCLAJES = 7
export const claveAncla = (n: number, que: 'SCORE' | 'PUNTOS') => `SCORE_ANCLA_${n}_${que}`
export const esClaveAncla = (clave: string) => /^SCORE_ANCLA_[1-7]_(SCORE|PUNTOS)$/.test(clave)
export const SUB_ANCLAJES = 'Tabla del score'

/** Pura: la tabla vigente, en orden; null si el API todavía no la manda. */
export function anclajes(v: Valores): { score: number; puntos: number }[] | null {
  const t = Array.from({ length: N_ANCLAJES }, (_, i) => ({ score: v[claveAncla(i + 1, 'SCORE')], puntos: v[claveAncla(i + 1, 'PUNTOS')] }))
  return t.every((a) => typeof a.score === 'number' && typeof a.puntos === 'number') ? t : null
}

/** Pura: los puntos (de 50) de un score, en línea recta entre los dos anclajes que lo rodean. */
export function puntosDeScore(t: { score: number; puntos: number }[], score: number): number {
  if (score <= t[0].score) return t[0].puntos
  const ultimo = t[t.length - 1]
  if (score >= ultimo.score) return ultimo.puntos
  const i = t.findIndex((a) => a.score >= score)
  const [a, b] = [t[i - 1], t[i]]
  return a.puntos + ((score - a.score) / (b.score - a.score)) * (b.puntos - a.puntos)
}

function metaAnclas(): Record<string, MetaParametro> {
  const m: Record<string, MetaParametro> = {}
  for (let n = 1; n <= N_ANCLAJES; n++) {
    const borde = n === 1 ? ' Un score igual o menor recibe los puntos de este anclaje.' : n === N_ANCLAJES ? ' Un score igual o mayor recibe los puntos de este anclaje.' : ''
    m[claveAncla(n, 'SCORE')] = {
      nombre: `Score del anclaje ${n}`,
      seccion: 'a5d_score',
      sub: SUB_ANCLAJES,
      unidad: 'num',
      queHace: `Score de la central (de 0 a 999) del anclaje ${n} de la tabla.${borde} Entre dos anclajes, los puntos se reparten en línea recta.`,
      rige: 'a5d',
      ...DECISION,
    }
    m[claveAncla(n, 'PUNTOS')] = {
      nombre: `Puntos del anclaje ${n}`,
      seccion: 'a5d_score',
      sub: SUB_ANCLAJES,
      unidad: 'puntos',
      queHace: `Puntos (de 50) que recibe un score igual al del anclaje ${n}. El score pesa 50 de los 119 puntos del puntaje.`,
      rige: 'a5d',
      ...DECISION,
    }
  }
  return m
}

const META_A5D: Record<string, MetaParametro> = {
  // ── Interruptor y motor ───────────────────────────────────────────────────
  ADENDA5_DEF: {
    nombre: 'Reglas de decisión con segundo firmante (Adenda 5 definitiva)',
    seccion: 'a5d_motor',
    sub: 'Interruptor',
    unidad: 'onoff',
    queHace:
      'Encendido: rige la Adenda 5 definitiva. Cada estudio sale aprobado, aprobado con segundo firmante o rechazado; la revisión manual deja de ser una salida del motor y el analista solo atiende apelaciones y excepciones de tope. Apagado: se decide como hoy.',
    excepciones: [
      'La tabla de 85 y 70 (aprobar solo, zona gris y «Está cerca») → deja de aplicar: deciden el puntaje para aprobar, el score mínimo para ir sin segundo firmante y el piso para pedir segundo firmante.',
      'Revisión manual como salida del motor → desaparece: un score de 450 a 599 ya no va a un analista, pide segundo firmante.',
      'El puntaje → se calcula sobre 119 puntos, con el score convertido por la tabla de anclajes y las variables que no se pueden verificar acreditadas.',
      'Dos centrales → cuenta el score mayor, no el promedio; la segunda se consulta solo si la primera falla o no entrega el saldo en mora de cada obligación.',
      'Mora vigente de telefonía, comercio o servicios públicos → ya no rechaza siempre: se trata por bandas según la razón de mora. La mora financiera vigente sigue rechazando.',
      'Canon por encima de la parte del ingreso que puede ser canon → no rechaza ni va a un analista: se aprueba «hasta canon de» ese máximo. Desaparece el margen del 15 %.',
      'Coarrendatario → pasa a ser segundo firmante: nunca resta, se puede sustituir con una consulta adicional y, si vence el plazo sin uno válido, el estudio se rechaza.',
      'Las dos tarifas mensuales y la prima que baja con coarrendatario → una sola tarifa mensual y una sola prima de vinculación.',
    ],
    etiquetaExcepciones: ['cambio al encenderla', 'cambios al encenderla'],
    nota: 'Solo se puede encender con las reglas de coarrendatarios e ingreso (Adenda 3) y las de capacidad de pago (Adenda 4) encendidas; mientras esté encendida, esas dos no se pueden apagar. Se enciende una sola vez, cuando la plataforma tenga completo el motor nuevo: hasta entonces no deja encenderla.',
    rige: 'siempre',
    motivo: true,
    ...DECISION,
  },
  UMBRAL_APROBADO: {
    nombre: 'Puntaje para aprobar',
    seccion: 'a5d_motor',
    sub: 'Decisión sobre cada persona',
    unidad: 'puntos',
    queHace:
      'Desde este puntaje (de 0 a 100) la persona se aprueba sin segundo firmante, si además cumple las tres condiciones. Si le falta alguna, o no llega a este puntaje pero sí al piso, queda aprobada con segundo firmante.',
    excepciones: [
      'Score de la central → igual o mayor que el score mínimo para ir sin segundo firmante.',
      'Historial financiero → al menos las obligaciones financieras que pide ese valor.',
      'Mora de telefonía, comercio o servicios públicos → ninguna en banda.',
    ],
    etiquetaExcepciones: ['condición', 'condiciones'],
    nota: 'Con un segundo firmante válido, el titular se aprueba si su puntaje más el bono del segundo firmante llega a este valor.',
    ejemplo: (v) => {
      const bajo = Math.max(v.PISO_SEGUNDO_FIRMANTE, v.UMBRAL_APROBADO - 3)
      return `Con ${v.UMBRAL_APROBADO}: ${Math.min(100, v.UMBRAL_APROBADO + 2)} puntos, con score de ${v.SCORE_MINIMO_SOLO + 20}, historial financiero y sin mora en banda, se aprueba sin segundo firmante${
        bajo < v.UMBRAL_APROBADO ? `; ${bajo} puntos queda aprobado con segundo firmante` : ''
      }.`
    },
    rige: 'a5d',
    ...DECISION,
  },
  SCORE_MINIMO_SOLO: {
    nombre: 'Score mínimo para ir sin segundo firmante',
    seccion: 'a5d_motor',
    sub: 'Decisión sobre cada persona',
    unidad: 'num',
    queHace:
      'Desde este score de la central (de 0 a 999) la persona puede aprobarse sin segundo firmante. Por debajo, aunque alcance el puntaje, se le pide uno. Si se consultan dos centrales, cuenta el score mayor.',
    nota: 'Un score entre el mínimo de la central y este valor ya no va a un analista: pide segundo firmante.',
    ejemplo: (v) =>
      `Con ${v.SCORE_MINIMO_SOLO}: con ${Math.min(100, v.UMBRAL_APROBADO + 5)} puntos, un score de ${v.SCORE_MINIMO_SOLO - 20} queda aprobado con segundo firmante; uno de ${v.SCORE_MINIMO_SOLO + 10}, con lo demás en regla, se aprueba sin segundo firmante.`,
    rige: 'a5d',
    ...DECISION,
  },
  HISTORIAL_FINANCIERO_MINIMO_SOLO: {
    nombre: 'Historial financiero para ir sin segundo firmante',
    seccion: 'a5d_motor',
    sub: 'Decisión sobre cada persona',
    unidad: 'obligaciones',
    queHace:
      'Obligaciones financieras (con un banco, una cooperativa, un fondo de empleados o quien preste dinero o emita tarjetas, incluida la libranza), vigentes o ya cerradas, como titular o codeudora, que debe tener la persona para aprobarse sin segundo firmante. Sin ellas se le pide uno. En 0 no se exige.',
    ejemplo: (v) =>
      v.HISTORIAL_FINANCIERO_MINIMO_SOLO > 0
        ? `Con ${v.HISTORIAL_FINANCIERO_MINIMO_SOLO}: quien solo tiene obligaciones de telefonía o de comercio queda aprobado con segundo firmante, aunque alcance el puntaje y el score.`
        : 'Con 0: no se exige historial financiero para ir sin segundo firmante.',
    rige: 'a5d',
    ...DECISION,
  },
  MESES_VENTANA_MORA_FINANCIERA: {
    nombre: 'Meses en que una mora financiera rechaza',
    seccion: 'a5d_motor',
    sub: 'Reglas de rechazo',
    unidad: 'meses',
    queHace:
      'Una mora de más de 30 días en una obligación financiera dentro de estos meses, contados desde la consulta, rechaza el estudio, esté pagada o no. Las moras de telefonía, comercio o servicios públicos no cuentan en esta regla.',
    nota: 'Además, toda mora vigente en una obligación financiera rechaza, por cualquier monto.',
    ejemplo: (v) =>
      `Con ${v.MESES_VENTANA_MORA_FINANCIERA}: una mora de 60 días en una tarjeta de crédito dentro de ${v.MESES_VENTANA_MORA_FINANCIERA === 1 ? 'el último mes' : `los últimos ${v.MESES_VENTANA_MORA_FINANCIERA} meses`}, aunque ya esté pagada, rechaza el estudio.`,
    rige: 'a5d',
    motivo: true,
    ...DECISION,
  },
  DTI_MAXIMO: {
    nombre: 'Endeudamiento máximo',
    seccion: 'a5d_motor',
    sub: 'Endeudamiento y canon máximo',
    unidad: 'pct',
    queHace:
      'Parte máxima del ingreso ajustado que pueden llevarse las cuotas de la persona, con la de la fianza. Por encima, con ingreso verificado, el estudio se rechaza; sin ingreso verificado no rechaza: el endeudamiento se puntúa por cómo paga la persona.',
    nota: 'Hoy la plataforma usa un 65 % fijo; este valor lo usa al encender la Adenda 5.',
    ejemplo: (v) => `Con ${fmt(v.DTI_MAXIMO)} % y un ingreso verificado de $3.000.000: cuotas por más de ${pesos(30_000 * v.DTI_MAXIMO)} al mes rechazan.`,
    rige: 'a5d',
    motivo: true,
    ...DECISION,
  },
  CANON_INGRESO_MAXIMO: {
    nombre: 'Parte del ingreso que puede ser canon',
    seccion: 'a5d_motor',
    sub: 'Endeudamiento y canon máximo',
    unidad: 'pct',
    queHace:
      'Fija el canon máximo: este porcentaje del ingreso ajustado para canon del titular. Si el canon pedido lo supera, el estudio no se rechaza ni va a un analista: se aprueba «hasta canon de» ese valor. El ingreso del segundo firmante no lo aumenta.',
    nota: 'Hoy la plataforma usa un 40 % fijo; este valor lo usa al encender la Adenda 5.',
    ejemplo: (v) => `Con ${fmt(v.CANON_INGRESO_MAXIMO)} % y un ingreso ajustado de $2.500.000: se aprueba hasta un canon de ${pesos(25_000 * v.CANON_INGRESO_MAXIMO)}.`,
    rige: 'a5d',
    ...DECISION,
  },

  // ── Score ─────────────────────────────────────────────────────────────────
  ...metaAnclas(),
  ACREDITAR_VARIABLES_NO_EVALUABLES: {
    nombre: 'Acreditar las variables que no se pueden verificar',
    seccion: 'a5d_score',
    sub: 'Variables que no se pueden verificar',
    unidad: 'onoff',
    queHace:
      'Encendido: la seguridad social, la estabilidad laboral y el historial de arrendamiento, que hoy no se pueden verificar, reciben su puntaje completo (23 de los 119 puntos) y el estudio deja constancia de que fueron acreditadas, no verificadas. Apagado: esas variables no suman puntos.',
    nota: 'Cuando una de esas variables se pueda verificar, se evalúa con su valor real aunque esto siga encendido.',
    rige: 'a5d',
    motivo: true,
    ...DECISION,
  },

  // ── Segundo firmante ──────────────────────────────────────────────────────
  PISO_SEGUNDO_FIRMANTE: {
    nombre: 'Piso para pedir segundo firmante',
    seccion: 'a5d_segundo',
    sub: 'Cuándo se pide',
    unidad: 'puntos',
    queHace:
      'Por debajo de este puntaje (de 0 a 100) el estudio se rechaza, por cualquier causa: ningún segundo firmante lo compensa. Desde este puntaje, quien no alcanza a aprobarse sin segundo firmante queda aprobado con segundo firmante.',
    nota: 'Reemplaza el puntaje mínimo para exigir coarrendatario, que solo aplicaba a algunas causas.',
    ejemplo: (v) =>
      `Con ${v.PISO_SEGUNDO_FIRMANTE}: ${Math.min(v.PISO_SEGUNDO_FIRMANTE + 3, v.UMBRAL_APROBADO - 1)} puntos queda aprobado con segundo firmante; ${Math.max(0, v.PISO_SEGUNDO_FIRMANTE - 1)} se rechaza.`,
    rige: 'a5d',
    motivo: true,
    ...DECISION,
  },

  // ── Mora no financiera ────────────────────────────────────────────────────
  BANDA_TELCO_TOLERADA: {
    nombre: 'Telefonía: hasta dónde se tolera la mora',
    seccion: 'a5d_mora',
    sub: 'Solo telefonía, televisión o internet',
    unidad: 'fraccion',
    queHace:
      'Cuando todas las moras vigentes no financieras son de telefonía, televisión o internet: si su suma, frente al canon, queda por debajo de este valor, se toleran. No impiden ir sin segundo firmante y dejan el comportamiento en 0 puntos. Desde este valor hasta el de rechazo, la mora queda en banda.',
    ejemplo: (v) =>
      `Con ${fraccion(v.BANDA_TELCO_TOLERADA)} y canon de $1.300.000: menos de ${pesos(CANON_CASO * v.BANDA_TELCO_TOLERADA)} en mora se tolera; desde ahí queda en banda.`,
    rige: 'a5d',
    ...DECISION,
  },
  BANDA_TELCO_RECHAZO: {
    nombre: 'Telefonía: desde dónde rechaza la mora',
    seccion: 'a5d_mora',
    sub: 'Solo telefonía, televisión o internet',
    unidad: 'fraccion',
    queHace:
      'Si la suma de esas moras, frente al canon, pasa de este valor, el estudio se rechaza. Hasta este valor inclusive, la mora queda en banda: resta 15 puntos de comportamiento y la persona queda, como máximo, aprobada con segundo firmante.',
    ejemplo: (v) => `Con ${fraccion(v.BANDA_TELCO_RECHAZO)} y canon de $1.300.000: más de ${pesos(CANON_CASO * v.BANDA_TELCO_RECHAZO)} en mora rechaza.`,
    rige: 'a5d',
    motivo: true,
    ...DECISION,
  },
  BANDA_REAL_TOLERADA: {
    nombre: 'Comercio y otros: hasta dónde se tolera la mora',
    seccion: 'a5d_mora',
    sub: 'Con comercio, servicios públicos u otro sector',
    unidad: 'fraccion',
    queHace:
      'Cuando al menos una mora vigente no financiera es de comercio, servicios públicos u otro sector que no sea telefonía: si la suma de todas, frente al canon, queda por debajo de este valor, se toleran. No impiden ir sin segundo firmante y restan en comportamiento los puntos fijados abajo. Desde este valor hasta el de rechazo, la mora queda en banda.',
    ejemplo: (v) =>
      `Con ${fraccion(v.BANDA_REAL_TOLERADA)} y canon de $1.300.000: menos de ${pesos(CANON_CASO * v.BANDA_REAL_TOLERADA)} en mora se tolera; desde ahí queda en banda.`,
    rige: 'a5d',
    ...DECISION,
  },
  BANDA_REAL_RECHAZO: {
    nombre: 'Comercio y otros: desde dónde rechaza la mora',
    seccion: 'a5d_mora',
    sub: 'Con comercio, servicios públicos u otro sector',
    unidad: 'fraccion',
    queHace:
      'Si la suma de esas moras, frente al canon, pasa de este valor, el estudio se rechaza. Hasta este valor inclusive, la mora queda en banda: resta 15 puntos de comportamiento y la persona queda, como máximo, aprobada con segundo firmante.',
    ejemplo: (v) => `Con ${fraccion(v.BANDA_REAL_RECHAZO)} y canon de $1.300.000: más de ${pesos(CANON_CASO * v.BANDA_REAL_RECHAZO)} en mora rechaza.`,
    rige: 'a5d',
    motivo: true,
    ...DECISION,
  },
  PENAL_REAL_TOLERADA: {
    nombre: 'Comportamiento con mora tolerada de comercio',
    seccion: 'a5d_mora',
    sub: 'Con comercio, servicios públicos u otro sector',
    unidad: 'puntos',
    queHace:
      'Puntos de comportamiento (de 10) de quien tiene una mora tolerada de comercio u otro sector. Es un número negativo: resta. Como referencia: sin mora son 10, con mora de telefonía tolerada 0 y con mora en banda menos 15.',
    ejemplo: (v) => `Con ${fmt(v.PENAL_REAL_TOLERADA, true)}: el comportamiento pasa de 10 puntos a ${fmt(v.PENAL_REAL_TOLERADA, true)}.`,
    rige: 'a5d',
    ...DECISION,
  },
  MIN_OBLIGACIONES_FINANCIERAS_AL_DIA: {
    nombre: 'Respaldo de una mora no financiera',
    seccion: 'a5d_mora',
    sub: 'Respaldo',
    unidad: 'obligaciones',
    queHace:
      'Quien tiene una mora vigente no financiera debe tener al menos estas obligaciones financieras vigentes y al día, como deudor principal. Si no, el estudio se rechaza por falta de respaldo, aunque la mora esté por debajo de la banda.',
    nota: 'Una mora no financiera ya pagada no es mora vigente y no exige respaldo.',
    ejemplo: (v) =>
      `Con ${v.MIN_OBLIGACIONES_FINANCIERAS_AL_DIA}: una mora de celular de $150.000 con ${obligaciones(Math.max(0, v.MIN_OBLIGACIONES_FINANCIERAS_AL_DIA - 1))} al día rechaza el estudio.`,
    rige: 'a5d',
    motivo: true,
    ...DECISION,
  },
  VIA_RAPIDA_SCORE: {
    nombre: 'Vía rápida: score mínimo',
    seccion: 'a5d_mora',
    sub: 'Vía rápida',
    unidad: 'num',
    queHace:
      'Desde este score de la central, con las obligaciones financieras al día que pide el valor siguiente, las moras de telefonía, televisión e internet se descartan por completo: no cuentan en la razón de mora, no restan en comportamiento y no exigen respaldo. No cambia nada para las moras financieras, las castigadas ni las de comercio.',
    ejemplo: (v) =>
      `Con ${v.VIA_RAPIDA_SCORE}: con score de ${v.VIA_RAPIDA_SCORE + 30} y ${obligaciones(v.VIA_RAPIDA_MIN_OBLIG_FIN)} al día, una mora de celular de $400.000 no cuenta.`,
    rige: 'a5d',
    ...DECISION,
  },
  VIA_RAPIDA_MIN_OBLIG_FIN: {
    nombre: 'Vía rápida: obligaciones financieras al día',
    seccion: 'a5d_mora',
    sub: 'Vía rápida',
    unidad: 'obligaciones',
    queHace: 'Obligaciones financieras vigentes y al día, como deudor principal, que necesita la persona, además del score, para entrar a la vía rápida.',
    rige: 'a5d',
    ...DECISION,
  },

  // ── Sustituciones y consulta adicional ────────────────────────────────────
  MAX_SUSTITUCIONES: {
    nombre: 'Sustituciones por estudio',
    seccion: 'a5d_sustituciones',
    sub: 'Sustituciones',
    unidad: 'veces',
    queHace:
      'Veces que la inmobiliaria puede cambiar a una persona del estudio que no pasa o no completa las condiciones, en total sobre el mismo estudio. Agotadas, el estudio no admite más cambios. Retirar a una persona por coincidencia en listas no cuenta y no se cobra.',
    ejemplo: (v) =>
      v.MAX_SUSTITUCIONES > 0
        ? `Con ${v.MAX_SUSTITUCIONES}: después de ${v.MAX_SUSTITUCIONES === 1 ? 'un cambio' : `${v.MAX_SUSTITUCIONES} cambios`}, el estudio no admite otro.`
        : 'Con 0: no se puede cambiar a ninguna persona del estudio.',
    rige: 'a5d',
    ...DECISION,
  },
  VALOR_CONSULTA_ADICIONAL: {
    nombre: 'Consulta adicional (sin IVA)',
    seccion: 'a5d_sustituciones',
    sub: 'Consulta adicional',
    unidad: 'cop',
    queHace:
      'Se cobra, más IVA, por la consulta de cada persona nueva que entra por sustitución, y por consultar de nuevo a quien ya pasó cuando su reporte venció. Se paga antes de la consulta, aparte del paquete prepagado, y el valor se avisa antes de cargar a la persona.',
    nota: 'Agregar el segundo firmante que pide el estudio no es una sustitución: no se cobra.',
    ejemplo: (v) => `Con IVA del ${fmt(v.TARIFA_IVA)} %, cada consulta adicional cuesta ${pesos(v.VALOR_CONSULTA_ADICIONAL * (1 + v.TARIFA_IVA / 100))}.`,
    rige: 'a5d',
  },
  DIAS_VIGENCIA_REPORTE: {
    nombre: 'Días que se reutiliza el reporte de la central',
    seccion: 'a5d_sustituciones',
    sub: 'Consulta adicional',
    unidad: 'dias',
    queHace:
      'Días desde la consulta a la central en que su resultado se reutiliza sin consultar de nuevo: se conserva a la persona que ya pasó cuando se sustituye a la otra, y un inmueble de canon mayor se reevalúa sin cobro. Vencidos, la nueva consulta se cobra como consulta adicional.',
    ejemplo: (v) =>
      `Con ${v.DIAS_VIGENCIA_REPORTE}: si a los ${v.DIAS_VIGENCIA_REPORTE + 5} días de la consulta se cambia a la otra persona, quien ya pasó se consulta de nuevo y se cobra.`,
    rige: 'a5d',
  },

  // ── Precio ────────────────────────────────────────────────────────────────
  PRIMA_VINCULACION: {
    nombre: 'Prima de vinculación',
    seccion: 'a5d_precio',
    sub: 'Al firmar el contrato',
    unidad: 'pct',
    queHace:
      'Porcentaje del canon mensual, más IVA, que se cobra una sola vez al firmar el contrato inicial, vaya la persona sola o con segundo firmante. La prórroga o la renovación no la cobran de nuevo.',
    ejemplo: (v) => {
      const base = (2_000_000 * v.PRIMA_VINCULACION) / 100
      return `Con canon de $2.000.000: ${pesos(base)} más IVA (${pesos(base * (1 + v.TARIFA_IVA / 100))}), una sola vez.`
    },
    rige: 'a5d',
  },
  TARIFA_MENSUAL: {
    nombre: 'Tarifa mensual única',
    seccion: 'a5d_precio',
    sub: 'Cada mes',
    unidad: 'pct',
    queHace:
      'Porcentaje del canon, más IVA, que se cobra cada mes por la fianza, igual para todos los contratos sin importar cómo se aprobó el estudio. Se cobra sobre el canon vigente hasta que termine el contrato.',
    nota: 'Reemplaza las dos tarifas de hoy (aprobación automática y no automática).',
    ejemplo: (v) => tarifaEjemplo(v.TARIFA_MENSUAL, v.TARIFA_IVA),
    rige: 'a5d',
  },
  PORCENTAJE_CASHBACK: {
    nombre: 'Cashback',
    seccion: 'a5d_precio',
    sub: 'Cada mes',
    unidad: 'pct',
    queHace: 'Porcentaje de la tarifa mensual efectivamente pagada, sin IVA, que se reconoce como cashback, en las condiciones ya definidas para causarlo.',
    ejemplo: (v) =>
      `Con tarifa del ${fmt(v.TARIFA_MENSUAL)} % y canon de $2.000.000: ${pesos((20_000 * v.TARIFA_MENSUAL * v.PORCENTAJE_CASHBACK) / 100)} al mes.`,
    rige: 'a5d',
  },
}

export const META: Record<string, MetaParametro> = {
  // ── Quién se aprueba ──────────────────────────────────────────────────────
  UMBRAL_APROBACION_AUTOMATICA: {
    saleConA5d: 'se elimina el puntaje de aprobación automática: aprueba el «puntaje para aprobar», con el score mínimo, el historial financiero y sin mora en banda',
    nombre: 'Puntaje para aprobar solo',
    seccion: 'aprobacion',
    sub: 'Puntaje del solicitante',
    unidad: 'puntos',
    queHace: 'Desde este puntaje (de 0 a 100) el estudio se aprueba sin un analista, si el ingreso alcanza y no hay alertas que lo manden a revisión.',
    ejemplo: (v) => `Con ${v.UMBRAL_APROBACION_AUTOMATICA}: un solicitante con ${v.UMBRAL_APROBACION_AUTOMATICA + 2} puntos se aprueba solo; con ${v.UMBRAL_APROBACION_AUTOMATICA - 1}, no.`,
    rige: 'siempre',
    ...DECISION,
  },
  UMBRAL_ZONA_GRIS: {
    saleConA5d: 'desaparecen la zona gris y «Está cerca»: lo reemplazan el «puntaje para aprobar» y el «piso para pedir segundo firmante»',
    nombre: 'Puntaje mínimo para no rechazar',
    seccion: 'aprobacion',
    sub: 'Puntaje del solicitante',
    unidad: 'puntos',
    queHace: 'Por debajo de este puntaje el estudio se rechaza, salvo las excepciones. De aquí hasta el de aprobar solo, se pide coarrendatario («Está cerca»).',
    excepciones: [
      'La central exige un analista → no se rechaza: decide un analista.',
      'Con la Adenda 4, lo baja solo el canon sin ingreso comprobado → decide un analista, que pide soporte de ingreso.',
      'Con la Adenda 4, en estudios de inmobiliaria y desde el piso, lo baja solo el endeudamiento, o el endeudamiento y el canon, sin ingreso comprobado → se exige coarrendatario.',
    ],
    ejemplo: (v) =>
      `Con ${v.UMBRAL_ZONA_GRIS}: ${Math.min(v.UMBRAL_ZONA_GRIS + 5, v.UMBRAL_APROBACION_AUTOMATICA - 1)} puntos queda pendiente de un coarrendatario (sin inmobiliaria, decide un analista); ${v.UMBRAL_ZONA_GRIS - 5} se rechaza.`,
    rige: 'siempre',
    ...DECISION,
  },
  UMBRAL_CASCADA_RECHAZO: {
    saleConA5d: 'con dos centrales cuenta el score mayor, y la segunda se consulta solo si la primera falla o no entrega el saldo en mora de cada obligación',
    nombre: 'Puntaje para rechazar sin consultar la segunda central',
    seccion: 'aprobacion',
    sub: 'Segunda central',
    unidad: 'puntos',
    queHace: 'Para ahorrar consultas: si con la primera central (casi siempre DataCrédito) el puntaje del solicitante (0 a 100) sale por debajo de este valor, el caso ya es claramente malo y se rechaza sin pagar la segunda consulta, salvo las excepciones.',
    excepciones: [
      'El puntaje que reporta la central cae en la franja que exige un analista → se consulta la segunda central.',
      'Con la Adenda 4, solo lo baja el canon frente a un ingreso no comprobado → se consulta la segunda central.',
    ],
    ejemplo: (v) =>
      `Con ${v.UMBRAL_CASCADA_RECHAZO}: ${Math.max(0, v.UMBRAL_CASCADA_RECHAZO - 5)} puntos se rechaza solo con la primera central; ${v.UMBRAL_CASCADA_RECHAZO + 15} puntos consulta también la segunda.`,
    rige: 'siempre',
    ...DECISION,
  },
  UMBRAL_CASCADA_APROBACION: {
    saleConA5d: 'con dos centrales cuenta el score mayor, y la segunda se consulta solo si la primera falla o no entrega el saldo en mora de cada obligación',
    nombre: 'Puntaje para aprobar sin consultar la segunda central',
    seccion: 'aprobacion',
    sub: 'Segunda central',
    unidad: 'puntos',
    queHace: 'Para ahorrar consultas: si con la primera central el puntaje del solicitante (0 a 100) llega a este valor, el caso ya es claramente bueno y no se paga la segunda consulta. Se aprueba si el ingreso alcanza y nada pide revisión. Entre este valor y el de rechazo se consultan las dos centrales.',
    ejemplo: (v) =>
      `Con ${v.UMBRAL_CASCADA_APROBACION}: ${Math.min(100, v.UMBRAL_CASCADA_APROBACION + 2)} puntos se decide solo con la primera central; ${v.UMBRAL_CASCADA_APROBACION - 2} consulta también la segunda.`,
    rige: 'siempre',
    ...DECISION,
  },
  UMBRAL_SCORE_RECHAZO: {
    conA5d: 'sigue rechazando a cualquier persona del estudio por debajo de este valor; si se consultan las dos centrales, cuenta el score mayor y no el promedio',
    nombre: 'Puntaje mínimo en la central',
    seccion: 'aprobacion',
    sub: 'Puntaje que reporta la central',
    unidad: 'num',
    queHace: 'Si el puntaje que reporta la central (o el promedio de las dos, cuando se consultan ambas) es menor que este valor, el estudio se rechaza sin importar el resto, y un coarrendatario así no cuenta.',
    ejemplo: (v) =>
      `Con ${v.UMBRAL_SCORE_RECHAZO}: ${v.UMBRAL_SCORE_RECHAZO - 20} en DataCrédito rechaza el estudio; ${v.UMBRAL_SCORE_RECHAZO + 10} no rechaza: se consulta TransUnion y decide el promedio de las dos.`,
    rige: 'siempre',
    ...DECISION,
  },
  UMBRAL_SCORE_REVISION: {
    saleConA5d: 'un score bajo ya no va a un analista: por debajo del «score mínimo para ir sin segundo firmante» se pide segundo firmante',
    nombre: 'Puntaje en la central que exige un analista',
    seccion: 'aprobacion',
    sub: 'Puntaje que reporta la central',
    unidad: 'num',
    queHace: 'Si el puntaje que reporta la central (o el promedio de las dos) queda entre el mínimo y este valor, el estudio no se aprueba ni se rechaza por puntaje: lo decide un analista.',
    ejemplo: (v) => {
      const r = v.UMBRAL_SCORE_RECHAZO
      const s = v.UMBRAL_SCORE_REVISION
      return s < r
        ? `Con ${s}: queda por debajo del puntaje mínimo (${r}), así que esta regla no manda ningún caso a un analista.`
        : `Con ${s}: un puntaje (o promedio) de ${Math.round((r + s) / 2)} lo decide un analista; desde ${s + 1} sigue el cálculo normal.`
    },
    rige: 'siempre',
    ...DECISION,
  },
  DIAS_MORA_RECIENTE_RECHAZO: {
    nombre: 'Mora de los últimos 6 meses que rechaza: desde cuántos días',
    seccion: 'aprobacion',
    sub: 'Moras que rechazan',
    unidad: 'dias',
    queHace:
      'Si en los últimos 6 meses la persona tuvo una mora de al menos estos días, el estudio se rechaza sin importar el puntaje. La central reporta la mora por tramos (30, 60, 90 o 120 días); en 30, cualquier mora reportada rechaza.',
    ejemplo: (v) =>
      v.DIAS_MORA_RECIENTE_RECHAZO === 30
        ? 'Con 30: una mora de 30 días hace 4 meses rechaza el estudio.'
        : `Con ${v.DIAS_MORA_RECIENTE_RECHAZO}: una mora de 30 días hace 4 meses no rechaza (sigue restando puntos); una de ${v.DIAS_MORA_RECIENTE_RECHAZO} días sí.`,
    rige: 'siempre',
    opciones: [30, 60, 90, 120],
    nota: 'Esta regla solo aplica con DataCrédito: TransUnion no informa la mora mes a mes. Moverlo exige autorización escrita de la Dirección de Riesgo.',
    motivo: true,
    ...DECISION,
  },
  UMBRAL_DIFERENCIA_INGRESO: {
    nombre: 'Diferencia de ingreso que pide revisión',
    seccion: 'aprobacion',
    sub: 'Otras alertas',
    unidad: 'pct',
    queHace: 'Si el ingreso que declara el solicitante se aleja más de este porcentaje del que estima la central, el estudio no se aprueba solo: lo revisa un analista. Nunca rechaza.',
    ejemplo: (v) => {
      const d = v.UMBRAL_DIFERENCIA_INGRESO / 100
      return `Con ${fmt(v.UMBRAL_DIFERENCIA_INGRESO)} %: si la central estima $2.000.000 y el solicitante declara más de ${pesos(2_000_000 * (1 + d))}${d < 1 ? ` o menos de ${pesos(2_000_000 * (1 - d))}` : ''}, va a un analista.`
    },
    rige: 'siempre',
    ...DECISION,
  },
  UMBRAL_SIMILITUD_BIOMETRICA: {
    nombre: 'Parecido mínimo entre la selfie y la cédula',
    seccion: 'aprobacion',
    sub: 'Otras alertas',
    unidad: 'pct',
    queHace: 'En la autorización y en la firma, si la selfie se parece a la cédula menos que este porcentaje, un analista confirma la identidad por otro medio. Nunca rechaza.',
    ejemplo: (v) => `Con ${fmt(v.UMBRAL_SIMILITUD_BIOMETRICA)} %: un parecido de ${fmt(v.UMBRAL_SIMILITUD_BIOMETRICA - 4)} % pasa a un analista.`,
    rige: 'siempre',
    ...DECISION,
  },

  // ── Cómo se mide el ingreso ───────────────────────────────────────────────
  ADENDA3_V2: {
    nombre: 'Reglas de coarrendatarios e ingreso (Adenda 3)',
    seccion: 'ingreso',
    sub: 'Paquete de reglas',
    unidad: 'onoff',
    queHace: 'Encendido: el ingreso estimado se ajusta aparte para el canon y para las deudas, el coarrendatario suma puntos e ingreso, y a quien casi aprueba se le ofrece presentar uno («Está cerca»). Apagado: se decide como antes.',
    nota: 'No se puede apagar mientras estén encendidas las reglas de capacidad de pago (Adenda 4) o la Adenda 5 definitiva.',
    rige: 'siempre',
    motivo: true,
    ...DECISION,
  },
  FACTOR_AJUSTE_INGRESO_CANON: {
    nombre: 'Ajuste del ingreso para medir el canon',
    seccion: 'ingreso',
    sub: 'Ajustes del ingreso',
    unidad: 'factor',
    queHace: 'Las centrales suelen estimar un ingreso más bajo que el real. Por eso, para medir cuánto pesa el canon, el ingreso estimado se multiplica por este número (1,50 = se toma un 50 % más). Afecta el puntaje, el tope del 40 % y el canon máximo del certificado. No se aplica a un ingreso comprobado con documentos.',
    ejemplo: (v) => {
      const f = v.FACTOR_AJUSTE_INGRESO_CANON
      return `Con ×${fmt(f)}: si la central estima $2.000.000, el canon se mide contra ${pesos(2_000_000 * f)}; el tope del 40 % deja un canon de hasta ${pesos(800_000 * f)}.`
    },
    rige: 'v2',
    ...DECISION,
  },
  FACTOR_AJUSTE_INGRESO_DTI: {
    nombre: 'Ajuste del ingreso para medir el endeudamiento',
    seccion: 'ingreso',
    sub: 'Ajustes del ingreso',
    unidad: 'factor',
    queHace: 'Igual que el anterior, pero para medir qué parte del ingreso se le va en cuotas de deudas: el ingreso estimado se multiplica por este número (1,15 = se toma un 15 % más). Afecta el puntaje y el tope del 65 %. No se aplica a un ingreso comprobado con documentos.',
    ejemplo: (v) => {
      const f = v.FACTOR_AJUSTE_INGRESO_DTI
      return `Con ×${fmt(f)}: si la central estima $2.000.000, el endeudamiento se mide contra ${pesos(2_000_000 * f)}; el tope del 65 % deja hasta ${pesos(1_300_000 * f)} al mes en cuotas.`
    },
    rige: 'v2',
    ...DECISION,
  },
  USAR_PISOS_FACTUALES: {
    nombre: 'Usar el ingreso mínimo que muestran sus deudas',
    seccion: 'ingreso',
    sub: 'Ajustes del ingreso',
    unidad: 'onoff',
    queHace: 'Si la persona ya paga cuotas altas cada mes, es porque gana al menos lo suficiente para pagarlas. Encendido: si ese ingreso mínimo que muestran sus deudas es mayor que el estimado, el canon se mide contra ese ingreso. Apagado: solo se calcula y se anota en el estudio.',
    nota: 'Solo actúa si la central estimó un ingreso y no hay uno comprobado, y solo cambia la medida del canon, no la de las deudas.',
    rige: 'v2',
    ...DECISION,
  },
  CRITERIO_SELECCION_INGRESO: {
    nombre: 'Ingreso a usar si las dos centrales lo estiman',
    seccion: 'ingreso',
    sub: 'Ajustes del ingreso',
    unidad: 'criterio',
    queHace: 'Cuando DataCrédito y TransUnion estiman ingresos distintos, se elige cuál usar: el mayor (más favorable al solicitante) o el menor (más prudente). Un ingreso comprobado con documentos siempre manda sobre los dos.',
    rige: 'parcial',
    notaRige: 'hoy solo DataCrédito entrega un ingreso estimado, así que no hay dos para elegir',
    ...DECISION,
  },
  FACTOR_AJUSTE_INGRESO: {
    nombre: 'Ajuste único del ingreso (reglas anteriores)',
    seccion: 'ingreso',
    sub: 'Ajustes del ingreso',
    unidad: 'factor',
    queHace: 'Con las reglas de coarrendatarios e ingreso apagadas, el ingreso estimado se multiplicaba por este factor para medir el canon y las deudas.',
    rige: 'sin_v2',
    notaRige: 'solo cuenta con las reglas de coarrendatarios e ingreso apagadas',
    ...DECISION,
  },
  ADENDA3_INGRESO: {
    nombre: 'Interruptor antiguo del ingreso (retirado)',
    seccion: 'ingreso',
    unidad: 'onoff',
    queHace: 'No hace nada: lo reemplazaron las reglas de coarrendatarios e ingreso. Queda fijo en apagado.',
    rige: 'nunca',
  },

  // ── Coarrendatarios ───────────────────────────────────────────────────────
  PUNTAJE_MINIMO_TITULAR_PARA_COARRENDATARIO: {
    saleConA5d: 'el segundo firmante se pide desde el «piso para pedir segundo firmante»',
    nombre: 'Puntaje mínimo para ofrecer coarrendatario',
    seccion: 'coarrendatarios',
    sub: 'Cuándo se pide',
    unidad: 'puntos',
    queHace: 'Desde este puntaje, el solicitante de una inmobiliaria que no alcanza a aprobarse solo recibe «Está cerca» y puede presentar un coarrendatario. Por debajo, ningún coarrendatario cuenta.',
    excepciones: [
      'Solicitante sin historial en las centrales → no aplica.',
      'Quedó por debajo solo por el endeudamiento, o por el endeudamiento y el canon → manda el puntaje mínimo para exigir coarrendatario.',
    ],
    ejemplo: (v) =>
      `Con ${v.PUNTAJE_MINIMO_TITULAR_PARA_COARRENDATARIO}: ${Math.min(v.PUNTAJE_MINIMO_TITULAR_PARA_COARRENDATARIO + 8, v.UMBRAL_APROBACION_AUTOMATICA - 1)} puntos recibe «Está cerca»; ${v.PUNTAJE_MINIMO_TITULAR_PARA_COARRENDATARIO - 2} no.`,
    rige: 'v2',
    ...DECISION,
  },
  PUNTAJE_PISO_COARRENDATARIO: {
    saleConA5d: 'lo reemplaza el «piso para pedir segundo firmante», que vale para cualquier causa',
    nombre: 'Puntaje mínimo para exigir coarrendatario',
    seccion: 'coarrendatarios',
    sub: 'Cuándo se pide',
    unidad: 'puntos',
    queHace: 'En estudios de una inmobiliaria: si el solicitante queda por debajo de la zona gris solo por el endeudamiento, o por el endeudamiento y el canon, sin ingreso comprobado, desde este puntaje se le exige un coarrendatario y decide un analista. Por debajo, o sin inmobiliaria, se rechaza, salvo la excepción.',
    excepciones: ['Lo baja solo el canon sin ingreso comprobado → no se rechaza: decide un analista, que pide soporte de ingreso.'],
    ejemplo: (v) =>
      v.PUNTAJE_PISO_COARRENDATARIO > 0
        ? `Con ${v.PUNTAJE_PISO_COARRENDATARIO}: ${Math.min(v.PUNTAJE_PISO_COARRENDATARIO + 4, v.UMBRAL_ZONA_GRIS - 1)} puntos por esas causas debe presentar coarrendatario; ${v.PUNTAJE_PISO_COARRENDATARIO - 1} se rechaza.`
        : 'Con 0: todo solicitante que quede por debajo de la zona gris solo por esas causas debe presentar coarrendatario.',
    rige: 'v2_a4',
    ...DECISION,
  },
  VIGENCIA_CONDICION_COARRENDATARIO_DIAS: {
    conA5d: 'es el plazo para presentar el segundo firmante; vencido sin uno válido, el estudio se rechaza',
    nombre: 'Plazo para presentar el coarrendatario',
    seccion: 'coarrendatarios',
    sub: 'Cuándo se pide',
    unidad: 'dias',
    queHace: 'Días para presentar el coarrendatario después de «Está cerca». Al vencer sin uno que resuelva la condición, decide un analista, salvo las excepciones.',
    excepciones: [
      'El coarrendatario era obligatorio → se rechaza.',
      'El ingreso comprobado del solicitante no alcanzaba → se rechaza.',
    ],
    rige: 'v2',
    ...DECISION,
  },
  HORAS_ESPERA_AUTORIZACION: {
    conA5d: 'la espera sigue igual y vale para las dos personas del estudio',
    nombre: 'Espera a que autorice el coarrendatario',
    seccion: 'coarrendatarios',
    sub: 'Cuándo se pide',
    unidad: 'horas',
    queHace:
      'Si un coarrendatario invitado no ha autorizado, la decisión sobre el solicitante (ya consultado) espera estas horas; luego se decide con quienes autorizaron.',
    rige: 'a4',
    notaRige: 'solo en la primera decisión; no espera si el solicitante incumple algo que el coarrendatario no compensa o si la primera central sola ya lo aprueba',
    ...DECISION,
  },
  PUNTAJE_MINIMO_COARRENDATARIO: {
    conA5d: 'es el puntaje mínimo del segundo firmante, que además no puede tener ninguna causa de rechazo; no se le exigen el score mínimo para ir sin segundo firmante ni historial financiero',
    nombre: 'Puntaje mínimo para que un coarrendatario cuente',
    seccion: 'coarrendatarios',
    sub: 'Cuánto aporta',
    unidad: 'puntos',
    queHace: 'Un coarrendatario con menos de este puntaje no suma puntos ni ingreso y se informa como no válido; el estudio del solicitante sigue su curso.',
    rige: 'v2',
    ...DECISION,
  },
  BONO_COARRENDATARIO_70_79: {
    conA5d: 'se suman al puntaje del titular; el estudio se aprueba si con ellos llega al «puntaje para aprobar»',
    nombre: 'Puntos que suma un coarrendatario de 70 a 79',
    seccion: 'coarrendatarios',
    sub: 'Cuánto aporta',
    unidad: 'puntos',
    queHace: 'Se suman al puntaje del solicitante si su mejor coarrendatario válido tiene de 70 a 79. Los de varios coarrendatarios no se suman entre sí.',
    ejemplo: (v) =>
      `Solicitante con 80 y coarrendatario con 75: ${80 + v.BONO_COARRENDATARIO_70_79} puntos${80 + v.BONO_COARRENDATARIO_70_79 >= v.UMBRAL_APROBACION_AUTOMATICA ? ': se aprueba solo si el ingreso alcanza y no hay alertas' : ''}.`,
    rige: 'v2',
    ...DECISION,
  },
  BONO_COARRENDATARIO_80_89: {
    conA5d: 'se suman al puntaje del titular; el estudio se aprueba si con ellos llega al «puntaje para aprobar»',
    nombre: 'Puntos que suma un coarrendatario de 80 a 89',
    seccion: 'coarrendatarios',
    sub: 'Cuánto aporta',
    unidad: 'puntos',
    queHace: 'Se suman al puntaje del solicitante si su mejor coarrendatario válido tiene de 80 a 89.',
    ejemplo: (v) =>
      `Solicitante con 76 y coarrendatario con 82: ${76 + v.BONO_COARRENDATARIO_80_89} puntos${76 + v.BONO_COARRENDATARIO_80_89 >= v.UMBRAL_APROBACION_AUTOMATICA ? ': se aprueba solo si el ingreso alcanza y no hay alertas' : ''}.`,
    rige: 'v2',
    ...DECISION,
  },
  BONO_COARRENDATARIO_90_100: {
    conA5d: 'se suman al puntaje del titular; el estudio se aprueba si con ellos llega al «puntaje para aprobar»',
    nombre: 'Puntos que suma un coarrendatario de 90 a 100',
    seccion: 'coarrendatarios',
    sub: 'Cuánto aporta',
    unidad: 'puntos',
    queHace: 'Se suman al puntaje del solicitante si su mejor coarrendatario válido tiene de 90 a 100.',
    ejemplo: (v) =>
      `Solicitante con 72 y coarrendatario con 92: ${72 + v.BONO_COARRENDATARIO_90_100} puntos${72 + v.BONO_COARRENDATARIO_90_100 >= v.UMBRAL_APROBACION_AUTOMATICA ? ': se aprueba solo si el ingreso alcanza y no hay alertas' : ''}.`,
    rige: 'v2',
    ...DECISION,
  },
  INGRESO_COARRENDATARIO_COMPUTABLE: {
    conA5d: 'el ingreso del segundo firmante solo cuenta para el endeudamiento, y solo si lo mejora; no aumenta el canon máximo',
    nombre: 'Parte del ingreso del coarrendatario que se suma',
    seccion: 'coarrendatarios',
    sub: 'Cuánto aporta',
    unidad: 'pct',
    queHace: 'Parte del ingreso de cada coarrendatario válido que se suma al del solicitante para medir el canon y las deudas. Sus cuotas cuentan completas.',
    ejemplo: (v) => `Con ${fmt(v.INGRESO_COARRENDATARIO_COMPUTABLE)} %: un coarrendatario con ingreso de $2.000.000 suma ${pesos(20_000 * v.INGRESO_COARRENDATARIO_COMPUTABLE)}.`,
    rige: 'v2',
    ...DECISION,
  },
  UMBRAL_COARRENDATARIO: {
    saleConA5d: 'un solicitante sin historial sigue las mismas reglas que los demás, y el segundo firmante se mide con el puntaje mínimo para que un coarrendatario cuente',
    nombre: 'Puntaje del coarrendatario para un solicitante sin historial',
    seccion: 'coarrendatarios',
    sub: 'Solicitantes sin historial',
    unidad: 'puntos',
    queHace: 'Si el solicitante no tiene historial en ninguna central, un analista solo puede aprobarlo con un coarrendatario válido de este puntaje o más.',
    rige: 'parcial',
    notaRige: 'hoy solo pesa cuando un analista aprueba a un solicitante sin historial, y en estudios decididos antes de las reglas nuevas de coarrendatarios',
    ...DECISION,
  },
  CUARTO_DESENLACE: {
    nombre: 'Interruptor antiguo de «Está cerca» (retirado)',
    seccion: 'coarrendatarios',
    unidad: 'onoff',
    queHace: 'No hace nada: lo reemplazaron las reglas de coarrendatarios e ingreso. Queda fijo en apagado.',
    rige: 'nunca',
  },

  // ── Capacidad de pago ─────────────────────────────────────────────────────
  ADENDA4: {
    nombre: 'Reglas de capacidad de pago (Adenda 4)',
    seccion: 'capacidad',
    sub: 'Paquete de reglas',
    unidad: 'onoff',
    queHace: 'Encendido: sin ingreso comprobado con documentos, un endeudamiento alto o un canon alto frente al ingreso ya no rechazan solos (van a un analista o piden coarrendatario) y el endeudamiento se puntúa por cómo paga la persona. Apagado: se decide como antes.',
    nota: 'Solo se puede encender con las reglas de coarrendatarios e ingreso (Adenda 3) encendidas. No se puede apagar mientras esté encendida la Adenda 5 definitiva.',
    rige: 'siempre',
    motivo: true,
    ...DECISION,
  },
  MIN_CREDITOS_VIGENTES_COHERENCIA: {
    nombre: 'Créditos activos mínimos para ser «buen pagador»',
    seccion: 'capacidad',
    sub: 'Quién es buen pagador',
    unidad: 'num',
    queHace: 'Para contar como buen pagador, la persona debe tener al menos estos créditos activos, todos al día.',
    ejemplo: (v) => `Con ${v.MIN_CREDITOS_VIGENTES_COHERENCIA}: quien tiene ${v.MIN_CREDITOS_VIGENTES_COHERENCIA - 1} créditos activos no cuenta como buen pagador, aunque esté al día.`,
    rige: 'a4',
    ...DECISION,
  },
  MESES_VENTANA_COMPORTAMIENTO: {
    nombre: 'Meses sin moras para ser «buen pagador»',
    seccion: 'capacidad',
    sub: 'Quién es buen pagador',
    unidad: 'meses',
    queHace: 'Meses hacia atrás sin ninguna mora de más de 30 días que se exigen para contar como buen pagador. Solo 6 o 12.',
    rige: 'a4',
    opciones: [6, 12],
    ...DECISION,
  },
  RATIO_COBERTURA_ALTA: {
    nombre: 'Cuotas frente al canon para el puntaje alto',
    seccion: 'capacidad',
    sub: 'Puntos de endeudamiento del buen pagador',
    unidad: 'veces',
    queHace: 'Para quien paga al día pero aparece muy endeudado (más del 65 %) y no comprobó su ingreso: si lo que paga en cuotas cada mes es al menos estas veces el canon, demuestra que puede pagar y recibe los puntos del nivel alto en vez de 0. Ejemplo: con 3, quien paga $4.500.000 al mes en cuotas y busca un canon de $1.500.000.',
    ejemplo: (v) =>
      `Con canon de $1.500.000: quien paga ${pesos(1_500_000 * v.RATIO_COBERTURA_ALTA)} o más al mes en cuotas recibe ${v.PUNTOS_DTI_COMPORTAMIENTO_ALTO} de 15 puntos.`,
    rige: 'a4',
    ...DECISION,
  },
  PUNTOS_DTI_COMPORTAMIENTO_ALTO: {
    nombre: 'Puntos del nivel alto',
    seccion: 'capacidad',
    sub: 'Puntos de endeudamiento del buen pagador',
    unidad: 'puntos',
    queHace: 'Puntos de endeudamiento (de 15), en vez de 0, para el buen pagador sin ingreso comprobado y con más del 65 % de endeudamiento, con cuotas en el nivel alto. Ese estudio no se aprueba sin un analista.',
    rige: 'a4',
    ...DECISION,
  },
  RATIO_COBERTURA_MEDIA: {
    nombre: 'Cuotas frente al canon para el puntaje medio',
    seccion: 'capacidad',
    sub: 'Puntos de endeudamiento del buen pagador',
    unidad: 'veces',
    queHace: 'Si paga en cuotas al mes al menos estas veces el canon, sin llegar al nivel alto, recibe los puntos del nivel medio; por debajo, 0. Mismo caso: buen pagador, sin ingreso comprobado y con más del 65 % de endeudamiento.',
    ejemplo: (v) =>
      `Con canon de $1.500.000: cuotas desde ${pesos(1_500_000 * v.RATIO_COBERTURA_MEDIA)} y por debajo de ${pesos(1_500_000 * v.RATIO_COBERTURA_ALTA)} al mes dan ${v.PUNTOS_DTI_COMPORTAMIENTO_MEDIO} de 15 puntos.`,
    rige: 'a4',
    ...DECISION,
  },
  PUNTOS_DTI_COMPORTAMIENTO_MEDIO: {
    nombre: 'Puntos del nivel medio',
    seccion: 'capacidad',
    sub: 'Puntos de endeudamiento del buen pagador',
    unidad: 'puntos',
    queHace: 'Puntos de endeudamiento (de 15), en vez de 0, para el mismo caso con cuotas en el nivel medio. Ese estudio no se aprueba sin un analista.',
    rige: 'a4',
    ...DECISION,
  },
  FACTOR_CUOTA_MINIMA_TARJETA: {
    nombre: 'Cuota real de una tarjeta de crédito',
    seccion: 'capacidad',
    sub: 'Tarjetas de crédito',
    unidad: 'num',
    queHace: 'Algunas centrales reportan como «cuota» de una tarjeta de crédito todo lo que se debe en ella, como si se pagara completo cada mes. En ese caso se cuenta solo esta parte del saldo (0,05 = 5 %), que es lo que se paga en realidad. Así la persona no parece más endeudada de lo que está.',
    ejemplo: (v) => `Con ${fmt(v.FACTOR_CUOTA_MINIMA_TARJETA)}: una tarjeta con saldo de $2.000.000 reportada con cuota de $2.000.000 cuenta ${pesos(2_000_000 * v.FACTOR_CUOTA_MINIMA_TARJETA)} al mes.`,
    rige: 'a4',
    ...DECISION,
  },
  DIAS_VIGENCIA_INGRESO_VERIFICADO: {
    nombre: 'Días que vale un ingreso comprobado',
    seccion: 'capacidad',
    sub: 'Ingreso comprobado con documentos',
    unidad: 'dias',
    queHace: 'Días que vale el ingreso que un analista comprueba con documentos, contados desde la fecha del documento. Vencido, el estudio se trata como sin ingreso comprobado.',
    rige: 'a4',
    ...DECISION,
  },
  DIAS_VIGENCIA_CERTIFICACION_LABORAL: {
    nombre: 'Antigüedad máxima de la certificación laboral',
    seccion: 'capacidad',
    sub: 'Ingreso comprobado con documentos',
    unidad: 'dias',
    queHace: 'Una certificación laboral más vieja que estos días no se acepta para comprobar el ingreso de un empleado.',
    rige: 'a4',
    ...DECISION,
  },
  CONSULTAS_APELACION_ASUMIDAS: {
    nombre: 'Consultas que Cofianza paga en una apelación',
    seccion: 'capacidad',
    sub: 'Apelaciones',
    unidad: 'consultas',
    queHace: 'Si Cofianza repite a su costo la consulta a la central (1) o no (0) cuando, al responder la primera apelación de un estudio, el reporte ya venció (30 días). Una apelación posterior nunca la tiene. En 0, esa apelación se cierra.',
    rige: 'siempre',
    opciones: [0, 1],
  },

  // ── Precios y cobros ──────────────────────────────────────────────────────
  PRECIO_ESTUDIO_INDIVIDUAL: {
    nombre: 'Precio del estudio (sin IVA)',
    seccion: 'precios',
    sub: 'Estudio',
    unidad: 'cop',
    queHace: 'Lo que se cobra por un estudio que no sale de un paquete prepagado. El IVA se suma encima. Un enlace de pago ya enviado conserva su valor.',
    ejemplo: (v) => `Con IVA del ${fmt(v.TARIFA_IVA)} %, el solicitante paga ${pesos(v.PRECIO_ESTUDIO_INDIVIDUAL * (1 + v.TARIFA_IVA / 100))}.`,
    rige: 'siempre',
  },
  TARIFA_IVA: {
    nombre: 'IVA',
    seccion: 'precios',
    sub: 'Estudio',
    unidad: 'pct',
    queHace: 'Se suma al estudio, a los paquetes, a la prima de vinculación y a la tarifa mensual de la fianza, y con él se facturan esos cobros.',
    rige: 'siempre',
  },
  TARIFA_VIA_AUTOMATICA: {
    saleConA5d: 'la reemplaza la «tarifa mensual única»',
    nombre: 'Tarifa mensual: aprobación automática',
    seccion: 'precios',
    sub: 'Tarifa mensual de la fianza',
    unidad: 'pct',
    queHace: 'Porcentaje del canon, más IVA, que se cobra cada mes por la fianza si el estudio se aprueba solo (también con coarrendatario) y en otro caso.',
    excepciones: [
      'Un analista lo aprueba sin condiciones y solo lo frenaron la capacidad de pago o la identidad → también se cobra esta tarifa.',
    ],
    etiquetaExcepciones: ['otro caso', 'otros casos'],
    ejemplo: (v) => tarifaEjemplo(v.TARIFA_VIA_AUTOMATICA, v.TARIFA_IVA),
    rige: 'siempre',
  },
  TARIFA_VIA_NO_AUTOMATICA: {
    saleConA5d: 'la reemplaza la «tarifa mensual única»',
    nombre: 'Tarifa mensual: aprobación no automática',
    seccion: 'precios',
    sub: 'Tarifa mensual de la fianza',
    unidad: 'pct',
    queHace: 'Porcentaje del canon, más IVA, que se cobra cada mes por la fianza en las demás aprobaciones: de un analista por otros motivos, con una condición adicional o de la Gerencia General sobre el tope.',
    ejemplo: (v) => tarifaEjemplo(v.TARIFA_VIA_NO_AUTOMATICA, v.TARIFA_IVA),
    rige: 'siempre',
  },
  TARIFA_COBRO_DESDE: {
    nombre: 'Mes desde el que la plataforma cobra la tarifa mensual',
    seccion: 'precios',
    sub: 'Tarifa mensual de la fianza',
    unidad: 'mes',
    queHace: 'Primer mes cuya tarifa mensual liquida y factura la plataforma. Los meses anteriores se cobran por fuera. «Sin activar» = la plataforma no cobra ningún mes.',
    notaRige: 'además Tecnología debe tener encendido el cobro automático de la tarifa; si está apagado, no se liquida ningún mes aunque aquí haya uno elegido',
    rige: 'siempre',
  },
  VIGENCIA_PAQUETE_MESES: {
    nombre: 'Duración de un paquete de estudios',
    seccion: 'precios',
    sub: 'Paquetes de estudios',
    unidad: 'meses',
    queHace: 'Meses que duran los cupos de un paquete prepagado, desde que se aprueba el pago. Al vencer, los cupos sin usar se pierden. Los paquetes ya comprados conservan su fecha.',
    rige: 'siempre',
  },
  ALERTA_SALDO_MINIMO_CUPOS: {
    nombre: 'Aviso de cupos por agotarse',
    seccion: 'precios',
    sub: 'Paquetes de estudios',
    unidad: 'num',
    queHace: 'Cuando los cupos disponibles de una inmobiliaria bajan de este número, sus titulares reciben un aviso en la plataforma y por correo. No bloquea nada.',
    rige: 'siempre',
  },
  PORCENTAJE_BENEFICIO_TRADICIONAL: {
    nombre: 'Beneficio de la inmobiliaria en modalidad Tradicional',
    seccion: 'precios',
    sub: 'Modalidad Tradicional',
    unidad: 'pct',
    queHace: 'Al firmarse un contrato Tradicional, se le reconoce a la inmobiliaria este porcentaje de lo pagado por el estudio sin IVA. Queda acumulado, sin pagarse.',
    ejemplo: (v) =>
      `Con ${fmt(v.PORCENTAJE_BENEFICIO_TRADICIONAL)} % y un estudio pagado a ${pesos(v.PRECIO_ESTUDIO_INDIVIDUAL)} sin IVA, se acumulan ${pesos((v.PRECIO_ESTUDIO_INDIVIDUAL * v.PORCENTAJE_BENEFICIO_TRADICIONAL) / 100)}.`,
    rige: 'siempre',
  },
  ALERTA_MEZCLA_TRADICIONAL_PAQUETE_25: {
    nombre: 'Aviso por muchos contratos Tradicional (paquete de 25)',
    seccion: 'precios',
    sub: 'Modalidad Tradicional',
    unidad: 'pct',
    queHace:
      'Si una inmobiliaria con paquete de 25 vigente supera este porcentaje de contratos Tradicional en 6 meses (mínimo 5 contratos), se avisa a la Gerencia General. No bloquea nada.',
    rige: 'siempre',
  },

  // ── Autorización y plazos ─────────────────────────────────────────────────
  DIAS_EXPIRACION_ESTUDIO: {
    nombre: 'Días que funciona el enlace de autorización',
    seccion: 'plazos',
    sub: 'Plazos',
    unidad: 'dias',
    queHace: 'Cada enlace de autorización funciona estos días desde que se envía. Si vence, el estudio sigue abierto y el enlace se puede reenviar.',
    rige: 'siempre',
  },
  DIAS_CADUCIDAD_ESTUDIO: {
    nombre: 'Días para que el estudio se cierre sin autorización',
    seccion: 'plazos',
    sub: 'Plazos',
    unidad: 'dias',
    queHace: 'Si el solicitante no autoriza en estos días desde que se creó el estudio, el estudio se cierra para siempre (hay que crear otro). Lo pagado se devuelve si nadie llegó a consultarse en la central.',
    notaRige: 'además Tecnología debe tener encendido el cierre automático (hoy lo está)',
    nota: 'Acortarlo aplica también a los estudios ya creados: los que ya pasen el plazo nuevo sin la autorización del solicitante se cierran en la siguiente revisión automática (cada hora). Alargarlo no reabre los cerrados.',
    rige: 'a4',
  },
  VIGENCIA_CRC_DIAS: {
    nombre: 'Días que vale el certificado de riesgo',
    seccion: 'plazos',
    sub: 'Plazos',
    unidad: 'dias',
    queHace: 'El certificado de riesgo vale estos días desde la consulta a la central. Vencido, no se firma contrato con él y hay que consultar de nuevo.',
    rige: 'siempre',
  },
  MAX_INTENTOS_DOCUMENTO: {
    nombre: 'Intentos para escribir el documento',
    seccion: 'plazos',
    sub: 'Documento y enlace',
    unidad: 'num',
    queHace: 'Veces que se puede escribir mal el número de documento en un mismo enlace. Agotadas, el enlace se bloquea y se avisa al asesor para corregir y reenviar.',
    rige: 'siempre',
  },
  MAX_CORRECCIONES_DOCUMENTO: {
    nombre: 'Correcciones del documento por estudio',
    seccion: 'plazos',
    sub: 'Documento y enlace',
    unidad: 'num',
    queHace: 'Veces que se puede corregir el documento del solicitante en un estudio. Una corrección más cierra el estudio, avisa a la Gerencia General y obliga a crear uno nuevo.',
    rige: 'siempre',
  },
  MAX_REENVIOS_ENLACE: {
    nombre: 'Reenvíos del enlace de autorización',
    seccion: 'plazos',
    sub: 'Documento y enlace',
    unidad: 'num',
    queHace: 'Veces que la inmobiliaria o el propietario pueden reenviar el enlace en un mismo estudio. Después, solo Cofianza puede reenviarlo.',
    rige: 'siempre',
  },
  ALERTA_BLOQUEO_WHATSAPP: {
    nombre: 'Aviso por WhatsApp de enlace bloqueado',
    seccion: 'plazos',
    sub: 'Documento y enlace',
    unidad: 'onoff',
    queHace: 'Encendido: cuando un enlace se bloquea por intentos fallidos con el documento, además del aviso en la plataforma se escribe por WhatsApp al asesor.',
    nota: 'Enciéndalo solo cuando Meta haya aprobado la plantilla de WhatsApp de este aviso: antes, el mensaje no llega.',
    rige: 'siempre',
  },

  // ── Canon y contratos ─────────────────────────────────────────────────────
  CANON_MAX_TRANSITORIO: {
    nombre: 'Canon máximo que se afianza (vivienda)',
    seccion: 'contratos',
    sub: 'Topes de canon',
    unidad: 'cop',
    queHace: 'Si el canon (sin IVA) supera este valor, el estudio no se aprueba solo: solo la Gerencia General puede aprobarlo y autorizar el contrato. En la migración de cartera, ese contrato se rechaza.',
    ejemplo: (v) =>
      `Con ${pesos(v.CANON_MAX_TRANSITORIO)}: un estudio con canon de ${pesos(v.CANON_MAX_TRANSITORIO + 200_000)} que saldría aprobado queda en revisión hasta que la Gerencia General lo autorice.`,
    rige: 'siempre',
    ...DECISION,
  },
  TOPE_CANON_COMERCIAL: {
    nombre: 'Canon máximo que se afianza (comercial)',
    seccion: 'contratos',
    sub: 'Topes de canon',
    unidad: 'cop',
    queHace: 'Un contrato comercial con canon sin IVA por encima de este valor se rechaza en la migración de cartera.',
    rige: 'parcial',
    notaRige: 'hoy solo actúa en la migración de cartera; los estudios comerciales todavía no están habilitados',
    ...DECISION,
  },
  TOLERANCIA_CANON: {
    saleConA5d: 'desaparece el margen: un canon igual o menor al aprobado no se reevalúa, y uno mayor se reevalúa sin cobro mientras el reporte de la central esté vigente',
    nombre: 'Cuánto puede subir el canon sin nueva evaluación',
    seccion: 'contratos',
    sub: 'Topes de canon',
    unidad: 'pct',
    queHace: 'Cuánto puede subir el canon sobre el evaluado, en el contrato o al cambiar o vincular el inmueble, sin pedir una nueva evaluación. También limita el canon máximo del certificado de riesgo.',
    ejemplo: (v) => `Evaluado con $2.000.000 y ${fmt(v.TOLERANCIA_CANON)} %: el contrato puede ir hasta ${pesos(2_000_000 * (1 + v.TOLERANCIA_CANON / 100))}.`,
    rige: 'siempre',
    ...DECISION,
  },
  TOPE_CANON_INGRESO_RECALCULO: {
    saleConA5d: 'el canon máximo lo fija la «parte del ingreso que puede ser canon»',
    nombre: 'Peso máximo del canon sobre el ingreso al subirlo',
    seccion: 'contratos',
    sub: 'Topes de canon',
    unidad: 'pct',
    queHace: 'Si el canon sube sobre el evaluado, no puede pesar más de este porcentaje del ingreso tomado en el estudio; si lo pasa, se exige nueva evaluación. Sin ingreso conocido no frena.',
    ejemplo: (v) => `Con un ingreso de $5.000.000 en el estudio y ${fmt(v.TOPE_CANON_INGRESO_RECALCULO)} %: el canon no puede pasar de ${pesos(50_000 * v.TOPE_CANON_INGRESO_RECALCULO)}.`,
    rige: 'siempre',
    ...DECISION,
  },
  VIGENCIA_MESES_DEFECTO: {
    nombre: 'Duración sugerida del contrato',
    seccion: 'contratos',
    sub: 'Contrato',
    unidad: 'meses',
    queHace: 'Duración con la que se precarga el contrato cuando el estudio no trae una. Quien elabora el contrato puede cambiarla.',
    rige: 'siempre',
  },
  MAX_CLAUSULAS_ADICIONALES: {
    nombre: 'Cláusulas adicionales sin revisión',
    seccion: 'contratos',
    sub: 'Contrato',
    unidad: 'num',
    queHace: 'Un contrato con más cláusulas adicionales que este número no se genera ni se envía a firma hasta que la Gerencia General autorice ese conjunto exacto.',
    rige: 'siempre',
  },
  DIAS_EXPIRACION_FIRMA: {
    nombre: 'Días para firmar el contrato',
    seccion: 'contratos',
    sub: 'Contrato',
    unidad: 'dias',
    queHace:
      'Días calendario para firmar desde el envío, con una sola prórroga igual y sin pasar la vigencia del certificado. Si vence sin todas las firmas, la fianza no opera y hay que reenviarlo.',
    rige: 'siempre',
  },
  DIAS_RESERVA_INMUEBLE: {
    nombre: 'Días que el inmueble queda apartado',
    seccion: 'contratos',
    sub: 'Contrato',
    unidad: 'dias_habiles',
    queHace: 'Días hábiles que el inmueble queda apartado al iniciar el contrato. Si en ese plazo no se envía a firma, el borrador se cancela solo y el inmueble se libera.',
    rige: 'siempre',
  },
  IPC_ANUAL: {
    nombre: 'IPC para reajustar el canon',
    seccion: 'contratos',
    sub: 'Contrato',
    unidad: 'pct',
    queHace: 'Cerca del aniversario de cada contrato se le sugiere a la inmobiliaria el canon reajustado con este porcentaje; ella lo confirma o lo corrige.',
    ejemplo: (v) => `Con ${fmt(v.IPC_ANUAL)} %: a un canon de $2.000.000 se le sugiere ${pesos(2_000_000 * (1 + v.IPC_ANUAL / 100))}.`,
    rige: 'siempre',
  },

  // ── Migración de cartera ──────────────────────────────────────────────────
  MESES_SIN_MORA_REQUERIDOS: {
    nombre: 'Meses sin mora que se declaran',
    seccion: 'migracion',
    sub: 'Condiciones',
    unidad: 'meses',
    queHace: 'La inmobiliaria declara que cada contrato que migra lleva estos meses sin mora. Queda en el acta y fija los meses de soportes que se piden en una auditoría.',
    rige: 'siempre',
  },
  TARIFA_MIGRACION_REPORTABLE: {
    nombre: 'Tarifa mensual de un contrato migrado',
    seccion: 'migracion',
    sub: 'Condiciones',
    unidad: 'pct',
    queHace: 'Porcentaje del canon, más IVA, que la inmobiliaria paga cada mes por un contrato migrado que autoriza el reporte a centrales. Queda en el acta; los lotes ya procesados no cambian.',
    ejemplo: (v) => `Con ${fmt(v.TARIFA_MIGRACION_REPORTABLE)} % y un canon de $2.000.000, la inmobiliaria paga ${pesos(20_000 * v.TARIFA_MIGRACION_REPORTABLE)} al mes más IVA.`,
    rige: 'siempre',
  },
  TARIFA_MIGRACION_NO_REPORTABLE: {
    nombre: 'Tarifa mensual de un contrato migrado que no autoriza reporte',
    seccion: 'migracion',
    sub: 'Condiciones',
    unidad: 'pct',
    queHace:
      'Porcentaje del canon, más IVA, que la inmobiliaria paga cada mes por un contrato migrado que no autoriza el reporte a centrales. Si después lo autoriza, pasa a la tarifa del contrato que sí lo autoriza desde el mes siguiente. Queda en el acta; los lotes ya procesados no cambian.',
    ejemplo: (v) =>
      `Con ${fmt(v.TARIFA_MIGRACION_NO_REPORTABLE)} % y un canon de $2.000.000, la inmobiliaria paga ${pesos(20_000 * v.TARIFA_MIGRACION_NO_REPORTABLE)} al mes más IVA.`,
    rige: 'siempre',
  },
  // Lo reemplazó la tarifa anterior: la API ya no lo lista; queda para nombrarlo en el historial de cambios.
  RECARGO_NO_REPORTABLE: {
    nombre: 'Recargo si el contrato migrado no autoriza reporte',
    seccion: 'migracion',
    sub: 'Condiciones',
    unidad: 'pct',
    queHace: 'Puntos que se suman a la tarifa de un contrato migrado que no autoriza el reporte a centrales. Si después lo autoriza, el recargo se quita desde el mes siguiente.',
    ejemplo: (v) =>
      `${fmt(v.TARIFA_MIGRACION_REPORTABLE)} % + ${fmt(v.RECARGO_NO_REPORTABLE)} = ${fmt(v.TARIFA_MIGRACION_REPORTABLE + v.RECARGO_NO_REPORTABLE)} % del canon al mes.`,
    rige: 'siempre',
  },
  MAX_FILAS_POR_CARGA: {
    nombre: 'Máximo de contratos por archivo',
    seccion: 'migracion',
    sub: 'Carga y plazos',
    unidad: 'num',
    queHace: 'Un archivo con más contratos que este número se rechaza completo; la cartera se carga en varios archivos.',
    rige: 'siempre',
  },
  UMBRAL_ALERTA_EXPOSICION_LOTE: {
    nombre: 'Monto de un lote que avisa a la Gerencia',
    seccion: 'migracion',
    sub: 'Carga y plazos',
    unidad: 'cop',
    queHace: 'Si los contratos de un lote suman este monto o más (18 cánones por contrato), se avisa a la Gerencia General. La carga no se frena.',
    rige: 'siempre',
  },
  DIAS_RESPUESTA_AUDITORIA: {
    nombre: 'Días para entregar soportes en una auditoría',
    seccion: 'migracion',
    sub: 'Carga y plazos',
    unidad: 'dias_habiles',
    queHace: 'Días hábiles para que la inmobiliaria entregue los soportes de pago de un contrato migrado en auditoría. Si no cumple, se avisa al equipo de Cofianza, que puede excluirlo. Cada lote conserva el plazo de su acta.',
    rige: 'siempre',
  },
  DIAS_VIGENCIA_LOTE_SIN_FIRMA: {
    nombre: 'Días para firmar el acta de migración',
    seccion: 'migracion',
    sub: 'Carga y plazos',
    unidad: 'dias',
    queHace: 'Días para firmar el acta de un lote o de una corrección. Sin firma a tiempo, el lote expira sin activar nada, o la corrección no se aplica.',
    rige: 'siempre',
  },
  DIAS_ENTREGA_DOCUMENTO_PENDIENTE: {
    nombre: 'Días para entregar el documento de un arrendatario sin identificar',
    seccion: 'migracion',
    sub: 'Carga y plazos',
    unidad: 'dias_habiles',
    queHace: 'Si el archivo no trae el documento de un arrendatario, el contrato entra al acta como pendiente de identificación y sin cobertura. La inmobiliaria tiene estos días hábiles, desde la firma del acta, para entregarlo; la fianza se activa el día en que Cofianza lo registra. Si no lo entrega a tiempo, el contrato no se migra. Cada lote conserva el plazo de su acta.',
    rige: 'siempre',
  },
  DIAS_ENTREGA_EXPEDIENTE_TRAS_MORA: {
    nombre: 'Días para entregar los datos de un contrato migrado con mora',
    seccion: 'migracion',
    sub: 'Carga y plazos',
    unidad: 'dias_habiles',
    queHace: 'Al reportarse una mora sobre un contrato migrado, se le piden a la inmobiliaria los datos que no se exigieron al migrar: celular y correo del arrendatario, coarrendatarios, copia del contrato firmado e historial de pagos. Tiene estos días hábiles para entregarlos. Cada lote conserva el plazo de su acta.',
    rige: 'siempre',
  },

  // La Adenda 5 definitiva va al final: su grupo cierra el menú.
  ...META_A5D,
}

function tarifaEjemplo(pct: number, iva: number): string {
  const base = (2_000_000 * pct) / 100
  return `Con canon de $2.000.000: ${pesos(base)} más IVA (${pesos(base * (1 + iva / 100))}) al mes.`
}

/**
 * Valores de reglas reemplazadas que ya no deciden nada. Si un API anterior
 * los sigue listando, la pantalla no los muestra (ni siquiera en «Otros»,
 * donde saldrían con su clave y editables): la escalera de mora vigente y el
 * paz y salvo de la Adenda 5 anterior, que reemplazó la Adenda 5 definitiva.
 * MIN_OBLIGACIONES_FINANCIERAS_AL_DIA no está: la definitiva lo reutiliza.
 */
const RETIRADOS = new Set(['ADENDA5', 'FACTOR_MORA_TOLERADA', 'FACTOR_MORA_RECHAZO', 'DIAS_PLAZO_PAZ_Y_SALVO'])
export const seMuestra = (p: { clave: string }) => !RETIRADOS.has(p.clave)

export const metaDe = (clave: string): MetaParametro =>
  META[clave] ?? { nombre: clave, seccion: 'otros', unidad: 'num', queHace: '', rige: 'siempre' }
export const nombreDe = (clave: string) => metaDe(clave).nombre

/** El resumen con sus excepciones en un solo texto (diálogo de edición y búsqueda). */
export const textoCompleto = (m: MetaParametro) =>
  m.excepciones?.length ? `${m.queHace} ${m.excepciones.join(' ')}` : m.queHace

// El orden de META es el de la pantalla (subtemas incluidos), no el del API.
const ORDEN = Object.keys(META)
const posicion = (clave: string) => (ORDEN.includes(clave) ? ORDEN.indexOf(clave) : ORDEN.length)
export const porOrden = (a: { clave: string }, b: { clave: string }) => posicion(a.clave) - posicion(b.clave)

/** ¿Está encendida la Adenda 5 definitiva? */
export const a5dEncendida = (v: Valores) => v.ADENDA5_DEF === 1
/** ¿El API ya trae la Adenda 5 definitiva? Uno anterior no la lista: entonces sus notas no se muestran. */
export const a5dDisponible = (v: Valores) => typeof v.ADENDA5_DEF === 'number'

/**
 * ¿Cambia algo hoy, con los paquetes de reglas como están? Lo que la Adenda 5
 * definitiva retira deja de aplicar al encenderla.
 */
export function rigeHoy(m: Pick<MetaParametro, 'rige' | 'saleConA5d'>, v: Valores): boolean {
  if (m.saleConA5d && a5dEncendida(v)) return false
  switch (m.rige) {
    case 'v2':
      return v.ADENDA3_V2 === 1
    case 'sin_v2':
      return v.ADENDA3_V2 !== 1
    case 'a4':
      return v.ADENDA4 === 1
    case 'v2_a4':
      return v.ADENDA3_V2 === 1 && v.ADENDA4 === 1
    case 'a5d':
      return a5dEncendida(v)
    case 'nunca':
      return false
    default:
      return true
  }
}

/** El valor con su unidad, como lo diría una persona: «$80.000», «19 %», «15 días». */
export function conUnidad(n: number, p: Pick<IParametroCalibracion, 'clave' | 'entero'>): string {
  const u = metaDe(p.clave).unidad
  const v = fmt(n, p.entero)
  switch (u) {
    case 'cop':
      return `$${v}`
    case 'pct':
      return `${v} %`
    case 'puntos':
      return `${v} pts`
    case 'horas':
      return `${v} ${n === 1 ? 'hora' : 'horas'}`
    case 'dias':
      return `${v} ${n === 1 ? 'día' : 'días'}`
    case 'dias_habiles':
      return `${v} ${n === 1 ? 'día hábil' : 'días hábiles'}`
    case 'meses':
      return `${v} ${n === 1 ? 'mes' : 'meses'}`
    case 'veces':
      return `${v} ${n === 1 ? 'vez' : 'veces'}`
    case 'consultas':
      return `${v} ${n === 1 ? 'consulta' : 'consultas'}`
    case 'obligaciones':
      return `${v} ${n === 1 ? 'obligación' : 'obligaciones'}`
    case 'fraccion':
      return `${fraccion(n)} (${fmt(n * 100)} %)`
    case 'factor':
      return `×${v}`
    case 'onoff':
      return n === 1 ? 'Encendido' : 'Apagado'
    case 'criterio':
      return n === 1 ? 'El mayor' : 'El menor'
    case 'mes': {
      if (n >= MES_APAGADO) return 'Sin activar'
      const anio = Math.floor(n / 100)
      const mes = n % 100
      return mes >= 1 && mes <= 12 ? `${MESES[mes - 1]} ${anio}` : String(n)
    }
    default:
      return v
  }
}

/** Las advertencias del API citan otros parámetros por su clave («más TARIFA_IVA»): se dicen por su nombre. */
// El mes de cobro se elige con un selector de mes: el formato AAAAMM y el
// 209912 («nunca») no se le muestran a la persona.
export const humanizar = (texto: string) =>
  sinReferenciasInternas(texto)
    .replace(/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/g, (c) => (META[c] ? `«${META[c].nombre.toLowerCase()}»` : c))
    .replace(/\s*\(AAAAMM[^)]*\)/g, '')
    .replace(new RegExp(`\\b${MES_APAGADO}\\b`, 'g'), '«Sin activar»')

/**
 * Las reglas de coherencia del API para la Adenda 5 definitiva, antes de
 * enviar: así el error sale al escribir y no después de guardar. El API las
 * vuelve a validar (src/lib/calibracion.ts, validarCoherencia). Devuelve el
 * motivo, o null si el valor nuevo cuadra con los demás.
 */
export function coherenciaA5d(clave: string, nuevo: number, v: Valores): string | null {
  const c: Valores = { ...v, [clave]: nuevo }
  if (esClaveAncla(clave)) {
    const t = anclajes(c)
    if (!t) return null
    for (let i = 1; i < t.length; i++) {
      if (t[i].score <= t[i - 1].score)
        return `Los anclajes deben crecer: el score del anclaje ${i + 1} (${fmt(t[i].score, true)}) debe quedar por encima del score del anclaje ${i} (${fmt(t[i - 1].score, true)}). Para correr la tabla hacia arriba, mueva primero los anclajes altos; hacia abajo, primero los bajos.`
      if (t[i].puntos <= t[i - 1].puntos)
        return `Los anclajes deben crecer: los puntos del anclaje ${i + 1} (${fmt(t[i].puntos)}) deben quedar por encima de los del anclaje ${i} (${fmt(t[i - 1].puntos)}).`
    }
    return null
  }
  const parejas: [bajo: string, alto: string][] = [
    ['BANDA_TELCO_TOLERADA', 'BANDA_TELCO_RECHAZO'],
    ['BANDA_REAL_TOLERADA', 'BANDA_REAL_RECHAZO'],
    ['PISO_SEGUNDO_FIRMANTE', 'UMBRAL_APROBADO'],
  ]
  for (const [bajo, alto] of parejas) {
    if ((clave === bajo || clave === alto) && typeof c[bajo] === 'number' && typeof c[alto] === 'number' && c[bajo] >= c[alto]) {
      // Las bandas, solo como fracción («0,40»): con el porcentaje entre paréntesis el mensaje quedaba con paréntesis dobles.
      const d = (k: string) => (META[k].unidad === 'fraccion' ? fraccion(c[k]) : conUnidad(c[k], { clave: k, entero: true }))
      return `«${META[bajo].nombre}» (${d(bajo)}) debe quedar por debajo de «${META[alto].nombre.toLowerCase()}» (${d(alto)}).`
    }
  }
  if (clave === 'ADENDA5_DEF' && nuevo === 1 && (c.ADENDA3_V2 !== 1 || c.ADENDA4 !== 1))
    return 'La Adenda 5 definitiva se enciende sobre las reglas de coarrendatarios e ingreso (Adenda 3) y las de capacidad de pago (Adenda 4): encienda primero esas.'
  if ((clave === 'ADENDA3_V2' || clave === 'ADENDA4') && nuevo !== 1 && c.ADENDA5_DEF === 1)
    return 'No se puede apagar mientras esté encendida la Adenda 5 definitiva: apague primero esa.'
  return null
}
