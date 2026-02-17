/**
 * Tipos globales de la aplicación
 * Re-exporta tipos de mock-data y añade tipos adicionales
 */

export type {
  MockInmueble,
  MockSolicitante,
  MockExpediente,
  MockUsuario,
  MockKPI,
} from '@/lib/mock-data'

export type {
  EstadoExpediente,
  EstadoInmueble,
  EstadoConfig,
  NavItem,
} from '@/lib/constants'

export type {
  ApiResponse,
  ApiError,
  ApiListResponse,
} from '@/lib/api'

// Tipos de autenticación (HP-95)
export type {
  UserRole,
  IUser,
  ILoginCredentials,
  ILoginResponse,
  IMeResponse,
  AuthErrorCode,
  IAuthError,
  IAuthState,
} from './auth'
