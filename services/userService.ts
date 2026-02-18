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
        size: string | number
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
        size: Number(backendData.pagination?.size) || 10,
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
}

// Instancia singleton
export const userService = new UserService()
