'use client'

/**
 * Cómo se calcula el puntaje del solicitante (0 a 100), dicho para la Gerencia.
 * Las tablas de puntos son las de la Política V4.1 y viven SOLO en el motor
 * del API: llegan por GET /admin/calibracion/tablas (M-3; este repo es
 * público y antes las copiaba a mano). Los cortes del panel se leen de `valores`.
 */

import type { ITablasPuntaje } from '@/services/calibracionService'
import {
  conSigno,
  puntosPorCotaInferior,
  puntosPorCotaSuperior,
  textoAntiguedad,
  textoPorcentajes,
  textoPuntajeCentral,
} from '@/lib/tablasPuntaje'
import { anclajes, fmt, puntosDeScore, type Valores } from './parametros'

interface Factor {
  nombre: string
  max: number
  como: string
}

/** Lo que el modelo puede sumar hoy: el divisor menos las variables sin fuente. */
function alcanzable(t: ITablasPuntaje): number {
  return t.divisor - t.fuera_de_alcance.reduce((a, v) => a + (t.maximos[v as keyof ITablasPuntaje['maximos']] ?? 0), 0)
}

/** El ejemplo de la Política, con los puntos que dan las tablas del API. */
function ejemplo(t: ITablasPuntaje) {
  const p = {
    central: puntosPorCotaInferior(t.v1, 720),
    deudas: puntosPorCotaSuperior(t.v2, 40),
    canon: puntosPorCotaSuperior(t.v3, 28),
    creditos: t.v5.financiero,
    pagos: t.v6.sin_mora,
    historial: puntosPorCotaInferior(t.v8, 72),
  }
  const total = p.central + p.deudas + p.canon + p.creditos + p.pagos + p.historial
  const max = alcanzable(t)
  return { p, total, max, puntaje: Math.round((total / max) * 1000) / 10 }
}

/** Los textos que dependen de las reglas encendidas (deudas y canon con Adenda 4). */
function factores(v: Valores, t: ITablasPuntaje): Factor[] {
  const a4 = v.ADENDA4 === 1
  const deudas = textoPorcentajes(t.v2, t.v2_maximo)
  const canon = textoPorcentajes(t.v3, t.v3_maximo)
  const dMax = fmt(t.v2_maximo)
  const cMax = fmt(t.v3_maximo)
  const m = t.maximos
  return [
    { nombre: 'Puntaje de la central', max: m.V1, como: `${textoPuntajeCentral(t.v1)}. Por debajo del mínimo se rechaza.` },
    {
      nombre: 'Deudas frente al ingreso',
      max: m.V2,
      como: a4
        ? `${deudas}. Más de ${dMax} %: con ingreso verificado se rechaza; sin él no rechaza: vale 0, o los puntos por comportamiento si paga al día, y como máximo decide un analista. Se suman las cuotas que reporta la central y la cuota de la fianza.`
        : `${deudas} · más de ${dMax} %: se rechaza (en estudios de inmobiliaria se compensa con un coarrendatario). Se suman las cuotas que reporta la central y la cuota de la fianza.`,
    },
    {
      nombre: 'Canon frente al ingreso',
      max: m.V3,
      como: a4
        ? `${canon}. Más de ${cMax} %: con ingreso verificado se rechaza; sin él vale 0 y no rechaza por sí solo: decide un analista, que pide soporte de ingreso (si el puntaje no alcanza el mínimo por otras causas, se rechaza).`
        : `${canon} · más de ${cMax} %: se rechaza (en estudios de inmobiliaria se compensa con un coarrendatario).`,
    },
    { nombre: 'Seguridad social', max: m.V4, como: 'Hoy no se cuenta: la consulta de antecedentes (Auco) no es fuente de este factor y ninguna central lo reporta.' },
    {
      nombre: 'Experiencia con créditos',
      max: m.V5,
      como: `Con bancos o financieras: ${fmt(t.v5.financiero)} · solo con comercio o cooperativas: ${fmt(t.v5.real_o_cooperativo)}.`,
    },
    {
      nombre: 'Comportamiento de pago',
      max: m.V6,
      como: `Sin moras en ${t.v6.ventana_meses} meses: ${conSigno(t.v6.sin_mora)} · sin historial: ${conSigno(t.v6.sin_historial)} · mora de más de 30 días en 12 meses: ${conSigno(t.v6.mora_mayor_30d)}. Una mora vigente o reciente rechaza (ver «Moras que rechazan»).`,
    },
    { nombre: 'Estabilidad laboral', max: m.V7, como: 'En el estudio automático no se cuenta; en revisión manual lo puntúa el analista.' },
    { nombre: 'Antigüedad del historial', max: m.V8, como: `${textoAntiguedad(t.v8)}.` },
    { nombre: 'Arriendos anteriores', max: m.V9, como: 'En el estudio automático no se cuenta; en revisión manual lo puntúa el analista.' },
  ]
}

function conclusionEjemplo(v: Valores, puntaje: number): string {
  const auto = v.UMBRAL_APROBACION_AUTOMATICA
  const gris = v.UMBRAL_ZONA_GRIS
  if (puntaje >= auto) return 'se aprueba solo si el ingreso alcanza y no hay alertas'
  if (v.ADENDA3_V2 === 1 && puntaje >= Math.max(v.PUNTAJE_MINIMO_TITULAR_PARA_COARRENDATARIO, gris))
    return 'no se aprueba solo: con inmobiliaria se le pide un coarrendatario («Está cerca»); sin inmobiliaria, decide un analista'
  if (puntaje >= gris) return 'decide un analista'
  return 'se rechaza'
}

/** Sin las tablas del API no hay qué mostrar: se dice, sin inventar cifras. */
export function SinTablas() {
  return <p className="text-sm text-gray-600">No se pudieron cargar las tablas de puntos. Recargue la página para intentarlo de nuevo.</p>
}

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
 * Adenda 5 definitiva §6: divisor fijo; el score por la tabla de anclajes del
 * panel; canon siempre completo; seguridad social, estabilidad y arriendos
 * acreditados (si el interruptor lo dice); comportamiento por las bandas de
 * mora. Las demás tablas, como hoy (Adenda 4).
 */
function factoresA5d(v: Valores, tb: ITablasPuntaje): Factor[] {
  const acreditar = v.ACREDITAR_VARIABLES_NO_EVALUABLES === 1
  const t = anclajes(v)
  const nv = 'No se puede verificar hoy: ' + (acreditar ? 'se acredita completo y el estudio deja constancia de que no fue verificado.' : 'no suma puntos.')
  const m = v.MESES_VENTANA_MORA_FINANCIERA
  const ventana = v.MESES_VENTANA_COMPORTAMIENTO
  // Un API sin el endeudamiento máximo en el panel: el máximo de la tabla del motor.
  const dti = typeof v.DTI_MAXIMO === 'number' ? v.DTI_MAXIMO : tb.v2_maximo
  // La regla de rechazo usa los días de «Mora de los últimos 6 meses que rechaza» (30 = la del §5).
  const dias = v.DIAS_MORA_RECIENTE_RECHAZO
  const moraQueRechaza = typeof dias === 'number' && dias !== 30 ? `de ${dias} días o más` : 'de más de 30 días'
  const mx = tb.maximos
  return [
    {
      nombre: 'Puntaje de la central',
      max: mx.V1,
      como: t
        ? `Por la tabla de anclajes: ${t.map((a) => `${a.score} → ${fmt(a.puntos)}`).join(' · ')}; entre dos anclajes, en línea recta. Con dos centrales cuenta el puntaje mayor.`
        : 'Por la tabla de anclajes, en línea recta entre dos anclajes. Con dos centrales cuenta el puntaje mayor.',
    },
    {
      nombre: 'Deudas frente al ingreso',
      max: mx.V2,
      como: `${textoPorcentajes(tb.v2, dti)}. Más de ${fmt(dti)} %: con ingreso verificado se rechaza; sin él no rechaza y se puntúa por cómo paga la persona (0, o los puntos por comportamiento si paga al día), como con la Adenda 4.`,
    },
    { nombre: 'Canon frente al ingreso', max: mx.V3, como: 'Siempre completo: un canon alto no resta puntos, se resuelve con el canon máximo («hasta canon de»).' },
    { nombre: 'Seguridad social', max: mx.V4, como: nv },
    {
      nombre: 'Experiencia con créditos',
      max: mx.V5,
      como: `Con obligaciones financieras (bancos, cooperativas, fondos de empleados, libranza o quien preste dinero o emita tarjetas): ${fmt(tb.v5.financiero)} · solo con comercio u otro sector: ${fmt(tb.v5.real_o_cooperativo)} · solo con telefonía: 0. Cuentan las obligaciones abiertas o cerradas en buen estado, y las de codeudor.`,
    },
    {
      nombre: 'Comportamiento de pago',
      max: mx.V6,
      como: `Sin mora, o sin historial: ${fmt(mx.V6)} · mora de telefonía tolerada: 0 · mora de comercio tolerada: ${fmt(v.PENAL_REAL_TOLERADA, true)} · mora en banda: ${conSigno(tb.a5d.mora_en_banda)}${
        m < ventana ? ` · mora financiera de más de 30 días entre el mes ${m + 1} y el ${ventana}: 0` : ''
      }. Una mora financiera ${moraQueRechaza} dentro de ${m === 1 ? 'el último mes' : `los últimos ${m} meses`} rechaza, esté pagada o no.`,
    },
    { nombre: 'Estabilidad laboral', max: mx.V7, como: nv },
    { nombre: 'Antigüedad del historial', max: mx.V8, como: `${textoAntiguedad(tb.v8)}.` },
    { nombre: 'Arriendos anteriores', max: mx.V9, como: nv },
  ]
}

/** El caso 2 de la adenda (score 660, lo demás completo), con los valores del panel. */
const SCORE_EJEMPLO = 660

export function ComoSeCalculaA5D({ valores, tablas }: { valores: Valores; tablas: ITablasPuntaje | null }) {
  const t = anclajes(valores)
  if (!t) return null
  if (!tablas) return <SinTablas />
  const v1 = puntosDeScore(t, SCORE_EJEMPLO)
  // Lo demás completo; sin acreditar, las variables sin fuente (seguridad social, estabilidad y arriendos) no suman.
  const divisor = tablas.divisor
  const resto = alcanzable(tablas) - tablas.maximos.V1 + (valores.ACREDITAR_VARIABLES_NO_EVALUABLES === 1 ? divisor - alcanzable(tablas) : 0)
  const brutos = v1 + resto
  const puntaje = Math.round((brutos / divisor) * 1000) / 10
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
        <p className="font-semibold tabular-nums text-gray-900">Puntaje = puntos obtenidos ÷ {divisor} × 100</p>
        <p className="mt-1 max-w-prose text-gray-600">
          Siempre se divide entre {divisor}, haya o no fuente para cada factor. Si a la persona le falta un dato, ese factor vale 0 (por ejemplo,
          sin ingreso estimado, las deudas frente al ingreso). El puntaje se calcula siempre, aunque la persona cumpla una regla de rechazo.
        </p>
      </div>
      <ListaFactores factores={factoresA5d(valores, tablas)} />
      <div className="rounded-lg border border-gray-200 p-3">
        <p className="font-semibold text-gray-900">Ejemplo</p>
        <p className="mt-1 max-w-prose text-gray-600">
          Puntaje de la central de {SCORE_EJEMPLO} ({fmt(Math.round(v1 * 10) / 10)} puntos) y lo demás completo, sin mora: {fmt(Math.round(brutos * 10) / 10)}{' '}
          de {divisor} = <b className="tabular-nums text-gray-900">{fmt(puntaje)}</b>. Con los valores de este panel, {conclusion}.
        </p>
      </div>
    </div>
  )
}

export function ComoSeCalcula({ valores, tablas }: { valores: Valores; tablas: ITablasPuntaje | null }) {
  if (!tablas) return <SinTablas />
  const ej = ejemplo(tablas)
  const max = alcanzable(tablas)
  const sinIngreso = max - tablas.maximos.V2 - tablas.maximos.V3
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
          se miden la seguridad social, la estabilidad laboral ni los arriendos anteriores: con DataCrédito el máximo es {max} puntos; si
          solo responde una central sin estimador de ingresos, {sinIngreso}. En revisión manual el analista puede puntuar estabilidad y
          arriendos y el máximo sube.
        </p>
      </div>

      {/* Una lista y no una tabla: en el celular la tabla de 520 px se cortaba y obligaba a desplazar de lado. */}
      <ListaFactores factores={factores(valores, tablas)} />

      <div className="rounded-lg border border-gray-200 p-3">
        <p className="font-semibold text-gray-900">Ejemplo</p>
        <p className="mt-1 max-w-prose text-gray-600">
          {`720 en la central (${ej.p.central}), deudas del 40 % (${ej.p.deudas}), canon del 28 % (${ej.p.canon}), créditos con bancos (${ej.p.creditos}), sin moras en ${tablas.v6.ventana_meses} meses (${ej.p.pagos}) y 6 años de historial (${ej.p.historial}): ${ej.total} puntos de ${ej.max} posibles = `}
          <b className="tabular-nums text-gray-900">{fmt(ej.puntaje)}</b>
          {`. Con los valores de hoy (${gris} y ${auto}): ${conclusionEjemplo(valores, ej.puntaje)}.`}
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
