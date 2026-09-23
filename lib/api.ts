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
 * Maneja errores HTTP y retorna un error estructurado.
 * Exportada para las subidas multipart (fetch directo con FormData).
 */
export async function handleApiError(response: Response): Promise<never> {
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

// Endpoints cuyo 401 no se arregla renovando el token (y el refresh o el
// logout, que corren dentro de la renovación, se quedarían esperándose).
const SIN_REINTENTO_401 = ['/auth/login', '/auth/refresh', '/auth/logout']

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  async get<T = unknown>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.send<T>(endpoint, { method: 'GET', ...options })
  }

  async post<T = unknown>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.send<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined, ...options })
  }

  async put<T = unknown>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.send<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined, ...options })
  }

  async patch<T = unknown>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.send<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined, ...options })
  }

  async delete<T = unknown>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.send<T>(endpoint, { method: 'DELETE', ...options })
  }

  private async send<T>(endpoint: string, init: RequestInit, retried = false): Promise<ApiResponse<T>> {
    const sentToken = getAuthToken()
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: buildHeaders(init.headers),
        credentials: 'include', // Incluir cookies JWT
        ...init,
      })

      // Token vencido: tras suspender el equipo o con la pestaña en segundo
      // plano, el refresh programado llega tarde. Se renueva una vez (si otra
      // petición ya lo hizo, basta con repetir) y se repite la petición.
      if (response.status === 401 && sentToken && !retried && !SIN_REINTENTO_401.includes(endpoint)) {
        const actual = getAuthToken()
        // Importación diferida: authService importa este módulo.
        const { authService } = require('@/services/authService')
        const token = actual && actual !== sentToken ? actual : await authService.refreshToken()
        if (token) return this.send<T>(endpoint, init, true)
      }

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
      // Error de red
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
