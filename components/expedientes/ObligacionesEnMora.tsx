/**
 * Adenda 5 §7 (solo Cofianza): las obligaciones en mora que llevaron el estudio
 * a revisión, con acreedor, saldo en mora, días y la marca de reclamo en trámite
 * (Ley 1266), que es un elemento de criterio del analista y no cambia el tramo.
 * Con `seleccion`, cada obligación lleva su casilla (aprobar sujeto a paz y salvo).
 *
 * §10: este detalle es reservado. Nunca se monta para la inmobiliaria, el
 * propietario ni el candidato desde el panel (el candidato lo ve en su enlace).
 */

'use client'

import { IconAlertTriangle } from '@/components/icons'
import type { IObligacionMoraA5 } from '@/types/estudio'
import { detalleMora, nombreObligacion, nombreSector } from '@/lib/pazYSalvo'

interface Props {
  obligaciones: IObligacionMoraA5[]
  /** Refs marcadas; sin él la lista es solo de lectura. */
  seleccion?: string[]
  onSeleccion?: (refs: string[]) => void
  disabled?: boolean
}

export function ObligacionesEnMora({ obligaciones, seleccion, onSeleccion, disabled }: Props) {
  if (obligaciones.length === 0) return null
  const conCasillas = !!seleccion && !!onSeleccion

  const alternar = (ref: string, marcada: boolean) => {
    if (!seleccion || !onSeleccion) return
    onSeleccion(marcada ? [...new Set([...seleccion, ref])] : seleccion.filter((r) => r !== ref))
  }

  return (
    <ul className="space-y-2">
      {obligaciones.map((o) => {
        const detalle = detalleMora(o)
        const contenido = (
          <div className="min-w-0 flex-1">
            <p className="break-words font-medium text-gray-900">{nombreObligacion(o)}</p>
            {detalle && <p className="text-xs text-gray-700">{detalle}</p>}
            {nombreSector(o.sector) && <p className="text-xs text-gray-500">{nombreSector(o.sector)}</p>}
            {o.en_reclamo && (
              <span className="mt-1 inline-flex items-start gap-1 rounded-xl bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                <IconAlertTriangle size={12} className="mt-0.5 shrink-0" />
                Reclamo en trámite (Ley 1266): elemento de criterio, no cambia el tramo
              </span>
            )}
          </div>
        )
        return (
          <li key={o.ref} className="rounded-lg border border-gray-200 bg-white p-2.5 text-sm">
            {conCasillas ? (
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={seleccion.includes(o.ref)}
                  onChange={(e) => alternar(o.ref, e.target.checked)}
                  disabled={disabled}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                {contenido}
              </label>
            ) : (
              contenido
            )}
          </li>
        )
      })}
    </ul>
  )
}
