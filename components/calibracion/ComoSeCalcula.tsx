'use client'

/**
 * Cómo se calcula el puntaje del solicitante (0 a 100), dicho para la Gerencia.
 * Las tablas de puntos son las de la Política V4.1 y viven en el motor del API
 * (src/modules/estudios/motor/scorecard.ts: PUNTOS_MAXIMOS y TABLA_V1..V8); no
 * son parámetros del panel. Si el motor cambia una tabla, hay que cambiarla
 * aquí también. Los cortes que sí son del panel se leen de `valores`.
 */

import type { Valores } from './parametros'

interface Factor {
  nombre: string
  max: number
  como: string
}

const COMPORTAMIENTO = 'Sin moras en 24 meses: +10 · sin historial: +5 · mora de más de 30 días en 12 meses: −15.'

const DEUDAS = 'Hasta 25 %: 15 · más de 25 y hasta 35 %: 12 · más de 35 y hasta 45 %: 8 · más de 45 y hasta 55 %: 4 · más de 55 y hasta 65 %: 2'
const CANON = 'Hasta 25 %: 10 · más de 25 y hasta 30 %: 7 · más de 30 y hasta 35 %: 4 · más de 35 y hasta 40 %: 2'

/** Los textos que dependen de las reglas encendidas (mora con Adenda 5; deudas y canon con Adenda 4). */
function factores(v: Valores): Factor[] {
  const a4 = v.ADENDA4 === 1
  const como: Record<string, string> = {
    'Deudas frente al ingreso': a4
      ? `${DEUDAS}. Más de 65 %: con ingreso verificado se rechaza; sin él no rechaza: vale 0, o los puntos por comportamiento si paga al día, y como máximo decide un analista. Se suman las cuotas que reporta la central y la cuota de la fianza.`
      : `${DEUDAS} · más de 65 %: se rechaza. Se suman las cuotas que reporta la central y la cuota de la fianza.`,
    'Canon frente al ingreso': a4
      ? `${CANON} y lo revisa un analista. Más de 40 %: con ingreso verificado se rechaza; sin él vale 0 y decide un analista, que pide soporte de ingreso.`
      : `${CANON} · más de 40 %: se rechaza.`,
    'Comportamiento de pago':
      v.ADENDA5 === 1
        ? `${COMPORTAMIENTO} Una mora vigente de sector no financiero de bajo monto frente al canon puede no rechazar: resta 15 puntos y no cuenta como «sin moras» (ver «Mora vigente y reciente»). Cualquier otra mora vigente, y la de los últimos 6 meses, rechaza.`
        : `${COMPORTAMIENTO} Una mora vigente o reciente rechaza (ver «Mora vigente y reciente»).`,
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
  { nombre: 'Seguridad social', max: 8, como: 'Hoy no se cuenta: la consulta de antecedentes (Auco) no es fuente de este factor y ninguna central lo reporta (Adenda 1 §1.2).' },
  { nombre: 'Experiencia con créditos', max: 6, como: 'Con bancos o financieras: 6 · solo con comercio o cooperativas: 4.' },
  // El texto de la mora depende de las reglas encendidas: lo arma factores().
  { nombre: 'Comportamiento de pago', max: 10, como: COMPORTAMIENTO },
  { nombre: 'Estabilidad laboral', max: 10, como: 'En el estudio automático no se cuenta; en revisión manual lo puntúa el analista.' },
  { nombre: 'Antigüedad del historial', max: 5, como: 'Más de 8 años: 5 · de 5 a 8 años: 4 · de 2 a menos de 5 años: 3 · de 6 meses a menos de 2 años: 1 · menos de 6 meses: 0.' },
  { nombre: 'Arriendos anteriores', max: 5, como: 'En el estudio automático no se cuenta; en revisión manual lo puntúa el analista.' },
]

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
      <div>
        <div aria-hidden className="hidden border-b border-gray-200 pb-2 text-xs font-semibold text-gray-600 sm:grid sm:grid-cols-[11rem_3.5rem_minmax(0,1fr)] sm:gap-x-3">
          <span>Factor</span>
          <span className="text-right">Máx.</span>
          <span>Cómo da puntos</span>
        </div>
        <dl className="divide-y divide-gray-100">
          {factores(valores).map((f) => (
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

      <div className="rounded-lg border border-gray-200 p-3">
        <p className="font-semibold text-gray-900">Ejemplo</p>
        <p className="mt-1 max-w-prose text-gray-600">
          720 en la central (44), deudas del 40 % (8), canon del 28 % (7), créditos con bancos (6), sin moras en 24 meses (10) y 6
          años de historial (4): 79 puntos de 96 posibles = <b className="tabular-nums text-gray-900">82,3</b>. Con los valores de hoy (
          {gris} y {auto}): {conclusionEjemplo(valores)}.
        </p>
      </div>

      <p className="max-w-prose text-xs text-gray-600">
        Antes de este puntaje mandan las reglas que rechazan siempre: listas restrictivas,{' '}
        {valores.ADENDA5 === 1 ? 'mora vigente (salvo la de bajo monto en sector no financiero) o reciente' : 'mora vigente o reciente'} y
        puntaje de la central por debajo de {minCentral}
        {valores.ADENDA4 === 1
          ? ' y, con ingreso verificado, endeudamiento o canon por encima del máximo'
          : ' y endeudamiento o canon por encima del máximo'}
        . Las tablas de puntos de cada factor salen de la Política y no se cambian desde
        este panel; los cortes de decisión sí.
      </p>
    </div>
  )
}
