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
  /** Comparte correo con otro firmante (Auco empareja la firma por correo). */
  correo_duplicado?: boolean
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
  /** Adenda 6.1 §3: antes del sobre, el arrendatario hace el cotejo de identidad (enlace por correo). */
  cotejo?: boolean
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

/**
 * Adenda 6.1 §3: el cotejo de identidad AL FIRMAR (la misma página, otra regla). Solo lo de la persona: si tiene que
 * marcar la casilla 4A (con su texto literal), cuántos intentos le quedan y, al terminar, si quedó aprobado o firma en
 * notaría.
 */
export interface ICotejoFirmaPublico {
  requiere_4a: boolean
  texto_4a: string
  version_4a: string
  max_intentos: number
  intentos_restantes: number
  /** AucoFace encendido: si no, «no disponible por ahora». */
  disponible: boolean
  resultado: 'aprobado' | 'notaria' | null
}

export interface IVerificacionIdentidadPublica {
  nombre: string
  inmueble: string
  /** Solo el tipo (cc, ce, ppt, pep, pasaporte) para nombrar el documento de la foto. Ausente en APIs viejas. */
  tipo_documento?: string | null
  completada: boolean
  /** Adenda 2 §9 (ausente en el cotejo al firmar de la Adenda 6.1). */
  consentimiento?: IConsentimientoFirma
  /** 'adenda61' = el cotejo al firmar (Adenda 6.1 §3). Ausente en la verificación de la Adenda 2 §9. */
  regla?: 'adenda61'
  cotejo?: ICotejoFirmaPublico
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
  /** 'adenda61' = cotejo de identidad al firmar (Adenda 6.1); 'adenda2' = verificación previa (Adenda 2 §9). */
  regla?: 'adenda2' | 'adenda61'
  /** Solo Cofianza, cotejo al firmar: cómo terminó (null = pendiente) e intentos usados. */
  desenlace?: 'aprobado' | 'sin_autorizacion_4a' | 'intentos_agotados' | 'no_cotejable' | null
  intentos?: number
  heredado?: boolean
  consentimiento_4a?: { origen: 'autorizacion' | 'firma' | null; marcada: boolean } | null
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
