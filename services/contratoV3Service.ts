/**
 * Asistente de contratos V3 (Entrega 3). El borrador es la fila `contratos` en
 * estado borrador y vive en el servidor: aquí no hay store ni sessionStorage.
 * Cada llamada devuelve el estado completo del asistente.
 */

import { apiClient, ApiClientError, handleApiError, type ApiResponse } from '@/lib/api'
import { API_BASE_URL, ERROR_MESSAGES } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth.store'
import type { EstadoAsistente, GuardarPasoBody } from '@/types/contratoV3'

const ruta = (expedienteId: string) => `/expedientes/${expedienteId}/contrato-v3`

/** Enviar a firma: la vista previa revisada y, en la Ruta B, el PDF propio que se vio. */
export interface EnviarBody {
  generacion: number
  propioSha256?: string
}

/** Un dato de un firmante que Auco no acepta (422 FIRMANTES_INVALIDOS). */
export interface FallaFirmante {
  rol: string
  motivo: string
}

export function fallasDe(err: unknown): FallaFirmante[] {
  // ApiClientError tipa details como lista de campos; aquí el API manda { fallas }.
  const d = (err instanceof ApiClientError ? err.details : undefined) as unknown as { fallas?: unknown } | undefined
  return Array.isArray(d?.fallas) ? (d.fallas as FallaFirmante[]) : []
}

export const contratoV3Service = {
  /** Sin efectos: bloqueos, avisos, resumen y (si existe) el borrador o el contrato enviado. */
  async obtener(expedienteId: string): Promise<EstadoAsistente> {
    const res = await apiClient.get<EstadoAsistente>(ruta(expedienteId))
    return res.data
  },
  /** Asigna el número, reserva el inmueble y avisa a los demás candidatos. Idempotente. */
  async iniciar(expedienteId: string): Promise<EstadoAsistente> {
    const res = await apiClient.post<EstadoAsistente>(ruta(expedienteId))
    return res.data
  },
  async guardarPaso(expedienteId: string, body: GuardarPasoBody): Promise<EstadoAsistente> {
    const res = await apiClient.put<EstadoAsistente>(`${ruta(expedienteId)}/pasos`, body)
    return res.data
  },
  /** Vista previa en modo revisión; el PDF se descarga con contratoService.descargarContrato. */
  async generar(expedienteId: string): Promise<EstadoAsistente> {
    const res = await apiClient.post<EstadoAsistente>(`${ruta(expedienteId)}/generar`)
    return res.data
  },
  /**
   * Solo administrador: autoriza el conjunto EXACTO de cláusulas adicionales que
   * supera el máximo (`huella` del paso 4 guardado). Cambiar la lista la anula.
   */
  async autorizarExceso(expedienteId: string, huella: string): Promise<EstadoAsistente> {
    const res = await apiClient.post<EstadoAsistente>(`${ruta(expedienteId)}/clausulas/autorizar-exceso`, { huella })
    return res.data
  },

  // ── Entrega 5: Ruta B y firma ──

  /**
   * Ruta B: carga (o reemplaza) el contrato de la inmobiliaria. Multipart: apiClient
   * solo manda JSON, así que va con fetch, pero con la cookie de sesión y el mismo
   * mapeo de errores (422 PDF_PROPIO_INVALIDO trae el motivo en el mensaje).
   */
  async subirPropio(expedienteId: string, archivo: File): Promise<EstadoAsistente> {
    const form = new FormData()
    form.append('archivo', archivo)
    const token = useAuthStore.getState().accessToken
    let res: Response
    try {
      res = await fetch(`${API_BASE_URL}${ruta(expedienteId)}/propio`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
        credentials: 'include',
      })
    } catch {
      throw new ApiClientError(ERROR_MESSAGES.NETWORK_ERROR, 0, 'NETWORK_ERROR')
    }
    if (!res.ok) await handleApiError(res)
    return ((await res.json()) as ApiResponse<EstadoAsistente>).data
  },
  /** URL firmada (10 min) del contrato propio, en cualquier estado del contrato. */
  async propioUrl(expedienteId: string): Promise<string> {
    const res = await apiClient.get<{ url: string }>(`${ruta(expedienteId)}/propio`)
    return res.data.url
  },
  /** URL firmada (10 min) del CRC que se envió a firma; null en borrador (vale el del estudio vigente). */
  async crcEnviadoUrl(expedienteId: string): Promise<string | null> {
    const res = await apiClient.get<{ url: string | null }>(`${ruta(expedienteId)}/crc`)
    return res.data.url
  },
  /** Saca el contrato de borrador y crea el proceso de firma en Auco. */
  async enviar(expedienteId: string, body: EnviarBody): Promise<EstadoAsistente> {
    const res = await apiClient.post<EstadoAsistente>(`${ruta(expedienteId)}/enviar`, body)
    return res.data
  },
  /** FIRMA INCOMPLETA: proceso nuevo en Auco con el mismo documento (consume un crédito). */
  async reenviar(expedienteId: string): Promise<EstadoAsistente> {
    const res = await apiClient.post<EstadoAsistente>(`${ruta(expedienteId)}/reenviar`)
    return res.data
  },
  /** EN FIRMA sin proceso vivo (el envío a Auco falló): lo vuelve a crear. */
  async reintentar(expedienteId: string): Promise<EstadoAsistente> {
    const res = await apiClient.post<EstadoAsistente>(`${ruta(expedienteId)}/firma/reintentar`)
    return res.data
  },
  /** Pregunta a Auco el estado ya, sin esperar el webhook ni el barrido. */
  async actualizarFirma(expedienteId: string): Promise<EstadoAsistente> {
    const res = await apiClient.post<EstadoAsistente>(`${ruta(expedienteId)}/firma/actualizar`)
    return res.data
  },
}
