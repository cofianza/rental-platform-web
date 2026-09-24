/**
 * AuthProvider - Contexto de autenticación (HP-95)
 * Inicializa la sesión al cargar la aplicación.
 * Se ejecuta UNA sola vez (useRef guard) para evitar llamadas dobles a la API.
 */

'use client'

import { useEffect, useRef } from 'react'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/auth.store'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const initCalled = useRef(false)

  useEffect(() => {
    // Guard: solo inicializar una vez por montaje
    if (initCalled.current) return
    initCalled.current = true

    // Solo inicializar si no está ya inicializado (e.g. hot reload)
    if (!useAuthStore.getState().isInitialized) {
      authService.checkSession()
    }
  }, [])

  return <>{children}</>
}
