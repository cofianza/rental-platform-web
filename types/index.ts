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

// Tipos de usuarios (HP-117)
export type {
  IUserProfile,
  IUserFilters,
  IUserFormData,
  IUsersMeta,
  IUsersResponse,
  IUserResponse,
  UserModalMode,
  IUsersState,
} from './user'

// Tipos de documentos (HP-295)
export type {
  EstadoDocumento,
  ITipoDocumento,
  IDocumento,
  IPresignedUrlRequest,
  IPresignedUrlResponse,
  IConfirmarSubidaRequest,
  IListDocumentosQuery,
  IDocumentosListResponse,
  IDocumentoResponse,
  ITiposDocumentoResponse,
  UploadStatus,
  IDocumentoUploadState,
  IDocumentosProgress,
} from './documento'
