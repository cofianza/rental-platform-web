import { apiClient } from '@/lib/api'
import type { ITipoDocumento, ICreateTipoDocumento, IUpdateTipoDocumento } from '@/types/documento'

interface ListResponse {
  success: boolean
  data: ITipoDocumento[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

interface SingleResponse {
  success: boolean
  data: ITipoDocumento
}

interface ListQuery {
  page?: number
  limit?: number
  activo?: string
  search?: string
}

function buildQueryString(query: ListQuery): string {
  const params = new URLSearchParams()
  if (query.page) params.append('page', query.page.toString())
  if (query.limit) params.append('limit', query.limit.toString())
  if (query.activo) params.append('activo', query.activo)
  if (query.search) params.append('search', query.search)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

class TipoDocumentoAdminService {
  async list(query: ListQuery = {}): Promise<ListResponse> {
    const qs = buildQueryString(query)
    return (await apiClient.get(`/admin/tipos-documento${qs}`)) as unknown as ListResponse
  }

  async getById(id: string): Promise<ITipoDocumento> {
    const response = (await apiClient.get(`/admin/tipos-documento/${id}`)) as unknown as SingleResponse
    return response.data
  }

  async create(data: ICreateTipoDocumento): Promise<ITipoDocumento> {
    const response = (await apiClient.post('/admin/tipos-documento', data)) as unknown as SingleResponse
    return response.data
  }

  async update(id: string, data: IUpdateTipoDocumento): Promise<ITipoDocumento> {
    const response = (await apiClient.put(`/admin/tipos-documento/${id}`, data)) as unknown as SingleResponse
    return response.data
  }

  async toggleActivo(id: string): Promise<ITipoDocumento> {
    const response = (await apiClient.patch(`/admin/tipos-documento/${id}/toggle-activo`)) as unknown as SingleResponse
    return response.data
  }

  async reordenar(items: { id: string; orden: number }[]): Promise<ITipoDocumento[]> {
    const response = (await apiClient.patch('/admin/tipos-documento/reordenar', { items })) as unknown as { success: boolean; data: ITipoDocumento[] }
    return response.data
  }

  async checkCodigo(codigo: string, excludeId?: string): Promise<{ disponible: boolean }> {
    const params = new URLSearchParams({ codigo })
    if (excludeId) params.append('excludeId', excludeId)
    const response = (await apiClient.get(
      `/admin/tipos-documento/check-codigo?${params.toString()}`
    )) as unknown as { success: boolean; data: { disponible: boolean } }
    return response.data
  }
}

export const tipoDocumentoAdminService = new TipoDocumentoAdminService()
