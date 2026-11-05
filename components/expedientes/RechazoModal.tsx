/**
 * RechazoModal - Modal para rechazar un documento con motivo
 * Incluye sugerencias rapidas y validacion de longitud minima
 */

'use client'

import { useState } from 'react'
import { IconLoader } from '@/components/icons'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'

const SUGERENCIAS_RAPIDAS = [
  'Documento ilegible o de baja calidad',
  'No coincide con el tipo de documento solicitado',
  'Documento vencido o fuera de vigencia',
  'Información incompleta o datos faltantes',
]

const MIN_CHARS = 10
const MAX_CHARS = 500

interface RechazoModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (motivo: string) => void
  documentoNombre: string
  isLoading?: boolean
}

export function RechazoModal({
  isOpen,
  onClose,
  onConfirm,
  documentoNombre,
  isLoading = false,
}: RechazoModalProps) {
  const [motivo, setMotivo] = useState('')

  const charCount = motivo.length
  const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS

  const handleConfirm = () => {
    if (!isValid || isLoading) return
    onConfirm(motivo.trim())
  }

  const handleClose = () => {
    if (isLoading) return
    setMotivo('')
    onClose()
  }

  const handleSugerencia = (texto: string) => {
    setMotivo(texto)
  }

  const restantes = MIN_CHARS - charCount

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Rechazar documento"
      description={
        <>
          <span className="font-medium text-gray-900 break-words">{documentoNombre}</span>. Le avisaremos a quien gestiona el
          estudio para que suba uno nuevo.
        </>
      }
      size="sm"
      footer={
        <ModalAcciones>
          <button type="button" onClick={handleClose} disabled={isLoading} className={botonModal('secondary')}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            aria-busy={isLoading || undefined}
            className={botonModal('danger')}
          >
            {isLoading && <IconLoader size={16} className="animate-spin" />}
            {isLoading ? 'Rechazando…' : 'Rechazar documento'}
          </button>
        </ModalAcciones>
      }
    >
      <div className="space-y-4">
        {/* Sugerencias rápidas: llenan el motivo, que se puede editar después. */}
        <div>
          <p id="rechazo-sugerencias" className="mb-2 text-sm font-medium text-gray-700">
            Motivos frecuentes
          </p>
          <div role="group" aria-labelledby="rechazo-sugerencias" className="flex flex-wrap gap-2">
            {SUGERENCIAS_RAPIDAS.map((sugerencia) => (
              <button
                key={sugerencia}
                type="button"
                onClick={() => handleSugerencia(sugerencia)}
                disabled={isLoading}
                aria-pressed={motivo === sugerencia}
                className={`min-h-9 rounded-full border px-3 py-1.5 text-left text-xs transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  motivo === sugerencia
                    ? 'border-red-300 bg-red-50 text-red-800'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {sugerencia}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="rechazo-modal-motivo" className="block text-sm font-medium text-gray-700 mb-1">
            Motivo del rechazo <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <textarea
            id="rechazo-modal-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Por ejemplo: la foto está borrosa y no se leen los datos."
            maxLength={MAX_CHARS}
            rows={4}
            required
            aria-describedby="rechazo-modal-motivo-ayuda"
            disabled={isLoading}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:bg-gray-50"
          />
          <div id="rechazo-modal-motivo-ayuda" className="mt-1 flex justify-between gap-3 text-xs">
            <span className={restantes > 0 && charCount > 0 ? 'text-amber-800' : 'text-gray-500'}>
              {restantes > 0
                ? `Obligatorio, mínimo ${MIN_CHARS} caracteres${charCount > 0 ? ` (faltan ${restantes})` : ''}.`
                : 'Lo verá quien gestiona el estudio.'}
            </span>
            <span className={`tabular-nums ${charCount > MAX_CHARS * 0.9 ? 'text-amber-800' : 'text-gray-500'}`}>
              {charCount}/{MAX_CHARS}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
