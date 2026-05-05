/**
 * Servicio de Soportes de Expediente (flujo condicionado).
 *
 * Permite al solicitante subir documentos adicionales (codeudor, póliza,
 * etc.) cuando el estudio queda condicionado, y al propietario / inmobiliaria
 * / admin / operador listarlos para tomar la decisión manual de aprobar.
 */

import { apiClient } from '@/lib/api'
import type { PropositoSoporte } from '@/types/estudio'

export interface PresignedUrlInput {
  nombre_original: string
  tipo_mime: 'application/pdf' | 'image/jpeg' | 'image/png'
  tamano_bytes: number
  proposito: PropositoSoporte
}

export interface PresignedUrlResponse {
  signed_url: string
  storage_key: string
  nombre_archivo: string
  expires_in: number
}

export interface ConfirmarInput {
  storage_key: string
  nombre_original: string
  tipo_mime: 'application/pdf' | 'image/jpeg' | 'image/png'
  tamano_bytes: number
  proposito: PropositoSoporte
}

export interface SoporteListItem {
  id: string
  proposito: PropositoSoporte
  nombre_original: string
  tipo_mime: string
  tamano_bytes: number
  subido_por: string | null
  subido_por_nombre: string | null
  created_at: string
  archivo_url: string | null
}

export const expedienteSoportesService = {
  async presignedUrl(expedienteId: string, input: PresignedUrlInput): Promise<PresignedUrlResponse> {
    const res = await apiClient.post<PresignedUrlResponse>(
      `/expedientes/${expedienteId}/soportes/presigned-url`,
      input,
    )
    return res.data
  },

  async confirmar(expedienteId: string, input: ConfirmarInput): Promise<{
    id: string
    proposito: PropositoSoporte
    nombre_original: string
    archivo_url: string | null
  }> {
    const res = await apiClient.post<{
      id: string
      proposito: PropositoSoporte
      nombre_original: string
      archivo_url: string | null
    }>(`/expedientes/${expedienteId}/soportes`, input)
    return res.data
  },

  async listar(expedienteId: string): Promise<SoporteListItem[]> {
    const res = await apiClient.get<SoporteListItem[]>(`/expedientes/${expedienteId}/soportes`)
    return res.data
  },

  /** Sube el archivo a la signed URL devuelta por presignedUrl(). */
  async uploadToSignedUrl(signedUrl: string, file: File): Promise<void> {
    const res = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Fallo al subir el archivo: ${res.status} ${text}`)
    }
  },
}
