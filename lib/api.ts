/**
 * Cliente HTTP para comunicación con el backend API
 * Configurado para /api/v1/ con manejo de errores consistente
 */

import { API_BASE_URL, ERROR_MESSAGES } from './constants'

// ============================================
// TIPOS
// ============================================

export interface ApiResponse<T = unknown> {
  data: T
  message?: string
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Array<{
      field: string
      message: string
    }>
  }
}

export interface ApiListResponse<T = unknown> {
  data: T[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ============================================
// CONFIGURACIÓN
// ============================================

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
}

/**
 * Obtiene el token JWT de autenticación desde el store de Zustand
 * HP-95: Token en memoria, no en localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null

  // Importación dinámica para evitar dependencias circulares
  const { useAuthStore } = require('@/stores/auth.store')
  return useAuthStore.getState().accessToken
}

/**
 * Construye headers con autenticación si está disponible
 */
function buildHeaders(customHeaders?: HeadersInit): HeadersInit {
  const headers = { ...DEFAULT_HEADERS, ...customHeaders }
  const token = getAuthToken()

  if (token) {
    return {
      ...headers,
      Authorization: `Bearer ${token}`,
    }
  }

  return headers
}

// ============================================
// MANEJO DE ERRORES
// ============================================

class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: Array<{ field: string; message: string }>
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

/**
 * Maneja errores HTTP y retorna un error estructurado
 */
async function handleApiError(response: Response): Promise<never> {
  let errorData: ApiError | null = null

  try {
    errorData = await response.json()
  } catch {
    // Si no se puede parsear el JSON, usar mensajes por defecto
  }

  const statusCode = response.status

  // Mapear códigos HTTP a mensajes
  let message: string = ERROR_MESSAGES.SERVER_ERROR
  let code: string = 'UNKNOWN_ERROR'

  if (statusCode === 401) {
    message = ERROR_MESSAGES.UNAUTHORIZED
    code = 'UNAUTHORIZED'
  } else if (statusCode === 404) {
    message = ERROR_MESSAGES.NOT_FOUND
    code = 'NOT_FOUND'
  } else if (statusCode === 400) {
    message = ERROR_MESSAGES.VALIDATION_ERROR
    code = 'VALIDATION_ERROR'
  }

  // Si hay datos de error del servidor, usarlos
  // Backend retorna: { success, errorCode, message, details? }
  const serverData = errorData as Record<string, unknown> | null
  if (serverData?.message) {
    message = serverData.message as string
    code = (serverData.errorCode as string) || code
  } else if (serverData?.error) {
    const err = serverData.error as Record<string, unknown>
    message = (err.message as string) || message
    code = (err.code as string) || code
  }

  throw new ApiClientError(
    message,
    statusCode,
    code,
    (serverData?.details as ApiClientError['details']) ?? undefined
  )
}

// ============================================
// CLIENTE HTTP
// ============================================

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  /**
   * Realiza una petición GET
   */
  async get<T = unknown>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: buildHeaders(options?.headers),
        credentials: 'include', // Incluir cookies JWT
        ...options,
      })

      if (!response.ok) {
        await handleApiError(response)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error
      }
      // Error de red
      throw new ApiClientError(ERROR_MESSAGES.NETWORK_ERROR, 0, 'NETWORK_ERROR')
    }
  }

  /**
   * Realiza una petición POST
   */
  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: buildHeaders(options?.headers),
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
        ...options,
      })

      if (!response.ok) {
        await handleApiError(response)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error
      }
      throw new ApiClientError(ERROR_MESSAGES.NETWORK_ERROR, 0, 'NETWORK_ERROR')
    }
  }

  /**
   * Realiza una petición PUT
   */
  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: buildHeaders(options?.headers),
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
        ...options,
      })

      if (!response.ok) {
        await handleApiError(response)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error
      }
      throw new ApiClientError(ERROR_MESSAGES.NETWORK_ERROR, 0, 'NETWORK_ERROR')
    }
  }

  /**
   * Realiza una petición PATCH
   */
  async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PATCH',
        headers: buildHeaders(options?.headers),
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
        ...options,
      })

      if (!response.ok) {
        await handleApiError(response)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error
      }
      throw new ApiClientError(ERROR_MESSAGES.NETWORK_ERROR, 0, 'NETWORK_ERROR')
    }
  }

  /**
   * Realiza una petición DELETE
   */
  async delete<T = unknown>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: buildHeaders(options?.headers),
        credentials: 'include',
        ...options,
      })

      if (!response.ok) {
        await handleApiError(response)
      }

      // DELETE puede retornar 204 No Content
      if (response.status === 204) {
        return { data: null as T }
      }

      return await response.json()
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error
      }
      throw new ApiClientError(ERROR_MESSAGES.NETWORK_ERROR, 0, 'NETWORK_ERROR')
    }
  }
}

// ============================================
// INSTANCIA POR DEFECTO
// ============================================

/**
 * Instancia por defecto del cliente API
 * Usar en toda la aplicación para comunicación con el backend
 */
export const apiClient = new ApiClient()

// Re-exportar para uso directo
export { ApiClientError }
