/**
 * AprobarCondicionadoCard — visible para propietario/inmobiliaria/admin/operador
 * cuando el expediente está en 'condicionado'.
 *
 * Flujo: el buró devolvió el estudio como condicionado. La inmobiliaria decide
 * si proceder de todos modos. Al aprobar, el expediente pasa a 'aprobado'
 * (SIN generar contrato aquí) y el contrato se genera luego desde la pestaña
 * Contratos con el formulario completo (modalidad de fianza + servicios
 * públicos / quién paga). La otra salida es invitar a un co-arrendatario.
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui'
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
  const [enviandoEnlace, setEnviandoEnlace] = useState(false)
  const [confirmAprobarOpen, setConfirmAprobarOpen] = useState(false)

  const puedeAprobar =
    userRol === 'administrador' ||
    userRol === 'operador_analista' ||
    userRol === 'propietario' ||
    userRol === 'inmobiliaria'

  if (expedienteEstado !== 'condicionado' || !puedeAprobar) return null

  const handleEnviarEnlace = async () => {
    setEnviandoEnlace(true)
    try {
      const res = await expedienteService.enviarEnlaceDocumentos(expedienteId)
      toast.success(`Enlace de carga enviado al solicitante (${res.email_destino}).`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar el enlace.')
    } finally {
      setEnviandoEnlace(false)
    }
  }

  const handleAprobar = async () => {
    setLoading(true)
    try {
      // Sin datos de contrato: solo aprueba. El contrato se genera después en
      // la pestaña Contratos con el formulario completo.
      await expedienteService.aprobarCondicionado(expedienteId)
      toast.success('Expediente aprobado. Genera el contrato en la pestaña Contratos (ahí defines la modalidad de fianza y quién paga los servicios).')
      onAprobado?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo aprobar el expediente.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
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
            El buró marcó la solicitud como condicionada. El solicitante puede invitar a un co-arrendatario para
            mejorar el perfil combinado. Si decides proceder igual, <strong>aprueba el expediente</strong>: pasará a
            Aprobado y desde la pestaña <strong>Contratos</strong> generarás el contrato con el formulario completo
            (modalidad de fianza y quién paga los servicios públicos).
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setConfirmAprobarOpen(true)}
              disabled={loading || enviandoEnlace}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? 'Aprobando…' : 'Aprobar expediente'}
              {!loading && (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </button>
            <button
              onClick={handleEnviarEnlace}
              disabled={loading || enviandoEnlace}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {enviandoEnlace ? 'Enviando…' : 'Enviar enlace al solicitante para cargar documentos'}
            </button>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      isOpen={confirmAprobarOpen}
      onClose={() => setConfirmAprobarOpen(false)}
      onConfirm={handleAprobar}
      title="Aprobar expediente condicionado"
      message="El expediente pasará a Aprobado y podrás generar el contrato desde la pestaña Contratos. ¿Continuar?"
      confirmLabel="Aprobar expediente"
      isLoading={loading}
    />
    </>
  )
}
