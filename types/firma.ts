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

export type RolFirmante = 'arrendatario' | 'arrendador' | 'cofianza'

// Pre-chequeo de firmantes antes de enviar a firma (4.3): a qué número va el
// OTP de cada firmante, con banderas de repetido/faltante.
export interface IFirmantePreview {
  rol_firmante: RolFirmante
  nombre: string
  email: string
  telefono: string | null
  auto: boolean
  falta_datos: boolean
  duplicado: boolean
}

export interface IFirmantesPreview {
  aplica: boolean
  firmantes: IFirmantePreview[]
  puede_enviar: boolean
}

// Firmante multi-parte de un contrato (arrendatario/arrendador/cofianza).
export interface IContratoFirmante {
  id: string
  rol_firmante: RolFirmante
  nombre: string
  email: string
  telefono: string | null
  orden: number
  estado: EstadoSolicitudFirma
  firmado_en: string | null
  created_at: string
}

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
  token_expiracion: string
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

export interface ICompletarFirmaInput {
  firma_imagen: string
  user_agent: string
  geo_latitud?: number
  geo_longitud?: number
  geo_precision?: number
}

export interface ICompletarFirmaResponse {
  firmado: boolean
  firmado_en: string
  hash_documento: string
}

// HP-342: PDF viewer response
export interface IContratoPdfResponse {
  pdf_url: string
  nombre_archivo: string
  expira_en_segundos: number
}

// HP-344: Evidencia de firma
export interface IEvidenciaFirma {
  id: string
  solicitud_firma_id: string
  ip_firmante: string
  user_agent: string
  geo_latitud: number | null
  geo_longitud: number | null
  geo_precision: number | null
  otp_verificado_en: string
  firma_imagen_url: string | null
  firmado_en: string
  hash_documento: string
  tiene_acuse: boolean
  created_at: string
}

export interface IAcuseDownloadResponse {
  url: string
  nombre_archivo: string
  expira_en_segundos: number
}
