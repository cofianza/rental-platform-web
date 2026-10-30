/**
 * AprobarCondicionadoCard — la guía de "qué sigue" de un estudio condicionado,
 * al tope del resumen para propietario/inmobiliaria/admin/operador.
 *
 * Adenda 2 §5: la revisión manual la resuelve SOLO un analista de Cofianza
 * (admin/operador), que es quien ve "Aprobar estudio". Mientras tanto el dueño
 * puede reforzar el caso: pedir soportes al solicitante o sumar un
 * coarrendatario (su tarjeta va justo debajo). La central no se elige ni se
 * re-consulta a mano (CORR §2): la decide la cascada del motor. Única
 * excepción, Política §14 caso L: si ninguna central respondió, el analista
 * puede volver a ejecutar la misma consulta.
 *  - coarrendatario → su resultado pasa a la revisión del analista, salvo una
 *    regla dura suya, que no lo deja aprobar (ponderacion.ts del API).
 * Al aprobar, el expediente pasa a 'aprobado' (SIN generar contrato aquí): el
 * contrato se crea después desde el estudio.
 * Canal del propietario directo (inmueble sin inmobiliaria, Decisión 4): no hay
 * coarrendatario hasta el Convenio, así que no se ofrece y, sin historial en
 * ninguna central (Política §15, que lo exige), el caso no puede aprobarse:
 * se cierra con motivo.
 * Adenda 3 §6 (cuarto desenlace): con `condicion` el caso NO está en revisión
 * del analista: falta el coarrendatario con el puntaje mínimo. La API responde
 * 409 a aprobar a mano y a pedir soportes, así que esos botones no se ofrecen.
 */

'use client'

import { AYUDA } from '@/lib/ayudaEstudio'
import { InfoTip } from '@/components/ui/InfoTip'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IngresoVerificadoSection } from './IngresoVerificadoSection'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { IconShieldCheck, IconAlertTriangle } from '@/components/icons'
import { expedienteService } from '@/services/expedienteService'
import { estudioService } from '@/services/estudioService'
import type { ICondicionCoarrendatario, IMotivosElegidos } from '@/types/estudio'
import { seCierraSiVence, textoCondicionCoarrendatario } from './textoVisible'
import { useMotivosDecision } from '@/hooks/useMotivosDecision'
import { CargandoMotivos, SelectorMotivos, errorMotivos, motivosParaEnviar } from './SelectorMotivos'
import { SoportesCondicionadoSection } from './SoportesCondicionadoSection'
import { DocumentosConsultados } from './DocumentosConsultados'
import { EvaluacionRevisionManual, evaluacionCompleta, type EvaluacionParcial } from './EvaluacionRevisionManual'
import { CondicionAdicional } from './CondicionAdicional'

interface AprobarCondicionadoCardProps {
  expedienteId: string
  expedienteEstado: string
  userRol?: string
  /** Condicionado porque el buró no tenía datos (sin score), no por riesgo medio. */
  sinInfoBuro?: boolean
  /** Política §14 caso L: id del estudio del titular si ninguna central respondió. */
  estudioSinCentrales?: string | null
  /** Inmueble sin inmobiliaria: el coarrendatario no existe en este canal (Decisión 4). */
  canalPropietario?: boolean
  /** Adenda 3 §6: aprobado con condición de presentar un coarrendatario. */
  condicion?: ICondicionCoarrendatario | null
  onAprobado?: () => void
}

export function AprobarCondicionadoCard({
  expedienteId,
  expedienteEstado,
  userRol,
  sinInfoBuro,
  estudioSinCentrales,
  canalPropietario,
  condicion,
  onAprobado,
}: AprobarCondicionadoCardProps) {
  const [loading, setLoading] = useState(false)
  const [reconsultando, setReconsultando] = useState(false)
  const aprobando = useRef(false)
  const [enviandoEnlace, setEnviandoEnlace] = useState(false)
  const [recordando, setRecordando] = useState(false)
  const [confirmAprobarOpen, setConfirmAprobarOpen] = useState(false)
  // Adenda 2 §5.1: fundamento escrito y documentos consultados de la decisión.
  const [fundamento, setFundamento] = useState('')
  // H58: con el catálogo del API, el motivo se elige de la lista (+ texto opcional).
  const { catalogo, cargando: cargandoMotivos } = useMotivosDecision(userRol === 'administrador' || userRol === 'operador_analista')
  const [motivos, setMotivos] = useState<IMotivosElegidos>({ motivos: [] })
  // B14: sin catálogo todavía no se decide el modo (lista o texto).
  const motivoListo = cargandoMotivos ? false : catalogo ? !errorMotivos('aprobar', motivos, catalogo) : fundamento.trim().length >= 10
  const [documentos, setDocumentos] = useState<string[]>([])
  // Adenda 2 §4.3: V7 y V9 con los que se recalcula el puntaje.
  const [evaluacion, setEvaluacion] = useState<EvaluacionParcial>({})
  // Política §15 (sin historial en ninguna central): fuente de capacidad verificada.
  const [fuenteCapacidad, setFuenteCapacidad] = useState(false)
  const [condicionAdicional, setCondicionAdicional] = useState(false)

  const esCofianza = userRol === 'administrador' || userRol === 'operador_analista'
  // Lo que impide aprobar ahora (p. ej. Política §15 sin el coarrendatario de 80):
  // se dice antes del formulario, no al final después de llenarlo.
  const [bloqueo, setBloqueo] = useState<{ codigo: string; motivo: string } | null>(null)
  // Sube al registrar un ingreso verificado: el bloqueo se vuelve a pedir.
  const [versionBloqueo, setVersionBloqueo] = useState(0)
  useEffect(() => {
    if (!esCofianza || expedienteEstado !== 'condicionado' || condicion) return
    let cancel = false
    expedienteService.bloqueoAprobacion(expedienteId).then(
      (b) => { if (!cancel) setBloqueo(b) },
      () => {},
    )
    return () => { cancel = true }
  }, [esCofianza, expedienteEstado, condicion, expedienteId, versionBloqueo])
  const esDueno = userRol === 'propietario' || userRol === 'inmobiliaria'

  if (expedienteEstado !== 'condicionado' || !(esCofianza || esDueno)) return null

  if (condicion) {
    // Sin un coarrendatario que la resuelva (al vencer o porque el evaluado no
    // alcanza: solo se admite uno), ¿se cierra como no aprobado? (API vencidaSeRechaza)
    const seCierra = seCierraSiVence(condicion)
    return (
      <div className="border-2 border-amber-300 bg-amber-50/60 rounded-lg p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <IconShieldCheck size={20} className="text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="mb-0.5 inline-flex items-center gap-1 text-base font-semibold text-gray-900">
              {condicion.obligatoria ? 'Requiere coarrendatario: qué sigue' : 'Aprobado con condición: qué sigue'}
              <InfoTip texto={AYUDA.condicionado} lado="derecha" />
            </h3>
            <p className="text-sm text-gray-700">{textoCondicionCoarrendatario(condicion)}</p>
            {!condicion.vencida && (
              <ol className="mt-4 space-y-4">
                <Paso n={1} titulo={esCofianza ? 'La inmobiliaria o el prospecto invitan al coarrendatario' : 'Invite al coarrendatario (en el recuadro de abajo)'}>
                  <p>
                    Es la persona con quien vivirá el solicitante. No necesita finca raíz: basta con que tenga ingresos
                    propios. Se le hace su propia evaluación, y el enlace de su invitación vence con la condición.
                  </p>
                </Paso>
                <Paso n={2} titulo="Cuando el coarrendatario termine su evaluación">
                  <p>
                    {condicion.decide_analista && !condicion.obligatoria && !seCierra
                      ? 'Si califica, un analista de Cofianza decide el estudio con los dos. Si no califica, no suma nada y el estudio pasa a revisión de un analista de Cofianza.'
                      : condicion.obligatoria
                      ? 'Si califica, un analista de Cofianza decide el estudio con los dos. Si no califica, el estudio se cierra como no aprobado: solo se admite un coarrendatario, así que invite a quien tenga ingresos propios suficientes.'
                      : seCierra
                        ? 'Si califica y entre los dos se cumple el ingreso, el estudio queda aprobado (o lo decide un analista si hay algo por revisar). Si no califica, o con él no alcanza el ingreso, el estudio se cierra como no aprobado: solo se admite un coarrendatario, así que invite a quien tenga ingresos propios suficientes.'
                        : 'Si califica, mejora el puntaje del estudio y su ingreso se suma al del solicitante. Con eso, si el estudio cumple y no hay nada por revisar, queda aprobado sin pasar por un analista; si no, lo decide un analista de Cofianza. Si no califica, no suma nada y el estudio pasa a revisión de un analista de Cofianza.'}
                  </p>
                </Paso>
                <Paso n={3} titulo="Si vence el plazo">
                  <p>
                    {seCierra
                      ? 'Sin un coarrendatario que cumpla, el estudio se cierra como no aprobado, sin repetir la consulta a las centrales.'
                      : 'El estudio pasa a revisión de un analista de Cofianza, sin repetir la consulta a las centrales.'}
                  </p>
                </Paso>
              </ol>
            )}
            <p className="mt-4 text-xs text-gray-600">
              Mientras la condición esté vigente no se puede aprobar el estudio a mano, pedir soportes al solicitante ni
              reasignarlo a otra propiedad: lo que falta es el coarrendatario.
              {esCofianza && ' Para no aprobarlo, use «Cambiar estado», arriba.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

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

  const handleRecordar = async () => {
    setRecordando(true)
    try {
      const res = await expedienteService.recordarAnalista(expedienteId)
      toast.success(res.enviado_a === 1 ? 'Recordatorio enviado al analista asignado.' : 'Recordatorio enviado a los analistas de Cofianza.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar el recordatorio.')
    } finally {
      setRecordando(false)
    }
  }

  // Caso L: misma cascada, DataCrédito primaria; nadie elige la central (CORR §2).
  const handleReconsultar = async () => {
    if (!estudioSinCentrales || reconsultando) return
    setReconsultando(true)
    try {
      await estudioService.ejecutarEstudio(estudioSinCentrales)
      toast.success('Consultando de nuevo las centrales. El resultado aparecerá en el estudio en unos minutos.')
      onAprobado?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo volver a consultar las centrales.')
    } finally {
      setReconsultando(false)
    }
  }

  const handleAprobar = async () => {
    // Doble clic: el segundo llega antes de que se pinte «Aprobando…».
    if (aprobando.current || !evaluacionCompleta(evaluacion) || !motivoListo) return
    aprobando.current = true
    setLoading(true)
    try {
      // Sin datos de contrato: solo aprueba. El contrato se crea después desde el estudio.
      const res = await expedienteService.aprobarCondicionado(expedienteId, {
        ...(catalogo ? motivosParaEnviar('aprobar', motivos, catalogo) : { fundamento: fundamento.trim() }),
        documentos_consultados: documentos,
        evaluacion,
        ...(sinInfoBuro ? { fuente_capacidad_verificada: fuenteCapacidad } : {}),
        ...(condicionAdicional ? { condicion_adicional: true } : {}),
      })
      setConfirmAprobarOpen(false)
      // El puntaje del modelo es interno: solo se le muestra a Cofianza, en
      // escala de 0 a 100 y con coma decimal.
      const p = res.puntaje_revision_manual
      const puntaje =
        esCofianza && p?.puntaje_normalizado != null
          ? ` Puntaje de la revisión: ${p.puntaje_normalizado.toLocaleString('es-CO', { maximumFractionDigits: 1 })} de 100.`
          : ''
      toast.success(`Estudio aprobado. Ya puede crear el contrato.${puntaje}`)
      onAprobado?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo aprobar el estudio.'
      toast.error(msg)
    } finally {
      aprobando.current = false
      setLoading(false)
    }
  }

  // §15 exige coarrendatario al que no tiene historial, y en este canal no lo hay.
  const sinSalidaAprobable = !!canalPropietario && !!sinInfoBuro

  return (
    <>
    <div className="border-2 border-amber-300 bg-amber-50/60 rounded-lg p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <IconShieldCheck size={20} className="text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="mb-0.5 inline-flex items-center gap-1 text-base font-semibold text-gray-900">
            Estudio condicionado: qué sigue
            <InfoTip texto={AYUDA.condicionado} lado="derecha" />
          </h3>
          <p className="text-sm text-gray-700">
            {estudioSinCentrales
              ? 'Ninguna central de riesgo respondió cuando se consultó. No es un rechazo: falta la respuesta de las centrales.'
              : sinInfoBuro
                ? 'Las centrales de riesgo no tienen historial de esta persona. No es un rechazo: falta información para medir el riesgo.'
                : 'La central sí evaluó a esta persona; el motivo de la revisión está en «Evaluación crediticia», aquí abajo. No es un rechazo.'}
          </p>
          {estudioSinCentrales && esCofianza && (
            <button
              onClick={handleReconsultar}
              disabled={reconsultando || loading}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-amber-800 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
            >
              {reconsultando ? 'Consultando…' : 'Volver a consultar las centrales'}
            </button>
          )}

          <ol className="mt-4 space-y-4">
            <Paso n={1} titulo={esCofianza ? 'Usted decide, como analista de Cofianza' : 'Lo decide un analista de Cofianza'}>
              {sinSalidaAprobable ? (
                <p>
                  Sin historial en ninguna central, solo se puede aprobar con un coarrendatario, y en
                  inmuebles sin inmobiliaria esa opción todavía no existe (llega con el Convenio). Por eso el caso no
                  puede aprobarse y se cierra con el motivo
                  {esCofianza
                    ? ': use «Cambiar estado», arriba.'
                    : '. Lo cierra un analista de Cofianza y le avisamos por notificación y correo.'}
                </p>
              ) : esCofianza ? (
                <>
                  <p>
                    Revise el caso, los soportes y el coarrendatario si lo hay. Si lo aprueba, el estudio pasa a
                    Aprobado y se puede crear el contrato. Para no aprobarlo, use «Cambiar estado», arriba.
                  </p>
                  {/* Si con el ingreso el estudio quedó no aprobado, se recarga (onAprobado recarga el estudio). */}
                  <IngresoVerificadoSection
                    expedienteId={expedienteId}
                    onRegistrado={(rechazado) => (rechazado ? onAprobado?.() : setVersionBloqueo((n) => n + 1))}
                  />
                  {bloqueo && (
                    <div role="status" className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold">Todavía no se puede aprobar</p>
                        <p>{bloqueo.motivo}</p>
                        <p className="mt-1 text-red-700">Puede dejarlo en espera o pasarlo a «No aprobable» con «Cambiar estado».</p>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setConfirmAprobarOpen(true)}
                    disabled={loading || enviandoEnlace || !!bloqueo}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {loading ? 'Aprobando…' : 'Aprobar estudio'}
                  </button>
                  {/* Solo el administrador: le recuerda al analista (uno cada 2 horas). */}
                  {userRol === 'administrador' && (
                    <button
                      onClick={handleRecordar}
                      disabled={recordando}
                      className="mt-2 ml-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-white border border-primary-300 rounded-lg hover:bg-primary-50 disabled:opacity-50 transition-colors"
                    >
                      {recordando ? 'Enviando…' : 'Enviar recordatorio al analista'}
                    </button>
                  )}
                </>
              ) : (
                <p>
                  Revisa el caso y lo aprueba o no. No tiene que hacer nada para que avance: le avisamos por
                  notificación y correo cuando decida.
                </p>
              )}
            </Paso>

            <Paso
              n={2}
              titulo={esCofianza ? 'La inmobiliaria o el propietario pueden reforzar el caso' : 'Mientras tanto, puede reforzar el caso (opcional)'}
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

                {!canalPropietario && (
                  <Opcion titulo="Sumar un coarrendatario (en el recuadro de abajo)">
                    <p>
                      Es la persona con quien vivirá el solicitante: se le hace su propia evaluación y el analista decide con
                      los dos resultados. Si el coarrendatario tiene un impedimento que no admite excepciones (por
                      ejemplo, aparecer en listas restrictivas), el estudio queda no aprobable.
                    </p>
                  </Opcion>
                )}
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
          El estudio pasará a Aprobado y se podrá crear el contrato desde el estudio. Su decisión queda
          registrada con su usuario, la fecha, el fundamento y los documentos que consultó.
        </p>
        {cargandoMotivos ? (
          <CargandoMotivos />
        ) : catalogo ? (
          <SelectorMotivos tipo="aprobar" catalogo={catalogo} value={motivos} onChange={setMotivos} disabled={loading} />
        ) : (
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
            placeholder="Por qué aprueba este caso (mínimo 10 caracteres)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
          />
        </div>
        )}
        <DocumentosConsultados expedienteId={expedienteId} value={documentos} onChange={setDocumentos} disabled={loading} />
        <EvaluacionRevisionManual value={evaluacion} onChange={setEvaluacion} disabled={loading} />
        <CondicionAdicional checked={condicionAdicional} onChange={setCondicionAdicional} disabled={loading} />
        {sinInfoBuro && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-gray-700">
            <p>
              <strong>Sin historial en ninguna central:</strong> para aprobarlo se exige un coarrendatario
              evaluado con puntaje de 80 o más, que el canon no pase del 30 % del ingreso y al menos una fuente de
              capacidad de pago verificable.
            </p>
            <label className="mt-2 flex items-start gap-2">
              <input
                type="checkbox"
                checked={fuenteCapacidad}
                onChange={(e) => setFuenteCapacidad(e.target.checked)}
                disabled={loading}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>
                Verifiqué al menos una fuente de capacidad de pago del solicitante (certificado laboral, extractos
                bancarios, declaración de renta u otra).
              </span>
            </label>
          </div>
        )}
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
            disabled={loading || !motivoListo || !evaluacionCompleta(evaluacion)}
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
