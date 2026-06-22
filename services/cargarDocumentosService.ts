// ============================================
// Carga pública de documentos del solicitante (por token, sin login)
// ============================================

import { apiClient } from '@/lib/api'

export type PropositoSoporte =
  | 'certificacion_laboral'
  | 'extractos_bancarios'
  | 'declaracion_renta'
  | 'carta_referencia'
  | 'codeudor'
  | 'poliza'
  | 'otros_soportes'

export interface ContextoCargaDocumentos {
  solicitante: string
  inmueble: { direccion: string; ciudad: string }
  estado: string
  puede_subir: boolean
  soportes: Array<{ id: string; proposito: PropositoSoporte; nombre_original: string; created_at: string }>
}

interface PresignedInput {
  nombre_original: string
  tipo_mime: string
  tamano_bytes: number
  proposito: PropositoSoporte
}

interface PresignedResponse {
  signed_url: string
  storage_key: string
  nombre_archivo: string
  expires_in: number
}

export const cargarDocumentosService = {
  async getContexto(token: string): Promise<ContextoCargaDocumentos> {
    const res = await apiClient.get<ContextoCargaDocumentos>(`/public/cargar-documentos/${token}`)
    return res.data
  },

  async presignedUrl(token: string, input: PresignedInput): Promise<PresignedResponse> {
    const res = await apiClient.post<PresignedResponse>(`/public/cargar-documentos/${token}/presigned-url`, input)
    return res.data
  },

  async confirmar(
    token: string,
    input: { storage_key: string; nombre_original: string; tipo_mime: string; tamano_bytes: number; proposito: PropositoSoporte },
  ): Promise<{ id: string; proposito: PropositoSoporte; nombre_original: string }> {
    const res = await apiClient.post<{ id: string; proposito: PropositoSoporte; nombre_original: string }>(
      `/public/cargar-documentos/${token}/confirmar`,
      input,
    )
    return res.data
  },

  /** Sube el archivo a la signed URL de Supabase. */
  async uploadToSignedUrl(signedUrl: string, file: File): Promise<void> {
    const res = await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Fallo al subir el archivo: ${res.status} ${text}`)
    }
  },
}
