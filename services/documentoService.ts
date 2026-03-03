/**
 * Servicio de Documentos - HP-295
 * Llamadas a la API para documentos de expedientes
 */

import { apiClient } from '@/lib/api'
import type {
  IDocumento,
  ITipoDocumento,
  IPresignedUrlRequest,
  IPresignedUrlResponse,
  IConfirmarSubidaRequest,
  IListDocumentosQuery,
  IPendientesRevisionResponse,
  IRevisionHistorial,
  IDocumentoUrlResponse,
  IReemplazarDocumentoRequest,
  IReemplazarPresignedResponse,
  IConfirmarReemplazoRequest,
  IVersionesResponse,
  IDocumentoMetadatos,
} from '@/types/documento'

// ============================================
// URL Cache
// ============================================

interface CachedUrl {
  url: string
  expiresAt: number // Unix timestamp ms
}

const MIN_REMAINING_MS = 2 * 60 * 1000 // Refresh if < 2 min remaining

// ============================================
// Helpers
// ============================================

/**
 * Construye query string para listar documentos
 */
function buildQueryString(query: IListDocumentosQuery): string {
  const params = new URLSearchParams()

  if (query.page) params.append('page', query.page.toString())
  if (query.limit) params.append('limit', query.limit.toString())
  if (query.tipo_documento_id) params.append('tipo_documento_id', query.tipo_documento_id)
  if (query.estado) params.append('estado', query.estado)
  if (query.sortBy) params.append('sortBy', query.sortBy)
  if (query.sortOrder) params.append('sortOrder', query.sortOrder)

  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}

// ============================================
// Service
// ============================================

class DocumentoService {
  private viewUrlCache = new Map<string, CachedUrl>()
  private downloadUrlCache = new Map<string, CachedUrl>()

  private getCachedUrl(cache: Map<string, CachedUrl>, id: string): string | null {
    const cached = cache.get(id)
    if (!cached) return null
    if (cached.expiresAt - Date.now() < MIN_REMAINING_MS) {
      cache.delete(id)
      return null
    }
    return cached.url
  }

  private setCachedUrl(cache: Map<string, CachedUrl>, id: string, url: string, expiresInSeconds: number) {
    cache.set(id, { url, expiresAt: Date.now() + expiresInSeconds * 1000 })
  }

  /**
   * Obtiene la lista de tipos de documento activos
   */
  async getTiposDocumento(): Promise<ITipoDocumento[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.get('/tipos-documento')) as any
    return response.data || []
  }

  /**
   * Obtiene documentos de un expediente con filtros y paginacion
   */
  async getDocumentosByExpediente(
    expedienteId: string,
    query: IListDocumentosQuery = {}
  ): Promise<{
    documentos: IDocumento[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }> {
    const queryString = buildQueryString(query)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.get(
      `/expedientes/${expedienteId}/documentos${queryString}`
    )) as any

    return {
      documentos: response.data || [],
      pagination: response.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 },
    }
  }

  /**
   * Obtiene detalle de un documento por ID
   */
  async getDocumentoById(id: string): Promise<IDocumento> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.get(`/documentos/${id}`)) as any
    return response.data
  }

  /**
   * Solicita una URL presignada para subir un archivo
   */
  async getPresignedUrl(data: IPresignedUrlRequest): Promise<IPresignedUrlResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.post('/documentos/presigned-url', data)) as any
    return response.data
  }

  /**
   * Sube un archivo directamente a la URL presignada
   * @param signedUrl URL presignada de Supabase Storage
   * @param file Archivo a subir
   * @param onProgress Callback para progreso (0-100)
   */
  async uploadToSignedUrl(
    signedUrl: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100)
          onProgress(progress)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Error al subir archivo: ${xhr.status} ${xhr.statusText}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Error de red al subir archivo'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('Subida de archivo cancelada'))
      })

      xhr.open('PUT', signedUrl)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    })
  }

  /**
   * Confirma la subida exitosa de un archivo
   */
  async confirmarSubida(data: IConfirmarSubidaRequest): Promise<IDocumento> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.post('/documentos/confirmar-subida', data)) as any
    return response.data
  }

  /**
   * Flujo completo de subida de documento:
   * 1. Obtener URL presignada
   * 2. Subir archivo a storage
   * 3. Confirmar subida en backend
   * HP-327: Ahora acepta metadatos opcionales para selfies/captura con camara
   */
  async uploadDocument(
    expedienteId: string,
    tipoDocumentoId: string,
    file: File,
    onProgress?: (progress: number) => void,
    metadatos?: IDocumentoMetadatos
  ): Promise<IDocumento> {
    // 1. Solicitar URL presignada
    const presignedData = await this.getPresignedUrl({
      expediente_id: expedienteId,
      tipo_documento_id: tipoDocumentoId,
      nombre_original: file.name,
      tipo_mime: file.type,
      tamano_bytes: file.size,
    })

    // 2. Subir archivo a storage
    await this.uploadToSignedUrl(presignedData.signedUrl, file, onProgress)

    // 3. Confirmar subida (HP-327: include metadatos)
    const documento = await this.confirmarSubida({
      expediente_id: expedienteId,
      tipo_documento_id: tipoDocumentoId,
      nombre_original: file.name,
      nombre_archivo: presignedData.nombre_archivo,
      storage_key: presignedData.storage_key,
      tipo_mime: file.type,
      tamano_bytes: file.size,
      metadatos,
    })

    return documento
  }

  /**
   * Elimina un documento (solo si estado = pendiente)
   */
  async deleteDocumento(id: string): Promise<void> {
    await apiClient.delete(`/documentos/${id}`)
  }

  /**
   * Aprueba un documento
   */
  async aprobarDocumento(id: string): Promise<IDocumento> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.patch(`/documentos/${id}/aprobar`)) as any
    return response.data
  }

  /**
   * Rechaza un documento con motivo
   */
  async rechazarDocumento(id: string, motivo: string): Promise<IDocumento> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.patch(`/documentos/${id}/rechazar`, {
      motivo_rechazo: motivo,
    })) as any
    return response.data
  }

  /**
   * Obtiene documentos pendientes de revision de un expediente
   */
  async getPendientesRevision(expedienteId: string): Promise<IPendientesRevisionResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.get(
      `/expedientes/${expedienteId}/documentos/pendientes-revision`
    )) as any
    return response.data
  }

  /**
   * Obtiene historial de revisiones de un documento
   */
  async getHistorialRevision(id: string): Promise<IRevisionHistorial[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.get(`/documentos/${id}/historial-revision`)) as any
    return response.data || []
  }

  /**
   * Obtiene URL segura de visualizacion (15 min, con cache)
   */
  async getViewUrl(documentoId: string): Promise<IDocumentoUrlResponse> {
    const cached = this.getCachedUrl(this.viewUrlCache, documentoId)
    if (cached) {
      return { url: cached, nombre_original: '', tipo_mime: null, expires_in: 0 }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.get(`/documentos/${documentoId}/url-visualizacion`)) as any
    const data = response.data as IDocumentoUrlResponse
    this.setCachedUrl(this.viewUrlCache, documentoId, data.url, data.expires_in)
    return data
  }

  /**
   * Obtiene URL segura de descarga (con nombre original, con cache)
   */
  async getDownloadUrl(documentoId: string): Promise<IDocumentoUrlResponse> {
    const cached = this.getCachedUrl(this.downloadUrlCache, documentoId)
    if (cached) {
      return { url: cached, nombre_original: '', tipo_mime: null, expires_in: 0 }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.get(`/documentos/${documentoId}/url-descarga`)) as any
    const data = response.data as IDocumentoUrlResponse
    this.setCachedUrl(this.downloadUrlCache, documentoId, data.url, data.expires_in)
    return data
  }

  /**
   * Valida un archivo antes de subirlo
   * @returns null si es valido, mensaje de error si no
   */
  validateFile(
    file: File,
    tipoDocumento: ITipoDocumento
  ): string | null {
    // Validar tipo MIME
    if (!tipoDocumento.formatos_aceptados.includes(file.type)) {
      const formatosLegibles = tipoDocumento.formatos_aceptados
        .map((f) => {
          const parts = f.split('/')
          return parts[1]?.toUpperCase() || f
        })
        .join(', ')
      return `Formato no permitido. Formatos aceptados: ${formatosLegibles}`
    }

    // Validar tamano
    const maxBytes = tipoDocumento.tamano_maximo_mb * 1024 * 1024
    if (file.size > maxBytes) {
      return `El archivo excede el tamano maximo de ${tipoDocumento.tamano_maximo_mb}MB`
    }

    return null
  }

  /**
   * Obtiene la URL publica de un documento (si existe)
   */
  getDocumentUrl(documento: IDocumento): string | null {
    if (documento.archivo_url) {
      return documento.archivo_url
    }
    return null
  }

  /**
   * Determina si un documento se puede previsualizar en el navegador
   */
  canPreview(documento: IDocumento): boolean {
    if (!documento.tipo_mime) return false
    return (
      documento.tipo_mime.startsWith('image/') ||
      documento.tipo_mime === 'application/pdf'
    )
  }

  /**
   * Determina si es una imagen
   */
  isImage(documento: IDocumento): boolean {
    return documento.tipo_mime?.startsWith('image/') || false
  }

  /**
   * Formatea el tamano del archivo
   */
  formatFileSize(bytes: number | null): string {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // ============================================
  // Reemplazo de documentos rechazados
  // ============================================

  /**
   * Inicia reemplazo de un documento rechazado (obtiene presigned URL)
   */
  async iniciarReemplazo(
    docId: string,
    data: IReemplazarDocumentoRequest
  ): Promise<IReemplazarPresignedResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.post(`/documentos/${docId}/reemplazar`, data)) as any
    return response.data
  }

  /**
   * Confirma la subida del documento de reemplazo
   */
  async confirmarReemplazo(
    docId: string,
    data: IConfirmarReemplazoRequest
  ): Promise<IDocumento> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.post(`/documentos/${docId}/confirmar-reemplazo`, data)) as any
    return response.data
  }

  /**
   * Flujo completo de reemplazo de documento rechazado:
   * 1. Iniciar reemplazo (presigned URL)
   * 2. Subir archivo a storage
   * 3. Confirmar reemplazo en backend
   * D1 CR: Ahora acepta metadatos opcionales para selfies
   */
  async replaceDocument(
    docId: string,
    file: File,
    onProgress?: (progress: number) => void,
    metadatos?: IDocumentoMetadatos
  ): Promise<IDocumento> {
    // 1. Obtener presigned URL para reemplazo
    const presignedData = await this.iniciarReemplazo(docId, {
      nombre_original: file.name,
      tipo_mime: file.type,
      tamano_bytes: file.size,
    })

    // 2. Subir archivo a storage
    await this.uploadToSignedUrl(presignedData.signedUrl, file, onProgress)

    // 3. Confirmar reemplazo (D1 CR: include metadatos)
    const documento = await this.confirmarReemplazo(docId, {
      nombre_original: file.name,
      nombre_archivo: presignedData.nombre_archivo,
      storage_key: presignedData.storage_key,
      tipo_mime: file.type,
      tamano_bytes: file.size,
      metadatos,
    })

    return documento
  }

  /**
   * Obtiene historial de versiones de un documento
   */
  async getVersiones(docId: string): Promise<IVersionesResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await apiClient.get(`/documentos/${docId}/versiones`)) as any
    return response.data
  }
}

// Instancia singleton
export const documentoService = new DocumentoService()
