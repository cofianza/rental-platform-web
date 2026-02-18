/**
 * AuthProvider - Contexto de autenticación (HP-95)
 * Inicializa la sesión al cargar la aplicación.
 * Se ejecuta UNA sola vez (useRef guard) para evitar llamadas dobles a la API.
 */

'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/auth.store'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const pathname = usePathname()
  const initCalled = useRef(false)

  useEffect(() => {
    // Guard: solo inicializar una vez por montaje
    if (initCalled.current) return
    initCalled.current = true

    const initialize = async () => {
      // Verificar si hay callback de OAuth en la URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const hasOAuthCallback = hashParams.has('access_token') || hashParams.has('error')

      if (hasOAuthCallback) {
        await authService.handleOAuthCallback()
        window.history.replaceState(null, '', pathname)
      } else {
        await authService.checkSession()
      }
    }

    // Solo inicializar si no está ya inicializado (e.g. hot reload)
    if (!useAuthStore.getState().isInitialized) {
      initialize()
    }
  }, [pathname])

  return <>{children}</>
}
