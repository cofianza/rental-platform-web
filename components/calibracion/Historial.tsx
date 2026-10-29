'use client'

import { useState } from 'react'
import type { IHistorialCalibracion, IParametroCalibracion } from '@/services/calibracionService'
import { IconArrowRight } from '@/components/icons'
import { formatDateTime } from '@/lib/constants'
import { conUnidad, nombreDe } from './parametros'

/** Un cambio dicho como frase: quién, qué, de cuánto a cuánto y por qué. */
export function CambioItem({ h, params, conNombre = true }: { h: IHistorialCalibracion; params: IParametroCalibracion[]; conNombre?: boolean }) {
  const def = params.find((p) => p.clave === h.clave) ?? { clave: h.clave, entero: false }
  return (
    <li className="px-4 py-3 text-sm">
      <p className="text-xs text-gray-500">
        {formatDateTime(h.created_at)} · {h.usuario_nombre ?? 'Usuario sin nombre'}
      </p>
      {conNombre && <p className="font-semibold text-gray-900">{nombreDe(h.clave)}</p>}
      <p className="mt-0.5 flex flex-wrap items-center gap-1.5">
        <span className="text-gray-500">{h.valor_anterior === null ? 'Sin valor' : conUnidad(h.valor_anterior, def)}</span>
        <IconArrowRight size={12} className="text-gray-400" />
        <span className="sr-only">pasó a</span>
        <span className="font-semibold text-gray-900">{conUnidad(h.valor_nuevo, def)}</span>
      </p>
      {h.motivo && <p className="mt-1 text-xs text-gray-600">Motivo: «{h.motivo}»</p>}
    </li>
  )
}

export function Historial({ historial, params }: { historial: IHistorialCalibracion[]; params: IParametroCalibracion[] }) {
  const [todos, setTodos] = useState(false)
  if (historial.length === 0) {
    return <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">Todavía no hay cambios registrados.</p>
  }
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <ul className="divide-y divide-gray-100">
        {(todos ? historial : historial.slice(0, 15)).map((h) => (
          <CambioItem key={h.id} h={h} params={params} />
        ))}
      </ul>
      {historial.length > 15 && (
        <button
          type="button"
          onClick={() => setTodos((v) => !v)}
          className="w-full border-t border-gray-100 py-2 text-sm font-medium text-primary-700 hover:bg-gray-50"
        >
          {todos ? 'Ver solo los últimos 15' : `Ver los ${historial.length} cambios`}
        </button>
      )}
    </div>
  )
}
