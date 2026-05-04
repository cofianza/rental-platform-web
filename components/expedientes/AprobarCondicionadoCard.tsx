/**
 * AprobarCondicionadoCard — visible para propietario/inmobiliaria/admin/operador
 * cuando el expediente está en 'condicionado'.
 *
 * Flujo: el buró devolvió el estudio como condicionado (necesita codeudor,
 * póliza extra, etc.). El propietario revisa la documentación adicional
 * y, si decide proceder, hace clic aquí. El backend transiciona el
 * expediente a 'aprobado' y genera el contrato — exactamente la misma ruta
 * que toma el flujo automático cuando el estudio sale 'aprobado'.
 *
 * El solicitante no ve esta card; ve EstudioEstadoCard (informativa).
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { expedienteService } from '@/services/expedienteService'

interface AprobarCondicionadoCardProps {
  expedienteId: string
  expedienteEstado: string
  userRol?: string
  onAprobado?: () => void
}

export function AprobarCondicionadoCard({
  expedienteId,
  expedienteEstado,
  userRol,
  onAprobado,
}: AprobarCondicionadoCardProps) {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const puedeAprobar =
    userRol === 'administrador' ||
    userRol === 'operador_analista' ||
    userRol === 'propietario' ||
    userRol === 'inmobiliaria'

  if (expedienteEstado !== 'condicionado' || !puedeAprobar) return null

  const handleAprobar = async () => {
    setLoading(true)
    try {
      const result = await expedienteService.aprobarCondicionado(expedienteId)
      if (result.contrato_id) {
        toast.success('Expediente aprobado. Contrato generado y listo para enviar a firma.')
      } else {
        toast.success('Expediente aprobado. Genera el contrato desde la pestaña Contratos.')
      }
      onAprobado?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo aprobar el expediente.'
      toast.error(msg)
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className="border-2 border-amber-300 bg-amber-50/60 rounded-lg p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 mb-0.5">Estudio condicionado — decisión pendiente</h3>
          <p className="text-sm text-gray-700 mb-3">
            El buró marcó la solicitud como condicionada. Revisa la documentación adicional que pediste al solicitante (codeudor, póliza, etc.).
            Si decides proceder, aprueba manualmente y se generará el contrato de arrendamiento.
          </p>

          {!showConfirm ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowConfirm(true)}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                Aprobar y generar contrato
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="bg-white border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-gray-800 mb-3">
                ¿Confirmas que ya validaste la documentación y quieres proceder? Se generará el contrato y se notificará al solicitante.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleAprobar}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Aprobando…' : 'Sí, aprobar'}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
