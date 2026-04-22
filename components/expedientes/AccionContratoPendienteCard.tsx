/**
 * AccionContratoPendienteCard — señaliza al admin/operador/inmobiliaria
 * cuando un expediente está aprobado pero aún no tiene contrato generado.
 *
 * El propietario ve el mismo aviso pero en modo "informativo" (no tiene
 * permiso para generar contratos — la inmobiliaria es quien los genera).
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { contratoService } from '@/services/contratoService'

interface AccionContratoPendienteCardProps {
  expedienteId: string
  expedienteEstado: string
  userRol?: string
  /** Callback para abrir el modal "Generar contrato" desde el Resumen. */
  onGenerarClick?: () => void
}

export function AccionContratoPendienteCard({
  expedienteId,
  expedienteEstado,
  userRol,
  onGenerarClick,
}: AccionContratoPendienteCardProps) {
  const [loading, setLoading] = useState(true)
  const [hasContrato, setHasContrato] = useState(false)

  const fetchContratos = useCallback(async () => {
    try {
      const res = await contratoService.getContratosForExpediente(expedienteId, { page: 1, limit: 1 })
      const activos = (res.data || []).filter((c) => c.estado !== 'cancelado')
      setHasContrato(activos.length > 0)
    } catch {
      setHasContrato(false)
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => { fetchContratos() }, [fetchContratos])

  // Solo relevante cuando el expediente está aprobado y no hay contrato aún.
  if (loading) return null
  if (hasContrato) return null
  if (expedienteEstado !== 'aprobado' && expedienteEstado !== 'condicionado') return null

  const puedeGenerar = userRol === 'administrador' || userRol === 'operador_analista' || userRol === 'inmobiliaria'

  if (puedeGenerar) {
    return (
      <div className="border-2 border-primary-300 bg-primary-50/50 rounded-lg p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <svg className="h-5 w-5 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 mb-0.5">Acción requerida: generar contrato</h3>
            <p className="text-sm text-gray-600 mb-3">
              El expediente está aprobado. El siguiente paso es generar el contrato de arrendamiento (desde el PDF del propietario o una plantilla de Cofianza) y enviarlo a firma.
            </p>
            {onGenerarClick ? (
              <button
                onClick={onGenerarClick}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
              >
                Generar contrato
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            ) : (
              <p className="text-sm text-primary-700 font-medium">Ve a la pestaña <strong>Contratos</strong> para generarlo.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Propietario: avisar informativo (no tiene permiso para generar).
  return (
    <div className="border border-blue-200 bg-blue-50 rounded-lg p-5">
      <div className="flex items-start gap-3">
        <svg className="h-5 w-5 text-blue-700 shrink-0 mt-0.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-blue-900 mb-0.5">Esperando generación del contrato</p>
          <p className="text-sm text-blue-800">
            El estudio del solicitante fue aprobado. La inmobiliaria o el operador de Cofianza están preparando el contrato — recibirás una notificación cuando esté listo.
          </p>
        </div>
      </div>
    </div>
  )
}
