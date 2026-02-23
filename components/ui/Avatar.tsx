/**
 * Avatar - Muestra iniciales del usuario con color determinista
 * Server Component - no requiere interactividad
 */

import { cn } from '@/lib/utils'

export interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Paleta de 8 colores para avatares
const AVATAR_COLORS = [
  'bg-primary-600',
  'bg-blue-600',
  'bg-purple-600',
  'bg-pink-600',
  'bg-orange-600',
  'bg-green-600',
  'bg-indigo-600',
  'bg-red-600',
] as const

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
} as const

/**
 * Genera iniciales desde un nombre completo
 * Toma la primera letra de la primera y última palabra
 */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)

  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].charAt(0).toUpperCase()

  const firstInitial = words[0].charAt(0).toUpperCase()
  const lastInitial = words[words.length - 1].charAt(0).toUpperCase()

  return `${firstInitial}${lastInitial}`
}

/**
 * Genera un índice de color determinista basado en el nombre
 * Mismo nombre = mismo color siempre
 */
function getColorIndex(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % AVATAR_COLORS.length
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const initials = getInitials(name)
  const colorClass = AVATAR_COLORS[getColorIndex(name)]
  const sizeClass = SIZES[size]

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-semibold shrink-0',
        colorClass,
        sizeClass,
        className
      )}
      title={name}
    >
      {initials}
    </div>
  )
}
