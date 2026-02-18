/**
 * Badges de Usuario - HP-117
 * Componentes de badges para rol y estado
 */

import type { UserRole } from '@/types/user'
import { ROLE_LABELS, ROLE_BADGE_CLASSES, STATUS_BADGE_CLASSES } from './constants'

interface RoleBadgeProps {
  role: UserRole
}

/**
 * Badge de rol con colores distintivos
 */
export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE_CLASSES[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  )
}

interface StatusBadgeProps {
  activo: boolean
}

/**
 * Badge de estado activo/inactivo
 */
export function StatusBadge({ activo }: StatusBadgeProps) {
  const classes = activo ? STATUS_BADGE_CLASSES.activo : STATUS_BADGE_CLASSES.inactivo

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}
    >
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  )
}
