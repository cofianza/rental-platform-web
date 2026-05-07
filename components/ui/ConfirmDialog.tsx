/**
 * ConfirmDialog - Diálogo de confirmación con botones Cancelar/Confirmar
 * Client Component - usa Modal internamente
 */

'use client'

import { Modal } from './Modal'
import { cn } from '@/lib/utils'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<unknown>
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  isLoading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  // Esperamos a que onConfirm termine antes de cerrar. Asi:
  //   - Si el padre setea isLoading=true al inicio de la accion, el boton
  //     muestra "Procesando..." mientras dura la operacion (antes el dialog
  //     se cerraba inmediato porque la lectura de isLoading era stale).
  //   - Si onConfirm es sincrono (no devuelve promise), await resuelve
  //     instantaneo y el cierre se ve igual que antes.
  // El padre tambien puede cerrar el dialog cambiando isOpen — onClose()
  // aqui es idempotente por seguridad.
  const handleConfirm = async () => {
    try {
      await onConfirm()
    } finally {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{message}</p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              'border border-gray-300 text-gray-700',
              'hover:bg-gray-50',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {cancelLabel}
          </button>

          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              'text-white',
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-primary-600 hover:bg-primary-700',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLoading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
