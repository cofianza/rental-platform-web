// ============================================
// Avisos de servicio (fallas de WhatsApp, pagos, firma…) — API /avisos-servicio
// ============================================

export type ServicioAviso =
  | 'whatsapp'
  | 'correo'
  | 'pagos'
  | 'firma'
  | 'evaluacion'
  | 'identidad'
  | 'plataforma'
  | 'mantenimiento'
  | 'otro'

/** informativo = sin falla (p. ej. mantenimiento); parcial = funciona a medias; caido = no funciona. */
export type NivelAviso = 'informativo' | 'parcial' | 'caido'

/** A quién se le muestra. El equipo de Cofianza ve todos siempre. */
export type AudienciaAviso = 'inmobiliaria' | 'propietario' | 'prospecto'

/** Lo que ve quien recibe el aviso. `audiencia` solo llega para el equipo de Cofianza. */
export interface IAvisoVisible {
  id: string
  servicio: ServicioAviso
  nivel: NivelAviso
  titulo: string
  mensaje: string
  actualizado_en: string
  audiencia?: AudienciaAviso[]
}

/** Completo, para el administrador. */
export interface IAvisoServicio extends IAvisoVisible {
  audiencia: AudienciaAviso[]
  activo: boolean
  /** Se deja de mostrar solo a esta hora (ISO). null = hasta marcarlo resuelto. */
  hasta: string | null
  creado_en: string
  creado_por: string
  actualizado_por: string
  resuelto_en: string | null
}

export interface IAvisoServicioInput {
  servicio: ServicioAviso
  nivel: NivelAviso
  titulo: string
  mensaje: string
  audiencia: AudienciaAviso[]
  activo: boolean
  hasta: string | null
}
