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
} from '@/types/inmueble'

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
        size: Number(response.pagination?.size) || 10,
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
        size: Number(response.pagination?.size) || 20,
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

    // Generar nombre único para el archivo
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const fileName = inmuebleId
      ? `${inmuebleId}/${timestamp}-${randomId}.${fileExt}`
      : `temp/${timestamp}-${randomId}.${fileExt}`

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Error uploading file:', error)
      throw new Error('Error al subir la imagen. Por favor, intenta de nuevo.')
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path)

    return urlData.publicUrl
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
}

// Instancia singleton
export const inmuebleService = new InmuebleService()
