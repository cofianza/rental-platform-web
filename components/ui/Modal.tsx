/**
 * Modal - Diálogo modal genérico con overlay
 * Client Component - requiere interactividad
 */

'use client'

import { useEffect, useCallback, useId, useRef } from 'react'
import { IconX } from '@/components/icons'
import { cn } from '@/lib/utils'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  children: React.ReactNode
  className?: string
  /** Nombre accesible cuando no hay `title` (p. ej. dialogos con titulo propio). */
  ariaLabel?: string
  /** false en formularios: un clic fuera del panel no debe tirar lo escrito. */
  closeOnBackdrop?: boolean
  /** El hijo trae su propio encabezado, cuerpo y pie: el panel no agrega
   *  título ni padding, y `className` define su tamaño y forma. */
  bare?: boolean
  /** Diálogo que se abre encima de otro modal. */
  encima?: boolean
}

// Bloqueo de scroll con contador: un ConfirmDialog abierto sobre otro Modal
// no destraba la pagina al cerrarse, y se restaura el overflow que hubiera.
let bloqueos = 0
let overflowPrevio = ''
function bloquearScroll() {
  if (bloqueos++ === 0) {
    overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
}
function liberarScroll() {
  bloqueos = Math.max(0, bloqueos - 1)
  if (bloqueos === 0) document.body.style.overflow = overflowPrevio
}

// Pila de diálogos abiertos: con un diálogo encima de otro (ConfirmDialog
// sobre un Modal, comparar versiones sobre el detalle del contrato) solo el de
// arriba atiende Escape y la trampa de foco. Sin esto, Escape cerraba los dos
// y las dos trampas se peleaban el foco.
const pila: symbol[] = []

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
} as const

export function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  className,
  ariaLabel,
  closeOnBackdrop = true,
  bare = false,
  encima = false,
}: ModalProps) {
  const titleId = useId()
  const contentRef = useRef<HTMLDivElement>(null)
  const restaurarFocoRef = useRef<HTMLElement | null>(null)
  const idRef = useRef(Symbol('modal'))

  // Escape cierra; Tab/Shift+Tab se quedan dentro del dialogo (trampa de foco).
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (pila[pila.length - 1] !== idRef.current) return
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !contentRef.current) return
      const nodos = Array.from(contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      )
      if (nodos.length === 0) {
        event.preventDefault()
        return
      }
      const primero = nodos[0]
      const ultimo = nodos[nodos.length - 1]
      const activo = document.activeElement as HTMLElement | null
      if (event.shiftKey && (activo === primero || !contentRef.current.contains(activo))) {
        event.preventDefault()
        ultimo.focus()
      } else if (!event.shiftKey && activo === ultimo) {
        event.preventDefault()
        primero.focus()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (!isOpen) return
    restaurarFocoRef.current = document.activeElement as HTMLElement | null
    const id = idRef.current
    pila.push(id)
    document.addEventListener('keydown', handleKeyDown)
    bloquearScroll()
    // Foco inicial: el primer control del cuerpo (un `autoFocus` hijo gana);
    // se salta el boton de cerrar para no invitar a cerrar por accidente.
    const t = setTimeout(() => {
      const root = contentRef.current
      if (!root) return
      if (root.contains(document.activeElement) && document.activeElement !== document.body) return
      const primero = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).find(
        (el) => el.offsetParent !== null && !el.hasAttribute('data-modal-close')
      )
      ;(primero ?? root).focus()
    }, 0)

    return () => {
      clearTimeout(t)
      const i = pila.lastIndexOf(id)
      if (i >= 0) pila.splice(i, 1)
      document.removeEventListener('keydown', handleKeyDown)
      liberarScroll()
      restaurarFocoRef.current?.focus?.()
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div
      className={cn('fixed inset-0 flex items-center justify-center', encima ? 'z-[60]' : 'z-50', !bare && 'p-4')}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : ariaLabel}
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal content. Layout flex column con max-height del viewport
          para que cuando el contenido sea largo, el body haga scroll
          interno y el header (titulo + boton cerrar) quede sticky. */}
      <div
        ref={contentRef}
        tabIndex={-1}
        className={cn(
          bare
            ? 'relative bg-white shadow-xl w-full outline-none'
            : cn('relative bg-white rounded-lg shadow-xl w-full flex flex-col outline-none', 'max-h-[calc(100vh-2rem)]', SIZES[size]),
          'animate-in fade-in zoom-in-95 duration-200',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {bare ? (
          children
        ) : (
          <>
            {/* Header (no se encoge) */}
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                <h2 id={titleId} className="text-lg font-semibold text-gray-900">
                  {title}
                </h2>
                <button
                  type="button"
                  data-modal-close
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  aria-label="Cerrar"
                >
                  <IconX size={20} className="text-gray-500" />
                </button>
              </div>
            )}

            {/* Body — scroll interno cuando el contenido excede el viewport */}
            <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">{children}</div>
          </>
        )}
      </div>
    </div>
  )
}
