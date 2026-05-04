/**
 * ContratoEstadoCard — resumen del estado del contrato para propietario/
 * inmobiliaria/admin/operador en la pestaña Resumen del expediente.
 *
 * Auto-oculto cuando no hay contrato (en ese caso AccionContratoPendienteCard
 * cubre el "siguiente paso"). Cuando hay contrato muestra estado, version,
 * archivo y fechas clave + CTA para abrir la pestaña Contratos.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { IconCheck, IconCalendar } from '@/components/icons'
import { contratoService } from '@/services/contratoService'
import { ESTADOS_CONTRATO } from '@/lib/constants'
import { formatDate } from '@/lib/constants'
import type { IContrato } from '@/types/contrato'

interface ContratoEstadoCardProps {
  expedienteId: string
  /** Callback para llevar al usuario a la pestaña Contratos. Si no se pasa,
   *  no se renderiza el CTA — la card queda informativa. */
  onVerContratos?: () => void
}

// Prioridad para escoger el contrato representativo si hay varios.
// Mismo orden que ContratoSolicitanteCard para que ambas vistas coincidan.
const PRIORIDAD: Record<string, number> = {
  vigente: 5,
  firmado: 4,
  pendiente_firma: 3,
  aprobado: 2,
  en_revision: 1,
  borrador: 1,
  cancelado: 0,
  finalizado: 0,
}

export function ContratoEstadoCard({ expedienteId, onVerContratos }: ContratoEstadoCardProps) {
  const [contrato, setContrato] = useState<IContrato | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchContrato = useCallback(async () => {
    try {
      const res = await contratoService.getContratosForExpediente(expedienteId, { page: 1, limit: 5 })
      const ordered = [...res.data].sort((a, b) => {
        const p = (PRIORIDAD[b.estado] ?? 0) - (PRIORIDAD[a.estado] ?? 0)
        if (p !== 0) return p
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      setContrato(ordered[0] ?? null)
    } catch {
      setContrato(null)
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => { fetchContrato() }, [fetchContrato])

  if (loading) return null
  if (!contrato) return null

  const estadoConfig = ESTADOS_CONTRATO[contrato.estado]
  const isFinal = contrato.estado === 'vigente' || contrato.estado === 'firmado'
  const isInactivo = contrato.estado === 'cancelado' || contrato.estado === 'finalizado'

  // Tono de la card por bloque de progreso del contrato.
  const cardTone = isFinal
    ? 'bg-green-50 border-green-200'
    : isInactivo
      ? 'bg-gray-50 border-gray-200'
      : 'bg-purple-50 border-purple-200'

  const iconTone = isFinal
    ? 'bg-green-100 text-green-600'
    : isInactivo
      ? 'bg-gray-100 text-gray-500'
      : 'bg-purple-100 text-purple-600'

  return (
    <div className={`border rounded-lg p-4 ${cardTone}`}>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <IconCalendar size={16} />
        Contrato
      </h3>

      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconTone}`}>
          <IconCheck size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${estadoConfig.bgColor} ${estadoConfig.textColor} ${estadoConfig.borderColor}`}
            >
              {estadoConfig.label}
            </span>
            <span className="text-xs text-gray-500 font-mono">v{contrato.version}</span>
          </div>

          <div className="space-y-0.5 text-sm">
            {contrato.nombre_archivo && (
              <p className="text-gray-700 truncate" title={contrato.nombre_archivo}>
                {contrato.nombre_archivo}
              </p>
            )}
            {contrato.fecha_inicio && (
              <p className="text-xs text-gray-600">
                Inicio: {formatDate(contrato.fecha_inicio)}
                {contrato.duracion_meses ? ` · ${contrato.duracion_meses} meses` : ''}
              </p>
            )}
            {contrato.fecha_firma && (
              <p className="text-xs text-gray-600">
                Firmado: {formatDate(contrato.fecha_firma)}
              </p>
            )}
            {contrato.motivo_cancelacion && (
              <p className="text-xs text-red-600">
                Motivo: {contrato.motivo_cancelacion}
              </p>
            )}
          </div>
        </div>
      </div>

      {onVerContratos && (
        <div className="mt-3 pt-3 border-t border-gray-200/60">
          <button
            type="button"
            onClick={onVerContratos}
            className="text-xs font-medium text-primary-700 hover:text-primary-800"
          >
            Ver detalle del contrato →
          </button>
        </div>
      )}
    </div>
  )
}
