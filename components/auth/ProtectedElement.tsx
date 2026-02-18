/**
 * ProtectedElement - Renderizado condicional por permisos
 * No renderiza nada en el DOM si el usuario no tiene permiso
 */

'use client'

import { usePermissions } from '@/hooks/usePermissions'
import type { Resource, Action } from '@/types/permissions'
import type { UserRole } from '@/types/auth'

interface ProtectedElementProps {
  children: React.ReactNode
  roles?: UserRole[]
  resource?: Resource
  action?: Action
  fallback?: React.ReactNode
}

export function ProtectedElement({
  children,
  roles,
  resource,
  action = 'read',
  fallback = null,
}: ProtectedElementProps) {
  const { hasRole, canAccess } = usePermissions()

  const hasAccess = (() => {
    if (roles && !hasRole(roles)) return false
    if (resource && !canAccess(resource, action)) return false
    if (!roles && !resource) return true
    return true
  })()

  if (!hasAccess) return <>{fallback}</>

  return <>{children}</>
}
