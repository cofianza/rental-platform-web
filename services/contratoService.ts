/**
 * Servicio de Contratos
 */

import { apiClient } from '@/lib/api'
import type {
  IContrato,
  IContratoMeta,
  IContratoListItem,
  IContratoListFilters,
  IGenerarContratoInput,
  IContratoDownloadResponse,
  IContratoVersion,
  IVersionComparison,
  IContratosResponse,
  IContratoResponse,
  IContratoDownloadApiResponse,
  IVersionesResponse,
  IVersionComparisonResponse,
  IContratoTransicionesResponse,
  IContratoHistorialResponse,
  IContratoTransitionInput,
  IContratoHistorialEntry,
} from '@/types/contrato'

class ContratoService {
  async getAllContratos(
    filters: Partial<IContratoListFilters> = {}
  ): Promise<{ data: IContratoListItem[]; meta: IContratoMeta }> {
    const params = new URLSearchParams()
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.sortBy) params.append('sortBy', filters.sortBy)
    if (filters.sortDir) params.append('sortDir', filters.sortDir)
    if (filters.estado) params.append('estado', filters.estado)
    if (filters.search) params.append('search', filters.search)
    if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde)
    if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta)
    const qs = params.toString()

    const response = (await apiClient.get(
      `/contratos${qs ? `?${qs}` : ''}`
    )) as unknown as { success: boolean; data: IContratoListItem[]; pagination: IContratoMeta }

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

  async getVersiones(contratoId: string): Promise<IContratoVersion[]> {
    const response = (await apiClient.get(
      `/contratos/${contratoId}/versiones`
    )) as unknown as IVersionesResponse
    return response.data || []
  }

  async descargarVersion(contratoId: string, versionNum: number): Promise<IContratoDownloadResponse> {
    const response = (await apiClient.get(
      `/contratos/${contratoId}/versiones/${versionNum}/descargar`
    )) as unknown as IContratoDownloadApiResponse
    return response.data
  }

  async compararVersiones(contratoId: string, v1: number, v2: number): Promise<IVersionComparison> {
    const response = (await apiClient.get(
      `/contratos/${contratoId}/versiones/comparar?v1=${v1}&v2=${v2}`
    )) as unknown as IVersionComparisonResponse
    return response.data
  }

  // ============================================================
  // Transiciones de estado
  // ============================================================

  async transicionar(id: string, input: IContratoTransitionInput): Promise<IContrato> {
    const response = (await apiClient.post(
      `/contratos/${id}/transitions`,
      input
    )) as unknown as IContratoResponse
    return response.data
  }

  async getTransicionesDisponibles(id: string): Promise<IContratoTransicionesResponse['data']> {
    const response = (await apiClient.get(
      `/contratos/${id}/available-transitions`
    )) as unknown as IContratoTransicionesResponse
    return response.data
  }

  async getHistorialTransiciones(id: string): Promise<{ estado_actual: string; historial: IContratoHistorialEntry[] }> {
    const response = (await apiClient.get(
      `/contratos/${id}/transitions`
    )) as unknown as IContratoHistorialResponse
    return response.data
  }
}

export const contratoService = new ContratoService()
