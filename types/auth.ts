/**
 * Tipos de autenticación - HP-95
 * Interfaces para el sistema de auth con Supabase
 * Alineadas con el backend (HP-94)
 */

/**
 * Roles del sistema
 * - administrador: Acceso total
 * - operador_analista: Gestión de expedientes
 * - gerencia_consulta: Solo lectura/reportes
 * - sin_rol: Usuario sin rol asignado (valor por defecto del backend)
 */
export type UserRole = 'administrador' | 'operador_analista' | 'gerencia_consulta' | 'sin_rol'

/**
 * Usuario básico retornado en login
 * (del auth.user de Supabase)
 */
export interface ILoginUser {
  id: string
  email: string
  rol: UserRole
}

/**
 * Perfil completo del usuario (respuesta de /auth/me y /users)
 * (de la tabla perfiles en Supabase)
 */
export interface IUserProfile {
  id: string
  email: string
  nombre: string
  apellido: string
  nombre_completo?: string // Solo viene de /auth/me (construido en backend)
  telefono?: string | null
  rol: UserRole
  activo?: boolean
  estado?: 'activo' | 'inactivo'
  created_at: string
  updated_at: string
}

/**
 * Usuario unificado para el store (combina ambos)
 */
export interface IUser {
  id: string
  email: string
  nombre_completo?: string
  rol: UserRole
  activo?: boolean
}

/**
 * Credenciales de login
 */
export interface ILoginCredentials {
  email: string
  password: string
}

/**
 * Sesión retornada por el backend
 */
export interface ISession {
  access_token: string
  refresh_token: string
  expires_at: number // Unix timestamp
}

/**
 * Respuesta del endpoint /auth/login
 */
export interface ILoginResponse {
  user: ILoginUser
  session: ISession
}

/**
 * Respuesta del endpoint /auth/me
 * (directamente el perfil, sin wrapper)
 */
export type IMeResponse = IUserProfile

/**
 * Respuesta del endpoint /auth/refresh
 */
export interface IRefreshResponse {
  access_token: string
  refresh_token: string
  expires_at: number
}

/**
 * Códigos de error de autenticación
 */
export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'INACTIVE_ACCOUNT'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'SESSION_EXPIRED'

/**
 * Error de autenticación
 */
export interface IAuthError {
  code: AuthErrorCode
  message: string
}

/**
 * Estado del store de autenticación
 */
export interface IAuthState {
  user: IUser | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  error: IAuthError | null
}
