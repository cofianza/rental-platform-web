/**
 * Servicio de Estudios de Riesgo Crediticio
 * Llamadas a la API para estudios
 */

import { apiClient, ApiClient } from '@/lib/api'
import type {
  IEstudio,
  IEstudioListItem,
  IEstudioFilters,
  IEstudiosMeta,
  ICreateEstudioInput,
  IEstudioPublicForm,
  ISubmitFormularioInput,
  ISendLinkResponse,
  IRegistrarResultadoInput,
  ICertificadoPresignedUrlResponse,
  ICertificadoViewUrlResponse,
} from '@/types/estudio'

// ============================================
// Authenticated endpoints
// ============================================

export const estudioService = {
  /**
   * Lista todos los estudios (global)
   */
  async listAll(
    filters: IEstudioFilters,
  ): Promise<{ data: IEstudioListItem[]; pagination: IEstudiosMeta }> {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.estado.length > 0) params.set('estado', filters.estado.join(','))
    if (filters.resultado) params.set('resultado', filters.resultado)
    if (filters.proveedor) params.set('proveedor', filters.proveedor)
    if (filters.fecha_desde) params.set('fecha_desde', filters.fecha_desde)
    if (filters.fecha_hasta) params.set('fecha_hasta', filters.fecha_hasta)
    params.set('page', String(filters.page))
    params.set('limit', String(filters.limit))
    params.set('sortBy', filters.sortBy)
    params.set('sortOrder', filters.sortOrder)

    const res = await apiClient.get<IEstudioListItem[]>(`/estudios?${params.toString()}`)
    return res as unknown as { data: IEstudioListItem[]; pagination: IEstudiosMeta }
  },

  /**
   * Lista estudios de un expediente
   */
  async getEstudiosForExpediente(
    expedienteId: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: IEstudio[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    const res = await apiClient.get<IEstudio[]>(
      `/expedientes/${expedienteId}/estudios?page=${page}&limit=${limit}`,
    )
    return res as unknown as { data: IEstudio[]; pagination: { total: number; page: number; limit: number; totalPages: number } }
  },

  /**
   * Obtiene un estudio por ID
   */
  async getEstudioById(estudioId: string): Promise<IEstudio> {
    const res = await apiClient.get<IEstudio>(`/estudios/${estudioId}`)
    return res.data
  },

  /**
   * Crea un nuevo estudio para un expediente
   */
  async createEstudio(expedienteId: string, data: ICreateEstudioInput): Promise<IEstudio> {
    const res = await apiClient.post<IEstudio>(
      `/expedientes/${expedienteId}/estudios`,
      data,
    )
    return res.data
  },

  /**
   * Cancela un estudio
   */
  async cancelEstudio(estudioId: string): Promise<IEstudio> {
    const res = await apiClient.patch<IEstudio>(`/estudios/${estudioId}/cancelar`)
    return res.data
  },

  /**
   * Envia enlace self-service al solicitante
   */
  async enviarEnlace(estudioId: string): Promise<ISendLinkResponse> {
    const res = await apiClient.post<ISendLinkResponse>(
      `/estudios/${estudioId}/enviar-enlace`,
    )
    return res.data
  },

  /**
   * Registra el resultado de un estudio (irreversible)
   */
  async registrarResultado(estudioId: string, data: IRegistrarResultadoInput): Promise<IEstudio> {
    const res = await apiClient.patch<IEstudio>(
      `/estudios/${estudioId}/resultado`,
      data,
    )
    return res.data
  },

  /**
   * Obtiene URL presigned para subir certificado PDF
   */
  async getCertificadoPresignedUrl(
    estudioId: string,
    nombreOriginal: string,
    tamanoBytes: number,
  ): Promise<ICertificadoPresignedUrlResponse> {
    const res = await apiClient.post<ICertificadoPresignedUrlResponse>(
      `/estudios/${estudioId}/certificado/presigned-url`,
      { nombre_original: nombreOriginal, tamano_bytes: tamanoBytes },
    )
    return res.data
  },

  /**
   * Sube archivo al signed URL con progreso via XHR
   */
  uploadCertificadoToSignedUrl(
    signedUrl: string,
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', signedUrl)
      xhr.setRequestHeader('Content-Type', file.type || 'application/pdf')

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve()
        else reject(new Error(`Upload failed: ${xhr.status}`))
      }
      xhr.onerror = () => reject(new Error('Upload failed'))
      xhr.send(file)
    })
  },

  /**
   * Obtiene URL firmada para ver/descargar certificado
   */
  async getCertificadoViewUrl(estudioId: string): Promise<ICertificadoViewUrlResponse> {
    const res = await apiClient.get<ICertificadoViewUrlResponse>(
      `/estudios/${estudioId}/certificado/url`,
    )
    return res.data
  },
}

// ============================================
// Public endpoints (no auth needed)
// ============================================

const publicClient = new ApiClient()

export const estudioPublicService = {
  /**
   * Obtiene datos del formulario publico por token
   */
  async getFormulario(token: string): Promise<IEstudioPublicForm> {
    const res = await publicClient.get<IEstudioPublicForm>(
      `/public/estudios/${token}/formulario`,
    )
    return res.data
  },

  /**
   * Envia el formulario publico
   */
  async submitFormulario(token: string, data: ISubmitFormularioInput): Promise<{ message: string }> {
    const res = await publicClient.post<{ message: string }>(
      `/public/estudios/${token}/formulario`,
      data,
    )
    return res.data
  },
}
