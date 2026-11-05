/**
 * Resumen del estudio ordenado por etapa (revisión del Resumen, 23-oct):
 * primero lo que toca ahora, después el detalle del paso actual y, plegado,
 * lo que ya pasó. Cada tarjeta se sigue ocultando sola cuando no aplica.
 */

'use client'

import { Fragment, type ReactNode } from 'react'
import type { EtapaEstudio } from '@/hooks/useEtapaEstudio'
import { IconChevronDown } from '@/components/icons'

export type BloqueResumen =
  | 'vincular'
  | 'contrato'
  | 'decision'
  | 'habilitar'
  | 'evaluacion'
  | 'autorizacion'
  | 'pago'
  | 'contratoEstado'
  | 'coarrendatario'
  | 'visita'

interface Orden {
  /** Lo que toca ahora (arriba). */
  ahora: BloqueResumen[]
  /** El detalle del paso actual. */
  detalle: BloqueResumen[]
  /** Lo que ya pasó, plegado. */
  historial: BloqueResumen[]
}

const DESPUES_DEL_RESULTADO: Pick<Orden, 'historial'> = { historial: ['coarrendatario', 'autorizacion', 'visita'] }

const ORDEN: Record<EtapaEstudio, Orden> = {
  visita: { ahora: ['habilitar', 'visita'], detalle: ['coarrendatario'], historial: [] },
  habilitar: { ahora: ['habilitar'], detalle: ['coarrendatario'], historial: ['visita'] },
  no_habilitada: { ahora: [], detalle: ['coarrendatario'], historial: ['visita'] },
  autorizacion: { ahora: ['autorizacion', 'pago'], detalle: ['evaluacion', 'coarrendatario'], historial: ['visita'] },
  enlace: { ahora: ['autorizacion', 'pago'], detalle: ['evaluacion', 'coarrendatario'], historial: ['visita'] },
  pago: { ahora: ['pago', 'autorizacion'], detalle: ['evaluacion', 'coarrendatario'], historial: ['visita'] },
  pago_prospecto: { ahora: ['pago', 'autorizacion'], detalle: ['evaluacion', 'coarrendatario'], historial: ['visita'] },
  consulta: { ahora: ['evaluacion'], detalle: ['coarrendatario'], historial: ['autorizacion', 'pago', 'visita'] },
  espera_coarrendatario: { ahora: ['evaluacion', 'coarrendatario'], detalle: [], historial: ['autorizacion', 'pago', 'visita'] },
  sin_ejecutar: { ahora: ['evaluacion'], detalle: ['coarrendatario'], historial: ['autorizacion', 'pago', 'visita'] },
  fallida: { ahora: ['evaluacion'], detalle: ['coarrendatario'], historial: ['autorizacion', 'pago', 'visita'] },
  decision: { ahora: ['decision', 'coarrendatario'], detalle: ['evaluacion'], historial: ['autorizacion', 'visita'] },
  contrato: { ahora: ['vincular', 'contrato'], detalle: ['evaluacion'], ...DESPUES_DEL_RESULTADO },
  firma: { ahora: ['contratoEstado'], detalle: ['evaluacion'], ...DESPUES_DEL_RESULTADO },
  firma_incompleta: { ahora: ['contratoEstado'], detalle: ['evaluacion'], ...DESPUES_DEL_RESULTADO },
  vigente: { ahora: ['contratoEstado'], detalle: ['evaluacion'], ...DESPUES_DEL_RESULTADO },
  finalizado: { ahora: ['contratoEstado'], detalle: ['evaluacion'], ...DESPUES_DEL_RESULTADO },
  no_aprobado: { ahora: [], detalle: ['evaluacion'], ...DESPUES_DEL_RESULTADO },
  cancelado: { ahora: [], detalle: ['evaluacion', 'contratoEstado'], ...DESPUES_DEL_RESULTADO },
}

interface Props {
  /** null = la etapa se está leyendo: no se pinta nada (sin saltos ni barras grises). */
  etapa: EtapaEstudio | null
  bloques: Record<BloqueResumen, ReactNode>
}

export function ResumenPorEtapa({ etapa, bloques }: Props) {
  if (!etapa) return null
  const { ahora, detalle, historial } = ORDEN[etapa]
  const pintar = (lista: BloqueResumen[]) =>
    lista.filter((b) => bloques[b]).map((b) => <Fragment key={b}>{bloques[b]}</Fragment>)
  const pasado = historial.filter((b) => bloques[b])

  return (
    <>
      {pintar(ahora)}
      {pintar(detalle)}
      {pasado.length > 0 && (
        <Plegable titulo="Pasos anteriores" resumen={pasado.length === 1 ? '1 paso' : `${pasado.length} pasos`}>
          <div className="space-y-4 p-4">{pintar(pasado)}</div>
        </Plegable>
      )}
    </>
  )
}

/** Sección plegada del Resumen (pasos anteriores, datos del estudio): un solo aspecto en toda la página. */
export function Plegable({ titulo, resumen, children }: { titulo: string; resumen?: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-gray-200 bg-white">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="font-semibold text-gray-900">{titulo}</span>
        {resumen && <span className="min-w-0 flex-1 truncate text-gray-500">{resumen}</span>}
        <IconChevronDown size={18} className="ml-auto shrink-0 text-gray-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-gray-200">{children}</div>
    </details>
  )
}
