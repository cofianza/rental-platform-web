/**
 * Servicio de Plantillas de Contrato
 */

import { apiClient } from '@/lib/api'
import type {
  IPlantillaContrato,
  IPlantillaContratoFilters,
  IPlantillaContratoFormData,
  IPlantillaContratoUpdateData,
  IPlantillaContratoMeta,
  IPlantillaPreviewResponse,
  IPlantillasResponse,
  IPlantillaResponse,
  IPlantillaPreviewApiResponse,
} from '@/types/plantilla-contrato'

function buildQueryString(filters: Partial<IPlantillaContratoFilters>): string {
  const params = new URLSearchParams()

  if (filters.search) params.append('search', filters.search)
  if (filters.activa) params.append('activa', filters.activa)
  if (filters.page) params.append('page', filters.page.toString())
  if (filters.limit) params.append('limit', filters.limit.toString())
  if (filters.sortBy) params.append('sortBy', filters.sortBy)
  if (filters.sortDir) params.append('sortDir', filters.sortDir)

  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

class PlantillaContratoService {
  async getPlantillas(filters: Partial<IPlantillaContratoFilters> = {}): Promise<{
    data: IPlantillaContrato[]
    meta: IPlantillaContratoMeta
  }> {
    const qs = buildQueryString(filters)
    const response = (await apiClient.get(
      `/plantillas-contrato${qs}`
    )) as unknown as IPlantillasResponse

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

  async getPlantillaById(id: string): Promise<IPlantillaContrato> {
    const response = (await apiClient.get(
      `/plantillas-contrato/${id}`
    )) as unknown as IPlantillaResponse
    return response.data
  }

  async createPlantilla(data: IPlantillaContratoFormData): Promise<IPlantillaContrato> {
    const response = (await apiClient.post(
      '/plantillas-contrato',
      data
    )) as unknown as IPlantillaResponse
    return response.data
  }

  async updatePlantilla(id: string, data: IPlantillaContratoUpdateData): Promise<IPlantillaContrato> {
    const response = (await apiClient.patch(
      `/plantillas-contrato/${id}`,
      data
    )) as unknown as IPlantillaResponse
    return response.data
  }

  async deletePlantilla(id: string): Promise<{ id: string; activa: boolean }> {
    const response = (await apiClient.delete(
      `/plantillas-contrato/${id}`
    )) as unknown as { success: boolean; data: { id: string; activa: boolean } }
    return response.data
  }

  async previewPlantilla(
    id: string,
    variables?: Record<string, string>
  ): Promise<IPlantillaPreviewResponse> {
    const response = (await apiClient.post(
      `/plantillas-contrato/${id}/preview`,
      { variables }
    )) as unknown as IPlantillaPreviewApiResponse
    return response.data
  }
}

export const plantillaContratoService = new PlantillaContratoService()
