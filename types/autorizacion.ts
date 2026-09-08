/**
 * Tipos para Autorizacion Habeas Data (HP-334)
 */

export type EstadoAutorizacion = 'pendiente' | 'autorizado' | 'expirado' | 'revocado'
export type MetodoFirma = 'canvas' | 'otp' | 'casilla'
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
  // Consentimientos opcionales elegidos al firmar (Paso 2 "Beneficios").
  consent_analitica?: boolean
  consent_comercial?: boolean
  consent_historial_referencia?: boolean
  // Evidencia de la firma (soporte legal Ley 527/1999).
  ip_autorizacion?: string | null
  user_agent?: string | null
  version_terminos?: string | null
  texto_autorizado?: string | null
  /** PASO 5 (Flujo §8): lo que el prospecto declaró en su celular. El bloque
   *  §8.2 (situación laboral, dónde labora, ingreso declarado) y el texto libre
   *  del reporte SOLO llegan a los roles internos de Cofianza — el backend los
   *  omite del JSON por allowlist, no los esconde el render. */
  perfil_prospecto?: IPerfilProspecto | null
}

export interface IPerfilProspecto {
  identidad_confirmada: boolean
  identidad_confirmada_en: string | null
  identidad_reporte: 'no_soy_yo' | 'datos_incorrectos' | null
  identidad_reporte_en: string | null
  presentacion: 'solo' | 'acompanado' | null
  coarrendatario_intencion: {
    nombre: string
    apellido: string
    email?: string
    telefono?: string
  } | null
  // Solo roles internos de Cofianza (administrador / operador_analista /
  // gerencia_consulta). Para inmobiliaria y propietario estas claves NO vienen.
  identidad_reporte_detalle?: string | null
  situacion_laboral?: 'empleado' | 'independiente' | 'pensionado' | 'otro' | null
  donde_labora?: string | null
  /** AUTORREPORTADO. Nunca es el ingreso del scorecard (Política V4.1 §4.2). */
  ingreso_declarado_cop?: number | null
  discrepancia_ingreso?: { hay: boolean; desviacion_pct: number } | null
}

export interface IAutorizacionPublicData {
  id: string
  estado: string
  texto_legal: string
  version_terminos: string
  solicitante: {
    nombre: string
    apellido: string
    telefono_masked?: string | null
    /** §8.1: el documento va ENMASCARADO (últimos 4). Enseñarlo completo al
     *  portador del enlace le regalaría la respuesta a un impostor — §12
     *  dice que la confirmación de identidad ES la defensa contra el enlace
     *  reenviado a un tercero. */
    tipo_documento?: string | null
    numero_documento_masked?: string | null
  }
  expediente: {
    numero_expediente: string
    inmueble: {
      direccion: string
      ciudad: string
      barrio: string | null
    }
  }
  /**
   * Política V4.1, Anexo A ("cédula validada vía biometría AUCO") + §14.
   * `requerida` = el interruptor del backend; `estado` = lo ya verificado en
   * este expediente (reabrir el enlace no obliga a repetir el cotejo).
   * Ausente en respuestas anteriores al despliegue.
   */
  biometria?: {
    requerida: boolean
    estado: EstadoBiometria | null
  }
}

/** Vocabulario del cotejo. `omitida` = el titular ejerció su derecho a negarse. */
export type EstadoBiometria =
  | 'verificada'
  | 'no_coincide'
  | 'no_verificada'
  | 'omitida'
  | 'desactivada'

export interface IBiometriaResponse {
  estado: EstadoBiometria
  /** Solo viene cuando `verificada`: es un parámetro del control antifraude. */
  similitud?: number | null
  umbral?: number
  motivo?: string | null
  guardado?: boolean
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
  /** §6.3: en la opción C el cobro va DESPUÉS de la firma. Viene del backend
   *  (derivado del pago del expediente) porque el prospecto no tiene sesión y
   *  el mismo endpoint sirve a A y B, donde ya está pagado y ofrecerle un
   *  cobro sería cobrarle dos veces. */
  pago_requerido?: boolean
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

// ── PASO 5 (Flujo §8) — pantalla pública del prospecto ──────────────

export interface IPerfilProspectoInput {
  /** §8.1 — sólo `true`: el backend rechaza cualquier otra cosa. */
  identidad_confirmada?: true
  situacion_laboral?: 'empleado' | 'independiente' | 'pensionado' | 'otro'
  donde_labora?: string
  ingreso_declarado_cop?: number
  presentacion?: 'solo' | 'acompanado'
  coarrendatario?: {
    nombre: string
    apellido: string
    email?: string
    telefono?: string
  }
}

export interface IReportarIdentidadInput {
  motivo: 'no_soy_yo' | 'datos_incorrectos'
  detalle?: string
}

/** Estado del cobro del estudio para la pantalla del prospecto ya firmada. */
export interface IPagoProspecto {
  estado: 'preparando' | 'pendiente' | 'procesando' | 'completado' | 'no_aplica'
  monto_formateado: string | null
  payment_link_url: string | null
}
