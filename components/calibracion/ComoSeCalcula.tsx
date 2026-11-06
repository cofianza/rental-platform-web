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

function factores(v: Valores): Factor[] {
  return FACTORES.map((f) =>
    f.nombre !== 'Comportamiento de pago'
      ? f
      : {
          ...f,
          como:
            v.ADENDA5 === 1
              ? `${COMPORTAMIENTO} Una mora vigente de sector no financiero de bajo monto frente al canon puede no rechazar: resta 15 puntos y no cuenta como «sin moras» (ver «Mora vigente y reciente»). Cualquier otra mora vigente, y la de los últimos 6 meses, rechaza.`
              : `${COMPORTAMIENTO} Una mora vigente o reciente rechaza (ver «Mora vigente y reciente»).`,
        },
  )
}

const FACTORES: Factor[] = [
  { nombre: 'Puntaje de la central', max: 50, como: '800 o más: 50 · 750-799: 47 · 700-749: 44 · 650-699: 40 · 600-649: 34 · 550-599: 20 · desde el mínimo hasta 549: 10. Por debajo del mínimo se rechaza.' },
  { nombre: 'Deudas frente al ingreso', max: 15, como: 'Hasta 25 %: 15 · 26-35 %: 12 · 36-45 %: 8 · 46-55 %: 4 · 56-65 %: 2 · más de 65 %: 0. Se suman las cuotas que reporta la central y la cuota de la fianza.' },
  { nombre: 'Canon frente al ingreso', max: 10, como: 'Hasta 25 %: 10 · 26-30 %: 7 · 31-35 %: 4 · 36-40 %: 2 · más de 40 %: 0.' },
  { nombre: 'Seguridad social', max: 8, como: 'Afiliado activo: 5 · beneficiario: 3. Sale de la consulta de antecedentes.' },
  { nombre: 'Experiencia con créditos', max: 6, como: 'Con bancos o financieras: 6 · solo con comercio o cooperativas: 4.' },
  // El texto de la mora depende de las reglas encendidas: lo arma factores().
  { nombre: 'Comportamiento de pago', max: 10, como: COMPORTAMIENTO },
  { nombre: 'Estabilidad laboral', max: 10, como: 'Hoy no hay fuente de datos: no se cuenta.' },
  { nombre: 'Antigüedad del historial', max: 5, como: 'Más de 8 años: 5 · 5-8: 4 · 2-5: 3 · 6-24 meses: 1 · menos de 6 meses: 0.' },
  { nombre: 'Arriendos anteriores', max: 5, como: 'Hoy no hay fuente de datos: no se cuenta.' },
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
          Se suman los puntos de nueve factores. Solo se divide entre el máximo de los factores que sí se pudieron medir,
          para no castigar a la persona por un dato que no existe: hoy no se miden la estabilidad laboral ni los arriendos
          anteriores, así que el máximo queda entre 96 y 104 puntos.
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
        <p className="mt-1 text-gray-600">
          720 en la central (44), deudas del 30 % (12), canon del 28 % (7), afiliado activo (5), créditos con bancos (6),
          sin moras en 24 meses (10) y 6 años de historial (4): 88 puntos de 104 posibles = <b className="text-gray-900">84,6</b>.
          {' '}Con los valores de hoy ({gris} y {auto}) queda en la zona gris: no se aprueba solo y se le pide coarrendatario.
        </p>
      </div>

      <p className="max-w-prose text-xs text-gray-600">
        Antes de este puntaje mandan las reglas que rechazan siempre: listas restrictivas,{' '}
        {valores.ADENDA5 === 1 ? 'mora vigente (salvo la de bajo monto en sector no financiero) o reciente' : 'mora vigente o reciente'} y
        puntaje de la central por debajo de {minCentral}. Las tablas de puntos de cada factor salen de la Política y no se cambian desde
        este panel; los cortes de decisión sí.
      </p>
    </div>
  )
}
