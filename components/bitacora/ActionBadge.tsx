'use client'

import { ACTION_LABELS, ACTION_PREFIX_COLORS } from './constants'

interface ActionBadgeProps {
  action: string
}

const DEFAULT_COLOR = { bg: 'bg-gray-100', text: 'text-gray-800' }

export function ActionBadge({ action }: ActionBadgeProps) {
  const label = ACTION_LABELS[action] || action
  // Por prefijo, no por acción exacta: el mapa anterior solo cubría 11 slugs y
  // el resto de la bitácora quedaba en gris indistinguible.
  const colors = ACTION_PREFIX_COLORS.find(([p]) => action.startsWith(p))?.[1] ?? DEFAULT_COLOR

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      {label}
    </span>
  )
}
