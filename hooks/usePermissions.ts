/**
 * Hook de permisos RBAC - Cofianza 2.0
 * Proporciona acceso al estado de permisos del usuario actual
 */

import { useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import type { Resource, Action } from '@/types/permissions'
import type { UserRole } from '@/types/auth'

export function usePermissions() {
  const user = useAuthStore((state) => state.user)
  const permissions = useAuthStore((state) => state.permissions)

  const userRole = user?.rol ?? null

  /**
   * Verifica si el usuario tiene un rol especifico
   */
  const hasRole = useCallback(
    (role: UserRole | UserRole[]): boolean => {
      if (!userRole) return false
      if (Array.isArray(role)) return role.includes(userRole)
      return userRole === role
    },
    [userRole],
  )

  /**
   * Verifica si el usuario puede realizar una accion en un recurso
   */
  const canAccess = useCallback(
    (resource: Resource, action: Action): boolean => {
      if (!permissions) return false
      const resourceActions = permissions[resource]
      if (!resourceActions) return false
      return resourceActions.includes(action)
    },
    [permissions],
  )

  /**
   * Verifica si el usuario puede acceder a un recurso (cualquier accion excepto read_own)
   */
  const canAccessResource = useCallback(
    (resource: Resource): boolean => {
      if (!permissions) return false
      const resourceActions = permissions[resource]
      if (!Array.isArray(resourceActions) || resourceActions.length === 0) return false
      return resourceActions.some((a) => a !== 'read_own')
    },
    [permissions],
  )

  /**
   * Retorna la lista de acciones permitidas para un recurso
   */
  const getActions = useCallback(
    (resource: Resource): Action[] => {
      if (!permissions) return []
      return permissions[resource] ?? []
    },
    [permissions],
  )

  return {
    userRole,
    permissions,
    hasRole,
    canAccess,
    canAccessResource,
    getActions,
    isAdmin: userRole === 'administrador',
  }
}
