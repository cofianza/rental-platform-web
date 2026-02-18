'use client'

import { ACTION_LABELS, ACTION_COLORS } from './constants'

interface ActionBadgeProps {
  action: string
}

const DEFAULT_COLOR = { bg: 'bg-gray-100', text: 'text-gray-800' }

export function ActionBadge({ action }: ActionBadgeProps) {
  const label = ACTION_LABELS[action] || action
  const colors = ACTION_COLORS[action] || DEFAULT_COLOR

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      {label}
    </span>
  )
}
