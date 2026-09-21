/**
 * Bloqueos y pendientes del asistente de contratos V3 (Entrega 3).
 *
 * Los decide el API (§5.2 del diseño): aquí solo se pintan, cada uno con el
 * enlace a donde se corrige. Un bloqueo impide iniciar o generar; un aviso no.
 */

'use client'

import Link from 'next/link'
import { IconAlertTriangle, IconArrowRight, IconInfo } from '@/components/icons'
import type { Bloqueo, NumeroPaso } from '@/types/contratoV3'

interface Props {
  bloqueos: Bloqueo[]
  /** Faltantes del asistente ("Falta guardar este paso", fechas vencidas…). */
  faltantes?: { paso: NumeroPaso; mensaje: string }[]
  /** Sin él (solo faltantes) no se pintan los enlaces de acción. */
  expedienteId?: string
  inmuebleId?: string
  /** Titular de la inmobiliaria: el único que edita los Datos para contrato. */
  esTitular?: boolean
  /** Si llega, los ítems con paso muestran "Ir al paso N". */
  onIrPaso?: (paso: NumeroPaso) => void
}

const enlace = 'inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline'

export function BloqueosContrato({ bloqueos, faltantes = [], expedienteId, inmuebleId, esTitular, onIrPaso }: Props) {
  if (bloqueos.length === 0 && faltantes.length === 0) return null

  const accion = (b: Bloqueo) => {
    if (!expedienteId) return null
    switch (b.accion) {
      case 'datos_contrato': {
        if (!esTitular) {
          return (
            <p className="text-xs text-red-700">Pídele al titular de la inmobiliaria que complete los Datos para contrato.</p>
          )
        }
        const returnTo = encodeURIComponent(`/expedientes/${expedienteId}/contrato`)
        return (
          <Link href={`/configuracion/datos-contrato?returnTo=${returnTo}`} className={enlace}>
            Completar Datos para contrato <IconArrowRight size={12} />
          </Link>
        )
      }
      case 'estudio':
        return (
          <Link href={`/expedientes/${expedienteId}`} className={enlace}>
            Ir al estudio <IconArrowRight size={12} />
          </Link>
        )
      case 'inmueble':
        return inmuebleId ? (
          <Link href={`/inmuebles/${inmuebleId}/editar`} className={enlace}>
            Editar el inmueble <IconArrowRight size={12} />
          </Link>
        ) : null
      default:
        return null
    }
  }

  const irPaso = (paso?: NumeroPaso) =>
    paso && onIrPaso ? (
      <button type="button" onClick={() => onIrPaso(paso)} className={enlace}>
        Ir al paso {paso} <IconArrowRight size={12} />
      </button>
    ) : null

  return (
    <div role="alert" className="space-y-2">
      {bloqueos.map((b, i) => (
        <div key={`${b.codigo}-${i}`} className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3">
          <IconAlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-sm text-red-800">{b.mensaje}</p>
            {b.detalle && b.detalle.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-5 text-xs text-red-700">
                {b.detalle.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {accion(b)}
              {irPaso(b.paso)}
            </div>
          </div>
        </div>
      ))}
      {faltantes.map((f, i) => (
        <div key={`${f.paso}-${i}`} className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <IconAlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-sm text-amber-900">
              {onIrPaso && <span className="font-semibold">Paso {f.paso}: </span>}
              {f.mensaje}
            </p>
            {irPaso(f.paso)}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Avisos que no bloquean (canon del registro, textos pendientes de Gerencia…). */
export function AvisosContrato({ avisos }: { avisos: string[] }) {
  if (avisos.length === 0) return null
  return (
    <ul className="space-y-2">
      {avisos.map((a) => (
        <li key={a} className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <IconInfo size={18} className="mt-0.5 shrink-0 text-blue-600" />
          <span>{a}</span>
        </li>
      ))}
    </ul>
  )
}
