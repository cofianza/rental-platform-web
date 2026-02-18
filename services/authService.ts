/**
 * Servicio de Autenticación - HP-95
 * Llamadas a la API para login, logout, refresh, etc.
 */

import { apiClient, ApiClientError } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { AUTH_MESSAGES, AUTH_ROUTES } from '@/lib/constants'
import type { ILoginCredentials, ILoginResponse, IUser, IAuthError, IMeResponse, IRefreshResponse } from '@/types/auth'

// Nombre de la cookie de sesión para el middleware
const SESSION_COOKIE_NAME = 'hp-session'

/**
 * Establece una cookie de sesión (para que el middleware detecte autenticación)
 */
function setSessionCookie(expiresAt: number): void {
  if (typeof document === 'undefined') return
  const expires = new Date(expiresAt * 1000).toUTCString()
  document.cookie = `${SESSION_COOKIE_NAME}=1; path=/; expires=${expires}; SameSite=Lax`
}

/**
 * Elimina la cookie de sesión
 */
function clearSessionCookie(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${SESSION_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

class AuthService {
  private refreshTimerId: ReturnType<typeof setTimeout> | null = null

  /**
   * Inicia sesión con email y contraseña
   */
  async login(credentials: ILoginCredentials): Promise<ILoginResponse> {
    const store = useAuthStore.getState()
    store.setLoading(true)
    store.clearError()

    try {
      const response = await apiClient.post<ILoginResponse>('/auth/login', credentials)
      const { user, session } = response.data

      // Convertir usuario de login a IUser
      const fullUser: IUser = {
        id: user.id,
        email: user.email,
        rol: user.rol,
      }

      // Guardar en memoria (Zustand)
      store.login(fullUser, session.access_token)

      // Establecer cookie de sesión para el middleware
      setSessionCookie(session.expires_at)

      // Programar refresh antes de expiración (expires_at es Unix timestamp)
      this.scheduleTokenRefreshFromTimestamp(session.expires_at)

      return response.data
    } catch (error) {
      const authError = this.handleAuthError(error)
      store.setError(authError)
      throw authError
    } finally {
      store.setLoading(false)
    }
  }

  /**
   * Cierra sesión
   */
  async logout(): Promise<void> {
    const store = useAuthStore.getState()

    try {
      // Llamar al backend para invalidar el refresh token cookie
      await apiClient.post('/auth/logout')
    } catch {
      // Continuar con logout local aunque falle el servidor
    }

    // Cerrar sesión de Supabase (si hay)
    try {
      await supabase.auth.signOut()
    } catch {
      // Ignorar errores de Supabase
    }

    // Limpiar estado local y cookie de sesión
    store.logout()
    clearSessionCookie()
    this.clearTokenRefreshTimer()
  }

  /**
   * Verifica la sesión actual (al cargar la app)
   * Primero refresca el token, luego obtiene el perfil
   */
  async checkSession(): Promise<IUser | null> {
    const store = useAuthStore.getState()
    store.setLoading(true)

    try {
      // Primero refrescar el token para tener accessToken en memoria
      // Pasamos false para que no haga logout automático si falla
      const token = await this.refreshToken(false)
      if (!token) {
        store.logout()
        clearSessionCookie()
        return null
      }

      // Ahora obtener el perfil del usuario
      const response = await apiClient.get<IMeResponse>('/auth/me')
      const profile = response.data

      // Convertir perfil a IUser
      const user: IUser = {
        id: profile.id,
        email: profile.email,
        nombre_completo: profile.nombre_completo,
        rol: profile.rol,
        activo: profile.activo,
      }

      store.setUser(user)

      // Actualizar cookie de sesión
      const expiresAt = Math.floor(Date.now() / 1000) + 3600 // 1 hora
      setSessionCookie(expiresAt)

      return user
    } catch {
      // Sesión inválida o expirada
      store.logout()
      clearSessionCookie()
      return null
    } finally {
      store.setLoading(false)
      store.setInitialized(true)
    }
  }

  /**
   * Refresca el token de acceso
   * @param logoutOnFail - Si es true, cierra sesión al fallar (default: true)
   */
  async refreshToken(logoutOnFail = true): Promise<string | null> {
    try {
      const response = await apiClient.post<IRefreshResponse>('/auth/refresh')
      const { access_token, expires_at } = response.data

      useAuthStore.getState().setAccessToken(access_token)
      this.scheduleTokenRefreshFromTimestamp(expires_at)

      return access_token
    } catch {
      // Refresh falló
      if (logoutOnFail) {
        await this.logout()
      }
      return null
    }
  }

  /**
   * Inicia Google Sign-In via Supabase OAuth
   */
  async signInWithGoogle(): Promise<void> {
    const store = useAuthStore.getState()
    store.setLoading(true)
    store.clearError()

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${AUTH_ROUTES.LOGIN}`,
        },
      })

      if (error) {
        throw error
      }
      // El usuario será redirigido a Google
      // Al regresar, Supabase establecerá la sesión
    } catch (error) {
      store.setError({
        code: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : AUTH_MESSAGES.SERVER_ERROR,
      })
      store.setLoading(false)
      throw error
    }
  }

  /**
   * Maneja el callback de Supabase OAuth y sincroniza con el backend
   */
  async handleOAuthCallback(): Promise<IUser | null> {
    const store = useAuthStore.getState()
    store.setLoading(true)

    try {
      // Verificar sesión de Supabase
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        return null
      }

      // Sincronizar con nuestro backend
      const user = await this.checkSession()
      return user
    } catch {
      store.logout()
      return null
    } finally {
      store.setLoading(false)
    }
  }

  // ============================================
  // MÉTODOS PRIVADOS
  // ============================================

  /**
   * Programa el refresh del token basándose en expires_at (Unix timestamp)
   */
  private scheduleTokenRefreshFromTimestamp(expiresAt: number): void {
    this.clearTokenRefreshTimer()

    // Calcular milisegundos hasta expiración
    const now = Date.now()
    const expiresAtMs = expiresAt * 1000 // Convertir Unix timestamp a ms
    const timeUntilExpiry = expiresAtMs - now

    // Refrescar 1 minuto antes de expirar
    const refreshTime = timeUntilExpiry - 60 * 1000

    if (refreshTime > 0) {
      this.refreshTimerId = setTimeout(() => {
        this.refreshToken()
      }, refreshTime)
    }
  }

  private clearTokenRefreshTimer(): void {
    if (this.refreshTimerId) {
      clearTimeout(this.refreshTimerId)
      this.refreshTimerId = null
    }
  }

  private handleAuthError(error: unknown): IAuthError {
    if (error instanceof ApiClientError) {
      if (error.statusCode === 401) {
        return {
          code: 'INVALID_CREDENTIALS',
          message: AUTH_MESSAGES.INVALID_CREDENTIALS,
        }
      }
      if (error.statusCode === 403) {
        return {
          code: 'INACTIVE_ACCOUNT',
          message: AUTH_MESSAGES.INACTIVE_ACCOUNT,
        }
      }
    }

    // Error de red
    if (error instanceof Error && error.message.includes('network')) {
      return {
        code: 'NETWORK_ERROR',
        message: AUTH_MESSAGES.NETWORK_ERROR,
      }
    }

    return {
      code: 'SERVER_ERROR',
      message: AUTH_MESSAGES.SERVER_ERROR,
    }
  }
}

// Instancia singleton
export const authService = new AuthService()
