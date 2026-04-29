/**
 * Hook de autenticación - HP-95
 * Proporciona acceso fácil al estado y acciones de auth
 */

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/services/authService'
import { AUTH_ROUTES } from '@/lib/constants'
import type { ILoginCredentials } from '@/types/auth'

export function useAuth() {
  const router = useRouter()

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
        const target = redirectTo && redirectTo.startsWith('/') ? redirectTo : AUTH_ROUTES.DASHBOARD
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
    router.push(AUTH_ROUTES.LOGIN)
  }, [router])

  /**
   * Inicia sesión con Google
   */
  const signInWithGoogle = useCallback(async () => {
    try {
      await authService.signInWithGoogle()
    } catch {
      // Error ya manejado en authService
    }
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
    signInWithGoogle,
    clearError,
  }
}
