'use client'

import type { IHistorialCalibracion, IParametroCalibracion } from '@/services/calibracionService'
import { IconAlertTriangle, IconLock } from '@/components/icons'
import { formatDate } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { conUnidad, humanizar, metaDe, type Valores } from './parametros'

interface Props {
  p: IParametroCalibracion
  valores: Valores
  ultimo?: IHistorialCalibracion
  onAbrir: (clave: string) => void
}

/** Una fila: qué es, qué hace, cuánto vale hoy y el botón para cambiarlo. */
export function ParametroFila({ p, valores, ultimo, onAbrir }: Props) {
  const meta = metaDe(p.clave)
  const onoff = meta.unidad === 'onoff'
  const ejemplo = meta.ejemplo?.(valores)
  const fijo = p.min === p.max
  const fecha = ultimo?.created_at ?? p.actualizado_en

  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900">{meta.nombre}</h3>
          {p.nivel === 'riesgo' && !fijo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
              <IconLock size={11} />
              Solo Gerencia General
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-gray-600">{meta.queHace || humanizar(p.descripcion)}</p>
        {ejemplo && <p className="mt-1 text-xs text-gray-500">{ejemplo}</p>}
        {meta.nota && <p className="mt-1 text-xs text-gray-500">{meta.nota}</p>}
        {meta.notaRige && (
          <p className="mt-1 text-xs text-gray-500">
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
          <p className="mt-1.5 text-xs text-gray-400">
            {fecha && `Último cambio: ${formatDate(fecha)}${ultimo?.usuario_nombre ? ` por ${ultimo.usuario_nombre}` : ''}`}
            {fecha && p.valor !== p.valorDefault && ' · '}
            {p.valor !== p.valorDefault && `Valor inicial: ${conUnidad(p.valorDefault, p)}`}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
        {onoff ? (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold',
              p.valor === 1 ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-600',
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', p.valor === 1 ? 'bg-primary-600' : 'bg-gray-400')} />
            {conUnidad(p.valor, p)}
          </span>
        ) : (
          <span className="text-xl font-bold text-gray-900">{conUnidad(p.valor, p)}</span>
        )}
        <button
          type="button"
          onClick={() => onAbrir(p.clave)}
          aria-label={`${fijo || p.editable === false ? 'Ver' : 'Cambiar'}: ${meta.nombre}`}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          {fijo || p.editable === false ? 'Ver' : onoff ? (p.valor === 1 ? 'Apagar' : 'Encender') : 'Cambiar'}
        </button>
      </div>
    </div>
  )
}
