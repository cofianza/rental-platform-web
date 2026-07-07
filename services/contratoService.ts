/**
 * Servicio de Contratos
 */

import { apiClient } from '@/lib/api'
import { coalesceRequest } from '@/lib/requestCoalesce'
import { API_BASE_URL } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth.store'
import type { IFirmantesPreview } from '@/types/firma'
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
  IRenovarContratoInput,
  IContratoTransitionInput,
  IContratoHistorialEntry,
  IContratoInfoFirma,
  IContratoVerificacionIntegridad,
  IContratoAccesoFirmado,
  IContratoArchivo,
  TipoArchivoContrato,
} from '@/types/contrato'

// KPI cards del listado global. Devuelto por GET /contratos/stats.
export interface IContratosStats {
  total: number
  pendientes_generar: number
  en_proceso_firma: number
  activos: number
  finalizados: number
  cancelados: number
  por_estado: Record<string, number>
}

class ContratoService {
  async getStats(): Promise<IContratosStats> {
    const response = (await apiClient.get('/contratos/stats')) as unknown as {
      success: boolean
      data: IContratosStats
    }
    return response.data
  }

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

    // Coalescing: en el detalle, varias cards piden los contratos del mismo
    // expediente a la vez al montar → 1 sola petición en vez de N.
    return coalesceRequest(`contratos-exp:${expedienteId}:${qs}`, async () => {
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
    })
  }

  async getContratoById(id: string): Promise<IContrato> {
    return coalesceRequest(`contrato:${id}`, async () => {
      const response = (await apiClient.get(
        `/contratos/${id}`
      )) as unknown as IContratoResponse
      return response.data
    })
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
    input?: {
      fecha_inicio?: string
      duracion_meses?: number
      valor_arriendo?: number
      // 4.1e: reasignación de quién paga cada servicio (obligaciones).
      servicios_reparto?: Record<string, 'arrendatario' | 'arrendador'>
    }
  ): Promise<IContrato> {
    const response = (await apiClient.post(
      `/contratos/${id}/regenerar`,
      input || {}
    )) as unknown as IContratoResponse
    return response.data
  }

  async renovarContrato(
    id: string,
    input: IRenovarContratoInput = {}
  ): Promise<IContrato> {
    const response = (await apiClient.post(
      `/contratos/${id}/renovar`,
      input
    )) as unknown as IContratoResponse
    return response.data
  }

  async descargarContrato(
    id: string,
    options?: { inline?: boolean },
  ): Promise<IContratoDownloadResponse> {
    // inline=true para preview en iframe (sin Content-Disposition: attachment).
    // Sin parametro, fuerza descarga (uso del boton "Descargar").
    const qs = options?.inline ? '?inline=true' : ''
    return coalesceRequest(`contrato-dl:${id}:${qs}`, async () => {
      const response = (await apiClient.get(
        `/contratos/${id}/descargar${qs}`
      )) as unknown as IContratoDownloadApiResponse
      return response.data
    })
  }

  async getVersiones(contratoId: string): Promise<IContratoVersion[]> {
    return coalesceRequest(`contrato-versiones:${contratoId}`, async () => {
      const response = (await apiClient.get(
        `/contratos/${contratoId}/versiones`
      )) as unknown as IVersionesResponse
      return response.data || []
    })
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

  /** Acción directa "Enviar a firma": lleva a pendiente_firma + dispara el envío. */
  async enviarAFirma(id: string): Promise<{ ok: true; message: string }> {
    const response = (await apiClient.post(
      `/contratos/${id}/enviar-firma`,
      {}
    )) as unknown as { success: boolean; data: { ok: true; message: string } }
    return response.data
  }

  /**
   * Pre-chequeo de firmantes antes de enviar a firma (4.3): a qué número va el
   * OTP de cada firmante, marcando repetidos/faltantes. No crea el sobre.
   */
  async previewFirmantes(id: string): Promise<IFirmantesPreview> {
    const response = (await apiClient.get(
      `/contratos/${id}/firmantes-preview`
    )) as unknown as { success: boolean; data: IFirmantesPreview }
    return response.data
  }

  async getTransicionesDisponibles(id: string): Promise<IContratoTransicionesResponse['data']> {
    return coalesceRequest(`contrato-transiciones:${id}`, async () => {
      const response = (await apiClient.get(
        `/contratos/${id}/available-transitions`
      )) as unknown as IContratoTransicionesResponse
      return response.data
    })
  }

  async getHistorialTransiciones(id: string): Promise<{ estado_actual: string; historial: IContratoHistorialEntry[] }> {
    const response = (await apiClient.get(
      `/contratos/${id}/transitions`
    )) as unknown as IContratoHistorialResponse
    return response.data
  }

  // ============================================================
  // Contrato firmado
  // ============================================================

  async subirContratoFirmado(
    id: string,
    file: File,
    opts?: { referencia_otp?: string; notas?: string }
  ): Promise<IContrato> {
    const formData = new FormData()
    formData.append('archivo', file)
    if (opts?.referencia_otp) formData.append('referencia_otp', opts.referencia_otp)
    if (opts?.notas) formData.append('notas', opts.notas)

    const token = useAuthStore.getState().accessToken
    const response = await fetch(`${API_BASE_URL}/contratos/${id}/subir-firmado`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    const json = await response.json()
    if (!response.ok) {
      throw new Error(json.message || 'Error al subir el contrato firmado')
    }
    return json.data
  }

  async descargarContratoFirmado(id: string): Promise<IContratoDownloadResponse> {
    // GET idempotente que piden a la vez la página (preview) y
    // ContratoFirmadoSection al montar → coalesce lo colapsa en 1 request.
    return coalesceRequest(`contrato-firmado-dl:${id}`, async () => {
      const response = (await apiClient.get(
        `/contratos/${id}/descargar-firmado`
      )) as unknown as IContratoDownloadApiResponse
      return response.data
    })
  }

  async getInfoFirma(id: string): Promise<IContratoInfoFirma> {
    return coalesceRequest(`contrato-info-firma:${id}`, async () => {
      const response = (await apiClient.get(
        `/contratos/${id}/info-firma`
      )) as unknown as { success: boolean; data: IContratoInfoFirma }
      return response.data
    })
  }

  async verificarIntegridad(id: string): Promise<IContratoVerificacionIntegridad> {
    return coalesceRequest(`contrato-integridad:${id}`, async () => {
      const response = (await apiClient.get(
        `/contratos/${id}/verificar-integridad`
      )) as unknown as { success: boolean; data: IContratoVerificacionIntegridad }
      return response.data
    })
  }

  async getLogAccesos(id: string): Promise<IContratoAccesoFirmado[]> {
    const response = (await apiClient.get(
      `/contratos/${id}/log-accesos`
    )) as unknown as { success: boolean; data: IContratoAccesoFirmado[] }
    return response.data
  }

  // ============================================================
  // Archivos asociados al contrato
  // ============================================================

  async subirArchivo(
    id: string,
    file: File,
    tipoArchivo: TipoArchivoContrato,
  ): Promise<IContratoArchivo> {
    const formData = new FormData()
    formData.append('archivo', file)
    formData.append('tipo_archivo', tipoArchivo)

    const token = useAuthStore.getState().accessToken
    const response = await fetch(`${API_BASE_URL}/contratos/${id}/archivos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    const json = await response.json()
    if (!response.ok) {
      throw new Error(json.message || 'Error al subir el archivo')
    }
    return json.data
  }

  async listarArchivos(id: string): Promise<IContratoArchivo[]> {
    return coalesceRequest(`contrato-archivos:${id}`, async () => {
      const response = (await apiClient.get(
        `/contratos/${id}/archivos`
      )) as unknown as { success: boolean; data: { archivos: IContratoArchivo[] } }
      return response.data.archivos
    })
  }

  async descargarArchivo(contratoId: string, archivoId: string): Promise<IContratoDownloadResponse> {
    const response = (await apiClient.get(
      `/contratos/${contratoId}/archivos/${archivoId}/descargar`
    )) as unknown as IContratoDownloadApiResponse
    return response.data
  }

  async eliminarArchivo(contratoId: string, archivoId: string): Promise<void> {
    await apiClient.delete(`/contratos/${contratoId}/archivos/${archivoId}`)
  }
}

export const contratoService = new ContratoService()
