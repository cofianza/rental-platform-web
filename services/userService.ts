/**
 * Servicio de Usuarios - HP-117
 * Llamadas a la API para CRUD de usuarios
 */

import { apiClient } from '@/lib/api'
import type {
  IUserFilters,
  IUserFormData,
  IUsersResponse,
  IUserResponse,
  IUserProfile,
  IOrphanAuthUser,
} from '@/types/user'

/**
 * Construye query string desde filtros
 */
function buildQueryString(filters: Partial<IUserFilters>): string {
  const params = new URLSearchParams()

  if (filters.search) {
    params.append('search', filters.search)
  }
  if (filters.role) {
    params.append('role', filters.role)
  }
  if (filters.is_active) {
    params.append('is_active', filters.is_active)
  }
  if (filters.page) {
    params.append('page', filters.page.toString())
  }
  if (filters.limit) {
    params.append('limit', filters.limit.toString())
  }
  if (filters.sortBy) {
    params.append('sortBy', filters.sortBy)
  }
  if (filters.sortOrder) {
    params.append('sortOrder', filters.sortOrder)
  }

  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}

class UserService {
  /**
   * Obtiene lista paginada de usuarios con filtros
   */
  async getUsers(filters: Partial<IUserFilters> = {}): Promise<IUsersResponse> {
    const queryString = buildQueryString(filters)

    interface BackendResponse {
      success: boolean
      data: IUserProfile[]
      pagination: {
        total: number
        page: string | number
        limit: string | number
        totalPages: number
      }
    }

    // apiClient.get devuelve directamente el JSON del servidor
    const backendData = (await apiClient.get(`/users${queryString}`)) as unknown as BackendResponse

    // Mapear pagination del backend a meta del frontend
    return {
      success: backendData.success,
      data: backendData.data || [],
      meta: {
        total: backendData.pagination?.total || 0,
        page: Number(backendData.pagination?.page) || 1,
        limit: Number(backendData.pagination?.limit) || 10,
        totalPages: backendData.pagination?.totalPages || 0,
      },
    }
  }

  /**
   * Obtiene un usuario por ID
   */
  async getUserById(id: string): Promise<IUserProfile> {
    const response = (await apiClient.get(`/users/${id}`)) as unknown as IUserResponse
    return response.data
  }

  /**
   * Crea un nuevo usuario
   */
  async createUser(data: IUserFormData): Promise<IUserProfile> {
    const response = (await apiClient.post('/users', data)) as unknown as IUserResponse
    return response.data
  }

  /**
   * Actualiza un usuario existente
   */
  async updateUser(id: string, data: Partial<IUserFormData>): Promise<IUserProfile> {
    const response = (await apiClient.put(`/users/${id}`, data)) as unknown as IUserResponse
    return response.data
  }

  /**
   * Activa un usuario
   */
  async activateUser(id: string): Promise<IUserProfile> {
    const response = (await apiClient.patch(`/users/${id}/activate`)) as unknown as IUserResponse
    return response.data
  }

  /**
   * Desactiva un usuario
   */
  async deactivateUser(id: string): Promise<IUserProfile> {
    const response = (await apiClient.patch(`/users/${id}/deactivate`)) as unknown as IUserResponse
    return response.data
  }

  /**
   * Lista usuarios huérfanos: filas en auth.users sin entrada en perfiles.
   * Quedan cuando un registro falla a mitad de camino. Solo admin.
   */
  async listOrphans(): Promise<IOrphanAuthUser[]> {
    const response = (await apiClient.get('/users/orphans')) as unknown as {
      data: IOrphanAuthUser[]
    }
    return response.data
  }

  /**
   * Borra un usuario por completo (super-admin). Si tiene relaciones
   * bloqueantes, el backend responde 400 con `details.blockers` (mapa
   * tabla → cantidad). Reintenta con force=true para forzar.
   */
  async deleteUser(
    id: string,
    options: { force?: boolean } = {},
  ): Promise<{ deleted: true; user_id: string; email: string | null }> {
    const qs = options.force ? '?force=true' : ''
    const response = (await apiClient.delete(`/users/${id}${qs}`)) as unknown as {
      data: { deleted: true; user_id: string; email: string | null }
    }
    return response.data
  }

  /**
   * Restablece la contrasena de un usuario con una contrasena especifica
   * que el admin elige. Solo admin. Backend valida fuerza (8+ chars,
   * mayuscula, minuscula, numero) y registra audit log.
   */
  async resetPassword(
    id: string,
    password: string,
  ): Promise<{ id: string; email: string; reset: true }> {
    const response = (await apiClient.post(`/users/${id}/reset-password`, { password })) as unknown as {
      data: { id: string; email: string; reset: true }
    }
    return response.data
  }
}

// Instancia singleton
export const userService = new UserService()
