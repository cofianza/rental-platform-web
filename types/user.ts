/**
 * Tipos de usuarios - HP-117
 * Interfaces para el CRUD de usuarios
 */

import type { UserRole, IUserProfile } from './auth'

// Re-exportar para conveniencia
export type { UserRole, IUserProfile }

/**
 * Filtros de búsqueda de usuarios
 */
export interface IUserFilters {
  search: string
  role: UserRole | ''
  is_active: 'true' | 'false' | ''
  page: number
  limit: number
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

/**
 * Datos del formulario de usuario (crear/editar)
 */
export interface IUserFormData {
  email: string
  nombre: string
  apellido: string
  telefono?: string
  rol: UserRole
}

/**
 * Metadatos de paginación
 */
export interface IUsersMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Respuesta paginada del endpoint GET /users
 */
export interface IUsersResponse {
  success: boolean
  data: IUserProfile[]
  meta: IUsersMeta
}

/**
 * Respuesta de crear/actualizar usuario
 */
export interface IUserResponse {
  success: boolean
  data: IUserProfile
}

/**
 * Estado del modal de usuario
 */
export type UserModalMode = 'create' | 'edit' | null

/**
 * Estado del store de usuarios
 */
export interface IUsersState {
  users: IUserProfile[]
  meta: IUsersMeta | null
  filters: IUserFilters
  isLoading: boolean
  error: string | null
  selectedUser: IUserProfile | null
  modalMode: UserModalMode
}
