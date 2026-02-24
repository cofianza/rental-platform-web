/**
 * Servicio de Solicitantes - HP-247
 * Llamadas a la API para solicitantes/applicants
 */

import { apiClient } from '@/lib/api'
import type {
  ISolicitante,
  ISolicitanteCreateData,
  ISolicitanteResponse,
  TipoDocumento,
} from '@/types/solicitante'

class SolicitanteService {
  /**
   * Busca un solicitante por tipo y numero de documento
   * Retorna null si no se encuentra
   */
  async searchByDocument(
    tipoDocumento: TipoDocumento,
    numeroDocumento: string
  ): Promise<ISolicitante | null> {
    try {
      const response = (await apiClient.get(
        `/applicants/search?document_type=${tipoDocumento}&document_number=${encodeURIComponent(numeroDocumento)}`
      )) as unknown as ISolicitanteResponse

      return response.data || null
    } catch (err) {
      // Si es 404, el solicitante no existe
      if (err instanceof Error && 'statusCode' in err && (err as { statusCode: number }).statusCode === 404) {
        return null
      }
      throw err
    }
  }

  /**
   * Crea un nuevo solicitante
   */
  async createSolicitante(data: ISolicitanteCreateData): Promise<ISolicitante> {
    const response = (await apiClient.post(
      '/applicants',
      data
    )) as unknown as ISolicitanteResponse

    return response.data
  }

  /**
   * Obtiene un solicitante por ID
   */
  async getSolicitanteById(id: string): Promise<ISolicitante> {
    const response = (await apiClient.get(
      `/applicants/${id}`
    )) as unknown as ISolicitanteResponse

    return response.data
  }
}

// Instancia singleton
export const solicitanteService = new SolicitanteService()
