/**
 * Hook de autenticación - HP-95
 * Proporciona acceso fácil al estado y acciones de auth
 */

import { useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/services/authService'
import { AUTH_ROUTES } from '@/lib/constants'
import { rutaInterna } from '@/lib/utils'
import type { ILoginCredentials } from '@/types/auth'

export function useAuth() {
  // Estado del store
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const error = useAuthStore((state) => state.error)
  const clearError = useAuthStore((state) => state.clearError)

  /**
   * Inicia sesión con email y contraseña.
   *
   * Usa window.location.replace para garantizar redirect en producción
   * (router.push puede fallar silenciosamente con RSC payloads en ciertos entornos).
   *
   * `redirectTo` permite al caller decidir el destino — útil cuando el
   * visitante venia de la vitrina con intent=interest+property_id y debe
   * volver al inmueble en vez de aterrizar en /dashboard.
   */
  const login = useCallback(
    async (credentials: ILoginCredentials, redirectTo?: string) => {
      try {
        await authService.login(credentials)
        const target = rutaInterna(redirectTo) ?? AUTH_ROUTES.DASHBOARD
        window.location.replace(target)
      } catch {
        // Error ya manejado en authService
      }
    },
    []
  )

  /**
   * Cierra sesión
   */
  const logout = useCallback(async () => {
    await authService.logout()
    // Navegación completa a /login a secas. Al cerrar la sesión, el panel
    // (DashboardShell) salta a /login?redirect=<página actual>; con router.push
    // ganaba ese salto y quien entrara después en ese equipo caía en la última
    // página del usuario anterior. Este replace va después y es el que queda.
    window.location.replace(AUTH_ROUTES.LOGIN)
  }, [])

  return {
    // Estado
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,

    // Acciones
    login,
    logout,
    clearError,
  }
}
