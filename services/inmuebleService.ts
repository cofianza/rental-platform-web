/**
 * Servicio de Inmuebles - HP-174
 * Llamadas a la API para CRUD de inmuebles + upload de fotos
 */

import { apiClient } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import type {
  IInmueble,
  IInmuebleFilters,
  IInmuebleCreateData,
  IInmuebleUpdateData,
  IInmueblesResponse,
  IInmuebleResponse,
  IFilterOptions,
  IFilterOptionsResponse,
  IInmueblesMeta,
  IFotoInmueble,
  IFotoInmuebleCreate,
  IFotoInmuebleUpdate,
  IFotosInmuebleResponse,
  IFotoInmuebleResponse,
} from '@/types/inmueble'
import { FOTO_LIMITS } from '@/types/inmueble'
import type {
  ICambioInmueble,
  ICambiosResumen,
  ICambiosResponse,
  ICambiosResumenResponse,
} from '@/types/cambio-inmueble'

const BUCKET_NAME = 'inmuebles'

/**
 * Construye query string desde filtros
 */
function buildQueryString(filters: Partial<IInmuebleFilters>): string {
  const params = new URLSearchParams()

  if (filters.search) params.append('search', filters.search)
  if (filters.tipo) params.append('tipo', filters.tipo)
  if (filters.ciudad) params.append('ciudad', filters.ciudad)
  if (filters.estado) params.append('estado', filters.estado)
  if (filters.estrato !== '' && filters.estrato !== undefined) {
    params.append('estrato', filters.estrato.toString())
  }
  if (filters.propietario_id) params.append('propietario_id', filters.propietario_id)
  if (filters.visible_vitrina !== '' && filters.visible_vitrina !== undefined) {
    params.append('visible_vitrina', filters.visible_vitrina.toString())
  }
  if (filters.rent_min !== '' && filters.rent_min !== undefined) {
    params.append('rent_min', filters.rent_min.toString())
  }
  if (filters.rent_max !== '' && filters.rent_max !== undefined) {
    params.append('rent_max', filters.rent_max.toString())
  }
  if (filters.page) params.append('page', filters.page.toString())
  if (filters.limit) params.append('limit', filters.limit.toString())
  if (filters.sortBy) params.append('sortBy', filters.sortBy)
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)

  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}

class InmuebleService {
  /**
   * Obtiene lista paginada de inmuebles con filtros
   */
  async getInmuebles(filters: Partial<IInmuebleFilters> = {}): Promise<{
    data: IInmueble[]
    meta: IInmueblesMeta
  }> {
    const queryString = buildQueryString(filters)

    const response = (await apiClient.get(
      `/inmuebles${queryString}`
    )) as unknown as IInmueblesResponse

    return {
      data: response.data || [],
      meta: {
        total: response.pagination?.total || 0,
        page: Number(response.pagination?.page) || 1,
        limit: Number(response.pagination?.limit) || 10,
        totalPages: response.pagination?.totalPages || 0,
      },
    }
  }

  /**
   * Obtiene un inmueble por ID con datos del propietario
   */
  async getInmuebleById(id: string): Promise<IInmueble> {
    const response = (await apiClient.get(`/inmuebles/${id}`)) as unknown as IInmuebleResponse
    return response.data
  }

  /**
   * Crea un nuevo inmueble
   */
  async createInmueble(data: IInmuebleCreateData): Promise<IInmueble> {
    const response = (await apiClient.post('/inmuebles', data)) as unknown as IInmuebleResponse
    return response.data
  }

  /**
   * Actualiza un inmueble existente (parcial)
   */
  async updateInmueble(id: string, data: IInmuebleUpdateData): Promise<IInmueble> {
    const response = (await apiClient.patch(
      `/inmuebles/${id}`,
      data
    )) as unknown as IInmuebleResponse
    return response.data
  }

  /**
   * Elimina un inmueble (baja lógica - solo admin)
   */
  async deleteInmueble(id: string): Promise<IInmueble> {
    const response = (await apiClient.delete(`/inmuebles/${id}`)) as unknown as IInmuebleResponse
    return response.data
  }

  /**
   * Obtiene opciones de filtros dinámicos
   */
  async getFilterOptions(): Promise<IFilterOptions> {
    const response = (await apiClient.get(
      '/inmuebles/filtros/opciones'
    )) as unknown as IFilterOptionsResponse
    return response.data
  }

  /**
   * Búsqueda avanzada de inmuebles (para vitrina)
   */
  async searchInmuebles(params: {
    keyword?: string
    city?: string
    state?: string
    property_type?: string
    stratum_min?: number
    stratum_max?: number
    rent_min?: number
    rent_max?: number
    area_min?: number
    area_max?: number
    bedrooms_min?: number
    bathrooms_min?: number
    neighborhood?: string
    status?: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: string
  }): Promise<{
    data: IInmueble[]
    meta: IInmueblesMeta
  }> {
    const queryParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        queryParams.append(key, value.toString())
      }
    })

    const queryString = queryParams.toString()
    const response = (await apiClient.get(
      `/inmuebles/buscar${queryString ? `?${queryString}` : ''}`
    )) as unknown as IInmueblesResponse

    return {
      data: response.data || [],
      meta: {
        total: response.pagination?.total || 0,
        page: Number(response.pagination?.page) || 1,
        limit: Number(response.pagination?.limit) || 20,
        totalPages: response.pagination?.totalPages || 0,
      },
    }
  }

  /**
   * Sube una foto de fachada a Supabase Storage
   * @returns URL pública de la imagen
   */
  async uploadFotoFachada(file: File, inmuebleId?: string): Promise<string> {
    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tipo de archivo no permitido. Solo se aceptan JPEG, PNG y WebP.')
    }

    // Validar tamaño (5MB max)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error('El archivo excede el tamaño máximo de 5MB.')
    }

    // Upload via backend API (uses service_role_key for Storage access)
    const formData = new FormData()
    formData.append('file', file)
    if (inmuebleId) formData.append('inmueble_id', inmuebleId)

    const { useAuthStore } = await import('@/stores/auth.store')
    const token = useAuthStore.getState().accessToken
    const { API_BASE_URL } = await import('@/lib/constants')

    const res = await fetch(`${API_BASE_URL}/inmuebles/upload-fachada`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(err?.message || 'Error al subir la imagen. Por favor, intenta de nuevo.')
    }

    const json = await res.json()
    return json.data?.url || json.url || ''
  }

  /**
   * Elimina una foto de Supabase Storage
   */
  async deleteFotoFachada(url: string): Promise<void> {
    // Extraer el path del archivo desde la URL
    const bucketUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/`
    const filePath = url.replace(bucketUrl, '')

    if (!filePath) {
      console.warn('No se pudo extraer el path del archivo')
      return
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (error) {
      console.error('Error deleting file:', error)
      // No lanzar error, solo loguear
    }
  }

  /**
   * Obtiene los expedientes asociados a un inmueble
   * Usa GET /expedientes?inmueble_id=... del módulo de expedientes
   */
  async getExpedientesByInmueble(inmuebleId: string) {
    const { expedienteService } = await import('./expedienteService')
    return expedienteService.getExpedientes({ inmueble_id: inmuebleId, limit: 50 })
  }

  /**
   * Obtiene el historial de cambios de un inmueble (paginado)
   */
  async getCambios(
    inmuebleId: string,
    params?: { page?: number; limit?: number; campo?: string; usuario_id?: string }
  ): Promise<{
    data: ICambioInmueble[]
    pagination: { total: number; page: number; limit: number; totalPages: number }
  }> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.campo) queryParams.append('campo', params.campo)
    if (params?.usuario_id) queryParams.append('usuario_id', params.usuario_id)
    const qs = queryParams.toString()

    const response = (await apiClient.get(
      `/inmuebles/${inmuebleId}/cambios${qs ? `?${qs}` : ''}`
    )) as unknown as ICambiosResponse

    return {
      data: response.data || [],
      pagination: response.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 },
    }
  }

  /**
   * Obtiene el resumen del historial de cambios de un inmueble
   */
  async getCambiosResumen(inmuebleId: string): Promise<ICambiosResumen> {
    const response = (await apiClient.get(
      `/inmuebles/${inmuebleId}/cambios/resumen`
    )) as unknown as ICambiosResumenResponse
    return response.data
  }

  /**
   * Actualiza la visibilidad del inmueble en la vitrina
   */
  async toggleVisibleVitrina(id: string, visible: boolean): Promise<IInmueble> {
    const response = (await apiClient.patch(
      `/inmuebles/${id}/visibility`,
      { visible_vitrina: visible }
    )) as unknown as IInmuebleResponse
    return response.data
  }

  // ============================================
  // FOTOS DEL INMUEBLE - HP-203
  // ============================================

  /**
   * Obtiene las fotos de un inmueble ordenadas
   */
  async getFotos(inmuebleId: string): Promise<IFotoInmueble[]> {
    try {
      const response = (await apiClient.get(
        `/inmuebles/${inmuebleId}/fotos`
      )) as unknown as IFotosInmuebleResponse
      return response.data || []
    } catch (error) {
      console.error('Error fetching fotos:', error)
      return []
    }
  }

  /**
   * Sube una foto a Supabase Storage y la registra en el backend
   * @returns La foto creada
   */
  async uploadFoto(
    inmuebleId: string,
    file: File,
    options?: { descripcion?: string; orden?: number; es_fachada?: boolean }
  ): Promise<IFotoInmueble> {
    // Validar tipo de archivo
    const allowedTypes: readonly string[] = FOTO_LIMITS.ALLOWED_TYPES
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tipo de archivo no permitido. Solo se aceptan JPEG, PNG y WebP.')
    }

    // Validar tamaño
    if (file.size > FOTO_LIMITS.MAX_FILE_SIZE) {
      throw new Error('El archivo excede el tamaño máximo de 5MB.')
    }

    // Generar nombre único para el archivo
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const fileName = `${inmuebleId}/fotos/${timestamp}-${randomId}.${fileExt}`

    // Subir a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      throw new Error('Error al subir la imagen. Por favor, intenta de nuevo.')
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uploadData.path)

    // Registrar en el backend
    const fotoData: IFotoInmuebleCreate = {
      url: urlData.publicUrl,
      descripcion: options?.descripcion,
      orden: options?.orden,
      es_fachada: options?.es_fachada,
      tamaño_archivo: file.size,
      tipo_archivo: file.type,
    }

    const response = (await apiClient.post(
      `/inmuebles/${inmuebleId}/fotos`,
      fotoData
    )) as unknown as IFotoInmuebleResponse

    return response.data
  }

  /**
   * Actualiza una foto (descripción, orden, es_fachada)
   */
  async updateFoto(
    inmuebleId: string,
    fotoId: string,
    data: IFotoInmuebleUpdate
  ): Promise<IFotoInmueble> {
    const response = (await apiClient.patch(
      `/inmuebles/${inmuebleId}/fotos/${fotoId}`,
      data
    )) as unknown as IFotoInmuebleResponse
    return response.data
  }

  /**
   * Elimina una foto del storage y del backend
   */
  async deleteFoto(inmuebleId: string, fotoId: string, fotoUrl: string): Promise<void> {
    // Eliminar del storage
    const bucketUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/`
    const filePath = fotoUrl.replace(bucketUrl, '')

    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath])

      if (storageError) {
        console.error('Error deleting from storage:', storageError)
      }
    }

    // Eliminar del backend
    await apiClient.delete(`/inmuebles/${inmuebleId}/fotos/${fotoId}`)
  }

  /**
   * Reordena las fotos de un inmueble
   * @param fotoIds Array de IDs en el nuevo orden
   */
  async reordenarFotos(inmuebleId: string, fotoIds: string[]): Promise<IFotoInmueble[]> {
    const response = (await apiClient.patch(
      `/inmuebles/${inmuebleId}/fotos/reordenar`,
      { foto_ids: fotoIds }
    )) as unknown as IFotosInmuebleResponse
    return response.data
  }

  /**
   * Marca una foto como fachada principal
   */
  async setFotoFachada(inmuebleId: string, fotoId: string): Promise<IFotoInmueble> {
    return this.updateFoto(inmuebleId, fotoId, { es_fachada: true })
  }
}

// Instancia singleton
export const inmuebleService = new InmuebleService()
