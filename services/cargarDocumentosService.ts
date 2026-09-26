// ============================================
// Carga pública de documentos del solicitante (por token, sin login)
// ============================================

import { apiClient } from '@/lib/api'
import type { CoarrendatarioEstado, IInvitarCoarrendatarioInput } from '@/services/coarrendatarioService'

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
  /** Su co-arrendatario: si puede invitarlo, a quién invitó y lo que declaró al autorizar (ausente en un API anterior). */
  coarrendatario?: {
    /** En revisión o aprobado antes del contrato, y canal de inmobiliaria (Decisiones 2 y 4). */
    puede_invitar: boolean
    /** Su invitación sigue en pie (ausente en un API anterior: solo en revisión). */
    vigente?: boolean
    /** `vencida`: la invitación pendiente pasó su plazo sin respuesta. */
    invitado: { nombre: string; estado: CoarrendatarioEstado; vencida?: boolean } | null
    /** Solo nombre y apellido: el correo y el WhatsApp del tercero no viajan. */
    sugerido: { nombre: string; apellido: string } | null
  }
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

  /** El prospecto invita a su co-arrendatario desde su enlace, sin cuenta. */
  async invitarCoarrendatario(
    token: string,
    input: IInvitarCoarrendatarioInput,
  ): Promise<{ nombre: string; estado: CoarrendatarioEstado }> {
    const res = await apiClient.post<{ nombre: string; estado: CoarrendatarioEstado }>(
      `/public/cargar-documentos/${token}/coarrendatario`,
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
