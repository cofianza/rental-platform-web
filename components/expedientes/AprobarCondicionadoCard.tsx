/**
 * AprobarCondicionadoCard — la guía de "qué sigue" de un estudio condicionado,
 * al tope del resumen para propietario/inmobiliaria/admin/operador.
 *
 * Adenda 2 §5: la revisión manual la resuelve SOLO un analista de Cofianza
 * (admin/operador), que es quien ve "Aprobar estudio". Mientras tanto el dueño
 * puede reforzar el caso: pedir soportes al solicitante, consultar el otro buró
 * (solo si el primero no tenía información) o sumar un co-arrendatario (su
 * tarjeta va justo debajo). Cada salida dice qué pasa después:
 *  - otro buró con información → su resultado pasa a la revisión del analista
 *    (un «aprobado» no aprueba solo, P33); un rechazo sí mueve el expediente;
 *  - co-arrendatario → su resultado pasa a la revisión del analista, salvo una
 *    regla dura suya, que no lo deja aprobar (ponderacion.ts del API).
 * Al aprobar, el expediente pasa a 'aprobado' (SIN generar contrato aquí): el
 * contrato se crea después desde el estudio.
 */

'use client'

import { useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { IconShieldCheck } from '@/components/icons'
import { expedienteService } from '@/services/expedienteService'
import type { IEstudio } from '@/types/estudio'
import { SoportesCondicionadoSection } from './SoportesCondicionadoSection'
import { DocumentosConsultados } from './DocumentosConsultados'
import { EvaluacionRevisionManual, evaluacionCompleta, type EvaluacionParcial } from './EvaluacionRevisionManual'
import { ReintentarEstudioForm } from './ReintentarEstudioForm'

interface AprobarCondicionadoCardProps {
  expedienteId: string
  expedienteEstado: string
  userRol?: string
  /** Condicionado porque el buró no tenía datos (sin score), no por riesgo medio. */
  sinInfoBuro?: boolean
  /** Estudio del titular: con él se ofrece consultar el otro buró aquí mismo. */
  estudioTitular?: IEstudio | null
  /** Documento del titular, para prellenar la consulta al otro buró. */
  persona?: { nombre?: string | null; apellido?: string | null; tipo_documento?: string | null; numero_documento?: string | null } | null
  onAprobado?: () => void
  /** Tras disparar la consulta al otro buró. */
  onReconsultado?: () => void
}

export function AprobarCondicionadoCard({
  expedienteId,
  expedienteEstado,
  userRol,
  sinInfoBuro,
  estudioTitular,
  persona,
  onAprobado,
  onReconsultado,
}: AprobarCondicionadoCardProps) {
  const [loading, setLoading] = useState(false)
  const aprobando = useRef(false)
  const [enviandoEnlace, setEnviandoEnlace] = useState(false)
  const [confirmAprobarOpen, setConfirmAprobarOpen] = useState(false)
  const [otroBuroAbierto, setOtroBuroAbierto] = useState(false)
  // Adenda 2 §5.1: fundamento escrito y documentos consultados de la decisión.
  const [fundamento, setFundamento] = useState('')
  const [documentos, setDocumentos] = useState<string[]>([])
  // Adenda 2 §4.3: V7 y V9 con los que se recalcula el puntaje.
  const [evaluacion, setEvaluacion] = useState<EvaluacionParcial>({})

  const esCofianza = userRol === 'administrador' || userRol === 'operador_analista'
  const esDueno = userRol === 'propietario' || userRol === 'inmobiliaria'

  if (expedienteEstado !== 'condicionado' || !(esCofianza || esDueno)) return null

  const handleEnviarEnlace = async () => {
    setEnviandoEnlace(true)
    try {
      const res = await expedienteService.enviarEnlaceDocumentos(expedienteId)
      toast.success(`Enlace de carga enviado al solicitante (${res.email_destino}). El anterior ya no sirve.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar el enlace.')
    } finally {
      setEnviandoEnlace(false)
    }
  }

  const handleAprobar = async () => {
    // Doble clic: el segundo llega antes de que se pinte «Aprobando…».
    if (aprobando.current || !evaluacionCompleta(evaluacion)) return
    aprobando.current = true
    setLoading(true)
    try {
      // Sin datos de contrato: solo aprueba. El contrato se crea después desde el estudio.
      const res = await expedienteService.aprobarCondicionado(expedienteId, {
        fundamento: fundamento.trim(),
        documentos_consultados: documentos,
        evaluacion,
      })
      setConfirmAprobarOpen(false)
      const p = res.puntaje_revision_manual
      toast.success(
        `Estudio aprobado.${p?.puntaje_normalizado != null ? ` Puntaje recalculado: ${p.puntaje_normalizado} (sobre ${p.denominador} puntos).` : ''} Ya se puede crear el contrato desde el estudio.`,
      )
      onAprobado?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo aprobar el estudio.'
      toast.error(msg)
    } finally {
      aprobando.current = false
      setLoading(false)
    }
  }

  // Solo si el primer buró no tenía información (el API solo deja cambiar de buró en ese caso).
  const ofreceOtroBuro = !!sinInfoBuro && !!estudioTitular

  return (
    <>
    <div className="border-2 border-amber-300 bg-amber-50/60 rounded-lg p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <IconShieldCheck size={20} className="text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 mb-0.5">Estudio condicionado: qué sigue</h3>
          <p className="text-sm text-gray-700">
            {sinInfoBuro
              ? 'El buró no tiene información crediticia de esta persona. No es un rechazo: falta información para medir el riesgo.'
              : 'El buró sí evaluó a esta persona y el riesgo salió medio. No es un rechazo.'}
          </p>

          <ol className="mt-4 space-y-4">
            <Paso n={1} titulo={esCofianza ? 'Decides tú, como analista de Cofianza' : 'Lo decide un analista de Cofianza'}>
              {esCofianza ? (
                <>
                  <p>
                    Revisa el caso, los soportes y el co-arrendatario si lo hay. Si lo apruebas, el estudio pasa a
                    Aprobado y se puede crear el contrato. Para no aprobarlo, usa «Cambiar estado», arriba.
                  </p>
                  <button
                    onClick={() => setConfirmAprobarOpen(true)}
                    disabled={loading || enviandoEnlace}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {loading ? 'Aprobando…' : 'Aprobar estudio'}
                  </button>
                </>
              ) : (
                <p>
                  Revisa el caso y lo aprueba o no. No tienes que hacer nada para que avance: te avisamos por
                  notificación y correo cuando decida.
                </p>
              )}
            </Paso>

            <Paso
              n={2}
              titulo={esCofianza ? 'La inmobiliaria o el propietario pueden reforzar el caso' : 'Mientras tanto, puedes reforzar el caso (opcional)'}
            >
              <ul className="space-y-3">
                <Opcion titulo="Pedir soportes al solicitante">
                  <p>
                    Le llega un enlace para cargar documentos (certificado laboral, extractos, etc.). Aparecen aquí y
                    el analista los tiene en cuenta. Cada envío genera un enlace nuevo: el anterior deja de servir.
                  </p>
                  <button
                    onClick={handleEnviarEnlace}
                    disabled={loading || enviandoEnlace}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {enviandoEnlace ? 'Enviando…' : 'Enviar enlace al solicitante'}
                  </button>
                  {/* Lo que el solicitante subió por el enlace: aquí el gestor revisa y
                      descarga; quien carga es el solicitante (permitirSubir=false). */}
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Documentos de soporte del solicitante</p>
                    <SoportesCondicionadoSection expedienteId={expedienteId} permitirSubir={false} />
                  </div>
                </Opcion>

                {ofreceOtroBuro && (
                  <Opcion titulo="Consultar el otro buró">
                    <p>
                      Si el otro buró sí tiene información, su resultado pasa al analista de Cofianza, que decide
                      el caso (si sale no aprobable, el estudio queda no aprobable). Es una consulta nueva y se factura.
                    </p>
                    {otroBuroAbierto ? (
                      <div className="mt-2">
                        <ReintentarEstudioForm
                          key={`${estudioTitular!.id}:${estudioTitular!.proveedor}`}
                          estudioId={estudioTitular!.id}
                          proveedorActual={estudioTitular!.proveedor}
                          persona={persona}
                          esTitular
                          expedienteId={expedienteId}
                          esReconsulta
                          onRetried={onReconsultado}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => setOtroBuroAbierto(true)}
                        className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Consultar el otro buró
                      </button>
                    )}
                  </Opcion>
                )}

                <Opcion titulo="Sumar un co-arrendatario (en el recuadro de abajo)">
                  <p>
                    Es la persona con quien vivirá el solicitante: se le hace su propia evaluación y el analista decide con
                    los dos resultados. Si el co-arrendatario tiene un impedimento que no admite excepciones (por
                    ejemplo, aparecer en listas restrictivas), el estudio queda no aprobable.
                  </p>
                </Opcion>
              </ul>
            </Paso>

            <Paso n={3} titulo="Cuando se decida">
              <p>
                <strong>Aprobado:</strong> se crea el contrato desde este estudio.{' '}
                <strong>No aprobable:</strong> no se puede hacer contrato con este solicitante para este inmueble.
              </p>
            </Paso>
          </ol>
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
          El estudio pasará a Aprobado y se podrá crear el contrato desde el estudio. Tu decisión queda
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
        <EvaluacionRevisionManual value={evaluacion} onChange={setEvaluacion} disabled={loading} />
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
            disabled={loading || fundamento.trim().length < 10 || !evaluacionCompleta(evaluacion)}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50"
          >
            {loading ? 'Aprobando…' : 'Aprobar estudio'}
          </button>
        </div>
      </div>
    </Modal>
    </>
  )
}

function Paso({ n, titulo, children }: { n: number; titulo: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-900"
      >
        {n}
      </span>
      <div className="min-w-0 flex-1 text-sm text-gray-700">
        <p className="font-semibold text-gray-900 mb-1">{titulo}</p>
        {children}
      </div>
    </li>
  )
}

function Opcion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <li className="rounded-lg border border-amber-200 bg-white/70 p-3">
      <p className="font-medium text-gray-900 mb-0.5">{titulo}</p>
      <div className="text-sm text-gray-700">{children}</div>
    </li>
  )
}
