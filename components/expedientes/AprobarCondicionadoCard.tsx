/**
 * AprobarCondicionadoCard — visible para propietario/inmobiliaria/admin/operador
 * cuando el expediente está en 'condicionado'.
 *
 * Adenda 2 §5: la revisión manual la resuelve SOLO un analista de Cofianza
 * (admin/operador), que es quien ve "Aprobar estudio". El dueño ve el estado y
 * puede aportar: pedir soportes al solicitante o sumar un co-arrendatario.
 * Al aprobar, el expediente pasa a 'aprobado' (SIN generar contrato aquí) y el
 * contrato se genera luego desde la pestaña Contratos con el formulario
 * completo (modalidad de fianza + servicios públicos / quién paga).
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { expedienteService } from '@/services/expedienteService'
import { SoportesCondicionadoSection } from './SoportesCondicionadoSection'
import { DocumentosConsultados } from './DocumentosConsultados'

interface AprobarCondicionadoCardProps {
  expedienteId: string
  expedienteEstado: string
  userRol?: string
  /** Condicionado porque el buró no tenía datos (sin score), no por riesgo medio. */
  sinInfoBuro?: boolean
  onAprobado?: () => void
}

export function AprobarCondicionadoCard({
  expedienteId,
  expedienteEstado,
  userRol,
  sinInfoBuro,
  onAprobado,
}: AprobarCondicionadoCardProps) {
  const [loading, setLoading] = useState(false)
  const [enviandoEnlace, setEnviandoEnlace] = useState(false)
  const [confirmAprobarOpen, setConfirmAprobarOpen] = useState(false)
  // Adenda 2 §5.1: fundamento escrito y documentos consultados de la decisión.
  const [fundamento, setFundamento] = useState('')
  const [documentos, setDocumentos] = useState<string[]>([])

  const esCofianza = userRol === 'administrador' || userRol === 'operador_analista'
  const esDueno = userRol === 'propietario' || userRol === 'inmobiliaria'

  if (expedienteEstado !== 'condicionado' || !(esCofianza || esDueno)) return null

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
      await expedienteService.aprobarCondicionado(expedienteId, {
        fundamento: fundamento.trim(),
        documentos_consultados: documentos,
      })
      setConfirmAprobarOpen(false)
      toast.success('Estudio aprobado. Genera el contrato en la pestaña Contratos (ahí defines la modalidad de fianza y quién paga los servicios).')
      onAprobado?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo aprobar el estudio.'
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
          <h3 className="text-base font-semibold text-gray-900 mb-0.5">
            {esCofianza ? 'Estudio condicionado — decisión pendiente' : 'Estudio condicionado — en revisión por Cofianza'}
          </h3>
          {!esCofianza ? (
            <p className="text-sm text-gray-700 mb-3">
              {sinInfoBuro
                ? 'El buró no tiene información crediticia de esta persona (no es un rechazo). '
                : 'Riesgo medio. '}
              Un analista de Cofianza revisa el caso y decide. Mientras tanto puedes{' '}
              {sinInfoBuro && <><strong>consultar el otro buró</strong>, </>}
              <strong>pedir soportes</strong> al solicitante o <strong>sumar un co-arrendatario</strong> (abajo).
            </p>
          ) : sinInfoBuro ? (
            <p className="text-sm text-gray-700 mb-3">
              El buró no tiene información crediticia de esta persona: no es un rechazo, pero tampoco hay score
              para medir el riesgo. Puedes <strong>consultar el otro buró</strong>, <strong>pedir soportes</strong> al
              solicitante, <strong>sumar un co-arrendatario</strong> (abajo) o <strong>aprobar</strong> con lo que
              tienes (generas el contrato en la pestaña <strong>Contratos</strong>).
            </p>
          ) : (
            <p className="text-sm text-gray-700 mb-3">
              Condicionado = riesgo medio: Cofianza puede respaldar el arriendo, pero conviene reforzar el perfil.
              Tienes tres salidas: <strong>aprobar</strong> (pasa a Aprobado y generas el contrato en la pestaña
              <strong> Contratos</strong>), <strong>pedir soportes</strong> al solicitante, o{' '}
              <strong>sumar un co-arrendatario</strong> (abajo).
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {esCofianza && (
              <button
                onClick={() => setConfirmAprobarOpen(true)}
                disabled={loading || enviandoEnlace}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {loading ? 'Aprobando…' : 'Aprobar estudio'}
                {!loading && (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                )}
              </button>
            )}
            <button
              onClick={handleEnviarEnlace}
              disabled={loading || enviandoEnlace}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {enviandoEnlace ? 'Enviando…' : 'Enviar enlace al solicitante para cargar documentos'}
            </button>
          </div>

          {/* Documentos que el solicitante subió por el enlace. Sin esto, el
              gestor podía enviar el enlace pero no ver el resultado: los
              soportes solo se listaban dentro de la sección de re-evaluación
              del modal de detalle, que está gateada a admin/operador.
              `permitirSubir=false`: aquí el gestor revisa y descarga, quien
              carga es el solicitante desde su enlace público. */}
          <div className="mt-4 border-t border-amber-200 pt-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">
              Documentos de soporte del solicitante
            </p>
            <SoportesCondicionadoSection expedienteId={expedienteId} permitirSubir={false} />
          </div>
        </div>
      </div>
    </div>

    <Modal
      isOpen={confirmAprobarOpen}
      onClose={() => { if (!loading) setConfirmAprobarOpen(false) }}
      title="Aprobar estudio en revisión manual"
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          El estudio pasará a Aprobado y podrás generar el contrato desde la pestaña Contratos. Tu decisión queda
          registrada con tu usuario, la fecha, el fundamento y los documentos que consultaste.
        </p>
        <div>
          <label htmlFor="fundamento-revision" className="block text-sm font-medium text-gray-700 mb-1">
            Fundamento de la decisión <span className="text-red-500">*</span>
          </label>
          <textarea
            id="fundamento-revision"
            value={fundamento}
            onChange={(e) => setFundamento(e.target.value)}
            rows={3}
            disabled={loading}
            placeholder="Por qué apruebas este caso (mínimo 10 caracteres)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
          />
        </div>
        <DocumentosConsultados expedienteId={expedienteId} value={documentos} onChange={setDocumentos} disabled={loading} />
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setConfirmAprobarOpen(false)}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => { void handleAprobar() }}
            disabled={loading || fundamento.trim().length < 10}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Aprobando…' : 'Aprobar estudio'}
          </button>
        </div>
      </div>
    </Modal>
    </>
  )
}
