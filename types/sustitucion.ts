/**
 * Cambios de personas de un estudio y consulta adicional. Todo lo que se
 * muestra (valores, cuántos cambios quedan, textos) lo envía la API: aquí no
 * se calcula ni se fija ninguna cifra.
 */

export type EstadoSustitucion = 'pendiente_pago' | 'pagada' | 'consultada' | 'cancelada' | 'devuelta' | 'retirada'

export interface IPersonaSustitucion {
  persona: 'coarrendatario'
  coarrendatario_id: string
  nombre: string
  /** La persona ya salió del estudio: lo que sigue es cargar a otra en su lugar. */
  ya_salio?: boolean
}

/** El cambio que está en curso (uno a la vez). */
export interface ISustitucionAbierta {
  id: string
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
  sale: { persona: 'coarrendatario'; nombre: string } | null
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
  persona: IPersonaSustitucion | null
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
