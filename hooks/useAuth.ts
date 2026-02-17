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
   * Inicia sesión con email y contraseña
   */
  const login = useCallback(
    async (credentials: ILoginCredentials) => {
      try {
        await authService.login(credentials)
        router.push(AUTH_ROUTES.DASHBOARD)
      } catch {
        // Error ya manejado en authService
      }
    },
    [router]
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
