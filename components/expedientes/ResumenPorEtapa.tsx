/**
 * Resumen del estudio ordenado por etapa (revisión del Resumen, 23-oct):
 * primero lo que toca ahora, después el detalle del paso actual y, plegado,
 * lo que ya pasó. Cada tarjeta se sigue ocultando sola cuando no aplica.
 */

'use client'

import { Fragment, type ReactNode } from 'react'
import type { EtapaEstudio } from '@/hooks/useEtapaEstudio'

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
  consulta: { ahora: ['evaluacion'], detalle: ['coarrendatario'], historial: ['autorizacion', 'pago', 'visita'] },
  sin_ejecutar: { ahora: ['evaluacion'], detalle: ['coarrendatario'], historial: ['autorizacion', 'pago', 'visita'] },
  fallida: { ahora: ['evaluacion'], detalle: ['coarrendatario'], historial: ['autorizacion', 'pago', 'visita'] },
  decision: { ahora: ['decision', 'coarrendatario'], detalle: ['evaluacion'], historial: ['autorizacion', 'visita'] },
  contrato: { ahora: ['vincular', 'contrato'], detalle: ['evaluacion'], ...DESPUES_DEL_RESULTADO },
  firma: { ahora: ['contratoEstado'], detalle: ['evaluacion'], ...DESPUES_DEL_RESULTADO },
  vigente: { ahora: ['contratoEstado'], detalle: ['evaluacion'], ...DESPUES_DEL_RESULTADO },
  finalizado: { ahora: ['contratoEstado'], detalle: ['evaluacion'], ...DESPUES_DEL_RESULTADO },
  no_aprobado: { ahora: [], detalle: ['evaluacion'], ...DESPUES_DEL_RESULTADO },
  cancelado: { ahora: [], detalle: ['evaluacion', 'contratoEstado'], ...DESPUES_DEL_RESULTADO },
}

/**
 * Quien no puede actuar (Gerencia, solo lectura) no ve las tarjetas de acción:
 * sin esto el Resumen quedaba vacío. Una línea que dice de quién es el paso.
 */
const SIN_ACCION: Partial<Record<EtapaEstudio, string>> = {
  habilitar: 'Falta que la inmobiliaria o el propietario habiliten la evaluación.',
  no_habilitada: 'Después de la visita se decidió no habilitar la evaluación: el estudio no continúa.',
  contrato: 'Falta que la inmobiliaria o el propietario creen el contrato.',
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
  const aviso = ahora.some((b) => bloques[b]) ? null : SIN_ACCION[etapa]

  return (
    <>
      {aviso && <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">{aviso}</p>}
      {pintar(ahora)}
      {pintar(detalle)}
      {pasado.length > 0 && (
        <details className="rounded-lg border border-gray-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4 text-sm hover:bg-gray-50">
            <span className="font-medium text-gray-800">Pasos anteriores</span>
            <span className="text-xs text-gray-500">Ver</span>
          </summary>
          <div className="space-y-4 border-t border-gray-200 p-4">{pintar(pasado)}</div>
        </details>
      )}
    </>
  )
}
