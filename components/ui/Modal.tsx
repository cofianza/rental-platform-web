/**
 * Modal - Diálogo modal genérico con overlay
 * Client Component - requiere interactividad
 */

'use client'

import { useEffect, useCallback } from 'react'
import { IconX } from '@/components/icons'
import { cn } from '@/lib/utils'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const

export function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  className,
}: ModalProps) {
  // Cerrar con tecla Escape
  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevenir scroll del body
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        className={cn(
          'relative bg-white rounded-lg shadow-xl w-full',
          'animate-in fade-in zoom-in-95 duration-200',
          SIZES[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Cerrar modal"
            >
              <IconX size={20} className="text-gray-500" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}
