/**
 * Servicio de Co-arrendatarios — flujo nuevo para estudios condicionados
 * (Mario, 5-may-2026). Reemplaza la subida de documentos: el solicitante
 * invita a un co-arrendatario que acepta T&C y se le hace su propio estudio.
 */

import { apiClient } from '@/lib/api'

export type CoarrendatarioEstado =
  | 'pendiente_aceptacion'
  | 'aceptado'
  | 'rechazado_invitacion'
  | 'estudio_completado'

export interface ICoarrendatarioEstudio {
  id: string
  estado: string
  resultado: string | null
  score: number | null
  observaciones: string | null
  fecha_completado: string | null
}

export interface ICoarrendatario {
  id: string
  expediente_id: string
  nombre: string
  apellido: string
  tipo_documento: string
  numero_documento: string
  email: string
  telefono: string | null
  estado: CoarrendatarioEstado
  estudio_id: string | null
  aceptado_at: string | null
  rechazado_at: string | null
  created_at: string
  updated_at: string
  /** Estudio TransUnion del coarrendatario (embebido por el backend). */
  estudio?: ICoarrendatarioEstudio | null
}

export interface IInvitarCoarrendatarioInput {
  nombre: string
  apellido: string
  tipo_documento: 'cc' | 'ce' | 'ti' | 'pasaporte' | 'nit'
  numero_documento: string
  email: string
  telefono?: string
}

export interface ICoarrendatarioPublicView {
  nombre: string
  apellido: string
  email: string
  estado: CoarrendatarioEstado
  expediente: {
    numero: string
    inmueble_direccion: string
    inmueble_ciudad: string
    titular_nombre: string
  }
  expira_en: string
}

export const coarrendatarioService = {
  /** Solicitante / propietario invita a un co-arrendatario. */
  async invitar(expedienteId: string, input: IInvitarCoarrendatarioInput): Promise<ICoarrendatario> {
    const res = (await apiClient.post(`/expedientes/${expedienteId}/coarrendatario`, input)) as unknown as {
      data: ICoarrendatario
    }
    return res.data
  },

  /**
   * Reenvía la invitación pendiente, corrigiendo email/teléfono si venían mal.
   * El backend regenera el token (invalida el enlace anterior) y reenvía el correo.
   */
  async reenviar(
    expedienteId: string,
    input: { email?: string; telefono?: string } = {},
  ): Promise<ICoarrendatario> {
    const res = (await apiClient.post(
      `/expedientes/${expedienteId}/coarrendatario/reenviar`,
      input,
    )) as unknown as { data: ICoarrendatario }
    return res.data
  },

  /** Estado del coarrendatario actual del expediente (o null si no hay). */
  async getDelExpediente(expedienteId: string): Promise<ICoarrendatario | null> {
    const res = (await apiClient.get(`/expedientes/${expedienteId}/coarrendatario`)) as unknown as {
      data: ICoarrendatario | null
    }
    return res.data
  },

  /** Vista pública: el invitado abre el link y vemos info de la invitación. */
  async getPublicByToken(token: string): Promise<ICoarrendatarioPublicView> {
    const res = (await apiClient.get(`/public/coarrendatario/${token}`)) as unknown as {
      data: ICoarrendatarioPublicView
    }
    return res.data
  },

  /** Invitado acepta T&C — el backend dispara su estudio TransUnion. */
  async aceptar(token: string): Promise<{ ok: true; estudio_id: string | null; mensaje: string }> {
    const res = (await apiClient.post(`/public/coarrendatario/${token}/aceptar`, {
      acepta_terminos: true,
      acepta_datos: true,
    })) as unknown as { data: { ok: true; estudio_id: string | null; mensaje: string } }
    return res.data
  },

  /** Invitado declina la invitación. */
  async rechazar(token: string): Promise<{ ok: true }> {
    const res = (await apiClient.post(`/public/coarrendatario/${token}/rechazar`, {})) as unknown as {
      data: { ok: true }
    }
    return res.data
  },
}
