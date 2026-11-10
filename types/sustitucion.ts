/**
 * Cambios de personas de un estudio y consulta adicional. Todo lo que se
 * muestra (valores, cuántos cambios quedan, textos) lo envía la API: aquí no
 * se calcula ni se fija ninguna cifra.
 */

export type EstadoSustitucion = 'pendiente_pago' | 'pagada' | 'consultada' | 'cancelada' | 'devuelta' | 'retirada'

export interface IPersonaSegundoFirmante {
  persona: 'coarrendatario'
  coarrendatario_id: string
  nombre: string
  /** La persona ya salió del estudio: lo que sigue es cargar a otra en su lugar. */
  ya_salio?: boolean
}

/** El solicitante del estudio (es uno solo: no lleva id). */
export interface IPersonaSolicitante {
  persona: 'solicitante'
  nombre: string
  ya_salio?: boolean
}

export type IPersonaSustitucion = IPersonaSegundoFirmante | IPersonaSolicitante

/** Lo que se le envía a la API para decir quién sale. */
export type PersonaQueSale = { persona: 'coarrendatario'; coarrendatario_id: string } | { persona: 'solicitante' }

/** Lo que la API permite hacer hoy con el solicitante. */
export interface IAccionSolicitante {
  accion: 'sustituir' | 'retirar_por_listas' | null
  accion_texto: string | null
  persona: IPersonaSolicitante | null
}

/** El cambio que está en curso (uno a la vez). */
export interface ISustitucionAbierta {
  id: string
  /** A quién reemplaza el cambio (sin el dato, el segundo firmante). */
  persona?: 'coarrendatario' | 'solicitante'
  estado: EstadoSustitucion
  estado_texto: string
  motivo: string
  requiere_pago: boolean
  total_cop: number | null
  /** Enlace de pago, mientras esté pendiente. */
  url_pago: string | null
  /** Ya se puede cargar a la persona nueva. */
  puede_cargar_persona: boolean
  entra: { nombre: string } | null
}

export interface IFilaHistorialSustitucion {
  id: string
  sale: { persona: 'coarrendatario' | 'solicitante'; nombre: string } | null
  entra: { nombre: string } | null
  motivo: string
  motivo_texto: string
  cuenta_limite: boolean
  estado: EstadoSustitucion
  estado_texto: string
  created_at: string
}

export interface IEstadoSustituciones {
  sustituciones: { usadas: number; maximo: number }
  accion: 'sustituir' | 'retirar_por_listas' | null
  accion_texto: string | null
  /** El segundo firmante. */
  persona: IPersonaSegundoFirmante | null
  /** El solicitante (null si no hay nada que hacer con él). */
  solicitante?: IAccionSolicitante | null
  abierta: ISustitucionAbierta | null
  historial: IFilaHistorialSustitucion[]
}

/** El aviso del valor, antes de cargar a la persona nueva. */
export interface ICotizacionSustitucion {
  puede_sustituir: boolean
  usadas: number
  maximo: number
  requiere_pago: boolean
  total_cop: number
  /** Lo que se cobra por este cambio; es lo que se confirma al crearlo. */
  total_a_pagar_cop: number
  sale: IPersonaSustitucion
  aviso: string
}

/** La persona que entra como solicitante (persona natural). */
export interface ICargarSolicitanteInput {
  nombre: string
  apellido: string
  tipo_documento: 'cc' | 'ce' | 'ppt' | 'pep'
  numero_documento: string
  email: string
  telefono?: string
}

export interface ISolicitanteCargado {
  sustitucion_id: string
  solicitante: { nombre: string }
  /** Se le pudo enviar su solicitud de autorización. */
  enlace_enviado: boolean
}

export interface ISustitucionCreada {
  sustitucion_id: string
  estado: EstadoSustitucion
  pago: { pago_id: string; url_pago: string; total_cop: number } | null
  sustituciones: { usadas: number; maximo: number }
}

/** Lo que la API cotiza cuando evaluar de nuevo necesita una consulta adicional. */
export interface IValorConsultaAdicional {
  consultas: number
  total_cop: number
}

export interface IConsultaAdicionalCanon {
  sustitucion_id: string | null
  estado: 'pendiente_pago' | 'pagada' | 'consultada' | 'no_requiere'
  requiere_pago: boolean
  url_pago: string | null
  total_cop: number
}
