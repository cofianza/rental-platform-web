/**
 * TransicionModal - HP-243
 * Modal de confirmación para cambio de estado del expediente
 */

'use client'

import { useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import { IconLoader, IconArrowRight } from '@/components/icons'
import { ESTADOS_EXPEDIENTE, type EstadoExpediente } from '@/lib/constants'
import type { ITransicionDisponible, IEvaluacionRevisionManual } from '@/types/expediente'
import type { IMotivosElegidos } from '@/types/estudio'
import { useMotivosDecision } from '@/hooks/useMotivosDecision'
import { CargandoMotivos, LoVeLaInmobiliaria, SelectorMotivos, errorMotivos, motivosParaEnviar } from './SelectorMotivos'
import { usePermissions } from '@/hooks/usePermissions'
import { DocumentosConsultados } from './DocumentosConsultados'
import { EvaluacionRevisionManual, evaluacionCompleta, type EvaluacionParcial } from './EvaluacionRevisionManual'

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
  ) => Promise<void>
  isLoading?: boolean
  /** Con él, al salir de 'condicionado' (revisión manual) se piden los
   *  documentos consultados (Adenda 2 §5.1). */
  expedienteId?: string
}

export function TransicionModal({
  isOpen,
  onClose,
  estadoActual,
  transicionesDisponibles,
  onConfirmar,
  isLoading = false,
  expedienteId,
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
  const [motivos, setMotivos] = useState<IMotivosElegidos>({ motivos: [] })
  const { userRole } = usePermissions()
  const { catalogo, cargando: cargandoMotivos } = useMotivosDecision(userRole === 'administrador' || userRole === 'operador_analista')
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  // Doble clic: el segundo llega antes de que el padre pinte isLoading.
  const enviando = useRef(false)
  // Adenda 2 §5.1: resolver un condicionado es una decisión de revisión manual.
  const esRevisionManual = estadoActual === 'condicionado' && !!expedienteId

  const handleClose = () => {
    if (isLoading) return
    setLabelSeleccionado(null)
    setComentario('')
    setMotivoGestor('')
    setDocumentos([])
    setEvaluacion({})
    setMotivos({ motivos: [] })
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
      setError('Puntúa la estabilidad laboral y el historial de arrendamiento')
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
      )
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
    }. Desde "rechazado" el estudio solo puede cerrarse: no hay vuelta atrás.`,
    cerrado:
      'El estudio queda archivado y sale del flujo. Se cancelan los contratos que aún no se hayan firmado y se libera la reserva del inmueble. No se puede reabrir.',
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cambiar Estado del Estudio"
      size="md"
    >
      <div className="space-y-6">
        {/* Estado actual */}
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">
            Estado actual
          </p>
          <Badge estado={estadoActual} />
        </div>

        {/* Selector de estado destino */}
        <div>
          <p id="transicion-modal-nuevo-estado" className="block text-sm font-medium text-gray-700 mb-3">
            Nuevo estado
          </p>
          <div role="group" aria-labelledby="transicion-modal-nuevo-estado" className="grid grid-cols-2 gap-2">
            {transiciones.map((transicion) => {
              const config = ESTADOS_EXPEDIENTE[transicion.estado_destino]
              const isSelected = labelSeleccionado === transicion.etiqueta

              return (
                <button
                  key={`${transicion.estado_destino}-${transicion.etiqueta}`}
                  type="button"
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
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? `${config.borderColor} ${config.bgColor}`
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span
                    className={`w-3 h-3 rounded-full ${
                      isSelected
                        ? config.textColor.replace('text-', 'bg-')
                        : 'bg-gray-300'
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      isSelected ? config.textColor : 'text-gray-700'
                    }`}
                  >
                    {transicion.etiqueta}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Visualización de la transición */}
        {estadoSeleccionado && (
          <div className="flex items-center justify-center gap-4 py-4 bg-gray-50 rounded-lg">
            <Badge estado={estadoActual} />
            <IconArrowRight size={20} className="text-gray-500" />
            <Badge estado={estadoSeleccionado} />
          </div>
        )}

        {tipoLista && catalogo && (
          <SelectorMotivos tipo={tipoLista} catalogo={catalogo} value={motivos} onChange={setMotivos} disabled={isLoading} />
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
            <span className="text-red-500">*</span>
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
                ? 'No incluya datos del buró ni el fundamento interno.'
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
              Motivo para la inmobiliaria o el propietario <span className="text-red-500">*</span>
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
              Lo verán en el estudio. Escríbalo corto, sin cifras del buró ni datos del coarrendatario.
              {!motivoGestorValido && ` Mínimo ${MIN_MOTIVO} caracteres (${motivoGestor.trim().length}/${MIN_MOTIVO}).`}
            </p>
          </div>
        )}

        {esRevisionManual && expedienteId && (
          <DocumentosConsultados expedienteId={expedienteId} value={documentos} onChange={setDocumentos} disabled={isLoading} />
        )}

        {pideEvaluacion && (
          <EvaluacionRevisionManual value={evaluacion} onChange={setEvaluacion} disabled={isLoading} />
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={isLoading || !estadoSeleccionado || !motivoValido || !motivoGestorValido}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
              esDestructiva ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-700 hover:bg-primary-800'
            }`}
          >
            {isLoading && <IconLoader size={16} className="animate-spin" />}
            Confirmar Cambio
          </button>
        </div>
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
