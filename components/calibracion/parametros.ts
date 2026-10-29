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
  | 'num'

export type SeccionId = 'aprobacion' | 'ingreso' | 'coarrendatarios' | 'capacidad' | 'precios' | 'plazos' | 'contratos' | 'migracion' | 'otros'

/**
 * Cuándo el valor cambia algún resultado: siempre, solo con un paquete de
 * reglas encendido (o apagado), nunca (retirado) o en parte (`notaRige` dice
 * dónde). Con lo que no rige hoy, la sección lo pliega al final.
 */
export type Rige = 'siempre' | 'v2' | 'sin_v2' | 'a4' | 'v2_a4' | 'nunca' | 'parcial'

export interface MetaParametro {
  nombre: string
  seccion: SeccionId
  /** Subtema dentro de la sección. */
  sub?: string
  unidad: Unidad
  queHace: string
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
}

export const SECCIONES: { id: SeccionId; titulo: string; ayuda: string }[] = [
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
]

// es-CO: coma decimal y punto de miles («1,15», «3.000.000»).
export const fmt = (n: number, entero = false) => n.toLocaleString('es-CO', { maximumFractionDigits: entero ? 0 : 4 })
const pesos = (n: number) => `$${fmt(Math.round(n), true)}`

/** 209912 = «nunca»: es el valor con el que el cobro queda apagado. */
export const MES_APAGADO = 209912
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const DECISION = { matriz: true } as const

export const META: Record<string, MetaParametro> = {
  // ── Quién se aprueba ──────────────────────────────────────────────────────
  UMBRAL_APROBACION_AUTOMATICA: {
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
    nombre: 'Puntaje mínimo para no rechazar',
    seccion: 'aprobacion',
    sub: 'Puntaje del solicitante',
    unidad: 'puntos',
    queHace: 'Por debajo de este puntaje el estudio se rechaza, salvo que solo lo baje el endeudamiento o la central exija un analista. De aquí hasta el de aprobar solo, se pide coarrendatario («Está cerca»).',
    ejemplo: (v) =>
      `Con ${v.UMBRAL_ZONA_GRIS}: ${Math.min(v.UMBRAL_ZONA_GRIS + 5, v.UMBRAL_APROBACION_AUTOMATICA - 1)} puntos queda pendiente de un coarrendatario (sin inmobiliaria, decide un analista); ${v.UMBRAL_ZONA_GRIS - 5} se rechaza.`,
    rige: 'siempre',
    ...DECISION,
  },
  UMBRAL_CASCADA_RECHAZO: {
    nombre: 'Rechazo sin consultar la segunda central',
    seccion: 'aprobacion',
    sub: 'Segunda central',
    unidad: 'puntos',
    queHace: 'Si con la primera central (casi siempre DataCrédito) el estudio saca menos de este puntaje, se rechaza sin consultar la otra, salvo que la central dé un puntaje de la franja que exige un analista.',
    ejemplo: (v) =>
      `Con ${v.UMBRAL_CASCADA_RECHAZO}: ${Math.max(0, v.UMBRAL_CASCADA_RECHAZO - 5)} puntos se rechaza solo con la primera central; ${v.UMBRAL_CASCADA_RECHAZO + 15} puntos consulta también la segunda.`,
    rige: 'siempre',
    ...DECISION,
  },
  UMBRAL_CASCADA_APROBACION: {
    nombre: 'Aprobación sin consultar la segunda central',
    seccion: 'aprobacion',
    sub: 'Segunda central',
    unidad: 'puntos',
    queHace: 'Si con la primera central el estudio llega a este puntaje, no se consulta la otra: se aprueba si el ingreso alcanza y nada pide revisión.',
    ejemplo: (v) =>
      `Con ${v.UMBRAL_CASCADA_APROBACION}: ${Math.min(100, v.UMBRAL_CASCADA_APROBACION + 2)} puntos se decide solo con la primera central; ${v.UMBRAL_CASCADA_APROBACION - 2} consulta también la segunda.`,
    rige: 'siempre',
    ...DECISION,
  },
  UMBRAL_SCORE_RECHAZO: {
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
    nota: 'No se puede apagar mientras estén encendidas las reglas de capacidad de pago (Adenda 4).',
    rige: 'siempre',
    motivo: true,
    ...DECISION,
  },
  FACTOR_AJUSTE_INGRESO_CANON: {
    nombre: 'Ajuste del ingreso para medir el canon',
    seccion: 'ingreso',
    sub: 'Ajustes del ingreso',
    unidad: 'factor',
    queHace: 'El ingreso que estima la central se multiplica por este factor al medir cuánto pesa el canon: en el puntaje, en el tope del 40 % y en el canon máximo del certificado de riesgo. No se aplica a un ingreso comprobado.',
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
    queHace: 'El ingreso que estima la central se multiplica por este factor antes de medir qué parte se le va en cuotas, en el puntaje y en el tope del 65 %. No se aplica a un ingreso comprobado.',
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
    queHace: 'Encendido: si las cuotas que la persona ya paga muestran un ingreso mayor que el estimado ya ajustado, el canon se mide contra ese ingreso. Apagado: solo se calcula y se anota.',
    nota: 'Solo actúa si la central estimó un ingreso y no hay uno comprobado, y solo cambia la medida del canon, no la de las deudas.',
    rige: 'v2',
    ...DECISION,
  },
  CRITERIO_SELECCION_INGRESO: {
    nombre: 'Ingreso a usar si las dos centrales lo estiman',
    seccion: 'ingreso',
    sub: 'Ajustes del ingreso',
    unidad: 'criterio',
    queHace: 'Si las dos centrales estiman el ingreso, se usa el mayor o el menor. Un ingreso comprobado con documentos siempre manda.',
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
    nombre: 'Puntaje mínimo para ofrecer coarrendatario',
    seccion: 'coarrendatarios',
    sub: 'Cuándo se pide',
    unidad: 'puntos',
    queHace: 'Desde este puntaje, el solicitante de una inmobiliaria que no alcanza a aprobarse solo recibe «Está cerca» y puede presentar un coarrendatario. Por debajo, ningún coarrendatario cuenta.',
    ejemplo: (v) =>
      `Con ${v.PUNTAJE_MINIMO_TITULAR_PARA_COARRENDATARIO}: ${Math.min(v.PUNTAJE_MINIMO_TITULAR_PARA_COARRENDATARIO + 8, v.UMBRAL_APROBACION_AUTOMATICA - 1)} puntos recibe «Está cerca»; ${v.PUNTAJE_MINIMO_TITULAR_PARA_COARRENDATARIO - 2} no.`,
    nota: 'No aplica al solicitante sin historial en las centrales. Si quedó por debajo solo por el endeudamiento, manda el puntaje mínimo para exigir coarrendatario.',
    rige: 'v2',
    ...DECISION,
  },
  PUNTAJE_PISO_COARRENDATARIO: {
    nombre: 'Puntaje mínimo para exigir coarrendatario',
    seccion: 'coarrendatarios',
    sub: 'Cuándo se pide',
    unidad: 'puntos',
    queHace: 'En estudios de una inmobiliaria: si el solicitante queda por debajo de la zona gris solo por el endeudamiento, sin ingreso comprobado, desde este puntaje se le exige un coarrendatario y decide un analista. Por debajo, o sin inmobiliaria, se rechaza.',
    ejemplo: (v) =>
      v.PUNTAJE_PISO_COARRENDATARIO > 0
        ? `Con ${v.PUNTAJE_PISO_COARRENDATARIO}: ${Math.min(v.PUNTAJE_PISO_COARRENDATARIO + 4, v.UMBRAL_ZONA_GRIS - 1)} puntos por endeudamiento debe presentar coarrendatario; ${v.PUNTAJE_PISO_COARRENDATARIO - 1} se rechaza.`
        : 'Con 0: todo solicitante que quede por debajo de la zona gris solo por el endeudamiento debe presentar coarrendatario.',
    rige: 'v2_a4',
    ...DECISION,
  },
  VIGENCIA_CONDICION_COARRENDATARIO_DIAS: {
    nombre: 'Plazo para presentar el coarrendatario',
    seccion: 'coarrendatarios',
    sub: 'Cuándo se pide',
    unidad: 'dias',
    queHace: 'Días para presentar el coarrendatario después de «Está cerca». Al vencer sin uno que resuelva la condición, se rechaza si el coarrendatario era obligatorio o si el ingreso comprobado del solicitante no alcanzaba; si no, decide un analista.',
    rige: 'v2',
    ...DECISION,
  },
  HORAS_ESPERA_AUTORIZACION: {
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
    nombre: 'Puntaje mínimo para que un coarrendatario cuente',
    seccion: 'coarrendatarios',
    sub: 'Cuánto aporta',
    unidad: 'puntos',
    queHace: 'Un coarrendatario con menos de este puntaje no suma puntos ni ingreso y se informa como no válido; el estudio del solicitante sigue su curso.',
    rige: 'v2',
    ...DECISION,
  },
  BONO_COARRENDATARIO_70_79: {
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
    nota: 'Solo se puede encender con las reglas de coarrendatarios e ingreso (Adenda 3) encendidas.',
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
    queHace: 'Si un buen pagador sin ingreso comprobado y con más del 65 % de endeudamiento paga en cuotas al mes al menos estas veces el canon, recibe los puntos del nivel alto en vez de 0.',
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
    nombre: 'Cuota que se cuenta en tarjetas reportadas por su saldo',
    seccion: 'capacidad',
    sub: 'Tarjetas de crédito',
    unidad: 'num',
    queHace: 'Si la central reporta como cuota de una tarjeta todo su saldo, se cuenta solo esta fracción del saldo (0,05 = 5 %). Así el endeudamiento no se infla.',
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
    unidad: 'num',
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
    nombre: 'Tarifa mensual: aprobación automática',
    seccion: 'precios',
    sub: 'Tarifa mensual de la fianza',
    unidad: 'pct',
    queHace: 'Porcentaje del canon, más IVA, que se cobra cada mes por la fianza si el estudio se aprueba solo (también con coarrendatario), o si un analista lo aprueba sin condiciones y solo lo frenaron la capacidad de pago o la identidad.',
    ejemplo: (v) => tarifaEjemplo(v.TARIFA_VIA_AUTOMATICA, v.TARIFA_IVA),
    rige: 'siempre',
  },
  TARIFA_VIA_NO_AUTOMATICA: {
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
    notaRige: 'además necesita encendido en el servidor el cobro automático de la tarifa; mientras esté apagado, no se liquida ningún mes aunque aquí haya uno elegido',
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
    notaRige: 'además necesita el cierre automático encendido en el servidor',
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
}

function tarifaEjemplo(pct: number, iva: number): string {
  const base = (2_000_000 * pct) / 100
  return `Con canon de $2.000.000: ${pesos(base)} más IVA (${pesos(base * (1 + iva / 100))}) al mes.`
}

export const metaDe = (clave: string): MetaParametro =>
  META[clave] ?? { nombre: clave, seccion: 'otros', unidad: 'num', queHace: '', rige: 'siempre' }
export const nombreDe = (clave: string) => metaDe(clave).nombre

// El orden de META es el de la pantalla (subtemas incluidos), no el del API.
const ORDEN = Object.keys(META)
const posicion = (clave: string) => (ORDEN.includes(clave) ? ORDEN.indexOf(clave) : ORDEN.length)
export const porOrden = (a: { clave: string }, b: { clave: string }) => posicion(a.clave) - posicion(b.clave)

/** ¿Cambia algo hoy, con los paquetes de reglas como están? */
export function rigeHoy(rige: Rige, v: Valores): boolean {
  switch (rige) {
    case 'v2':
      return v.ADENDA3_V2 === 1
    case 'sin_v2':
      return v.ADENDA3_V2 !== 1
    case 'a4':
      return v.ADENDA4 === 1
    case 'v2_a4':
      return v.ADENDA3_V2 === 1 && v.ADENDA4 === 1
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
