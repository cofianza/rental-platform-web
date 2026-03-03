/**
 * RechazoModal - Modal para rechazar un documento con motivo
 * Incluye sugerencias rapidas y validacion de longitud minima
 */

'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'

const SUGERENCIAS_RAPIDAS = [
  'Documento ilegible o de baja calidad',
  'No coincide con el tipo de documento solicitado',
  'Documento vencido o fuera de vigencia',
  'Informacion incompleta o datos faltantes',
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Rechazar documento" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Rechazar <span className="font-medium text-gray-900">{documentoNombre}</span>.
          Indica el motivo del rechazo para que el solicitante pueda corregirlo.
        </p>

        {/* Sugerencias rapidas */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Sugerencias rapidas:</p>
          <div className="flex flex-wrap gap-2">
            {SUGERENCIAS_RAPIDAS.map((sugerencia) => (
              <button
                key={sugerencia}
                type="button"
                onClick={() => handleSugerencia(sugerencia)}
                disabled={isLoading}
                className="px-2.5 py-1 text-xs text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {sugerencia}
              </button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <div>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Describe el motivo del rechazo (min. 10 caracteres)..."
            maxLength={MAX_CHARS}
            rows={4}
            disabled={isLoading}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 disabled:bg-gray-50"
          />
          <div className="flex justify-between mt-1">
            <span className={`text-xs ${charCount < MIN_CHARS ? 'text-red-500' : 'text-gray-400'}`}>
              {charCount < MIN_CHARS ? `Minimo ${MIN_CHARS} caracteres` : ''}
            </span>
            <span className={`text-xs ${charCount > MAX_CHARS * 0.9 ? 'text-yellow-600' : 'text-gray-400'}`}>
              {charCount}/{MAX_CHARS}
            </span>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Rechazando...' : 'Rechazar documento'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
