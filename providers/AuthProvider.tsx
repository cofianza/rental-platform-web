/**
 * AuthProvider - Contexto de autenticación (HP-95)
 * Inicializa la sesión al cargar la aplicación
 */

'use client'

import { useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const pathname = usePathname()
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const setLoading = useAuthStore((state) => state.setLoading)

  /**
   * Inicializa la sesión al cargar la app
   */
  const initializeAuth = useCallback(async () => {
    // Verificar si hay callback de OAuth en la URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const hasOAuthCallback = hashParams.has('access_token') || hashParams.has('error')

    if (hasOAuthCallback) {
      // Manejar callback de OAuth
      await authService.handleOAuthCallback()
      // Limpiar la URL
      window.history.replaceState(null, '', pathname)
    } else {
      // Verificar sesión existente
      await authService.checkSession()
    }
  }, [pathname])

  useEffect(() => {
    if (!isInitialized) {
      initializeAuth()
    }
  }, [isInitialized, initializeAuth])

  /**
   * Escuchar cambios de sesión de Supabase (para OAuth)
   */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Usuario inició sesión con OAuth
          setLoading(true)
          await authService.checkSession()
          setLoading(false)
        } else if (event === 'SIGNED_OUT') {
          // Sesión de Supabase cerrada
          // El estado ya se maneja en authService.logout()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [setLoading])

  return <>{children}</>
}
