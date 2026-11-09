/**
 * TransicionModal - HP-243
 * Modal de confirmación para cambio de estado del expediente
 */

'use client'

import { useRef, useState } from 'react'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import { IconLoader, IconAlertTriangle, IconCheck } from '@/components/icons'
import { ESTADOS_EXPEDIENTE, type EstadoExpediente } from '@/lib/constants'
import type { ITransicionDisponible, IEvaluacionRevisionManual } from '@/types/expediente'
import type { IMotivosElegidos } from '@/types/estudio'
import { useMotivosAprobacion } from '@/hooks/useMotivosAprobacion'
import { useMotivosDecision } from '@/hooks/useMotivosDecision'
import { CargandoMotivos, LoVeLaInmobiliaria, SelectorMotivos, errorMotivos, errorMotivosAprobacion, motivosParaEnviar } from './SelectorMotivos'
import { usePermissions } from '@/hooks/usePermissions'
import { DocumentosConsultados } from './DocumentosConsultados'
import { EvaluacionRevisionManual, evaluacionCompleta, type EvaluacionParcial } from './EvaluacionRevisionManual'
import { CondicionAdicional } from './CondicionAdicional'
import { ApiClientError } from '@/lib/api'

/** transitionBodySchema del API exige el comentario con al menos 10 caracteres. */
const MIN_MOTIVO = 10

export interface TransicionModalProps {
  isOpen: boolean
  onClose: () => void
  estadoActual: EstadoExpediente
  transicionesDisponibles: ITransicionDisponible[]
  onConfirmar: (
    estadoDestino: EstadoExpediente,
    comentario: string,
    etiqueta?: string,
    documentosConsultados?: string[],
    evaluacion?: IEvaluacionRevisionManual,
    /** P34: al rechazar, el motivo corto que verá la inmobiliaria o el propietario. */
    motivo?: string,
    /** H58/H103: motivos de lista (rechazar, o aprobar una revisión manual). */
    motivos?: IMotivosElegidos,
    /** Adenda 4 §9: al aprobar una revisión manual, exigió algo más. */
    condicionAdicional?: boolean,
    /** Biometría «no coincide»: cómo verificó el analista la identidad. */
    notaIdentidad?: string,
  ) => Promise<void>
  isLoading?: boolean
  /** Con él, al salir de 'condicionado' (revisión manual) se piden los
   *  documentos consultados (Adenda 2 §5.1). */
  expedienteId?: string
  /** El nombre del estado que muestra el chip del detalle (la etapa), no el estado formal. */
  etiquetaActual?: string
}

export function TransicionModal({
  isOpen,
  onClose,
  estadoActual,
  transicionesDisponibles,
  onConfirmar,
  isLoading = false,
  expedienteId,
  etiquetaActual,
}: TransicionModalProps) {
  // Identificamos la transicion seleccionada por su label, no solo por
  // estado destino — pueden existir dos transiciones al mismo destino con
  // labels distintos (ej. aprobado → cerrado tiene "Cerrar expediente" y
  // "Cancelar expediente"). Trackear por label evita seleccionar las dos
  // a la vez y permite key-uniqueness en el .map.
  const [labelSeleccionado, setLabelSeleccionado] = useState<string | null>(null)
  const [comentario, setComentario] = useState('')
  const [motivoGestor, setMotivoGestor] = useState('')
  const [documentos, setDocumentos] = useState<string[]>([])
  const [evaluacion, setEvaluacion] = useState<EvaluacionParcial>({})
  const [condicionAdicional, setCondicionAdicional] = useState(false)
  const [motivos, setMotivos] = useState<IMotivosElegidos>({ motivos: [] })
  // La foto no coincidió o no se pudo verificar: la API pide la nota (NOTA_IDENTIDAD_REQUERIDA).
  const [pideNotaIdentidad, setPideNotaIdentidad] = useState(false)
  const [notaIdentidad, setNotaIdentidad] = useState('')
  const { userRole } = usePermissions()
  const { catalogo, cargando: cargandoMotivos } = useMotivosDecision(userRole === 'administrador' || userRole === 'operador_analista')
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  // Doble clic: el segundo llega antes de que el padre pinte isLoading.
  const enviando = useRef(false)
  // Adenda 2 §5.1: resolver un condicionado es una decisión de revisión manual.
  const esRevisionManual = estadoActual === 'condicionado' && !!expedienteId
  const { noAplican, error: errorMotivosLectura, reintentar: reintentarMotivos } = useMotivosAprobacion(expedienteId, isOpen && esRevisionManual && (userRole === 'administrador' || userRole === 'operador_analista'))

  const handleClose = () => {
    if (isLoading) return
    setLabelSeleccionado(null)
    setComentario('')
    setMotivoGestor('')
    setDocumentos([])
    setEvaluacion({})
    setMotivos({ motivos: [] })
    setPideNotaIdentidad(false)
    setNotaIdentidad('')
    setError(null)
    onClose()
  }

  const transicionSeleccionada = transicionesDisponibles.find(
    (t) => t.etiqueta === labelSeleccionado,
  )
  const estadoSeleccionado = transicionSeleccionada?.estado_destino ?? null
  // Adenda 2 §4.3: aprobar una revisión manual recalcula el puntaje con V7/V9.
  const pideEvaluacion = esRevisionManual && estadoSeleccionado === 'aprobado'
  // Mismo mínimo que transitionBodySchema en el API: sin esto se pasaba por la
  // confirmación roja y el 400 llegaba después.
  // H58/H103: rechazar y aprobar una revisión manual se motivan con la lista
  // (si el API la tiene); el API arma con ella el comentario y el motivo.
  const tipoLista = !catalogo ? null : estadoSeleccionado === 'rechazado' ? 'rechazar' : pideEvaluacion ? 'aprobar' : null
  const errorLista = tipoLista && catalogo ? errorMotivos(tipoLista, motivos, catalogo) : null
  // B14: esta decisión irá con lista, pero el catálogo aún no llega.
  const esperaLista = cargandoMotivos && (estadoSeleccionado === 'rechazado' || pideEvaluacion)
  const motivoValido = esperaLista ? false : tipoLista ? !errorLista : comentario.trim().length >= MIN_MOTIVO
  // P34: al rechazar, el comentario es el fundamento interno y aparte va un
  // motivo corto para la inmobiliaria o el propietario (el API lo exige).
  const pideMotivoGestor = estadoSeleccionado === 'rechazado' && !tipoLista && !esperaLista
  const motivoGestorValido = !pideMotivoGestor || motivoGestor.trim().length >= MIN_MOTIVO
  // Al cancelar, este texto se guarda como motivo de la cancelación, que ven la
  // inmobiliaria o el propietario y el solicitante en el estudio. No hay otro
  // campo: quien cancela desde Cofianza tiene que saberlo al escribirlo.
  // «Finalizado» es el cierre natural (arriendo firmado). Cancelar o cerrar un
  // no aprobable también lleva a 'cerrado', pero no es eso.
  const etiquetaDestino =
    estadoSeleccionado !== 'cerrado'
      ? undefined
      : transicionSeleccionada?.etiqueta.startsWith('Cancelar')
        ? 'Cancelado'
        : estadoActual === 'rechazado'
          ? 'No aprobable (cerrado)'
          : undefined
  const cancelaCofianza =
    estadoSeleccionado === 'cerrado' &&
    !!transicionSeleccionada?.etiqueta.startsWith('Cancelar') &&
    (userRole === 'administrador' || userRole === 'operador_analista')

  const handleConfirmar = async () => {
    if (!estadoSeleccionado) {
      setError('Seleccione un estado destino')
      return
    }

    if (esperaLista) return
    if (!motivoValido) {
      setError(errorLista ?? `Escriba el motivo (mínimo ${MIN_MOTIVO} caracteres).`)
      return
    }

    if (!motivoGestorValido) {
      setError(`Escriba el motivo para la inmobiliaria o el propietario (mínimo ${MIN_MOTIVO} caracteres).`)
      return
    }

    if (pideEvaluacion && !evaluacionCompleta(evaluacion)) {
      setError('Puntúe la estabilidad laboral y el historial de arrendamiento.')
      return
    }

    // Los motivos que el estudio contradice no se pueden registrar (la API da 400).
    const errorFundamento = pideEvaluacion
      ? errorMotivosAprobacion(motivos.motivos, noAplican, documentos, evaluacion.arrendamiento_previo)
      : null
    if (errorFundamento) {
      setError(errorFundamento)
      return
    }

    if (pideEvaluacion && pideNotaIdentidad && notaIdentidad.trim().length < MIN_MOTIVO) {
      setError(`Explique cómo verificó la identidad (mínimo ${MIN_MOTIVO} caracteres).`)
      return
    }

    setError(null)
    if (esDestructiva && !confirmando) {
      setConfirmando(true)
      return
    }
    setConfirmando(false)
    if (enviando.current) return
    enviando.current = true
    try {
      await onConfirmar(
        estadoSeleccionado,
        // M4: con lista, el API arma el comentario con los motivos; lo escrito
        // para otra transición (textarea oculto) no viaja.
        tipoLista ? '' : comentario.trim(),
        transicionSeleccionada?.etiqueta,
        esRevisionManual ? documentos : undefined,
        pideEvaluacion && evaluacionCompleta(evaluacion) ? evaluacion : undefined,
        pideMotivoGestor ? motivoGestor.trim() : undefined,
        tipoLista && catalogo ? motivosParaEnviar(tipoLista, motivos, catalogo) : undefined,
        pideEvaluacion && condicionAdicional ? true : undefined,
        pideEvaluacion && notaIdentidad.trim() ? notaIdentidad.trim() : undefined,
      )
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'NOTA_IDENTIDAD_REQUERIDA') {
        setPideNotaIdentidad(true)
        // El texto de la API distingue «no coincidió» de «no se pudo verificar».
        setError(err.message || 'La foto del solicitante no permitió verificar su identidad. Explique abajo cómo la verificó.')
      }
      return
    } finally {
      enviando.current = false
    }
    handleClose()
  }

  // Asegurar que transicionesDisponibles sea siempre un array
  const transiciones = Array.isArray(transicionesDisponibles) ? transicionesDisponibles : []

  // Transiciones sin vuelta atrás. Se marcan en rojo y piden confirmación
  // aparte, con las consecuencias escritas.
  const esDestructiva =
    estadoSeleccionado === 'rechazado' || estadoSeleccionado === 'cerrado'
  const CONSECUENCIAS: Record<string, string> = {
    rechazado: `Se libera la reserva del inmueble, se cancelan los contratos que aún no se hayan firmado y se le avisa por correo al coarrendatario${
      estadoActual === 'condicionado' ? ' y al prospecto, con su derecho de apelación' : ''
    }. Desde No aprobable el estudio solo puede cerrarse. Si lo cierra, una apelación del prospecto ya no podrá reabrirlo.`,
    cerrado:
      'El estudio queda archivado y sale del flujo. Se cancelan los contratos que aún no se hayan firmado y se libera la reserva del inmueble. No se puede reabrir.',
  }

  const botonDeshabilitado = isLoading || !estadoSeleccionado || !motivoValido || !motivoGestorValido

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cambiar el estado del estudio"
      description={
        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
          Estado actual: <Badge estado={estadoActual} label={etiquetaActual} />
        </span>
      }
      size="md"
      footer={
        <div className="space-y-2">
          {/* El error va junto al botón: con el cuerpo desplazado no se vería. */}
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </p>
          )}
          {!error && esDestructiva && (
            <p className="text-sm text-gray-600">
              {estadoSeleccionado === 'cerrado' ? 'No se puede deshacer: antes' : 'Antes'} de aplicarlo le mostramos qué pasa y le pedimos confirmarlo.
            </p>
          )}
          <ModalAcciones>
            <button type="button" onClick={handleClose} disabled={isLoading} className={botonModal('secondary')}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={botonDeshabilitado}
              aria-busy={isLoading || undefined}
              className={botonModal(esDestructiva ? 'danger' : 'primary')}
            >
              {isLoading && <IconLoader size={16} className="animate-spin" />}
              Confirmar cambio
            </button>
          </ModalAcciones>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Selector de estado destino */}
        <div>
          <p id="transicion-modal-nuevo-estado" className="block text-sm font-medium text-gray-700 mb-2">
            Nuevo estado <span className="text-red-600" aria-hidden="true">*</span>
          </p>
          <div role="group" aria-labelledby="transicion-modal-nuevo-estado" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {transiciones.map((transicion) => {
              const config = ESTADOS_EXPEDIENTE[transicion.estado_destino]
              const isSelected = labelSeleccionado === transicion.etiqueta
              const sinVuelta = transicion.estado_destino === 'cerrado'
              const reabrible = transicion.estado_destino === 'rechazado'

              return (
                <button
                  key={`${transicion.estado_destino}-${transicion.etiqueta}`}
                  type="button"
                  
                  aria-pressed={isSelected}
                  onClick={() => {
                    // M2/M4: lo escrito o marcado para otra transición no se arrastra.
                    if (transicion.etiqueta !== labelSeleccionado) {
                      setComentario('')
                      setMotivoGestor('')
                      setMotivos({ motivos: [] })
                      setEvaluacion({})
                      setError(null)
                    }
                    setLabelSeleccionado(transicion.etiqueta)
                  }}
                  disabled={isLoading}
                  className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 ${
                    isSelected
                      ? `${config.borderColor} ${config.bgColor}`
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      isSelected ? `${config.textColor.replace('text-', 'bg-')} border-transparent text-white` : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isSelected && <IconCheck size={12} />}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-medium ${isSelected ? config.textColor : 'text-gray-900'}`}>
                      {transicion.etiqueta}
                    </span>
                    {sinVuelta && <span className="block text-xs text-gray-600">Sin vuelta atrás</span>}
                    {reabrible && <span className="block text-xs text-gray-600">Solo se reabre con una apelación o una reevaluación</span>}
                  </span>
                </button>
              )
            })}
          </div>
          {/* Cómo queda el estudio: «Cancelar» y «cerrar un no aprobable» llevan a cerrado con otro nombre. */}
          {estadoSeleccionado && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-700">
              Queda en: <Badge estado={estadoSeleccionado} label={etiquetaDestino} />
            </p>
          )}
        </div>

        {tipoLista && catalogo && (
          <SelectorMotivos tipo={tipoLista} catalogo={catalogo} value={motivos} onChange={(v) => { setMotivos(v); setError(null) }} disabled={isLoading} noAplican={tipoLista === 'aprobar' ? noAplican : undefined} errorLectura={tipoLista === 'aprobar' && errorMotivosLectura} onReintentar={reintentarMotivos} />
        )}

        {esperaLista && <CargandoMotivos />}

        {/* Campo de comentario (con la lista, el API lo arma de los motivos) */}
        {!tipoLista && !esperaLista && (
        <div>
          {cancelaCofianza && <LoVeLaInmobiliaria />}
          <label htmlFor="transicion-modal-comentario-motivo" className="block text-sm font-medium text-gray-700 mb-2">
            {pideMotivoGestor
              ? 'Fundamento interno'
              : cancelaCofianza
                ? 'Motivo de la cancelación (lo ven la inmobiliaria o el propietario y el solicitante)'
                : 'Comentario / Motivo'}{' '}
            <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <textarea id="transicion-modal-comentario-motivo"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Describa el motivo del cambio de estado..."
            rows={3}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:bg-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500">
            {pideMotivoGestor
              ? 'Solo lo ve Cofianza: queda en el historial del estudio con su usuario y la fecha.'
              : cancelaCofianza
                ? 'No incluya datos de las centrales de riesgo ni el fundamento interno.'
                : esRevisionManual
                  ? 'Es el fundamento de su decisión de revisión manual: queda registrado con su usuario y la fecha.'
                  : 'Este comentario quedará registrado en el historial del estudio.'}
            {!motivoValido && ` Mínimo ${MIN_MOTIVO} caracteres (${comentario.trim().length}/${MIN_MOTIVO}).`}
          </p>
        </div>
        )}

        {pideMotivoGestor && (
          <div>
            <LoVeLaInmobiliaria />
            <label htmlFor="transicion-modal-motivo-gestor" className="block text-sm font-medium text-gray-700 mb-2">
              Motivo para la inmobiliaria o el propietario <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <textarea id="transicion-modal-motivo-gestor"
              value={motivoGestor}
              onChange={(e) => setMotivoGestor(e.target.value)}
              placeholder="Ej.: El caso no cumple la política de evaluación de Cofianza."
              rows={2}
              maxLength={500}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Lo verán en el estudio. Escríbalo corto, sin cifras de las centrales de riesgo ni datos del coarrendatario.
              {!motivoGestorValido && ` Mínimo ${MIN_MOTIVO} caracteres (${motivoGestor.trim().length}/${MIN_MOTIVO}).`}
            </p>
          </div>
        )}

        {esRevisionManual && expedienteId && (
          <DocumentosConsultados expedienteId={expedienteId} value={documentos} onChange={setDocumentos} disabled={isLoading} />
        )}

        {pideEvaluacion && pideNotaIdentidad && (
          <div>
            <label htmlFor="transicion-modal-nota-identidad" className="block text-sm font-medium text-gray-700 mb-2">
              Cómo verificó la identidad <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <textarea id="transicion-modal-nota-identidad"
              value={notaIdentidad}
              onChange={(e) => setNotaIdentidad(e.target.value)}
              placeholder="Por ejemplo: revisé la cédula original en una videollamada"
              rows={2}
              maxLength={1000}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:bg-gray-100"
            />
          </div>
        )}

        {pideEvaluacion && (
          <>
            <EvaluacionRevisionManual value={evaluacion} onChange={setEvaluacion} disabled={isLoading} />
            <CondicionAdicional checked={condicionAdicional} onChange={setCondicionAdicional} disabled={isLoading} />
          </>
        )}

      </div>

      <ConfirmDialog
        isOpen={confirmando}
        onClose={() => setConfirmando(false)}
        onConfirm={handleConfirmar}
        title={estadoSeleccionado === 'rechazado' ? '¿Rechazar el estudio?' : '¿Cerrar el estudio?'}
        message={(estadoSeleccionado && CONSECUENCIAS[estadoSeleccionado]) || ""}
        confirmLabel={estadoSeleccionado === 'rechazado' ? 'Sí, rechazar' : 'Sí, cerrar'}
        variant="danger"
        isLoading={isLoading}
      />
    </Modal>
  )
}
