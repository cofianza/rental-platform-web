/**
 * Modal - Diálogo modal genérico con overlay
 * Client Component - requiere interactividad
 */

'use client'

import { useEffect, useCallback, useId, useRef, type ReactNode } from 'react'
import { IconX } from '@/components/icons'
import { buttonClasses } from './Button'
import { cn } from '@/lib/utils'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  /** Una línea bajo el título: qué decide o qué pasa aquí. Se anuncia como descripción del diálogo. */
  description?: ReactNode
  /** Pie fijo (no se desplaza con el cuerpo). Las acciones van en `<ModalAcciones>`:
   *  la secundaria primero y la principal al final (a la derecha en pantallas
   *  anchas; arriba y a lo ancho en el celular). */
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  children: React.ReactNode
  className?: string
  /** Nombre accesible cuando no hay `title` (p. ej. dialogos con titulo propio). */
  ariaLabel?: string
  /** Un clic fuera del panel cierra. Apagado por defecto: en un formulario
   *  (sobre todo en el celular) tiraba lo escrito. Solo para visores y
   *  detalles de solo lectura; Escape y la X cierran siempre. */
  closeOnBackdrop?: boolean
  /** El hijo trae su propio encabezado, cuerpo y pie: el panel no agrega
   *  título ni padding, y `className` define su tamaño y forma. */
  bare?: boolean
  /** Diálogo que se abre encima de otro modal. */
  encima?: boolean
  /** Id de un elemento propio que describe el diálogo (aria-describedby), si no se usa `description`. */
  ariaDescribedBy?: string
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
  description,
  footer,
  size = 'md',
  children,
  className,
  ariaLabel,
  closeOnBackdrop = false,
  bare = false,
  encima = false,
  ariaDescribedBy,
}: ModalProps) {
  const titleId = useId()
  const descId = useId()
  const contentRef = useRef<HTMLDivElement>(null)
  const restaurarFocoRef = useRef<HTMLElement | null>(null)
  const idRef = useRef(Symbol('modal'))
  // onClose va en un ref: la mayoría de padres lo pasa inline, y como el efecto
  // de foco dependía de él, cada tecla en un campo del diálogo lo desmontaba y
  // montaba otra vez — el foco saltaba al botón de fondo y volvía, rompiendo
  // las tildes (teclas muertas) y el lector de pantalla.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Escape cierra; Tab/Shift+Tab se quedan dentro del dialogo (trampa de foco).
  // Un popup interno que ya atendió Escape (preventDefault) no cierra el diálogo.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (pila[pila.length - 1] !== idRef.current) return
      if (event.defaultPrevented) return
      if (event.key === 'Escape') {
        onCloseRef.current()
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
    []
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
      className={cn('fixed inset-0 flex items-center justify-center', encima ? 'z-[60]' : 'z-50', !bare && 'p-3 sm:p-4')}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : ariaLabel}
      aria-describedby={description && title && !bare ? descId : ariaDescribedBy}
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
            : cn('relative bg-white rounded-lg shadow-xl w-full flex flex-col outline-none', 'max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)]', SIZES[size]),
          'animate-in fade-in zoom-in-95 duration-200',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {bare ? (
          children
        ) : (
          <>
            {/* Encabezado (no se encoge): título, una línea de contexto y cerrar. */}
            {title && (
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 py-3 pl-4 pr-2 sm:py-4 sm:pl-6 sm:pr-3">
                <div className="min-w-0 pt-1.5">
                  <h2 id={titleId} className="break-words text-base font-semibold leading-snug text-gray-900 sm:text-lg">
                    {title}
                  </h2>
                  {description && (
                    <p id={descId} className="mt-1 text-sm leading-relaxed text-gray-600">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  data-modal-close
                  onClick={onClose}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  aria-label="Cerrar"
                >
                  <IconX size={20} />
                </button>
              </div>
            )}

            {/* Cuerpo: es lo único que se desplaza cuando el contenido no cabe. */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">{children}</div>

            {/* Pie fijo: las acciones siempre a la vista, también a 390 px. */}
            {footer && (
              <div className="shrink-0 rounded-b-lg border-t border-gray-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
                {footer}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Fila de acciones del pie. Orden en el código: la secundaria (Cancelar) y al
 * final la principal. En pantallas anchas quedan a la derecha, la principal en
 * el extremo; en el celular se apilan a lo ancho con la principal arriba.
 */
export function ModalAcciones({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end',
        '[&>*]:w-full sm:[&>*]:w-auto',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Botón de diálogo: la misma forma que `Button`, con 40 px de alto. */
export function botonModal(variante: 'primary' | 'secondary' | 'danger' = 'secondary', className?: string) {
  return buttonClasses(variante, 'md', cn('min-h-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1', className))
}
