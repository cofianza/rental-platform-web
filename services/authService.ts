/**
 * Servicio de Autenticación - HP-95
 * Llamadas a la API para login, logout, refresh, etc.
 */

import { apiClient, ApiClientError } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { AUTH_MESSAGES, AUTH_ROUTES } from '@/lib/constants'
import type { ILoginCredentials, ILoginResponse, IUser, IAuthError, IMeResponse, IRefreshResponse, IMyProfile, IUpdateMyProfilePayload } from '@/types/auth'
import type { PermissionsResponse } from '@/types/permissions'

// Nombre de la cookie de sesión para el middleware
const SESSION_COOKIE_NAME = 'hp-session'

// Clave de localStorage para el refresh token
const REFRESH_TOKEN_KEY = 'hp-rt'

/**
 * Establece una cookie de sesión (para que el middleware detecte autenticación)
 * Dura 30 dias (alineada con el refresh token de Supabase, no con el access token)
 */
function setSessionCookie(): void {
  if (typeof document === 'undefined') return
  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  const expires = new Date(Date.now() + thirtyDays).toUTCString()
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
  private refreshPromise: Promise<string | null> | null = null

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

      // Persistir refresh token para sobrevivir recargas de pagina
      localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token)

      // Establecer cookie de sesión para el middleware
      setSessionCookie()

      // Programar refresh antes de expiración (expires_at es Unix timestamp)
      this.scheduleTokenRefreshFromTimestamp(session.expires_at)

      // Cargar permisos en background (no bloquear el login/redirect)
      this.fetchPermissions()

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

    // Limpiar estado local, cookie de sesión y refresh token
    store.logout()
    clearSessionCookie()
    localStorage.removeItem(REFRESH_TOKEN_KEY)
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

      // Cargar permisos del usuario
      await this.fetchPermissions()

      // Renovar cookie de sesión
      setSessionCookie()

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
   * Refresca el token de acceso.
   * Usa deduplicacion: si ya hay un refresh en curso, reutiliza esa promesa
   * para evitar que dos llamadas simultáneas roten el token y una falle.
   */
  async refreshToken(logoutOnFail = true): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise

    this.refreshPromise = this.doRefreshToken(logoutOnFail)
    try {
      return await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  private async doRefreshToken(logoutOnFail: boolean): Promise<string | null> {
    try {
      const refresh_token = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (!refresh_token) return null

      const response = await apiClient.post<IRefreshResponse>('/auth/refresh', { refresh_token })
      const { access_token, refresh_token: new_refresh_token, expires_at } = response.data

      useAuthStore.getState().setAccessToken(access_token)
      this.scheduleTokenRefreshFromTimestamp(expires_at)
      setSessionCookie()

      // Actualizar el refresh token almacenado (rotacion de tokens)
      if (new_refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, new_refresh_token)
      }

      return access_token
    } catch {
      // Refresh falló
      localStorage.removeItem(REFRESH_TOKEN_KEY)
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
      // Verificar usuario autenticado en Supabase (getUser valida el JWT server-side)
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()

      if (!supabaseUser) {
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
  // RECUPERACIÓN DE CONTRASEÑA
  // ============================================

  /**
   * Solicita un enlace de recuperación de contraseña
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/forgot-password', { email })
    return response.data
  }

  /**
   * Valida que un token de reset sea válido y no haya expirado
   */
  async validateResetToken(token: string): Promise<{ valid: boolean }> {
    const response = await apiClient.get<{ valid: boolean }>(`/auth/reset-password/${token}`)
    return response.data
  }

  /**
   * Restablece la contraseña usando un token válido
   */
  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/reset-password', { token, password })
    return response.data
  }

  // ============================================
  // REGISTRO PUBLICO
  // ============================================

  async registerPropietario(data: Record<string, unknown>): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/register/propietario', data)
    return response.data
  }

  async registerInmobiliaria(data: Record<string, unknown>): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/register/inmobiliaria', data)
    return response.data
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await apiClient.get<{ message: string }>(`/auth/register/verify-email/${token}`)
    return response.data
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/register/resend-verification', { email })
    return response.data
  }

  // ============================================
  // MI CUENTA — perfil extendido editable por el usuario
  // ============================================

  async getMyProfile(): Promise<IMyProfile> {
    const response = await apiClient.get<IMyProfile>('/auth/me/perfil')
    return response.data
  }

  async updateMyProfile(payload: IUpdateMyProfilePayload): Promise<IMyProfile> {
    const response = await apiClient.patch<IMyProfile>('/auth/me/perfil', payload)
    return response.data
  }

  // ============================================
  // PERMISOS RBAC
  // ============================================

  /**
   * Carga los permisos del usuario desde el backend
   */
  async fetchPermissions(): Promise<void> {
    try {
      const response = await apiClient.get<PermissionsResponse>('/auth/permissions')
      useAuthStore.getState().setPermissions(response.data.permissions)
    } catch {
      useAuthStore.getState().setPermissions(null)
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
        // El backend distingue EMAIL_NOT_CONFIRMED vs INVALID_CREDENTIALS
        // para que la UI muestre banner warning + CTA de reenvío.
        if (error.code === 'EMAIL_NOT_CONFIRMED') {
          return {
            code: 'EMAIL_NOT_CONFIRMED',
            message: AUTH_MESSAGES.EMAIL_NOT_CONFIRMED,
          }
        }
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
