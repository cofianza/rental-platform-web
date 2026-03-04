/**
 * Servicio de Contratos
 */

import { apiClient } from '@/lib/api'
import type {
  IContrato,
  IContratoMeta,
  IGenerarContratoInput,
  IContratoDownloadResponse,
  IContratosResponse,
  IContratoResponse,
  IContratoDownloadApiResponse,
} from '@/types/contrato'

class ContratoService {
  async getContratosForExpediente(
    expedienteId: string,
    query?: { page?: number; limit?: number }
  ): Promise<{ data: IContrato[]; meta: IContratoMeta }> {
    const params = new URLSearchParams()
    if (query?.page) params.append('page', query.page.toString())
    if (query?.limit) params.append('limit', query.limit.toString())
    const qs = params.toString()

    const response = (await apiClient.get(
      `/expedientes/${expedienteId}/contratos${qs ? `?${qs}` : ''}`
    )) as unknown as IContratosResponse

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

  async getContratoById(id: string): Promise<IContrato> {
    const response = (await apiClient.get(
      `/contratos/${id}`
    )) as unknown as IContratoResponse
    return response.data
  }

  async generarContrato(
    expedienteId: string,
    input: IGenerarContratoInput
  ): Promise<IContrato> {
    const response = (await apiClient.post(
      `/expedientes/${expedienteId}/contratos/generar`,
      input
    )) as unknown as IContratoResponse
    return response.data
  }

  async regenerarContrato(
    id: string,
    variables?: Record<string, string>
  ): Promise<IContrato> {
    const response = (await apiClient.post(
      `/contratos/${id}/regenerar`,
      { variables }
    )) as unknown as IContratoResponse
    return response.data
  }

  async descargarContrato(id: string): Promise<IContratoDownloadResponse> {
    const response = (await apiClient.get(
      `/contratos/${id}/descargar`
    )) as unknown as IContratoDownloadApiResponse
    return response.data
  }
}

export const contratoService = new ContratoService()
