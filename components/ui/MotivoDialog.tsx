'use client'

/**
 * Dialogo que pide un motivo (texto) antes de confirmar una accion. Reemplaza
 * a window.prompt, que la casa no usa: sin estilo, sin validacion y bloquea la
 * pestana. Misma familia que ConfirmDialog.
 */

import { useId, useState, type ReactNode } from 'react'
import { IconLoader } from '@/components/icons'
import { Modal, ModalAcciones, botonModal } from './Modal'

export interface MotivoDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (motivo: string) => void | Promise<unknown>
  title: string
  /** Qué pasa al confirmar; va antes del campo del motivo. */
  descripcion?: ReactNode
  label?: string
  placeholder?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  isLoading?: boolean
  /** Largo minimo del motivo para habilitar el boton (default 5). */
  minLength?: number
  /** Texto con que abre (p. ej. lo que ya se escribió en otro diálogo). Se toma al montar. */
  valorInicial?: string
}

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'

export function MotivoDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  descripcion,
  label = 'Motivo',
  placeholder,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Volver',
  variant = 'default',
  isLoading = false,
  minLength = 5,
  valorInicial = '',
}: MotivoDialogProps) {
  const [motivo, setMotivo] = useState(valorInicial)
  const valido = motivo.trim().length >= minLength
  const campoId = useId()
  const ayudaId = useId()

  const confirmar = async () => {
    if (!valido || isLoading) return
    // `false` = la acción falló: el motivo escrito se conserva para reintentar.
    if ((await onConfirm(motivo.trim())) !== false) setMotivo('')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      title={title}
      size="sm"
      encima
      footer={
        <ModalAcciones>
          <button type="button" onClick={onClose} disabled={isLoading} className={botonModal('secondary')}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={!valido || isLoading}
            aria-busy={isLoading || undefined}
            className={botonModal(variant === 'danger' ? 'danger' : 'primary')}
          >
            {isLoading && <IconLoader size={16} className="animate-spin" />}
            {isLoading ? 'Guardando…' : confirmLabel}
          </button>
        </ModalAcciones>
      }
    >
      <div className="space-y-3">
        {descripcion && <div className="text-sm leading-relaxed text-gray-700">{descripcion}</div>}
        <div>
          <label htmlFor={campoId} className="block text-sm font-medium text-gray-700">
            {label} {minLength > 0 && <span className="text-red-600" aria-hidden="true">*</span>}
          </label>
          <textarea
            id={campoId}
            autoFocus
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            maxLength={500}
            required={minLength > 0}
            aria-describedby={ayudaId}
            placeholder={placeholder}
            disabled={isLoading}
            className={`${INPUT_CLASS} mt-1`}
          />
          <p id={ayudaId} className={`mt-1 text-xs ${!valido && motivo.length > 0 ? 'text-amber-800' : 'text-gray-500'}`}>
            {!valido && motivo.length > 0
              ? `Escriba al menos ${minLength} caracteres.`
              : minLength > 0
                ? `Obligatorio, mínimo ${minLength} caracteres.`
                : 'Opcional.'}
          </p>
        </div>
      </div>
    </Modal>
  )
}
