/**
 * RoleGuard - Proteccion de paginas por rol/permiso
 * Redirige a /dashboard/403 si el usuario no tiene acceso
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuthStore } from '@/stores/auth.store'
import type { Resource, Action } from '@/types/permissions'
import type { UserRole } from '@/types/auth'

interface RoleGuardProps {
  children: React.ReactNode
  roles?: UserRole[]
  resource?: Resource
  action?: Action
  fallback?: React.ReactNode
}

export function RoleGuard({
  children,
  roles,
  resource,
  action = 'read',
  fallback = null,
}: RoleGuardProps) {
  const router = useRouter()
  const { hasRole, canAccess } = usePermissions()
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const permissions = useAuthStore((state) => state.permissions)

  const isReady = isInitialized && isAuthenticated && permissions !== null

  const hasAccess = (() => {
    if (!isReady) return false
    if (roles && !hasRole(roles)) return false
    if (resource && !canAccess(resource, action)) return false
    if (!roles && !resource) return true
    return true
  })()

  useEffect(() => {
    if (isReady && !hasAccess) {
      router.replace('/dashboard/403')
    }
  }, [isReady, hasAccess, router])

  if (!isReady || !hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
