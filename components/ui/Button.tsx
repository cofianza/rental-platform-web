/**
 * Button — botón de acción con una sola forma para toda la app.
 *
 * Antes cada pantalla estilaba el suyo: el mismo "Nuevo estudio" era coral y
 * negrita en una lista y verde y normal en otra, con cinco radios distintos.
 * La variante decide el color; la forma (radio, peso, relleno) es la misma.
 * Para un Link que se ve como botón, usar `buttonClasses()`.
 */

import { cn } from '@/lib/utils'

type Variante = 'primary' | 'accent' | 'secondary' | 'danger'
type Tamano = 'sm' | 'md'

const VARIANTES: Record<Variante, string> = {
  // Contraste AA (P29): el blanco va sobre verde 700 (5,5:1; sobre 600 da 3,8:1)
  // y sobre coral el texto es ink-900 (6,4:1; blanco da 2,8:1).
  primary: 'bg-primary-700 text-white hover:bg-primary-800',
  // Coral: CTA de acento de la marca (pantallas de la Oficina Virtual).
  accent: 'bg-coral-500 text-ink-900 hover:bg-coral-400',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

const TAMANOS: Record<Tamano, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

export function buttonClasses(variante: Variante = 'primary', tamano: Tamano = 'md', className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    VARIANTES[variante],
    TAMANOS[tamano],
    className,
  )
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  tamano?: Tamano
}

export function Button({ variante = 'primary', tamano = 'md', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variante, tamano, className)} {...props} />
}
