/**
 * TransicionModal - HP-243
 * Modal de confirmación para cambio de estado del expediente
 */

'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { IconLoader, IconArrowRight } from '@/components/icons'
import { ESTADOS_EXPEDIENTE, type EstadoExpediente } from '@/lib/constants'
import type { ITransicionDisponible } from '@/types/expediente'
import { DocumentosConsultados } from './DocumentosConsultados'

export interface TransicionModalProps {
  isOpen: boolean
  onClose: () => void
  estadoActual: EstadoExpediente
  transicionesDisponibles: ITransicionDisponible[]
  onConfirmar: (estadoDestino: EstadoExpediente, comentario: string, etiqueta?: string, documentosConsultados?: string[]) => Promise<void>
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
  const [documentos, setDocumentos] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  // Adenda 2 §5.1: resolver un condicionado es una decisión de revisión manual.
  const esRevisionManual = estadoActual === 'condicionado' && !!expedienteId

  const handleClose = () => {
    if (isLoading) return
    setLabelSeleccionado(null)
    setComentario('')
    setDocumentos([])
    setError(null)
    onClose()
  }

  const transicionSeleccionada = transicionesDisponibles.find(
    (t) => t.etiqueta === labelSeleccionado,
  )
  const estadoSeleccionado = transicionSeleccionada?.estado_destino ?? null

  const handleConfirmar = async () => {
    if (!estadoSeleccionado) {
      setError('Selecciona un estado destino')
      return
    }

    if (!comentario.trim()) {
      setError('El comentario es obligatorio')
      return
    }

    setError(null)
    await onConfirmar(
      estadoSeleccionado,
      comentario.trim(),
      transicionSeleccionada?.etiqueta,
      esRevisionManual ? documentos : undefined,
    )
    handleClose()
  }

  // Asegurar que transicionesDisponibles sea siempre un array
  const transiciones = Array.isArray(transicionesDisponibles) ? transicionesDisponibles : []

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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado actual
          </label>
          <Badge estado={estadoActual} />
        </div>

        {/* Selector de estado destino */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Nuevo estado
          </label>
          <div className="grid grid-cols-2 gap-2">
            {transiciones.map((transicion) => {
              const config = ESTADOS_EXPEDIENTE[transicion.estado_destino]
              const isSelected = labelSeleccionado === transicion.etiqueta

              return (
                <button
                  key={`${transicion.estado_destino}-${transicion.etiqueta}`}
                  type="button"
                  onClick={() => setLabelSeleccionado(transicion.etiqueta)}
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
            <IconArrowRight size={20} className="text-gray-400" />
            <Badge estado={estadoSeleccionado} />
          </div>
        )}

        {/* Campo de comentario */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comentario / Motivo <span className="text-red-500">*</span>
          </label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Describe el motivo del cambio de estado..."
            rows={3}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:bg-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500">
            {esRevisionManual
              ? 'Es el fundamento de tu decisión de revisión manual: queda registrado con tu usuario y la fecha.'
              : 'Este comentario quedará registrado en el historial del estudio'}
          </p>
        </div>

        {esRevisionManual && expedienteId && (
          <DocumentosConsultados expedienteId={expedienteId} value={documentos} onChange={setDocumentos} disabled={isLoading} />
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
            disabled={isLoading || !estadoSeleccionado || !comentario.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && <IconLoader size={16} className="animate-spin" />}
            Confirmar Cambio
          </button>
        </div>
      </div>
    </Modal>
  )
}
