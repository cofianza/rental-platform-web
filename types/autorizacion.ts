/**
 * Tipos para Autorizacion Habeas Data (HP-334)
 */

export type EstadoAutorizacion = 'pendiente' | 'autorizado' | 'expirado' | 'revocado'
export type MetodoFirma = 'canvas' | 'otp'
export type CanalAutorizacion = 'web' | 'enlace'

export interface IAutorizacion {
  id: string
  estado: EstadoAutorizacion
  canal: CanalAutorizacion
  metodo_firma: MetodoFirma | null
  autorizado_en: string | null
  hash_documento: string | null
  fecha_revocacion: string | null
  motivo_revocacion: string | null
  token_expiracion: string | null
  created_at: string
}

export interface IAutorizacionPublicData {
  id: string
  estado: string
  texto_legal: string
  version_terminos: string
  solicitante: {
    nombre: string
    apellido: string
    // El backend ya NO expone el email al portador del token (PII minimizada).
    email?: string
    telefono_masked?: string | null
  }
  expediente: {
    numero_expediente: string
    inmueble: {
      direccion: string
      ciudad: string
      barrio: string | null
    }
  }
}

export interface IEnviarEnlaceResponse {
  id: string
  estado: string
  token_expiracion: string
}

export interface IFirmarInput {
  metodo_firma: MetodoFirma
  datos_firma?: string
  codigo_otp?: string
  consentimientos_opcionales?: {
    analitica?: boolean
    comercial?: boolean
    historial_referencia?: boolean
  }
}

export interface IFirmarResponse {
  estado: string
  hash_documento: string
  autorizado_en: string
}

export interface IRevocarInput {
  motivo: string
}

export interface IRevocarResponse {
  estado: string
  fecha_revocacion: string
}

export interface IOtpResponse {
  mensaje: string
  expira_en: string
}

export interface IVerificarOtpResponse {
  verificado: boolean
  mensaje: string
}
