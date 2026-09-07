'use client'

/**
 * Dialogo que pide un motivo (texto) antes de confirmar una accion. Reemplaza
 * a window.prompt, que la casa no usa: sin estilo, sin validacion y bloquea la
 * pestana. Misma familia que ConfirmDialog.
 */

import { useState } from 'react'
import { Modal } from './Modal'

export interface MotivoDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (motivo: string) => void | Promise<unknown>
  title: string
  label?: string
  placeholder?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  isLoading?: boolean
  /** Largo minimo del motivo para habilitar el boton (default 5). */
  minLength?: number
}

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'

export function MotivoDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  label = 'Motivo',
  placeholder,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Volver',
  variant = 'default',
  isLoading = false,
  minLength = 5,
}: MotivoDialogProps) {
  const [motivo, setMotivo] = useState('')
  const valido = motivo.trim().length >= minLength

  const confirmar = async () => {
    if (!valido || isLoading) return
    await onConfirm(motivo.trim())
    setMotivo('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-3">
        <label className="block text-xs font-medium text-gray-700">
          {label}
          <textarea
            autoFocus
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={placeholder}
            disabled={isLoading}
            className={`${INPUT_CLASS} mt-1`}
          />
        </label>
        {!valido && motivo.length > 0 && (
          <p className="text-xs text-gray-500">Escribe al menos {minLength} caracteres.</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={!valido || isLoading}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 ${
              variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {isLoading ? 'Guardando…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
