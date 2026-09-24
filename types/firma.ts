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
  // Firmante bloqueado en Auco tras varios códigos fallidos: no es final, Cofianza lo desbloquea.
  | 'bloqueado'

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
  /** Fuente editable del teléfono, para corregirlo en línea desde el modal:
   *  'solicitante' → ficha del solicitante (origen_id); 'arrendador' → WhatsApp
   *  de recaudo de la inmobiliaria (perfil-arrendador propio). */
  origen?: 'solicitante' | 'arrendador'
  origen_id?: string | null
}

export interface IFirmantesPreview {
  aplica: boolean
  firmantes: IFirmantePreview[]
  puede_enviar: boolean
  /** Adenda 2 §9: antes del sobre, el arrendatario confirma su identidad por correo. */
  biometria?: boolean
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

// Adenda 2 §9 — verificación de identidad antes de la firma

export interface IConsentimientoFirma {
  version: string
  parrafos: string[]
  opciones: { autoriza: string; analista: string }
}

export interface IVerificacionIdentidadPublica {
  nombre: string
  inmueble: string
  completada: boolean
  consentimiento: IConsentimientoFirma
}

/** El gestor solo ve 'pendiente' | 'completada'; Cofianza ve el resultado del cotejo. */
export type EstadoVerificacionIdentidad =
  | 'pendiente'
  | 'completada'
  | 'verificada'
  | 'no_coincide'
  | 'no_verificada'
  | 'omitida'

export interface IVerificacionIdentidad {
  id: string
  rol: 'arrendatario' | 'cotitular'
  nombre: string
  email: string
  estado: EstadoVerificacionIdentidad
  token_expiracion?: string
  // Solo para roles de Cofianza:
  opcion?: 'autoriza' | 'analista' | null
  similitud?: number | null
  umbral?: number | null
  motivo?: string | null
  requiere_analista?: boolean
  revision?: 'confirmada' | 'suplantacion' | null
  revision_nota?: string | null
  revisado_en?: string | null
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
