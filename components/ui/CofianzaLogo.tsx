/**
 * CofianzaLogo — Logo oficial de la marca: la casa (base `#047857`, techo `#10B981`) y el nombre
 * «Cofi» (`#0F172A`) + «anza» (`#10B981`), como en la landing v2 de Gerencia (2-oct-2026) y el
 * reporte de la Oficina Virtual (25-nov, punto 15).
 *
 * SVG inline para no depender de un archivo estatico (escala perfecta a cualquier resolucion).
 *
 * Variants:
 *   - <CofianzaLogo />              -> solo la casa, 28x28
 *   - <CofianzaLogo withText />     -> casa + «Cofianza»
 *   - <CofianzaLogo size={40} />    -> override del tamano (cuadrado)
 *   - <CofianzaLogo invert />       -> «Cofi» en blanco para fondos oscuros
 */

import { cn } from '@/lib/utils'

interface CofianzaLogoProps {
  /** Lado en px de la casa (es cuadrada). */
  size?: number
  /** Si se renderiza el nombre «Cofianza» al lado. */
  withText?: boolean
  /** Tamano del nombre (Tailwind text-* classes). Default: text-xl. */
  textClassName?: string
  /** «Cofi» en blanco (para fondos oscuros). */
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
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        width={size}
        height={size}
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="4" y="20" width="32" height="18" rx="2" fill="#047857" />
        <path d="M20 4L38 20H2L20 4Z" fill="#10B981" />
      </svg>
      {withText && (
        <span
          className={cn(
            'font-display font-black tracking-tight',
            textClassName,
            invert ? 'text-white' : 'text-ink-900',
          )}
        >
          Cofi<span className={invert ? 'text-primary-400' : 'text-primary-500'}>anza</span>
        </span>
      )}
    </span>
  )
}
