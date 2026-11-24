/**
 * Integración nuby → Cofianza (solo lectura): Cofianza copia los inmuebles que
 * la inmobiliaria tiene disponibles para arrendar en nuby (en arriendo y en
 * estado «Activa»). Tipos del contrato de la API
 * (`/inmobiliaria/integraciones/nuby` y `/admin/inmobiliarias/{id}/integraciones/nuby`).
 */

/** Quién opera la pantalla: el titular de la inmobiliaria o el administrador de plataforma sobre una organización. */
export type ModoIntegracionNuby = { tipo: 'titular' } | { tipo: 'admin'; orgId: string }

export type EstadoConexionNuby = 'activa' | 'error' | 'pausada'

/** Cifras de la última copia que terminó. */
export interface ResumenCopiaNuby {
  modo: 'completa' | 'incremental'
  terminado_en: string
  leidos: number
  en_arriendo: number
  creados: number
  actualizados: number
  vinculados: number
  sin_cambios: number
  protegidos: number
  /** En arriendo pero no «Activa» en nuby (arrendados, inactivos…): no se crean en Cofianza. */
  no_activas: number
  /** Su código está en 2+ inmuebles de Cofianza: esperan a que se elija cuál es. */
  codigo_repetido: number
  no_traidos: number
  fotos_copiadas: number
  ausentes: number
  /**
   * Inmuebles ya vinculados que en esta copia aparecían de golpe como arrendados
   * o inactivos en nuby. Por ser tantos a la vez (puede ser un dato raro de
   * nuby), Cofianza copió sus datos pero NO les cambió el estado ni los retiró
   * de la vitrina, y tampoco lo hará en las copias siguientes: solo los aplica
   * la copia que lanza un administrador de Cofianza. 0 normalmente.
   */
  estados_en_duda: number
}

export interface IntegracionNuby {
  /** P. ej. "mi-inmobiliaria.nuby.app". */
  instancia: string
  /** Últimos 4 caracteres del ID de cliente (la clave nunca vuelve). */
  client_id_final: string
  estado: EstadoConexionNuby
  conectada_en: string
  /** «Cofianza» cuando la conectó un administrador de la plataforma. */
  conectada_por_nombre: string | null
  /** Última copia que terminó bien: la hora en que TERMINÓ. Toda copia que termina bien la cambia. */
  ultima_sincronizacion_en: string | null
  ultima_revision_completa_en: string | null
  /** Hora en que EMPEZÓ el último intento (haya terminado bien o no). */
  ultimo_intento_en: string | null
  /** Texto ya listo para mostrar: qué pasó y, si aplica, si Cofianza reintenta sola. */
  ultimo_error: string | null
  sincronizando: boolean
  resumen: ResumenCopiaNuby | null
}

export interface TotalesNuby {
  vinculados: number
  codigo_repetido: number
  no_traidos: number
  con_diferencias: number
  ausentes: number
}

export interface CandidatoCodigoNuby {
  inmueble_id: string
  codigo: string
  direccion: string
  ciudad: string
  /** Estado del inmueble en Cofianza: disponible | en_estudio | ocupado | inactivo. */
  estado: string
}

/** El mismo código existe en 2+ inmuebles de Cofianza: no se vincula hasta que elijan cuál es. */
export interface CodigoRepetidoNuby {
  codigo: string
  titulo: string | null
  direccion: string | null
  candidatos: CandidatoCodigoNuby[]
}

export type MotivoNoTraidoNuby =
  | 'sin_canon'
  | 'clase_sin_equivalente'
  | 'sin_direccion'
  | 'sin_municipio'
  | 'codigo_invalido'
  | 'datos_no_validos'

/** Inmueble en arriendo de nuby que no se pudo traer. */
export interface NoTraidoNuby {
  codigo: string
  titulo: string | null
  motivo: MotivoNoTraidoNuby
  detalle: string | null
}

export type CampoDiferenciaNuby = 'canon' | 'estado'

export interface DiferenciaNuby {
  campo: CampoDiferenciaNuby
  en_nuby: string
  en_cofianza: string
}

/** Inmueble protegido (con estudio o contrato en Cofianza) donde nuby dice otra cosa. */
export interface ConDiferenciasNuby {
  codigo: string
  inmueble_id: string
  direccion: string | null
  diferencias: DiferenciaNuby[]
}

export interface PendientesNuby {
  codigo_repetido: CodigoRepetidoNuby[]
  no_traidos: NoTraidoNuby[]
  con_diferencias: ConDiferenciasNuby[]
}

export interface EstadoIntegracionNuby {
  /** false = la función está apagada en la plataforma: no se muestra el formulario. */
  habilitada: boolean
  /** false = la copia automática está apagada; solo corre con «Copiar ahora». */
  sincronizacion_automatica: boolean
  conectada: boolean
  integracion: IntegracionNuby | null
  /** Totales reales: las listas de `pendientes` pueden venir recortadas. */
  totales: TotalesNuby
  pendientes: PendientesNuby
}

/** Lo que el titular copia de nuby (Configuraciones → API nuby → «Crear Cliente»). */
export interface CredencialesNuby {
  instancia: string
  client_id: string
  client_secret: string
}

export interface PruebaConexionNuby {
  ok: true
  inmuebles_muestra: number
}

export interface VinculoNuby {
  codigo: string
  inmueble_id: string
}
