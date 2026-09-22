/**
 * Asistente de contratos V3 (Entrega 3). El borrador es la fila `contratos` en
 * estado borrador y vive en el servidor: aquí no hay store ni sessionStorage.
 * Cada llamada devuelve el estado completo del asistente.
 */

import { apiClient } from '@/lib/api'
import type { EstadoAsistente, GuardarPasoBody } from '@/types/contratoV3'

const ruta = (expedienteId: string) => `/expedientes/${expedienteId}/contrato-v3`

export const contratoV3Service = {
  /** Sin efectos: bloqueos, avisos, resumen y (si existe) el borrador. */
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
}
