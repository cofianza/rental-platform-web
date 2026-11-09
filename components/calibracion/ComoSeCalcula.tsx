'use client'

/**
 * Cómo se calcula el puntaje del solicitante (0 a 100), dicho para la Gerencia.
 * Las tablas de puntos son las de la Política V4.1 y viven en el motor del API
 * (src/modules/estudios/motor/scorecard.ts: PUNTOS_MAXIMOS y TABLA_V1..V8); no
 * son parámetros del panel. Si el motor cambia una tabla, hay que cambiarla
 * aquí también. Los cortes que sí son del panel se leen de `valores`.
 */

import { anclajes, fmt, puntosDeScore, type Valores } from './parametros'

interface Factor {
  nombre: string
  max: number
  como: string
}

/** Tramos de deudas frente al ingreso (TABLA_V2 de scorecard.ts): hasta qué % y cuántos puntos. */
const TRAMOS_DEUDAS: [hasta: number, puntos: number][] = [
  [25, 15],
  [35, 12],
  [45, 8],
  [55, 4],
  [65, 2],
]
/** El motor de hoy corta en 65 % fijo (V2_DTI_MAXIMO); la Adenda 5 definitiva, en el endeudamiento máximo del panel. */
const DTI_MAXIMO_HOY = 65

/**
 * La tabla de deudas con el último tramo terminando en `max` (el endeudamiento
 * máximo). Si el máximo queda por debajo de un corte, la tabla termina ahí.
 */
function deudasHasta(max: number): string {
  const partes: string[] = []
  let desde = 0
  for (const [i, [hasta, puntos]] of TRAMOS_DEUDAS.entries()) {
    const ultimo = i === TRAMOS_DEUDAS.length - 1 || hasta >= max
    const tope = ultimo ? max : hasta
    partes.push(desde === 0 ? `Hasta ${fmt(tope)} %: ${puntos}` : `más de ${fmt(desde)} y hasta ${fmt(tope)} %: ${puntos}`)
    if (ultimo) break
    desde = hasta
  }
  return partes.join(' · ')
}

const DEUDAS = deudasHasta(DTI_MAXIMO_HOY)
const CANON = 'Hasta 25 %: 10 · más de 25 y hasta 30 %: 7 · más de 30 y hasta 35 %: 4 · más de 35 y hasta 40 %: 2'

/** Los textos que dependen de las reglas encendidas (deudas y canon con Adenda 4). */
function factores(v: Valores): Factor[] {
  const a4 = v.ADENDA4 === 1
  const como: Record<string, string> = {
    'Deudas frente al ingreso': a4
      ? `${DEUDAS}. Más de 65 %: con ingreso verificado se rechaza; sin él no rechaza: vale 0, o los puntos por comportamiento si paga al día, y como máximo decide un analista. Se suman las cuotas que reporta la central y la cuota de la fianza.`
      : `${DEUDAS} · más de 65 %: se rechaza (en estudios de inmobiliaria se compensa con un coarrendatario). Se suman las cuotas que reporta la central y la cuota de la fianza.`,
    'Canon frente al ingreso': a4
      ? `${CANON}. Más de 40 %: con ingreso verificado se rechaza; sin él vale 0 y no rechaza por sí solo: decide un analista, que pide soporte de ingreso (si el puntaje no alcanza el mínimo por otras causas, se rechaza).`
      : `${CANON} · más de 40 %: se rechaza (en estudios de inmobiliaria se compensa con un coarrendatario).`,
  }
  return FACTORES.map((f) => (como[f.nombre] ? { ...f, como: como[f.nombre] } : f))
}

/**
 * Ejemplo fijo (verificado contra scorecard.ts): 44 + 8 + 7 + 6 + 10 + 4 = 79
 * de 96 = 82,3. La conclusión se calcula con los cortes vigentes del panel.
 */
const EJEMPLO = 82.3
function conclusionEjemplo(v: Valores): string {
  const auto = v.UMBRAL_APROBACION_AUTOMATICA
  const gris = v.UMBRAL_ZONA_GRIS
  if (EJEMPLO >= auto) return 'se aprueba solo si el ingreso alcanza y no hay alertas'
  if (v.ADENDA3_V2 === 1 && EJEMPLO >= Math.max(v.PUNTAJE_MINIMO_TITULAR_PARA_COARRENDATARIO, gris))
    return 'no se aprueba solo: con inmobiliaria se le pide un coarrendatario («Está cerca»); sin inmobiliaria, decide un analista'
  if (EJEMPLO >= gris) return 'decide un analista'
  return 'se rechaza'
}

const FACTORES: Factor[] = [
  { nombre: 'Puntaje de la central', max: 50, como: '800 o más: 50 · 750-799: 47 · 700-749: 44 · 650-699: 40 · 600-649: 34 · 550-599: 20 · desde el mínimo hasta 549: 10. Por debajo del mínimo se rechaza.' },
  // Deudas y canon dependen de las reglas encendidas: los arma factores().
  { nombre: 'Deudas frente al ingreso', max: 15, como: DEUDAS },
  { nombre: 'Canon frente al ingreso', max: 10, como: CANON },
  { nombre: 'Seguridad social', max: 8, como: 'Hoy no se cuenta: la consulta de antecedentes (Auco) no es fuente de este factor y ninguna central lo reporta.' },
  { nombre: 'Experiencia con créditos', max: 6, como: 'Con bancos o financieras: 6 · solo con comercio o cooperativas: 4.' },
  { nombre: 'Comportamiento de pago', max: 10, como: 'Sin moras en 24 meses: +10 · sin historial: +5 · mora de más de 30 días en 12 meses: −15. Una mora vigente o reciente rechaza (ver «Moras que rechazan»).' },
  { nombre: 'Estabilidad laboral', max: 10, como: 'En el estudio automático no se cuenta; en revisión manual lo puntúa el analista.' },
  { nombre: 'Antigüedad del historial', max: 5, como: 'Más de 8 años: 5 · de 5 a 8 años: 4 · de 2 a menos de 5 años: 3 · de 6 meses a menos de 2 años: 1 · menos de 6 meses: 0.' },
  { nombre: 'Arriendos anteriores', max: 5, como: 'En el estudio automático no se cuenta; en revisión manual lo puntúa el analista.' },
]

/** La lista de factores, igual en las dos versiones: una lista y no una tabla, para que quepa en el celular. */
function ListaFactores({ factores }: { factores: Factor[] }) {
  return (
    <div>
      <div aria-hidden className="hidden border-b border-gray-200 pb-2 text-xs font-semibold text-gray-600 sm:grid sm:grid-cols-[11rem_3.5rem_minmax(0,1fr)] sm:gap-x-3">
        <span>Factor</span>
        <span className="text-right">Máx.</span>
        <span>Cómo da puntos</span>
      </div>
      <dl className="divide-y divide-gray-100">
        {factores.map((f) => (
          <div key={f.nombre} className="py-2.5 sm:grid sm:grid-cols-[11rem_3.5rem_minmax(0,1fr)] sm:gap-x-3">
            <dt className="flex items-baseline justify-between gap-3 font-medium text-gray-900 sm:contents">
              <span>{f.nombre}</span>
              <span className="text-xs font-normal tabular-nums text-gray-600 sm:text-right sm:text-sm sm:text-gray-700">
                <span className="sm:hidden">máximo </span>
                {f.max}
                <span className="sm:hidden"> puntos</span>
              </span>
            </dt>
            <dd className="mt-0.5 text-gray-600 sm:mt-0">{f.como}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/**
 * Adenda 5 definitiva §6: divisor fijo de 119; el score por la tabla de
 * anclajes del panel; canon siempre completo; seguridad social, estabilidad y
 * arriendos acreditados (si el interruptor lo dice); comportamiento por las
 * bandas de mora. Las demás tablas, como hoy (Adenda 4).
 */
function factoresA5d(v: Valores): Factor[] {
  const acreditar = v.ACREDITAR_VARIABLES_NO_EVALUABLES === 1
  const t = anclajes(v)
  const nv = 'No se puede verificar hoy: ' + (acreditar ? 'se acredita completo y el estudio deja constancia de que no fue verificado.' : 'no suma puntos.')
  const m = v.MESES_VENTANA_MORA_FINANCIERA
  const ventana = v.MESES_VENTANA_COMPORTAMIENTO
  // Un API sin el endeudamiento máximo en el panel: el 65 % fijo de hoy.
  const dti = typeof v.DTI_MAXIMO === 'number' ? v.DTI_MAXIMO : DTI_MAXIMO_HOY
  // La regla de rechazo usa los días de «Mora de los últimos 6 meses que rechaza» (30 = la del §5).
  const dias = v.DIAS_MORA_RECIENTE_RECHAZO
  const moraQueRechaza = typeof dias === 'number' && dias !== 30 ? `de ${dias} días o más` : 'de más de 30 días'
  return [
    {
      nombre: 'Puntaje de la central',
      max: 50,
      como: t
        ? `Por la tabla de anclajes: ${t.map((a) => `${a.score} → ${fmt(a.puntos)}`).join(' · ')}; entre dos anclajes, en línea recta. Con dos centrales cuenta el puntaje mayor.`
        : 'Por la tabla de anclajes, en línea recta entre dos anclajes. Con dos centrales cuenta el puntaje mayor.',
    },
    {
      nombre: 'Deudas frente al ingreso',
      max: 15,
      como: `${deudasHasta(dti)}. Más de ${fmt(dti)} %: con ingreso verificado se rechaza; sin él no rechaza y se puntúa por cómo paga la persona (0, o los puntos por comportamiento si paga al día), como con la Adenda 4.`,
    },
    { nombre: 'Canon frente al ingreso', max: 10, como: 'Siempre completo: un canon alto no resta puntos, se resuelve con el canon máximo («hasta canon de»).' },
    { nombre: 'Seguridad social', max: 8, como: nv },
    {
      nombre: 'Experiencia con créditos',
      max: 6,
      como: 'Con obligaciones financieras (bancos, cooperativas, fondos de empleados, libranza o quien preste dinero o emita tarjetas): 6 · solo con comercio u otro sector: 4 · solo con telefonía: 0. Cuentan las obligaciones abiertas o cerradas en buen estado, y las de codeudor.',
    },
    {
      nombre: 'Comportamiento de pago',
      max: 10,
      como: `Sin mora, o sin historial: 10 · mora de telefonía tolerada: 0 · mora de comercio tolerada: ${fmt(v.PENAL_REAL_TOLERADA, true)} · mora en banda: −15${
        m < ventana ? ` · mora financiera de más de 30 días entre el mes ${m + 1} y el ${ventana}: 0` : ''
      }. Una mora financiera ${moraQueRechaza} dentro de ${m === 1 ? 'el último mes' : `los últimos ${m} meses`} rechaza, esté pagada o no.`,
    },
    { nombre: 'Estabilidad laboral', max: 10, como: nv },
    { nombre: 'Antigüedad del historial', max: 5, como: 'Más de 8 años: 5 · de 5 a 8 años: 4 · de 2 a menos de 5 años: 3 · de 6 meses a menos de 2 años: 1 · menos de 6 meses: 0.' },
    { nombre: 'Arriendos anteriores', max: 5, como: nv },
  ]
}

/** El caso 2 de la adenda (score 660, lo demás completo), con los valores del panel. */
const SCORE_EJEMPLO = 660

export function ComoSeCalculaA5D({ valores }: { valores: Valores }) {
  const t = anclajes(valores)
  if (!t) return null
  const v1 = puntosDeScore(t, SCORE_EJEMPLO)
  // Sin acreditar, seguridad social (8), estabilidad (10) y arriendos (5) no suman.
  const resto = valores.ACREDITAR_VARIABLES_NO_EVALUABLES === 1 ? 69 : 46
  const brutos = v1 + resto
  const puntaje = Math.round((brutos / 119) * 1000) / 10
  const conclusion =
    SCORE_EJEMPLO < valores.UMBRAL_SCORE_RECHAZO
      ? 'se rechaza por el puntaje de la central'
      : puntaje < valores.PISO_SEGUNDO_FIRMANTE
        ? 'se rechaza: queda por debajo del piso'
        : puntaje >= valores.UMBRAL_APROBADO && SCORE_EJEMPLO >= valores.SCORE_MINIMO_SOLO
          ? 'se aprueba sin segundo firmante'
          : puntaje >= valores.UMBRAL_APROBADO
            ? `queda aprobado con segundo firmante, porque el puntaje de la central es menor que ${valores.SCORE_MINIMO_SOLO}`
            : 'queda aprobado con segundo firmante, porque no llega al puntaje para aprobar'
  return (
    <div className="space-y-4 text-sm text-gray-700">
      <div className="rounded-lg bg-gray-50 p-3">
        <p className="font-semibold tabular-nums text-gray-900">Puntaje = puntos obtenidos ÷ 119 × 100</p>
        <p className="mt-1 max-w-prose text-gray-600">
          Siempre se divide entre 119, haya o no fuente para cada factor. Si a la persona le falta un dato, ese factor vale 0 (por ejemplo,
          sin ingreso estimado, las deudas frente al ingreso). El puntaje se calcula siempre, aunque la persona cumpla una regla de rechazo.
        </p>
      </div>
      <ListaFactores factores={factoresA5d(valores)} />
      <div className="rounded-lg border border-gray-200 p-3">
        <p className="font-semibold text-gray-900">Ejemplo</p>
        <p className="mt-1 max-w-prose text-gray-600">
          Puntaje de la central de {SCORE_EJEMPLO} ({fmt(Math.round(v1 * 10) / 10)} puntos) y lo demás completo, sin mora: {fmt(Math.round(brutos * 10) / 10)}{' '}
          de 119 = <b className="tabular-nums text-gray-900">{fmt(puntaje)}</b>. Con los valores de este panel, {conclusion}.
        </p>
      </div>
    </div>
  )
}

export function ComoSeCalcula({ valores }: { valores: Valores }) {
  const auto = valores.UMBRAL_APROBACION_AUTOMATICA
  const gris = valores.UMBRAL_ZONA_GRIS
  const minCentral = valores.UMBRAL_SCORE_RECHAZO
  return (
    <div className="space-y-4 text-sm text-gray-700">
      <div className="rounded-lg bg-gray-50 p-3">
        <p className="font-semibold tabular-nums text-gray-900">Puntaje = puntos obtenidos ÷ puntos posibles × 100</p>
        <p className="mt-1 max-w-prose text-gray-600">
          Se suman los puntos de nueve factores. Se divide entre el máximo de los factores que tienen fuente en esta evaluación. Los
          que no tienen fuente no cuentan; si a la persona le falta un dato de un factor que sí tiene fuente, ese factor vale 0. Hoy no
          se miden la seguridad social, la estabilidad laboral ni los arriendos anteriores: con DataCrédito el máximo es 96 puntos; si
          solo responde una central sin estimador de ingresos, 71. En revisión manual el analista puede puntuar estabilidad y
          arriendos y el máximo sube.
        </p>
      </div>

      {/* Una lista y no una tabla: en el celular la tabla de 520 px se cortaba y obligaba a desplazar de lado. */}
      <ListaFactores factores={factores(valores)} />

      <div className="rounded-lg border border-gray-200 p-3">
        <p className="font-semibold text-gray-900">Ejemplo</p>
        <p className="mt-1 max-w-prose text-gray-600">
          720 en la central (44), deudas del 40 % (8), canon del 28 % (7), créditos con bancos (6), sin moras en 24 meses (10) y 6
          años de historial (4): 79 puntos de 96 posibles = <b className="tabular-nums text-gray-900">82,3</b>. Con los valores de hoy (
          {gris} y {auto}): {conclusionEjemplo(valores)}.
        </p>
      </div>

      <p className="max-w-prose text-xs text-gray-600">
        Antes de este puntaje mandan las reglas que rechazan siempre: listas restrictivas, mora vigente o reciente y
        puntaje de la central por debajo de {minCentral}
        {valores.ADENDA4 === 1
          ? ' y, con ingreso verificado, endeudamiento o canon por encima del máximo'
          : ' y endeudamiento o canon por encima del máximo (en estudios de inmobiliaria se compensan con un coarrendatario)'}
        . Las tablas de puntos de cada factor salen de la Política y no se cambian desde
        este panel; los cortes de decisión sí.
      </p>
    </div>
  )
}
