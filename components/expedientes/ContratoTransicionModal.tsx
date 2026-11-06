'use client'

import { useState } from 'react'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { IconLoader, IconArrowRight, IconAlertTriangle } from '@/components/icons'
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
  /** Devuelve false si la transición falló: el modal permanece abierto y
   *  conserva comentario/motivo para reintentar. void/true = éxito → cierra. */
  onConfirmar: (estadoDestino: EstadoContrato, comentario: string, motivo?: string) => Promise<boolean | void>
  isLoading?: boolean
  /** Moras activas del contrato: si >0 se advierte al terminar/cancelar (la
   *  mora NO se cancela al terminar — el cobro sigue). */
  morasActivas?: number
  /** Transición que el usuario ya eligió con el botón que abrió el modal
   *  (se puede cambiar dentro). Se lee al montar. */
  estadoInicial?: EstadoContrato
}

const ESTADOS_CON_MOTIVO: EstadoContrato[] = ['cancelado', 'finalizado']

/** Terminar o cancelar no se deshace: se dice qué pasa y el botón lo nombra. */
const TERMINAL: Partial<Record<EstadoContrato, { boton: string; efecto: string }>> = {
  finalizado: {
    boton: 'Terminar contrato',
    efecto: 'No se puede deshacer. La fianza deja de operar y el inmueble queda disponible (fuera de la vitrina).',
  },
  cancelado: {
    boton: 'Cancelar contrato',
    efecto: 'No se puede deshacer. El contrato queda cancelado y el inmueble se libera.',
  },
}

export function ContratoTransicionModal({
  isOpen,
  onClose,
  estadoActual,
  transicionesDisponibles,
  onConfirmar,
  isLoading = false,
  morasActivas = 0,
  estadoInicial,
}: ContratoTransicionModalProps) {
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoContrato | null>(estadoInicial ?? null)
  const [comentario, setComentario] = useState('')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const requiresMotivo = !!estadoSeleccionado && ESTADOS_CON_MOTIVO.includes(estadoSeleccionado)
  const terminal = estadoSeleccionado ? TERMINAL[estadoSeleccionado] : undefined
  // Terminar/cancelar piden un solo texto, el motivo; la API lo guarda también como comentario.
  const texto = requiresMotivo ? motivo : comentario

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
      setError('Elija el nuevo estado del contrato.')
      return
    }

    if (!texto.trim()) {
      setError(requiresMotivo ? 'Escriba el motivo.' : 'Escriba un comentario sobre el cambio.')
      return
    }

    setError(null)
    const ok = await onConfirmar(
      estadoSeleccionado,
      texto.trim(),
      requiresMotivo ? motivo.trim() : undefined,
    )
    // Si la transición falló (false), NO cerrar: el usuario conserva su
    // comentario/motivo y puede reintentar (antes se descartaban en silencio).
    if (ok !== false) handleClose()
  }

  const configActual = ESTADOS_CONTRATO[estadoActual as EstadoContratoKey]
  const transiciones = Array.isArray(transicionesDisponibles) ? transicionesDisponibles : []

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cambiar estado del contrato"
      description="Elija el nuevo estado y deje constancia del motivo."
      size="md"
      footer={
        <div className="space-y-2">
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <IconAlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
          <ModalAcciones>
            <button type="button" onClick={handleClose} disabled={isLoading} className={botonModal('secondary')}>
              Volver
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={isLoading || !estadoSeleccionado || !texto.trim()}
              aria-busy={isLoading || undefined}
              className={botonModal(terminal ? 'danger' : 'primary')}
            >
              {isLoading && <IconLoader size={16} className="animate-spin" aria-hidden="true" />}
              {isLoading ? 'Guardando…' : terminal?.boton ?? 'Confirmar cambio'}
            </button>
          </ModalAcciones>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Advertencia de moras activas: la mora NO se cancela al terminar el
            contrato (el cobro de la fianza continúa), así que el operador debe
            decidir explícitamente si marcarla pagada o cancelarla. Solo aplica a
            transiciones de terminación (finalizado/cancelado). */}
        {morasActivas > 0 && (!estadoSeleccionado || ESTADOS_CON_MOTIVO.includes(estadoSeleccionado)) && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <IconAlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
            <span>
              Este contrato tiene <strong>{morasActivas} mora{morasActivas > 1 ? 's' : ''} activa{morasActivas > 1 ? 's' : ''}</strong>.
              Terminar o cancelar el contrato <strong>no cierra</strong> la mora: el cobro sigue su curso.
              Si ya se saldó o quiere detenerla, márquela como pagada o cancélela en <em>Reportar mora</em>.
            </span>
          </div>
        )}

        {/* Estado actual */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-gray-700">Estado actual:</span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${configActual?.bgColor || 'bg-gray-100'} ${configActual?.textColor || 'text-gray-700'}`}>
            {configActual?.label || estadoActual}
          </span>
        </div>

        {/* Selector de estado destino */}
        <div>
          <p id="contrato-transicion-modal-nuevo-estado" className="mb-2 block text-sm font-medium text-gray-700">
            Nuevo estado <span className="text-red-600" aria-hidden="true">*</span>
          </p>
          {transiciones.length === 0 ? (
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
              Desde el estado actual no hay cambios disponibles.
            </p>
          ) : (
            <div role="group" aria-labelledby="contrato-transicion-modal-nuevo-estado" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {transiciones.map((transicion) => {
                const config = ESTADOS_CONTRATO[transicion.estado as EstadoContratoKey]
                const isSelected = estadoSeleccionado === transicion.estado

                return (
                  <button
                    key={transicion.estado}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setEstadoSeleccionado(transicion.estado)
                      setError(null)
                    }}
                    disabled={isLoading}
                    className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 ${
                      isSelected
                        ? `${config?.borderColor || 'border-gray-400'} ${config?.bgColor || 'bg-gray-100'} ${config?.textColor || 'text-gray-700'} ring-1 ring-inset ring-current`
                        // ring-current toma el color del estado: textColor viene escrito
                        // completo en ESTADOS_CONTRATO (lib/constants.ts), así Tailwind lo genera.
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-3 w-3 shrink-0 rounded-full ${
                        isSelected
                          ? `${config?.textColor || 'text-gray-700'} bg-current`
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
          )}
        </div>

        {/* Visualizacion de la transicion */}
        {estadoSeleccionado && (
          <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg bg-gray-50 py-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${configActual?.bgColor || 'bg-gray-100'} ${configActual?.textColor || 'text-gray-700'}`}>
              {configActual?.label || estadoActual}
            </span>
            <IconArrowRight size={18} className="text-gray-500" aria-hidden="true" />
            <span className="sr-only">pasa a</span>
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

        {terminal && <p className="text-sm text-gray-700">{terminal.efecto}</p>}

        {/* Terminar/cancelar piden solo el motivo; las demás transiciones, un comentario. */}
        {requiresMotivo ? (
          <div>
            <label htmlFor="contrato-transicion-modal-motivo" className="mb-1 block text-sm font-medium text-gray-700">
              Motivo <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <textarea id="contrato-transicion-modal-motivo"
              value={motivo}
              onChange={(e) => { setMotivo(e.target.value); setError(null) }}
              placeholder={
                estadoSeleccionado === 'cancelado'
                  ? 'Motivo de la cancelación del contrato…'
                  : 'Motivo de la terminación del contrato…'
              }
              rows={3}
              required
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:bg-gray-100"
            />
          </div>
        ) : (
          <div>
            <label htmlFor="contrato-transicion-modal-comentario" className="mb-1 block text-sm font-medium text-gray-700">
              Comentario <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <textarea id="contrato-transicion-modal-comentario"
              value={comentario}
              onChange={(e) => { setComentario(e.target.value); setError(null) }}
              placeholder="Describa el motivo del cambio de estado…"
              rows={3}
              required
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:bg-gray-100"
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
