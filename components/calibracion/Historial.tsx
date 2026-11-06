'use client'

import { useState } from 'react'
import type { IHistorialCalibracion, IParametroCalibracion } from '@/services/calibracionService'
import { IconArrowRight, IconRefresh } from '@/components/icons'
import { formatDateTime } from '@/lib/constants'
import { conUnidad, nombreDe } from './parametros'

/** Un cambio dicho como frase: quién, qué, de cuánto a cuánto y por qué. */
export function CambioItem({ h, params, conNombre = true }: { h: IHistorialCalibracion; params: IParametroCalibracion[]; conNombre?: boolean }) {
  const def = params.find((p) => p.clave === h.clave) ?? { clave: h.clave, entero: false }
  return (
    <li className="px-4 py-3 text-sm sm:px-5">
      <p className="text-xs text-gray-600">
        {formatDateTime(h.created_at)} · {h.usuario_nombre ?? 'Usuario sin nombre'}
      </p>
      {conNombre && <p className="font-semibold text-gray-900">{nombreDe(h.clave)}</p>}
      <p className="mt-1 flex flex-wrap items-center gap-1.5 tabular-nums">
        <span className="text-gray-600">{h.valor_anterior === null ? 'Sin valor' : conUnidad(h.valor_anterior, def)}</span>
        <IconArrowRight size={12} aria-hidden className="text-gray-500" />
        <span className="sr-only">pasó a</span>
        <span className="font-semibold text-gray-900">{conUnidad(h.valor_nuevo, def)}</span>
      </p>
      {h.motivo && <p className="mt-1 max-w-prose text-xs text-gray-600">Motivo: «{h.motivo}»</p>}
    </li>
  )
}

export function Historial({
  historial,
  params,
  error = false,
  onReintentar,
}: {
  historial: IHistorialCalibracion[]
  params: IParametroCalibracion[]
  /** No se pudo leer: no es lo mismo que no tener cambios. */
  error?: boolean
  onReintentar?: () => void
}) {
  const [todos, setTodos] = useState(false)
  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-semibold text-red-800">No se pudo cargar el historial de cambios.</p>
        <p className="mt-1 text-sm text-red-700">Los valores de la calibración sí cargaron; solo falta el registro de cambios.</p>
        {onReintentar && (
          <button
            type="button"
            onClick={onReintentar}
            className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <IconRefresh size={14} />
            Reintentar
          </button>
        )}
      </div>
    )
  }
  if (historial.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center">
        <p className="font-semibold text-gray-900">Todavía no hay cambios registrados.</p>
        <p className="mt-1 text-sm text-gray-600">Cada valor que se cambie aparecerá aquí.</p>
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <p className="border-b border-gray-100 px-4 py-2.5 text-xs text-gray-600 sm:px-5">
        {historial.length} {historial.length === 1 ? 'cambio registrado' : 'cambios registrados'}, del más reciente al más antiguo.
      </p>
      <ul className="divide-y divide-gray-100">
        {(todos ? historial : historial.slice(0, 15)).map((h) => (
          <CambioItem key={h.id} h={h} params={params} />
        ))}
      </ul>
      {historial.length > 15 && (
        <button
          type="button"
          onClick={() => setTodos((v) => !v)}
          className="min-h-11 w-full border-t border-gray-100 py-2 text-sm font-medium text-primary-700 hover:bg-gray-50"
        >
          {todos ? 'Ver solo los últimos 15' : `Ver los ${historial.length} cambios`}
        </button>
      )}
    </div>
  )
}
