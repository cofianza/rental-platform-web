/**
 * CofianzaLogo — Logo oficial de la marca (triangulo + pildora).
 *
 * SVG inline para no depender de un archivo estatico (escala perfecta a
 * cualquier resolucion y permite override de colores). El logo viene del
 * landing v3 que entrego Mario; los colores son `#10B981` (verde claro,
 * triangulo) y `#047857` (verde oscuro, pildora).
 *
 * Variants:
 *   - <CofianzaLogo />              -> solo el icono, 24x28
 *   - <CofianzaLogo withText />     -> icono + 'cofianza' en negrita
 *   - <CofianzaLogo size={40} />    -> override del alto (mantiene aspect 24:28)
 *   - <CofianzaLogo invert />       -> texto blanco para fondos oscuros
 */

import { cn } from '@/lib/utils'

interface CofianzaLogoProps {
  /** Alto en px del icono. El ancho se calcula manteniendo aspect 24:28. */
  size?: number
  /** Si se renderiza el wordmark 'cofianza' al lado. */
  withText?: boolean
  /** Tamano del wordmark (Tailwind text-* classes). Default: text-xl. */
  textClassName?: string
  /** Texto blanco (para hero oscuro). */
  invert?: boolean
  /** Clases extra al wrapper. */
  className?: string
}

export function CofianzaLogo({
  size = 28,
  withText = false,
  textClassName = 'text-xl',
  invert = false,
  className,
}: CofianzaLogoProps) {
  // Mantenemos aspect ratio 24:28 (ancho:alto) — coincide con el viewBox 96x112.
  const width = Math.round((size * 24) / 28)

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 96 112"
        fill="none"
        width={width}
        height={size}
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="0" y="88" width="96" height="24" rx="12" fill="#047857" />
        <path
          d="M48 4 L88 78 Q90 88 80 88 L16 88 Q6 88 8 78 Z"
          fill="#10B981"
        />
      </svg>
      {withText && (
        <span
          className={cn(
            'font-bold tracking-tight',
            textClassName,
            invert ? 'text-white' : 'text-gray-900',
          )}
        >
          cofianza
        </span>
      )}
    </span>
  )
}
