/**
 * Tipos para Solicitudes de Firma Electronica - HP-341
 */

export type EstadoSolicitudFirma =
  | 'pendiente'
  | 'enviado'
  | 'abierto'
  | 'otp_validado'
  | 'firmado'
  | 'expirado'
  | 'cancelado'

export interface ISolicitudFirma {
  id: string
  contrato_id: string
  nombre_firmante: string
  email_firmante: string
  telefono_firmante: string | null
  estado: EstadoSolicitudFirma
  envios_realizados: number
  max_envios: number
  token_expiracion: string
  abierto_en: string | null
  firmado_en: string | null
  auco_document_code: string | null
  created_at: string
  updated_at: string
  enviado_por_nombre: string | null
}

export interface ICrearSolicitudFirmaInput {
  contrato_id: string
  nombre_firmante: string
  email_firmante: string
  telefono_firmante?: string
  enviar_sms?: boolean
}

export interface ISolicitudFirmaPublic {
  solicitud_id: string
  nombre_firmante: string
  email_firmante: string
  estado: string
  contrato_nombre: string
  expediente_numero: string
  inmueble_direccion: string
  inmueble_ciudad: string
}

export interface IOtpSolicitarResponse {
  enviado: boolean
  canal: 'email' | 'sms'
  destino_enmascarado: string
  expira_en_minutos: number
}

export interface IOtpVerificarResponse {
  verificado: boolean
  estado: string
}
