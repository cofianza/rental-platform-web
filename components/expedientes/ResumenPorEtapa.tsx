/**
 * Resumen del estudio ordenado por etapa (revisión del Resumen, 23-oct):
 * primero lo que toca ahora, después el detalle del paso actual y, plegado,
 * lo que ya pasó. Cada tarjeta se sigue ocultando sola cuando no aplica.
 * «Pasos anteriores» solo guarda lo terminado (reporte de Gerencia, 21-nov,
 * punto 10): el coarrendatario que sigue en curso se queda a la vista.
 */

'use client'

import { useId, useState, type ReactNode } from 'react'
import type { EtapaEstudio } from '@/hooks/useEtapaEstudio'
import { IconChevronDown } from '@/components/icons'
import { cn } from '@/lib/utils'

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
  // Primero agendar la visita (la acción principal); debajo, marcarla como hecha si fue por fuera.
  visita: { ahora: ['visita', 'habilitar'], detalle: ['coarrendatario'], historial: [] },
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
  // Con el resultado que envía la API: lo que falta está en la evaluación y en la tarjeta de la otra persona.
  segundo_firmante: { ahora: ['decision', 'coarrendatario'], detalle: ['evaluacion'], historial: ['autorizacion', 'visita'] },
  bloqueado: { ahora: ['evaluacion', 'coarrendatario'], detalle: ['decision'], historial: ['autorizacion', 'visita'] },
  contrato: { ahora: ['vincular', 'contrato'], detalle: ['evaluacion'], ...DESPUES_DEL_RESULTADO },
  // Aprobado con traba: la tarjeta del contrato dice qué lo impide y cómo seguir (BloqueosContrato).
  canon_excede: { ahora: ['vincular', 'contrato'], detalle: ['evaluacion'], ...DESPUES_DEL_RESULTADO },
  // El coarrendatario sin responder sigue vigente: su tarjeta va arriba, no en «Pasos anteriores».
  coarrendatario_pendiente: {
    ahora: ['vincular', 'contrato', 'coarrendatario'],
    detalle: ['evaluacion'],
    historial: ['autorizacion', 'visita'],
  },
  // Igual con el segundo firmante en evaluación o en verificación: su tarjeta sigue a la vista.
  coarrendatario_en_evaluacion: {
    ahora: ['vincular', 'contrato', 'coarrendatario'],
    detalle: ['evaluacion'],
    historial: ['autorizacion', 'visita'],
  },
  coarrendatario_en_verificacion: {
    ahora: ['vincular', 'contrato', 'coarrendatario'],
    detalle: ['evaluacion'],
    historial: ['autorizacion', 'visita'],
  },
  // Adenda 6 §4: Cofianza termina una verificación del solicitante; el contrato espera.
  solicitante_en_verificacion: {
    ahora: ['vincular', 'contrato', 'coarrendatario'],
    detalle: ['evaluacion'],
    historial: ['autorizacion', 'visita'],
  },
  // Un estudio sin propiedad también puede vencer: su tarjeta de «vincular» dice cómo seguir.
  vencido: { ahora: ['vincular', 'contrato'], detalle: ['evaluacion'], ...DESPUES_DEL_RESULTADO },
  firma: { ahora: ['contratoEstado'], detalle: ['evaluacion'], ...DESPUES_DEL_RESULTADO },
  firma_incompleta: { ahora: ['contratoEstado'], detalle: ['evaluacion'], ...DESPUES_DEL_RESULTADO },
  vigente: { ahora: ['contratoEstado'], detalle: ['evaluacion'], ...DESPUES_DEL_RESULTADO },
  finalizado: { ahora: ['contratoEstado'], detalle: ['evaluacion'], ...DESPUES_DEL_RESULTADO },
  no_aprobado: { ahora: [], detalle: ['evaluacion'], ...DESPUES_DEL_RESULTADO },
  cancelado: { ahora: [], detalle: ['evaluacion', 'contratoEstado'], ...DESPUES_DEL_RESULTADO },
  // Reabierto por un reemplazo: la persona nueva (su invitación) y el cambio en curso de «Personas del estudio».
  reapertura: { ahora: ['evaluacion', 'coarrendatario'], detalle: [], historial: ['autorizacion', 'pago', 'visita'] },
}

interface Props {
  /** null = la etapa se está leyendo: un esqueleto del alto de una tarjeta (sin dejar la pestaña en blanco). */
  etapa: EtapaEstudio | null
  bloques: Record<BloqueResumen, ReactNode>
  /**
   * El coarrendatario sigue en curso (lo avisa su tarjeta: invitación sin responder, evaluación sin
   * terminar, en verificación o en revisión). Su tarjeta sale de «Pasos anteriores» y va con el detalle.
   */
  coarrendatarioVivo?: boolean
}

/** El orden de la etapa, con el coarrendatario vivo fuera de lo que ya pasó. Pura. */
export function ordenDelResumen(etapa: EtapaEstudio, coarrendatarioVivo = false): Orden {
  const orden = ORDEN[etapa]
  if (!coarrendatarioVivo || !orden.historial.includes('coarrendatario')) return orden
  return {
    ahora: orden.ahora,
    detalle: ['coarrendatario', ...orden.detalle],
    historial: orden.historial.filter((b) => b !== 'coarrendatario'),
  }
}

export function ResumenPorEtapa({ etapa, bloques, coarrendatarioVivo = false }: Props) {
  const [anterioresAbiertos, setAnterioresAbiertos] = useState(false)
  const idBase = useId()
  if (!etapa) {
    return (
      <div role="status" className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        <span className="sr-only">Cargando el siguiente paso del estudio…</span>
        <div className="flex items-start gap-3">
          <div className="hidden h-9 w-9 shrink-0 rounded-full bg-gray-200 sm:block" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="h-4 w-56 max-w-full rounded bg-gray-200" />
            <div className="h-3 w-full max-w-lg rounded bg-gray-100" />
            <div className="h-3 w-4/5 max-w-md rounded bg-gray-100" />
          </div>
        </div>
      </div>
    )
  }
  const { ahora, detalle, historial } = ordenDelResumen(etapa, coarrendatarioVivo)
  const conBloque = (lista: BloqueResumen[]) => lista.filter((b) => bloques[b])
  const pasado = conBloque(historial)
  const idDe = (b: BloqueResumen) => `${idBase}-${b}`

  // Una sola lista de hermanos con clave estable (no un <details> aparte): una tarjeta que cambia de grupo
  // (el coarrendatario que termina y pasa a «Pasos anteriores», o al revés) se mueve sin volver a montarse,
  // sin otra petición ni salto. Una tarjeta que no aplica se pinta vacía y su contenedor no ocupa lugar.
  const items: ReactNode[] = conBloque([...ahora, ...detalle]).map((b) => (
    <div key={b} className="empty:hidden">
      {bloques[b]}
    </div>
  ))
  if (pasado.length > 0) {
    items.push(
      <div key="pasos-anteriores" className="rounded-xl border border-gray-200 bg-white">
        <button
          type="button"
          aria-expanded={anterioresAbiertos}
          aria-controls={pasado.map(idDe).join(' ')}
          onClick={() => setAnterioresAbiertos((a) => !a)}
          className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:px-5"
        >
          <span className="font-semibold text-gray-900">Pasos anteriores</span>
          <span className="min-w-0 flex-1 truncate text-gray-500">{pasado.length === 1 ? '1 paso' : `${pasado.length} pasos`}</span>
          <IconChevronDown size={18} className={cn('ml-auto shrink-0 text-gray-500 transition-transform', anterioresAbiertos && 'rotate-180')} />
        </button>
      </div>,
      ...pasado.map((b) => (
        // Plegados siguen montados (como en el <details> de antes): al abrir no se vuelven a pedir.
        <div key={b} id={idDe(b)} hidden={!anterioresAbiertos} className="empty:hidden border-l-2 border-gray-200 pl-3 sm:ml-1 sm:pl-4">
          {bloques[b]}
        </div>
      )),
    )
  }

  return <>{items}</>
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
