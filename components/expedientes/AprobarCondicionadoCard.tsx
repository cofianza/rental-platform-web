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
 * Adenda 5 §7: si la mora vigente de bajo monto llevó el caso a revisión (tramo
 * 'revision'), el analista ve las obligaciones en mora y puede aprobar o
 * aprobar sujeto a paz y salvo. Con el paz y salvo pendiente el caso espera al
 * candidato (PazYSalvoPendiente), como con la condición de coarrendatario.
 */

'use client'

import { AYUDA } from '@/lib/ayudaEstudio'
import { InfoTip } from '@/components/ui/InfoTip'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IngresoVerificadoSection } from './IngresoVerificadoSection'
import { PazYSalvoPendiente } from './PazYSalvoPendiente'
import { ObligacionesEnMora } from './ObligacionesEnMora'
import { useMoraVigente } from '@/hooks/useMoraVigente'
import { pazYSalvoDeMoraVigente, pazYSalvoPendiente, pesosA5, razonMoraPct, textoPct, TRAMO_A5, venceSiSeExigeHoy } from '@/lib/pazYSalvo'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { IconShieldCheck, IconAlertTriangle, IconCheck } from '@/components/icons'
import { expedienteService } from '@/services/expedienteService'
import { ApiClientError } from '@/lib/api'
import { estudioService } from '@/services/estudioService'
import type { ICondicionCoarrendatario, IMotivosElegidos, IPazYSalvo, TramoAdenda5 } from '@/types/estudio'
import { fechaCondicion, seCierraSiVence, textoCondicionCoarrendatario, textoVisible } from './textoVisible'
import { useMotivosAprobacion } from '@/hooks/useMotivosAprobacion'
import { useMotivosDecision } from '@/hooks/useMotivosDecision'
import { CargandoMotivos, SelectorMotivos, errorMotivos, errorMotivosAprobacion, motivosParaEnviar } from './SelectorMotivos'
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
  /** Una central no respondió y la otra respondió sin puntaje (no es el caso L completo). */
  reconsultaParcial?: boolean
  /** Inmueble sin inmobiliaria: el coarrendatario no existe en este canal (Decisión 4). */
  canalPropietario?: boolean
  /** Adenda 3 §6: aprobado con condición de presentar un coarrendatario. */
  condicion?: ICondicionCoarrendatario | null
  /** Observaciones del motor en la evaluación del titular: por qué llegó a revisión. */
  motivoRevision?: string | null
  /** Estudio sin propiedad: al aprobar no hay dueño a quien avisar y el contrato espera el inmueble. */
  sinInmueble?: boolean
  /** Adenda 5 §7: aprobado sujeto a paz y salvo (el del estudio del titular; sin detalle para externos). */
  pazYSalvo?: IPazYSalvo | null
  /**
   * Adenda 5 §4: tramo de la escalera del titular (estudio.adenda5_tramo; solo
   * llega a Cofianza). Sin él (ADENDA5 apagada o sin mora) no se pide GET
   * mora-vigente y la tarjeta queda como antes.
   */
  adenda5Tramo?: TramoAdenda5 | null
  onAprobado?: () => void
}

export function AprobarCondicionadoCard({
  expedienteId,
  expedienteEstado,
  userRol,
  sinInfoBuro,
  estudioSinCentrales,
  reconsultaParcial,
  canalPropietario,
  condicion,
  motivoRevision,
  sinInmueble,
  pazYSalvo,
  adenda5Tramo,
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
  // La foto no coincidió o no se pudo verificar: la API pide una nota de identidad.
  // Se descubre con su respuesta (NOTA_IDENTIDAD_REQUERIDA); desde ahí se exige aquí.
  const [pideNotaIdentidad, setPideNotaIdentidad] = useState(false)
  const [notaIdentidad, setNotaIdentidad] = useState('')
  const faltaNotaIdentidad = pideNotaIdentidad && notaIdentidad.trim().length < 10
  // Adenda 2 §4.3: V7 y V9 con los que se recalcula el puntaje.
  const [evaluacion, setEvaluacion] = useState<EvaluacionParcial>({})
  // Los motivos que el estudio contradice no se pueden registrar (la API da 400).
  const { noAplican, error: errorMotivosLectura, reintentar: reintentarMotivos } = useMotivosAprobacion(expedienteId, userRol === 'administrador' || userRol === 'operador_analista')
  // Lo que el propio formulario ya sabe que no aplica, dicho en el motivo (no al final):
  // sin documentos cargados no hay ingreso que verificar (A1), y sin referencia
  // positiva elegida abajo no hay referencia de arrendamiento (A3).
  const [docsCargados, setDocsCargados] = useState<number | null>(null)
  const noAplicanTodos: Record<string, string> = {
    ...noAplican,
    ...(docsCargados === 0 && !noAplican.A1
      ? { A1: 'Este estudio no tiene documentos de ingreso cargados. Pídalos con «Enviar enlace al solicitante» o elija otro motivo.' }
      : {}),
    ...(evaluacion.arrendamiento_previo && evaluacion.arrendamiento_previo !== 'referencia_positiva' && !noAplican.A3
      ? { A3: 'En «Historial de arrendamiento verificado» eligió una opción sin referencia positiva.' }
      : {}),
  }
  const errorFundamento = errorMotivosAprobacion(motivos.motivos, noAplicanTodos, documentos, evaluacion.arrendamiento_previo)
  // Política §15 (sin historial en ninguna central): fuente de capacidad verificada.
  const [fuenteCapacidad, setFuenteCapacidad] = useState(false)
  const [condicionAdicional, setCondicionAdicional] = useState(false)

  const esCofianza = userRol === 'administrador' || userRol === 'operador_analista'
  // Adenda 5: la escalera de mora vigente y el paz y salvo. El detalle (acreedor,
  // saldo, razón, tramo) solo lo lee Cofianza (§10); los demás ven el plazo.
  // Solo se pide con el titular en el tramo de revisión: con ADENDA5 apagada
  // (o sin mora) no hay petición nueva ni aviso de error posible.
  const [versionA5, setVersionA5] = useState(0)
  const {
    moraVigente,
    cargando: cargandoA5,
    error: errorA5,
    reintentar: reintentarA5,
  } = useMoraVigente(
    expedienteId,
    esCofianza && expedienteEstado === 'condicionado' && !condicion && adenda5Tramo === 'revision',
    versionA5,
  )
  const pazYSalvoDeMora = pazYSalvoDeMoraVigente(moraVigente)
  const pazYSalvoVivo = pazYSalvoPendiente(pazYSalvo) ? pazYSalvo : pazYSalvoDeMora
  const obligacionesMora = moraVigente?.obligaciones ?? []
  // §7: solo en el tramo de revisión el analista puede exigir el paz y salvo.
  const enRevisionA5 = esCofianza && moraVigente?.tramo === 'revision'
  // El tramo que trae el estudio (no depende de GET mora-vigente): lo que se dice
  // aunque la lectura siga cargando o haya fallado. Con ADENDA5 apagada llega null.
  const tramoRevisionA5 = esCofianza && adenda5Tramo === 'revision'
  // Sin las obligaciones todavía no se ofrece «Aprobar sujeto a paz y salvo»: se espera la lectura.
  const esperandoA5 = tramoRevisionA5 && cargandoA5
  const pctRazon = razonMoraPct(moraVigente)
  const [modo, setModo] = useState<'aprobar' | 'sujeto'>('aprobar')
  const [exigidas, setExigidas] = useState<string[]>([])
  const sujeto = enRevisionA5 && modo === 'sujeto'
  // Al abrir el modal: el plazo que se muestra se cuenta desde ahí (la fecha real la fija la API).
  const [abiertoEn, setAbiertoEn] = useState(0)
  const etiquetaAprobar = sujeto ? 'Aprobar sujeto a paz y salvo' : 'Aprobar estudio'
  // Por qué llegó a revisión, arriba del formulario: los motivos que elija deben responder a esto.
  const revision = motivoRevision ? partirObservaciones(textoVisible(motivoRevision)) : null
  // Lo que falta para que se active «Aprobar estudio», dicho junto al botón:
  // los campos obligatorios quedan abajo del modal y no se veían.
  const faltantes: string[] = []
  if (cargandoMotivos) faltantes.push('Esperar a que carguen los motivos.')
  else if (!motivoListo) faltantes.push(catalogo ? (errorMotivos('aprobar', motivos, catalogo) ?? 'Elija al menos un motivo.') : 'Escriba el fundamento de la decisión (mínimo 10 caracteres).')
  if (esperandoA5) faltantes.push('Esperar a que carguen las obligaciones en mora.')
  if (errorFundamento) faltantes.push(errorFundamento)
  if (!evaluacion.estabilidad_laboral) faltantes.push('Elija la «Situación laboral verificada».')
  if (!evaluacion.arrendamiento_previo) faltantes.push('Elija el «Historial de arrendamiento verificado» (si no tiene, elija «Sin historial de arrendamiento previo»).')
  if (faltaNotaIdentidad) faltantes.push('Escriba cómo verificó la identidad (mínimo 10 caracteres).')
  if (sujeto && exigidas.length === 0) faltantes.push('Marque al menos una obligación de la que exige el paz y salvo.')
  // Lo que impide aprobar ahora (p. ej. Política §15 sin el coarrendatario de 80):
  // se dice antes del formulario, no al final después de llenarlo.
  const [bloqueo, setBloqueo] = useState<{ codigo: string; motivo: string } | null>(null)
  // Sube al registrar un ingreso verificado: el bloqueo se vuelve a pedir.
  const [versionBloqueo, setVersionBloqueo] = useState(0)
  // Con el paz y salvo pendiente no se aprueba a mano: no hay bloqueo que anticipar.
  const hayPazYSalvo = !!pazYSalvoVivo
  useEffect(() => {
    if (!esCofianza || expedienteEstado !== 'condicionado' || condicion || hayPazYSalvo) return
    let cancel = false
    expedienteService.bloqueoAprobacion(expedienteId).then(
      (b) => { if (!cancel) setBloqueo(b) },
      () => {},
    )
    return () => { cancel = true }
  }, [esCofianza, expedienteEstado, condicion, hayPazYSalvo, expedienteId, versionBloqueo])
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

  if (pazYSalvoVivo) {
    return (
      <PazYSalvoPendiente
        expedienteId={expedienteId}
        pazYSalvo={pazYSalvoVivo}
        esCofianza={esCofianza}
        obligacionesEnMora={obligacionesMora}
        sinInmueble={sinInmueble}
        onAcreditado={() => {
          setVersionA5((n) => n + 1)
          onAprobado?.()
        }}
      />
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
    if (aprobando.current || esperandoA5 || !evaluacionCompleta(evaluacion) || !motivoListo || errorFundamento || faltaNotaIdentidad) return
    if (sujeto && exigidas.length === 0) return
    aprobando.current = true
    setLoading(true)
    try {
      const revisionBody = {
        ...(catalogo ? motivosParaEnviar('aprobar', motivos, catalogo) : { fundamento: fundamento.trim() }),
        documentos_consultados: documentos,
        evaluacion,
        ...(sinInfoBuro ? { fuente_capacidad_verificada: fuenteCapacidad } : {}),
        ...(condicionAdicional ? { condicion_adicional: true } : {}),
        ...(notaIdentidad.trim() ? { nota_identidad: notaIdentidad.trim() } : {}),
      }
      if (sujeto) {
        // Adenda 5 §7: no pasa a Aprobado; queda pendiente del candidato.
        const res = await expedienteService.aprobarSujetoPazYSalvo(expedienteId, { ...revisionBody, obligaciones: exigidas })
        setConfirmAprobarOpen(false)
        const vence = res?.paz_y_salvo?.vence_en ?? null
        toast.success(
          `Aprobado sujeto a paz y salvo. El candidato tiene ${vence ? `hasta el ${fechaCondicion(vence)}` : 'el plazo vigente'} para acreditarlo; le escribimos con el detalle.`,
        )
        setVersionA5((n) => n + 1)
        onAprobado?.()
        return
      }
      // Sin datos de contrato: solo aprueba. El contrato se crea después desde el estudio.
      const res = await expedienteService.aprobarCondicionado(expedienteId, revisionBody)
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
      if (err instanceof ApiClientError && err.code === 'NOTA_IDENTIDAD_REQUERIDA') {
        setPideNotaIdentidad(true)
        // El texto de la API distingue «no coincidió» de «no se pudo verificar».
        toast.error(err.message || 'La foto del solicitante no permitió verificar su identidad. Explique abajo cómo la verificó.')
        return
      }
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
            {estudioSinCentrales && reconsultaParcial
              ? 'Una central de riesgo no respondió y la otra no devolvió puntaje de esta persona. No es un rechazo: Cofianza puede volver a consultar cuando la central responda.'
              : estudioSinCentrales
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
                  {tramoRevisionA5 && (
                    <p className="mt-2">
                      Llegó a revisión por una mora vigente de bajo monto en sector no financiero. Dentro de «Aprobar
                      estudio» verá las obligaciones en mora y podrá aprobarlo o aprobarlo sujeto a paz y salvo; si lo
                      aprueba, se cobra la tarifa de aprobación no automática.
                    </p>
                  )}
                  {errorA5 && (
                    <p className="mt-2 text-xs text-red-700">
                      No se pudo leer el detalle de la mora vigente.{' '}
                      <button type="button" onClick={reintentarA5} className="font-medium underline">
                        Reintentar
                      </button>
                    </p>
                  )}
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
                    onClick={() => {
                      setAbiertoEn(Date.now())
                      setConfirmAprobarOpen(true)
                    }}
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
      size="xl"
    >
      <div className="space-y-4">
        {revision && (revision.motivos.length > 0 || revision.datos) ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-gray-800">
            <p className="font-semibold text-gray-900">Por qué llegó a revisión</p>
            {revision.motivos.length > 0 ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {revision.motivos.map((m) => <li key={m}>{m}</li>)}
              </ul>
            ) : (
              <p className="mt-1">El motor no dejó un motivo escrito: revíselo en «Evaluación crediticia», en el estudio.</p>
            )}
            {revision.datos && <p className="mt-1 text-xs text-gray-600">{revision.datos}</p>}
            <p className="mt-2 text-xs font-medium text-amber-900">
              Apruebe solo si lo que verificó resuelve estos puntos.
              {docsCargados === 0 &&
                ' Este estudio no tiene documentos cargados: si necesita soportes de ingreso, cierre esta ventana y use «Enviar enlace al solicitante».'}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            No hay un motivo escrito del motor: revíselo en «Evaluación crediticia», en el estudio. Complete los dos
            pasos; abajo verá lo que falta para aprobar.
          </p>
        )}
        {enRevisionA5 && obligacionesMora.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-white p-3 text-sm text-gray-800">
            <p className="font-semibold text-gray-900">Obligaciones en mora</p>
            <p className="mt-0.5 text-xs text-gray-600">
              {typeof moraVigente?.suma_moras_cop === 'number' && pctRazon !== null
                ? `Suman ${pesosA5(moraVigente.suma_moras_cop)} en mora: ${textoPct(pctRazon)} del canon${
                    typeof moraVigente.canon_cop === 'number' ? ` de ${pesosA5(moraVigente.canon_cop)}` : ''
                  }. `
                : pctRazon !== null
                  ? `Razón de mora: ${textoPct(pctRazon)} del canon. `
                  : ''}
              {TRAMO_A5.revision}. Por reserva, el acreedor y el monto no se comparten con la inmobiliaria ni con el propietario.
            </p>
            <div className="mt-2">
              <ObligacionesEnMora obligaciones={obligacionesMora} />
            </div>
          </div>
        )}
        {/* El tercer estado de la lectura: sin ella no se ve la mora ni «Aprobar sujeto a paz y salvo». */}
        {tramoRevisionA5 && !enRevisionA5 && (cargandoA5 || errorA5) && (
          <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {cargandoA5 ? (
              'Cargando las obligaciones en mora…'
            ) : (
              <>
                No se pudo leer el detalle de la mora vigente; sin él no puede aprobar sujeto a paz y salvo.{' '}
                <button type="button" onClick={reintentarA5} className="font-medium underline">
                  Reintentar
                </button>
              </>
            )}
          </div>
        )}
        {/* Dos columnas en pantallas anchas: a la izquierda por qué se aprueba; a la
            derecha lo que se verificó. Así el formulario cabe casi sin desplazarse. */}
        <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <PasoModal
            n={1}
            titulo="Por qué lo aprueba"
            ayuda="Marque solo lo que pasó en este caso. Queda en el registro interno de Cofianza: la inmobiliaria o el propietario solo reciben el aviso de que se aprobó."
            listo={motivoListo && !errorFundamento}
          />
        {cargandoMotivos ? (
          <CargandoMotivos />
        ) : catalogo ? (
          <SelectorMotivos tipo="aprobar" catalogo={catalogo} value={motivos} onChange={setMotivos} disabled={loading} noAplican={noAplicanTodos} errorLectura={errorMotivosLectura} onReintentar={reintentarMotivos} />
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
        </section>
        <section className="space-y-4">
          <PasoModal
            n={2}
            titulo="Lo que verificó"
            ayuda="Queda en el registro de la decisión y, si el estudio tiene puntaje, lo vuelve a calcular."
            listo={evaluacionCompleta(evaluacion) && !faltaNotaIdentidad}
          />
        <EvaluacionRevisionManual value={evaluacion} onChange={setEvaluacion} disabled={loading} />
        <DocumentosConsultados expedienteId={expedienteId} value={documentos} onChange={setDocumentos} disabled={loading} onCargados={setDocsCargados} />
        {pideNotaIdentidad && (
          <div>
            <label htmlFor="nota-identidad" className="block text-sm font-medium text-gray-700 mb-1">
              Cómo verificó la identidad <span className="text-red-500">*</span>
            </label>
            <p className="mb-1 text-xs text-gray-600">
              La foto del solicitante no coincidió con su documento o no permitió verificar su identidad. Explique cómo confirmó que es la misma persona.
            </p>
            <textarea
              id="nota-identidad"
              value={notaIdentidad}
              onChange={(e) => setNotaIdentidad(e.target.value)}
              rows={2}
              disabled={loading}
              placeholder="Por ejemplo: revisé la cédula original en una videollamada (mínimo 10 caracteres)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
            />
          </div>
        )}
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
        </section>
        </div>
        {enRevisionA5 && (
          <section className="space-y-2">
            <PasoModal
              n={3}
              titulo="Cómo lo aprueba"
              ayuda="Por la mora vigente puede exigir el paz y salvo antes de expedir la fianza. Es opcional."
              listo={modo === 'aprobar' || exigidas.length > 0}
            />
            <div role="radiogroup" aria-label="Cómo lo aprueba" className="grid gap-2 sm:grid-cols-2">
              <OpcionModo
                activa={modo === 'aprobar'}
                titulo="Aprobar"
                ayuda="El estudio pasa a Aprobado y se puede crear el contrato."
                disabled={loading}
                onElegir={() => setModo('aprobar')}
              />
              <OpcionModo
                activa={modo === 'sujeto'}
                titulo="Aprobar sujeto a paz y salvo"
                ayuda="Queda pendiente del candidato: sin contrato hasta acreditar el paz y salvo de lo que marque."
                disabled={loading}
                onElegir={() => {
                  setModo('sujeto')
                  // Por omisión se exigen todas; el analista desmarca las que no.
                  if (exigidas.length === 0) setExigidas(obligacionesMora.map((o) => o.ref))
                }}
              />
            </div>
            {modo === 'sujeto' && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                <p className="mb-2 text-xs font-semibold text-gray-700">Obligaciones de las que exige el paz y salvo</p>
                <ObligacionesEnMora obligaciones={obligacionesMora} seleccion={exigidas} onSeleccion={setExigidas} disabled={loading} />
                <p className="mt-2 text-xs text-gray-600">
                  Plazo:{' '}
                  {moraVigente?.dias_plazo_paz_y_salvo
                    ? `${moraVigente.dias_plazo_paz_y_salvo} días calendario (hasta el ${fechaCondicion(
                        venceSiSeExigeHoy(moraVigente.dias_plazo_paz_y_salvo, abiertoEn || 0),
                      )}, aproximadamente)`
                    : 'el que fija la calibración, en días calendario'}
                  . Si vence sin que el candidato cargue el paz y salvo, el estudio se cierra como no aprobado; si lo cargó a
                  tiempo y aún no se ha acreditado, vuelve a su revisión.
                </p>
              </div>
            )}
          </section>
        )}
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">{sujeto ? 'Al aprobar sujeto a paz y salvo' : 'Al aprobar'}</p>
          {sujeto ? (
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              <li>El estudio no pasa a Aprobado: queda pendiente de un requisito a cargo del candidato y no se puede crear el contrato.</li>
              <li>
                Al candidato le escribimos con el detalle de las obligaciones y el plazo; a la inmobiliaria o al propietario solo les
                decimos que hay un requisito pendiente a cargo del candidato.
              </li>
              <li>
                Cuando un analista de Cofianza acredite el paz y salvo, el estudio pasa a Aprobado con esta decisión y se cobra la tarifa
                de aprobación no automática.
              </li>
              <li>Queda en el registro interno con su usuario, la fecha, los motivos, los documentos y las obligaciones que marcó.</li>
            </ul>
          ) : (
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              <li>
                {sinInmueble
                  ? 'El estudio pasa a Aprobado. Para crear el contrato, primero vincule el inmueble.'
                  : 'El estudio pasa a Aprobado y se puede crear el contrato.'}
              </li>
              <li>
                {sinInmueble
                  ? 'Se le avisa al solicitante.'
                  : 'Se le avisa al solicitante y a la inmobiliaria o al propietario.'}
              </li>
              {tramoRevisionA5 && <li>Por la mora vigente, se cobra la tarifa de aprobación no automática.</li>}
              <li>Queda en el registro interno con su usuario, la fecha, los motivos y los documentos que marcó.</li>
            </ul>
          )}
        </div>
        <div className="sticky -bottom-4 -mx-1 space-y-2 border-t border-gray-100 bg-white px-1 pt-3 pb-4">
        {!loading && (faltantes.length > 0 ? (
          <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p className="font-semibold">Para activar «{etiquetaAprobar}» falta:</p>
            {/* En el celular el pie fijo no puede tapar el formulario: la lista se desplaza. */}
            <ul className="mt-1 max-h-28 list-disc space-y-0.5 overflow-y-auto pl-5 sm:max-h-none">
              {faltantes.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </div>
        ) : (
          <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-primary-800">
            <IconCheck size={16} className="shrink-0" />
            Todo completo: revise «Al aprobar» y confirme.
          </p>
        ))}
        <div className="flex justify-end gap-2">
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
            disabled={loading || esperandoA5 || !motivoListo || !evaluacionCompleta(evaluacion) || !!errorFundamento || faltaNotaIdentidad || (sujeto && exigidas.length === 0)}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50"
          >
            {loading ? 'Aprobando…' : etiquetaAprobar}
          </button>
        </div>
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

/** Una de las dos formas de aprobar en el tramo de revisión de la mora vigente (Adenda 5 §7). */
function OpcionModo({
  activa,
  titulo,
  ayuda,
  disabled,
  onElegir,
}: {
  activa: boolean
  titulo: string
  ayuda: string
  disabled?: boolean
  onElegir: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activa}
      disabled={disabled}
      onClick={onElegir}
      className={`rounded-lg border p-3 text-left text-sm transition-colors disabled:opacity-50 ${
        activa ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600' : 'border-gray-200 bg-white hover:border-primary-300'
      }`}
    >
      <span className="flex items-center gap-1.5 font-semibold text-gray-900">
        {activa && <IconCheck size={14} className="shrink-0 text-primary-700" />}
        {titulo}
      </span>
      <span className="mt-0.5 block text-xs text-gray-600">{ayuda}</span>
    </button>
  )
}

/** Encabezado de cada bloque del modal de aprobación, con su estado (pendiente o listo). */
function PasoModal({ n, titulo, ayuda, listo }: { n: number; titulo: string; ayuda?: string; listo: boolean }) {
  return (
    <div>
    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
      <span
        aria-hidden
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          listo ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
        }`}
      >
        {listo ? <IconCheck size={14} /> : n}
      </span>
      {titulo}
      <span className="sr-only">{listo ? '(completo)' : '(pendiente)'}</span>
    </h3>
    {ayuda && <p className="mt-0.5 pl-8 text-xs text-gray-500">{ayuda}</p>}
    </div>
  )
}

/**
 * Separa las observaciones del motor en los datos de la central y los motivos de
 * la revisión, que van después de «El caso pasa a revisión…». Si el texto no
 * trae ese corte, todas las frases van como motivos.
 */
function partirObservaciones(texto: string): { datos: string; motivos: string[] } {
  const partes = texto.split(/\.\s+(?=[A-ZÁÉÍÓÚÑ¿«])/)
  const frases = partes
    .map((f, i) => (i < partes.length - 1 ? `${f}.` : f).trim())
    // La API no reescribe las observaciones cuando la condición de coarrendatario
    // vence o no se cumple: aquí ya no está vigente (el modal no sale con condición).
    .filter((f) => f && !/^Condici[oó]n pendiente:/i.test(f))
  const corte = frases.findIndex((f) => /pasa a revisi[oó]n/i.test(f))
  if (corte < 0) return { datos: '', motivos: frases }
  return { datos: frases.slice(0, corte).join(' '), motivos: frases.slice(corte + 1) }
}
