'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { IconLoader, IconArrowRight } from '@/components/icons'
import { ESTADOS_CONTRATO, type EstadoContratoKey } from '@/lib/constants'
import type { EstadoContrato } from '@/types/contrato'

interface TransicionDisponible {
  estado: EstadoContrato
  label: string
}

export interface ContratoTransicionModalProps {
  isOpen: boolean
  onClose: () => void
  estadoActual: EstadoContrato
  transicionesDisponibles: TransicionDisponible[]
  onConfirmar: (estadoDestino: EstadoContrato, comentario: string, motivo?: string) => Promise<void>
  isLoading?: boolean
}

const ESTADOS_CON_MOTIVO: EstadoContrato[] = ['cancelado', 'finalizado']

export function ContratoTransicionModal({
  isOpen,
  onClose,
  estadoActual,
  transicionesDisponibles,
  onConfirmar,
  isLoading = false,
}: ContratoTransicionModalProps) {
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoContrato | null>(null)
  const [comentario, setComentario] = useState('')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const requiresMotivo = !!estadoSeleccionado && ESTADOS_CON_MOTIVO.includes(estadoSeleccionado)

  const handleClose = () => {
    if (isLoading) return
    setEstadoSeleccionado(null)
    setComentario('')
    setMotivo('')
    setError(null)
    onClose()
  }

  const handleConfirmar = async () => {
    if (!estadoSeleccionado) {
      setError('Selecciona un estado destino')
      return
    }

    if (!comentario.trim()) {
      setError('El comentario es obligatorio')
      return
    }

    if (requiresMotivo && !motivo.trim()) {
      setError('El motivo es obligatorio para esta transicion')
      return
    }

    setError(null)
    await onConfirmar(
      estadoSeleccionado,
      comentario.trim(),
      requiresMotivo ? motivo.trim() : undefined,
    )
    handleClose()
  }

  const configActual = ESTADOS_CONTRATO[estadoActual as EstadoContratoKey]
  const transiciones = Array.isArray(transicionesDisponibles) ? transicionesDisponibles : []

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cambiar Estado del Contrato"
      size="md"
    >
      <div className="space-y-6">
        {/* Estado actual */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado actual
          </label>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${configActual?.bgColor || 'bg-gray-100'} ${configActual?.textColor || 'text-gray-700'}`}>
            {configActual?.label || estadoActual}
          </span>
        </div>

        {/* Selector de estado destino */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Nuevo estado
          </label>
          <div className="grid grid-cols-2 gap-2">
            {transiciones.map((transicion) => {
              const config = ESTADOS_CONTRATO[transicion.estado as EstadoContratoKey]
              const isSelected = estadoSeleccionado === transicion.estado

              return (
                <button
                  key={transicion.estado}
                  type="button"
                  onClick={() => {
                    setEstadoSeleccionado(transicion.estado)
                    setError(null)
                  }}
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? `${config?.borderColor || 'border-gray-300'} ${config?.bgColor || 'bg-gray-100'}`
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span
                    className={`w-3 h-3 rounded-full ${
                      isSelected
                        ? (config?.textColor || 'text-gray-700').replace('text-', 'bg-')
                        : 'bg-gray-300'
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      isSelected ? config?.textColor || 'text-gray-700' : 'text-gray-700'
                    }`}
                  >
                    {transicion.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Visualizacion de la transicion */}
        {estadoSeleccionado && (
          <div className="flex items-center justify-center gap-4 py-4 bg-gray-50 rounded-lg">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${configActual?.bgColor || 'bg-gray-100'} ${configActual?.textColor || 'text-gray-700'}`}>
              {configActual?.label || estadoActual}
            </span>
            <IconArrowRight size={20} className="text-gray-400" />
            {(() => {
              const targetConfig = ESTADOS_CONTRATO[estadoSeleccionado as EstadoContratoKey]
              return (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${targetConfig?.bgColor || 'bg-gray-100'} ${targetConfig?.textColor || 'text-gray-700'}`}>
                  {targetConfig?.label || estadoSeleccionado}
                </span>
              )
            })()}
          </div>
        )}

        {/* Campo de comentario */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comentario <span className="text-red-500">*</span>
          </label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Describe el motivo del cambio de estado..."
            rows={3}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:bg-gray-100"
          />
        </div>

        {/* Campo de motivo (solo para cancelacion/finalizacion) */}
        {requiresMotivo && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={
                estadoSeleccionado === 'cancelado'
                  ? 'Motivo de la cancelación del contrato...'
                  : 'Motivo de la finalización del contrato...'
              }
              rows={2}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:bg-gray-100"
            />
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Botones de accion */}
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
            disabled={isLoading || !estadoSeleccionado || !comentario.trim() || (requiresMotivo && !motivo.trim())}
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
