/**
 * ConfirmDialog - Diálogo de confirmación con botones Cancelar/Confirmar
 * Client Component - usa Modal internamente
 */

'use client'

import { useId, useRef, useState, type ReactNode } from 'react'
import { IconLoader } from '@/components/icons'
import { Modal, ModalAcciones, botonModal } from './Modal'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<unknown>
  title: string
  /** Texto o contenido (p. ej. una lista); va en un bloque, no en un párrafo. */
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  isLoading?: boolean
  /** Falta algo que se pide dentro del mensaje (p. ej. un motivo obligatorio). */
  confirmDisabled?: boolean
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
  confirmDisabled = false,
}: ConfirmDialogProps) {
  // Esperamos a que onConfirm termine antes de cerrar. Asi:
  //   - Si el padre setea isLoading=true al inicio de la accion, el boton
  //     muestra "Procesando..." mientras dura la operacion (antes el dialog
  //     se cerraba inmediato porque la lectura de isLoading era stale).
  //   - Si onConfirm es sincrono (no devuelve promise), await resuelve
  //     instantaneo y el cierre se ve igual que antes.
  // El padre tambien puede cerrar el dialog cambiando isOpen — onClose()
  // aqui es idempotente por seguridad.
  // Un doble clic llega antes de que el padre pinte isLoading: sin este
  // candado la acción (aprobar, eliminar, enviar…) corría dos veces.
  const enCurso = useRef(false)
  const [ocupado, setOcupado] = useState(false)
  const handleConfirm = async () => {
    if (enCurso.current) return
    enCurso.current = true
    setOcupado(true)
    try {
      await onConfirm()
    } finally {
      enCurso.current = false
      setOcupado(false)
      onClose()
    }
  }
  const bloqueado = isLoading || ocupado
  const mensajeId = useId()

  return (
    // Mientras dice «Procesando…» la acción ya corre: la X y Escape no cierran,
    // para no dar a entender que se canceló. Va encima: casi siempre se abre
    // sobre otro diálogo o sobre una tarjeta con su propio modal.
    <Modal
      isOpen={isOpen}
      onClose={bloqueado ? () => {} : onClose}
      title={title}
      size="sm"
      encima
      ariaDescribedBy={mensajeId}
      footer={
        <ModalAcciones>
          <button
            type="button"
            autoFocus={variant === 'danger'}
            onClick={onClose}
            disabled={bloqueado}
            className={botonModal('secondary')}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            autoFocus={variant !== 'danger'}
            onClick={handleConfirm}
            disabled={bloqueado || confirmDisabled}
            aria-busy={bloqueado || undefined}
            className={botonModal(variant === 'danger' ? 'danger' : 'primary')}
          >
            {bloqueado && <IconLoader size={16} className="animate-spin" />}
            {bloqueado ? 'Procesando…' : confirmLabel}
          </button>
        </ModalAcciones>
      }
    >
      <div id={mensajeId} className="text-sm leading-relaxed text-gray-700">
        {message}
      </div>
    </Modal>
  )
}
