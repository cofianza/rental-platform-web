'use client'

/**
 * Piezas del panel para la Adenda 5: el aviso de que sus valores
 * aplican al encenderla, la tabla de anclajes del score (7 filas, cada número
 * abre su diálogo), el resumen de las bandas de mora y la lista corta de
 * valores de otras secciones que también usa.
 */

import type { IParametroCalibracion } from '@/services/calibracionService'
import { IconAlertTriangle, IconArrowRight, IconInfo, IconLock } from '@/components/icons'
import { cn } from '@/lib/utils'
import {
  a5dEncendida,
  anclajes,
  claveAncla,
  conUnidad,
  fmt,
  metaDe,
  N_ANCLAJES,
  puntosDeScore,
  verboParametro,
  type SeccionId,
  type Valores,
} from './parametros'

/** Arriba de cada sección de la Adenda 5 mientras esté apagada. */
export function AvisoA5d({ onIr }: { onIr?: (v: SeccionId) => void }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900">
      <IconInfo size={18} className="mt-0.5 shrink-0 text-primary-700" />
      <div className="min-w-0">
        <p>
          <span className="font-semibold">Aplican al encender la Adenda 5.</span> Hoy no cambian ningún resultado: se pueden revisar y
          dejar listos.
        </p>
        {onIr && (
          <button
            type="button"
            onClick={() => onIr('a5d_motor')}
            className="-mx-1 mt-1 inline-flex min-h-10 items-center gap-1 rounded-md px-1 font-medium text-primary-800 hover:underline"
          >
            Ver el interruptor
            <IconArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

/** Para el número tocable: «Ver» si este usuario no puede cambiarlo. */
const verbo = verboParametro

/**
 * La tabla que convierte el score en puntos. Con `onAbrir`, cada número abre
 * su diálogo; sin él (vista previa del diálogo) se resalta `resaltar`.
 */
export function TablaAnclajes({
  valores,
  params,
  onAbrir,
  resaltar,
}: {
  valores: Valores
  params: IParametroCalibracion[]
  onAbrir?: (clave: string) => void
  resaltar?: string
}) {
  const t = anclajes(valores)
  if (!t) return null
  const de = (clave: string) => params.find((p) => p.clave === clave)
  const soloGerencia = params.some((p) => p.clave === claveAncla(1, 'SCORE') && p.nivel === 'riesgo')
  // Ejemplo: el punto medio entre los anclajes 3 y 4 (si la tabla está en orden).
  const [a, b] = [t[2], t[3]]
  const ejemplo = b.score > a.score ? Math.round((a.score + b.score) / 2) : null

  const celda = (clave: string, entero: boolean) => {
    const p = de(clave)
    const valor = valores[clave]
    const texto = fmt(valor, entero)
    const inicial = p && p.valor !== p.valorDefault ? fmt(p.valorDefault, entero) : null
    if (!onAbrir)
      return (
        <span
          className={cn(
            'inline-block rounded-md px-1.5 py-0.5 font-bold tabular-nums',
            resaltar === clave ? 'bg-primary-700 text-white' : 'text-gray-900',
          )}
        >
          {texto}
        </span>
      )
    return (
      <span className="inline-flex flex-col items-start">
        <button
          type="button"
          onClick={() => onAbrir(clave)}
          aria-label={`${verbo(p)}: ${metaDe(clave).nombre} (${texto})`}
          className="inline-flex min-h-10 min-w-12 items-center justify-center rounded-md border border-gray-300 bg-white px-2.5 font-bold tabular-nums text-gray-900 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-800"
        >
          {texto}
        </button>
        {inicial && <span className="mt-0.5 text-xs text-gray-600">Valor inicial: {inicial}</span>}
      </span>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {onAbrir && soloGerencia && (
        <p className="flex items-center gap-1.5 border-b border-gray-100 px-4 py-2.5 text-xs text-gray-600 sm:px-5">
          <IconLock size={12} className="shrink-0" />
          Toque un número para verlo o cambiarlo. Solo la Gerencia General los cambia.
        </p>
      )}
      <table className="w-full text-sm">
        <caption className="sr-only">Tabla que convierte el puntaje de la central en puntos</caption>
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-600">
            <th scope="col" className="w-16 px-4 py-2 font-semibold sm:px-5">
              Anclaje
            </th>
            <th scope="col" className="px-2 py-2 font-semibold">
              Puntaje de la central
            </th>
            <th scope="col" className="px-4 py-2 font-semibold sm:px-5">
              Puntos (de 50)
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {Array.from({ length: N_ANCLAJES }, (_, i) => i + 1).map((n) => (
            <tr key={n} className={cn(onAbrir ? 'align-top' : 'align-middle')}>
              <th scope="row" className={cn('px-4 font-medium tabular-nums text-gray-600 sm:px-5', onAbrir ? 'pb-2 pt-[1.125rem]' : 'py-1.5')}>
                {n}
              </th>
              <td className={cn('px-2', onAbrir ? 'py-2' : 'py-1')}>
                <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
                  {celda(claveAncla(n, 'SCORE'), true)}
                  {n === 1 && <span className="text-xs text-gray-600">o menos</span>}
                  {n === N_ANCLAJES && <span className="text-xs text-gray-600">o más</span>}
                </span>
              </td>
              <td className={cn('px-4 sm:px-5', onAbrir ? 'py-2' : 'py-1')}>{celda(claveAncla(n, 'PUNTOS'), false)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {onAbrir && (
        <div className="space-y-1.5 border-t border-gray-100 px-4 py-3 text-xs text-gray-600 sm:px-5">
          {ejemplo !== null && (
            <p>
              <span className="font-semibold text-gray-700">Ejemplo:</span> un puntaje de la central de {ejemplo} recibe{' '}
              {fmt(Math.round(puntosDeScore(t, ejemplo) * 10) / 10)} puntos de 50: queda entre el anclaje 3 ({a.score} → {fmt(a.puntos)}) y el 4 (
              {b.score} → {fmt(b.puntos)}), y los puntos se reparten en línea recta.
            </p>
          )}
          <p className="flex items-start gap-1.5 text-amber-800">
            <IconAlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>
              Los anclajes deben crecer, en puntaje de la central y en puntos. Para correr la tabla hacia arriba, mueva primero los anclajes altos; hacia abajo,
              primero los bajos.
            </span>
          </p>
        </div>
      )}
    </div>
  )
}

const pct = (f: number) => `${fmt(f * 100)} %`

/** Arriba de «Mora no financiera»: cómo queda cada caso con los valores vigentes. */
export function BandasMora({ valores }: { valores: Valores }) {
  const v = valores
  if ([v.BANDA_TELCO_TOLERADA, v.BANDA_TELCO_RECHAZO, v.BANDA_REAL_TOLERADA, v.BANDA_REAL_RECHAZO].some((x) => typeof x !== 'number')) return null
  const grupos = [
    {
      titulo: 'Solo telefonía, televisión o internet',
      tol: v.BANDA_TELCO_TOLERADA,
      rech: v.BANDA_TELCO_RECHAZO,
      comportamiento: 'comportamiento en 0 puntos',
    },
    {
      titulo: 'Con comercio, servicios públicos u otro sector',
      tol: v.BANDA_REAL_TOLERADA,
      rech: v.BANDA_REAL_RECHAZO,
      comportamiento: `comportamiento en ${fmt(v.PENAL_REAL_TOLERADA, true)} puntos`,
    },
  ]
  const n = v.MIN_OBLIGACIONES_FINANCIERAS_AL_DIA
  return (
    <section aria-labelledby="bandas-mora" className="rounded-xl border border-gray-200 bg-white px-4 py-4 sm:px-5">
      <h3 id="bandas-mora" className="text-sm font-bold text-gray-900">
        Cómo se trata la mora con estos valores
      </h3>
      <p className="mt-0.5 max-w-prose text-sm text-gray-600">
        Razón de mora = suma de las moras vigentes no financieras ÷ canon mensual. Si al menos una es de comercio u otro sector, todas se miden
        con las bandas de comercio.
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {grupos.map((g) => (
          <div key={g.titulo}>
            <p className="mb-1.5 text-sm font-semibold text-gray-800">{g.titulo}</p>
            <ul className="space-y-1.5 text-sm">
              <li className="grid grid-cols-[0.625rem_minmax(0,1fr)] gap-x-2">
                <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary-600" />
                <span>
                  <span className="font-semibold tabular-nums text-gray-900">Menos de {pct(g.tol)}:</span>{' '}
                  <span className="text-gray-600">se tolera, con {g.comportamiento}.</span>
                </span>
              </li>
              <li className="grid grid-cols-[0.625rem_minmax(0,1fr)] gap-x-2">
                <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span>
                  <span className="font-semibold tabular-nums text-gray-900">
                    De {pct(g.tol)} a {pct(g.rech)}:
                  </span>{' '}
                  <span className="text-gray-600">en banda, comportamiento en −15 puntos y pide segundo firmante.</span>
                </span>
              </li>
              <li className="grid grid-cols-[0.625rem_minmax(0,1fr)] gap-x-2">
                <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-red-500" />
                <span>
                  <span className="font-semibold tabular-nums text-gray-900">Más de {pct(g.rech)}:</span>{' '}
                  <span className="text-gray-600">se rechaza.</span>
                </span>
              </li>
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 max-w-prose text-xs text-gray-600">
        Siempre rechaza cualquier mora financiera vigente. También rechaza una mora no financiera de quien tenga menos de {n}{' '}
        {n === 1 ? 'obligación financiera vigente y al día' : 'obligaciones financieras vigentes y al día'}, salvo en la vía rápida cuando toda la mora
        es de telefonía, televisión o internet. En la vía rápida (puntaje de la central desde {v.VIA_RAPIDA_SCORE} y {v.VIA_RAPIDA_MIN_OBLIG_FIN}{' '}
        {v.VIA_RAPIDA_MIN_OBLIG_FIN === 1 ? 'obligación financiera' : 'obligaciones financieras'} al día) las moras de telefonía, televisión e internet
        no cuentan.
      </p>
    </section>
  )
}

/** Valores de otras secciones que esta también usa: en corto, cada uno abre su diálogo. */
export function Relacionados({
  titulo,
  claves,
  params,
  onAbrir,
}: {
  titulo: string
  claves: string[]
  params: IParametroCalibracion[]
  onAbrir: (clave: string) => void
}) {
  const items = claves.map((c) => params.find((p) => p.clave === c)).filter((p): p is IParametroCalibracion => !!p)
  if (items.length === 0) return null
  return (
    <section className="rounded-xl border border-dashed border-gray-300 bg-gray-50">
      <h3 className="px-4 pb-1 pt-3 text-sm font-semibold text-gray-700 sm:px-5">{titulo}</h3>
      <ul className="divide-y divide-gray-200">
        {items.map((p) => {
          const m = metaDe(p.clave)
          return (
            <li key={p.clave}>
              <button
                type="button"
                onClick={() => onAbrir(p.clave)}
                aria-label={`${verbo(p)}: ${m.nombre} (${conUnidad(p.valor, p)})`}
                className="flex min-h-12 w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-gray-100 sm:px-5"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900">{m.nombre}</span>
                  {m.conA5d && <span className="mt-0.5 block text-xs text-gray-600">Con la Adenda 5: {m.conA5d}.</span>}
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums text-gray-900">{conUnidad(p.valor, p)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** ¿La sección es de la Adenda 5 y está apagada? Entonces se muestra entera, sin plegar. */
export const previaA5d = (grupo: string | undefined, v: Valores) => grupo === 'a5d' && !a5dEncendida(v)
