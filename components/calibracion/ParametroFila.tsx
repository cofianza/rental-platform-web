'use client'

import { useId, useState } from 'react'
import type { IHistorialCalibracion, IParametroCalibracion } from '@/services/calibracionService'
import { IconAlertTriangle, IconArrowRight, IconChevronDown, IconLock } from '@/components/icons'
import { formatDate } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { conUnidad, humanizar, metaDe, type Valores } from './parametros'

interface Props {
  p: IParametroCalibracion
  valores: Valores
  ultimo?: IHistorialCalibracion
  onAbrir: (clave: string) => void
}

/** Una viñeta «condición → qué pasa»; sin flecha, va como texto corrido. */
function Excepcion({ texto }: { texto: string }) {
  const i = texto.indexOf(' → ')
  if (i < 0) return <li className="text-gray-700">{texto}</li>
  return (
    <li className="text-gray-700">
      <span className="font-medium text-gray-900">{texto.slice(0, i)}</span>
      <IconArrowRight size={13} className="mx-1 inline-block align-[-2px] text-gray-500" />
      <span className="sr-only">: </span>
      {texto.slice(i + 3)}
    </li>
  )
}

/**
 * Una tarjeta: nombre, quién lo cambia, el valor de hoy y el botón; debajo, el
 * resumen de la regla, sus excepciones plegadas, el ejemplo y el último cambio.
 */
export function ParametroFila({ p, valores, ultimo, onAbrir }: Props) {
  const meta = metaDe(p.clave)
  const onoff = meta.unidad === 'onoff'
  const ejemplo = meta.ejemplo?.(valores)
  const fijo = p.min === p.max
  const fecha = ultimo?.created_at ?? p.actualizado_en
  const excepciones = meta.excepciones ?? []
  const [singular, plural] = meta.etiquetaExcepciones ?? ['excepción', 'excepciones']
  const [abierto, setAbierto] = useState(false)
  const idLista = useId()

  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:pt-1.5">
          <h3 className="text-sm font-bold text-gray-900">{meta.nombre}</h3>
          {p.nivel === 'riesgo' && !fijo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
              <IconLock size={11} />
              Solo Gerencia General
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
          {onoff ? (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold',
                p.valor === 1 ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-700',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', p.valor === 1 ? 'bg-primary-600' : 'bg-gray-400')} />
              {conUnidad(p.valor, p)}
            </span>
          ) : (
            <span className="text-xl font-bold tabular-nums text-gray-900">{conUnidad(p.valor, p)}</span>
          )}
          <button
            type="button"
            onClick={() => onAbrir(p.clave)}
            aria-label={`${fijo || p.editable === false ? 'Ver' : 'Cambiar'}: ${meta.nombre}`}
            className="inline-flex min-h-10 min-w-[5.5rem] items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:border-gray-400 hover:bg-gray-50"
          >
            {fijo || p.editable === false ? 'Ver' : onoff ? (p.valor === 1 ? 'Apagar' : 'Encender') : 'Cambiar'}
          </button>
        </div>
      </div>

      <div className="mt-2 max-w-[68ch]">
        <p className="text-sm text-gray-700">{meta.queHace || humanizar(p.descripcion)}</p>

        {excepciones.length > 0 && (
          <div className="mt-1">
            <button
              type="button"
              aria-expanded={abierto}
              aria-controls={idLista}
              onClick={() => setAbierto((a) => !a)}
              className="-mx-2 inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary-700 hover:bg-primary-50 hover:text-primary-800"
            >
              {abierto ? 'Ocultar' : 'Ver'} {excepciones.length} {excepciones.length === 1 ? singular : plural}
              <IconChevronDown
                size={16}
                className={cn('shrink-0 transition-transform motion-reduce:transition-none', abierto && 'rotate-180')}
              />
            </button>
            <ul id={idLista} hidden={!abierto} className="ml-4 list-disc space-y-1.5 text-sm marker:text-gray-400">
              {excepciones.map((e) => (
                <Excepcion key={e} texto={e} />
              ))}
            </ul>
          </div>
        )}

        {ejemplo && (
          <p className="mt-2 text-xs text-gray-600">
            <span className="font-semibold text-gray-700">Ejemplo:</span> {ejemplo}
          </p>
        )}
        {meta.nota && <p className="mt-1 text-xs text-gray-600">{meta.nota}</p>}
        {meta.notaRige && (
          <p className="mt-1 text-xs text-gray-600">
            <span className="font-semibold">Cuándo aplica:</span> {meta.notaRige}.
          </p>
        )}
        {p.advertencia && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-800">
            <IconAlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>{humanizar(p.advertencia)}</span>
          </p>
        )}
        {(fecha || p.valor !== p.valorDefault) && (
          <p className="mt-1.5 text-xs text-gray-500">
            {fecha && `Último cambio: ${formatDate(fecha)}${ultimo?.usuario_nombre ? ` por ${ultimo.usuario_nombre}` : ''}`}
            {fecha && p.valor !== p.valorDefault && ' · '}
            {p.valor !== p.valorDefault && `Valor inicial: ${conUnidad(p.valorDefault, p)}`}
          </p>
        )}
      </div>
    </div>
  )
}
