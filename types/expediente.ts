/**
 * Tipos para Expedientes - HP-229
 * Interfaces para el módulo de expedientes
 */

import type { EstadoExpediente } from '@/lib/constants'
import type { EstadoEstudio, IDesenlaceEstudio, ResultadoEstudio } from './estudio'
import type { EstadoBloqueo } from './autorizacion'

// Re-export del tipo de estado
export type { EstadoExpediente }

/** Estudio vigente (el más reciente) embebido en la fila del expediente. */
export interface IEstudioVigente extends IDesenlaceEstudio {
  estado: EstadoEstudio
  resultado: ResultadoEstudio
  score?: number | null
  created_at: string
  /** La autorización del prospecto venció sin firmarse (Flujo §12). Lo calcula el RPC de la lista. */
  expirado?: boolean
  /** BLQ §8: por qué se detuvo el enlace (mismo estado que el detalle). Ausente con una API anterior. */
  estado_bloqueo?: EstadoBloqueo | null
  /** Adenda 3 V2 §6: aprobado con condición de presentar un coarrendatario («Está cerca»). */
  condicion_coarrendatario?: { vence_en: string; ingreso_adicional_requerido: number | null; obligatoria?: boolean; decide_analista?: boolean } | null
  /** Adenda 4 V3 §12: el titular ya consultado espera la autorización del coarrendatario hasta esta fecha. */
  espera_coarrendatario_hasta?: string | null
  /** Autorizó y está pagada, pero la consulta no arrancó sola: hay que lanzarla desde el detalle. */
  sin_ejecutar?: boolean
  /** La última consulta del coarrendatario falló: reintentarla le toca al gestor. */
  coarrendatario_fallido?: boolean
}

/**
 * Por qué un estudio aprobado y sin contrato vivo no puede pasar al contrato (reporte de Gerencia,
 * 21-nov, puntos 1, 3 y 7). Lo calcula la API una sola vez para la lista, el encabezado y el detalle.
 */
export type CodigoTrabaContrato =
  | 'vencido'
  | 'canon_excede'
  | 'coarrendatario_pendiente'
  /** El segundo firmante aceptó y su evaluación sigue en curso: se puede esperar o seguir sin él. */
  | 'coarrendatario_en_evaluacion'
  /** Cofianza verifica al segundo firmante ya evaluado: se puede esperar el resultado o seguir sin él. */
  | 'coarrendatario_en_verificacion'
  /** Adenda 6 §4: Cofianza termina una verificación del solicitante (sus listas); quien gestiona solo espera. */
  | 'solicitante_en_verificacion'

export interface ITrabaContrato {
  /** Un código que esta versión no conoce se trata como si no hubiera traba. */
  codigo: CodigoTrabaContrato | (string & {})
  /** Ya redactado en usted por la API: se muestra tal cual. */
  texto: string
  /** canon_excede: hasta qué canon quedó aprobado el estudio. Los estudios anteriores a la Adenda 5 pueden no traerlo. */
  canon_habilitado_cop?: number
  /** canon_excede: el resultado tiene la leyenda «hasta un canon de» (un canon mayor no se evalúa de nuevo). */
  hasta_canon?: boolean
  /** canon_excede sin leyenda: la API ofrece evaluar de nuevo con el canon de la propiedad. */
  puede_reevaluar?: boolean
  /** vencido: cuándo vence (o venció) el resultado. Con sin_margen es una fecha futura. */
  vencio_en?: string
  /** vencido: el resultado todavía no vence, pero ya no alcanza para firmar el contrato. */
  sin_margen?: boolean
  /** coarrendatario_pendiente (estudios anteriores a la Adenda 5): lo que cambia en la prima al seguir sin él. */
  aviso_prima?: string
  /** canon_excede: lo que se supera es el tope que Cofianza afianza (lo decide la Gerencia General). Solo viaja con true. */
  sobre_tope?: boolean
}

/**
 * Filtro de la vista fusionada por el estado del estudio vigente. `segundo_firmante` (aprobado con
 * segundo firmante), `bloqueado` (bloqueado por listas) y `revision_cofianza` (en revisión de Cofianza)
 * solo los acepta la API nueva (reporte de Gerencia, 21-nov, punto 6); `condicionado` es la unión de los tres.
 */
export type EstudioFiltro =
  | 'todos'
  | 'aprobado'
  | 'rechazado'
  | 'condicionado'
  | 'segundo_firmante'
  | 'bloqueado'
  | 'revision_cofianza'
  | 'en_proceso'
  | 'sin_estudio'
  | 'requiere_accion'
  /** Reporte de la Oficina Virtual (25-nov), punto 1: cancelados o caducados y cerrados sin resultado. */
  | 'cerrado'
  /** Punto 11: espera solo que el titular firme la autorización (enlace vigente). Filtro, no pestaña. */
  | 'espera_autorizacion'

/**
 * Inmueble asociado al expediente
 */
export interface IExpedienteInmueble {
  id: string
  codigo: string
  titulo: string
  direccion: string
  ciudad: string
}

/**
 * Solicitante del expediente
 */
export interface IExpedienteSolicitante {
  id: string
  nombre: string  // Nombre completo (nombres + apellidos concatenados por el backend)
  documento: string // Tipo + número de documento
}

/**
 * Analista/Responsable del expediente
 */
export interface IExpedienteAnalista {
  id: string
  nombre: string
  apellido: string
}

/**
 * Expediente completo (respuesta de API)
 */
export interface IExpediente {
  id: string
  numero_expediente: string
  /** null en un estudio creado sin propiedad (solo Cofianza). */
  inmueble_id: string | null
  inmueble: IExpedienteInmueble | null
  solicitante_id: string
  solicitante: IExpedienteSolicitante | null
  analista_id: string | null
  analista: IExpedienteAnalista | null
  creador_id: string
  creador: {
    id: string
    nombre: string
    apellido: string
  } | null
  estado: EstadoExpediente
  notas: string | null
  /** Miembro de la inmobiliaria responsable del expediente (multi-tenant Fase 3.1). */
  miembro_responsable_id?: string | null
  /** Inmobiliaria dueña del estudio (null = propietario directo o sin inmueble). La trae el detalle. */
  inmobiliaria_id?: string | null
  /** Solo para Cofianza en la lista: null = sin inmobiliaria; ausente = no se pudo leer. */
  inmobiliaria_nombre?: string | null
  /** Computed por el backend (RPC list_expedientes_with_relations): TRUE si
   *  existe al menos una cita en estado='realizada'. Permite mapear el paso
   *  del proceso (Cita previa vs Estudio) cuando estado='borrador'. */
  cita_realizada?: boolean
  /** El estudio espera una acción tuya (habilitar, definir pago, decidir condicionado, generar contrato). */
  requiere_accion?: boolean
  /** De quién depende ahora mismo el estudio. */
  depende_de?: 'gestor' | 'prospecto' | 'cofianza' | null
  /** Lista (RPC): estado del último contrato no cancelado, para el paso de la fila. */
  contrato_estado?: string | null
  /**
   * Lista (RPC, Adenda 6 §2): el contrato V3 en firma espera la carga del documento firmado en notaría. No hay firmas
   * que esperar: el turno es de quien gestiona («cargar el contrato firmado en notaría»). Ausente con una API anterior.
   */
  firma_notaria?: boolean
  /** Adenda de precios §8.2: prioridad en la cola del analista (el caso R2 va 'baja'). */
  prioridad_revision?: 'baja' | 'normal' | 'alta'
  /** Solo Cofianza, en revisión: desde cuándo (lista y detalle; «En revisión hace N días»). */
  en_revision_desde?: string | null
  /** Solo si se pidió con_contrato_vivo: ya tiene un contrato no cancelado. */
  tiene_contrato_vivo?: boolean
  /** Flag del workflow paso 3: el propietario habilito el estudio crediticio. */
  estudio_habilitado?: boolean
  /** Flag del workflow paso 3: el propietario decidio NO proceder. Mutuamente
   *  excluyente con estudio_habilitado=true. */
  estudio_rechazado?: boolean | null
  motivo_estudio_rechazado?: string | null
  /** Flag 3.2: la cita se omitió porque ya hubo contacto/visita por fuera;
   *  permite habilitar el estudio sin exigir una cita 'realizada'. */
  cita_omitida?: boolean
  /** Datos del contrato capturados al habilitar el estudio. Editables hasta
   *  esa habilitacion; despues quedan congelados y alimentan el contrato. */
  duracion_contrato_meses?: number | null
  fecha_inicio_contrato?: string | null
  /** Marca de cancelacion. NULL = no fue cancelado (cierre natural o aun activo).
   *  Cuando NOT NULL, la UI debe mostrar el expediente como cancelado y los
   *  pasos despues de estado_pre_cancelacion como pendientes/no completados. */
  cancelado_at?: string | null
  motivo_cancelacion?: string | null
  estado_pre_cancelacion?: EstadoExpediente | null
  /** Motivo legible cuando el expediente termina en estado='rechazado'. Lo
   *  escribe el orchestrator/coarrendatarios.service automáticamente. Lo lee
   *  el banner de cierre en el detalle del expediente. */
  motivo_rechazo?: string | null
  /** Estudio vigente (el más reciente) del expediente, embebido por el RPC para
   *  pintar su badge en la fila. null si el expediente aún no tiene estudios. */
  estudio_vigente?: IEstudioVigente | null
  /** Solo en el detalle: el contrato se crea con el asistente V3 (flag
   *  CONTRATOS_V3_ENABLED del API + inmueble de una inmobiliaria). Ausente o
   *  false = flujo anterior (GenerarContratoModal). */
  contratos_v3?: boolean
  /**
   * Lista y detalle: solo con el estudio aprobado y sin contrato vivo, lo que impide crear el contrato.
   * null o ausente (una API anterior) = nada lo impide: la etapa sale como siempre.
   */
  traba_contrato?: ITrabaContrato | null
  /** Lista y detalle, solo en estudios aprobados: hasta cuándo sirve el resultado (ISO). Ausente con una API anterior. */
  vigencia_hasta?: string | null
  /**
   * Lista y detalle, con `vigencia_hasta`: hasta cuándo se puede enviar a firma (ISO: el fin de la vigencia menos
   * el margen que necesita el proceso de firma). Ausente con una API anterior: se cuenta contra `vigencia_hasta`.
   */
  firmar_hasta?: string | null
  /**
   * Adenda 6 §7: evaluar de nuevo el estudio por un canon mayor (al reasignarlo o desde el contrato) no tiene costo
   * hoy. false: requeriría una consulta adicional o el resultado ya venció. Solo en un aprobado evaluado con la Adenda
   * 5; ausente en los demás (o con una API anterior): sin el dato no se promete «sin costo».
   */
  reevaluacion_sin_costo?: boolean
  /**
   * Lista y detalle: Cofianza verifica al segundo firmante ya evaluado (el turno es de Cofianza y quien gestiona
   * no puede invitar ni reemplazar a nadie mientras tanto). Ausente con una API anterior.
   */
  segundo_en_verificacion?: boolean
  /**
   * Lista y detalle: el estudio no aprobable se reabrió por un reemplazo y espera la evaluación de la persona nueva
   * (punto 5 del reporte de Gerencia). Ausente con una API anterior.
   */
  reapertura_abierta?: boolean
  /** Con `reapertura_abierta`: hasta cuándo debe autorizar la persona nueva (ISO). Ausente = no se muestra. */
  vence_reapertura?: string | null
  created_at: string
  updated_at: string
}

/**
 * Filtros de listado de expedientes
 */
export interface IExpedienteFilters {
  search: string
  estado: EstadoExpediente[] // Multi-select: array de estados
  analista_id: string
  inmueble_id: string // Filtrar por inmueble asociado
  fecha_desde: string // ISO date string
  fecha_hasta: string // ISO date string
  /** Filtra expedientes por el estado del estudio vigente (vista fusionada). */
  estudio_filtro?: EstudioFiltro
  page: number
  limit: number
  /** Miembro del equipo de la inmobiliaria (distinto del analista interno). */
  miembro_responsable_id?: string
  /** Solo los que no tienen analista (el «Sin asignar» del dashboard). */
  sin_analista?: boolean
  /** Que cada fila traiga tiene_contrato_vivo (acciones pendientes del inicio). */
  con_contrato_vivo?: boolean
  sortBy: 'created_at' | 'numero' | 'estado' | 'updated_at'
  sortOrder: 'asc' | 'desc'
}

/**
 * Metadatos de paginación
 */
export interface IExpedientesMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Estadísticas por estado (formato API)
 */
export interface IExpedientesStatsRaw {
  total: number
  stats: Array<{
    estado: EstadoExpediente
    count: number
  }>
}

/**
 * Estadísticas por estado (formato transformado para UI)
 */
export interface IExpedientesStats {
  total: number
  por_estado: Record<EstadoExpediente, number>
  /**
   * La bandeja «En revisión de Cofianza»: condicionados sin «aprobado con segundo firmante» ni «bloqueado por
   * listas», con la regla del chip `revision_cofianza` (la lista se pide con estado=condicionado y ese filtro).
   * null = la API no lo pudo saber; ausente = API anterior. En los dos casos la bandeja es «Condicionados», como antes.
   */
  revision_cofianza?: number | null
}

/**
 * Opción de analista para dropdown
 */
export interface IAnalistaOption {
  id: string
  nombre: string
}

/**
 * Respuesta de listado de expedientes
 */
export interface IExpedientesResponse {
  success: boolean
  data: IExpediente[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

/**
 * Respuesta de un expediente
 */
export interface IExpedienteResponse {
  success: boolean
  data: IExpediente
}

/**
 * Respuesta de estadísticas (formato API)
 */
export interface IExpedientesStatsResponse {
  success: boolean
  data: IExpedientesStatsRaw
}

// ============================================
// HP-243: Vista Detalle del Expediente
// ============================================

/**
 * Inmueble detallado para vista de expediente
 * Campos alineados con backend: inmuebles(id, codigo, direccion, ciudad, departamento, tipo, estado, valor_arriendo)
 */
export interface IExpedienteInmuebleDetalle {
  id: string
  codigo: string
  titulo?: string  // Opcional - no viene del backend en detalle
  direccion: string
  ciudad: string
  departamento: string
  tipo: string
  uso?: string  // Opcional
  estrato?: number  // Opcional
  valor_arriendo: number
  valor_administracion?: number | null
  area_construida?: number | null
  habitaciones?: number | null
  banos?: number | null
  parqueaderos?: number | null
  foto_fachada_url?: string | null
  estado?: string
  /** El estudio cuyo contrato reservó el inmueble (con estado 'ocupado'); null si nadie. */
  reservado_por_expediente_id?: string | null
  /** Inmueble de una inmobiliaria (null = propietario directo). */
  inmobiliaria_id?: string | null
}

/**
 * Solicitante detallado para vista de expediente
 * Campos alineados con backend: solicitantes(id, nombre, apellido, tipo_documento, numero_documento, email, telefono)
 */
export interface IExpedienteSolicitanteDetalle {
  id: string
  tipo_persona?: 'natural' | 'juridica'
  tipo_documento: string
  numero_documento: string
  nombre: string  // Backend usa singular
  apellido: string  // Backend usa singular
  email: string
  telefono: string
  direccion?: string | null
  departamento?: string | null
  ciudad?: string | null
  ocupacion?: string | null
  actividad_economica?: string | null
  ingresos_mensuales?: number | null
  nivel_educativo?: string | null
  parentesco?: string | null
  habitara_inmueble?: boolean | null
}

/**
 * Expediente con datos completos para vista detalle
 */
export interface IExpedienteDetalle extends Omit<IExpediente, 'inmueble' | 'solicitante'> {
  inmueble: IExpedienteInmuebleDetalle | null
  solicitante: IExpedienteSolicitanteDetalle | null
  /** Adenda 1 contratos, respuesta 21: un administrador lo cerró sin acta de entrega (quién, cuándo y por qué). */
  cierre_sin_acta?: ICierreSinActa | null
  /** Adenda de precios §7: canon, tope y excepción de la Gerencia General. Solo roles de Cofianza. */
  tope_canon?: ITopeCanonDetalle | null
  /** Estudio creado sin propiedad: canon con el que se evalúa y destinación. */
  canon_objetivo_cop?: number | null
  destinacion_objetivo?: 'vivienda' | 'comercial' | null
  /** Solo mientras no tenga inmueble: hasta qué canon queda aprobado (el «máximo amparado» del CRC). */
  sin_inmueble?: { canonAprobadoCop: number | null; destinacion: string | null } | null
}

export interface ITopeCanonDetalle {
  canon_cop: number | null
  tope_cop: number
  /** Por encima del tope y sin excepción: aprobar es solo de la Gerencia General. */
  requiere_gerencia: boolean
  excepcion: {
    canon_autorizado_cop: number
    por_nombre: string | null
    en: string | null
    motivo: string | null
  } | null
}

export interface ICierreSinActa {
  en: string
  porNombre: string | null
  motivo: string
}

/**
 * Transición disponible para un expediente
 */
export interface ITransicionDisponible {
  estado_destino: EstadoExpediente
  etiqueta: string
  requiere_comentario: boolean
  color?: string
}

/**
 * Payload para ejecutar transición
 */
export interface IEjecutarTransicion {
  estado_destino: EstadoExpediente
  comentario: string
  /** Etiqueta de la transicion seleccionada en el modal. Permite distinguir
   *  intenciones cuando dos transiciones convergen al mismo destino (eg.
   *  aprobado → cerrado puede ser "Cerrar expediente" o "Cancelar
   *  expediente"). El backend la usa para marcar columnas de cancelacion. */
  etiqueta?: string
  /** Adenda 2 §5.1: al resolver un condicionado, lo que el analista consultó. */
  documentos_consultados?: string[]
  /** Adenda 2 §4.3: obligatoria al aprobar un condicionado. */
  evaluacion?: IEvaluacionRevisionManual
  /** Adenda 4 §9: al aprobar un condicionado, exigió algo más (tarifa no automática). */
  condicion_adicional?: boolean
  /**
   * Cómo hizo el analista la verificación que la API exige explicar al aprobar: la identidad del solicitante
   * (biometría «no coincide» o «no verificada») o la del segundo firmante con el que se aprueba el estudio.
   */
  nota_identidad?: string
  /** P34: obligatorio al rechazar; es lo que ve la inmobiliaria o el propietario. */
  motivo?: string
  /** H58/H103: motivos de lista; el API arma con ellos motivo y comentario. */
  motivos?: string[]
  motivo_detalle?: string
}

/** Adenda 2 §4.3: V7 y V9 que puntúa el analista (códigos de OPCIONES_V7/V9 del API). */
export interface IEvaluacionRevisionManual {
  estabilidad_laboral: string
  arrendamiento_previo: string
}

/** Recálculo que devuelve el API al aprobar una revisión manual. */
export interface IPuntajeRevisionManual {
  puntaje_normalizado: number | null
  denominador: number
}

/**
 * Comentario interno del expediente (HP-263)
 */
export interface IComentarioExpediente {
  id: string
  expediente_id: string
  usuario_id: string
  usuario: {
    id: string
    nombre: string
    apellido: string
  }
  contenido: string
  is_internal: boolean
  created_at: string
  updated_at: string
}

/**
 * Payload para crear comentario
 */
export interface ICrearComentario {
  contenido: string
}

/**
 * Evento del timeline del expediente (HP-270)
 */
export interface ITimelineEvento {
  id: string
  expediente_id: string
  tipo: 'creacion' | 'transicion' | 'documento' | 'comentario' | 'asignacion' | 'estudio' | 'contrato' | 'firma' | 'pago' | 'cita'
  descripcion: string
  detalle: Record<string, unknown> | null
  usuario_id: string
  usuario: {
    id: string
    nombre: string
    apellido: string
  }
  created_at: string
}

// ============================================
// Responses para HP-243
// ============================================

export interface IExpedienteDetalleResponse {
  success: boolean
  data: IExpedienteDetalle
}

export interface ITransicionesDisponiblesResponse {
  success: boolean
  data: ITransicionDisponible[]
}

export interface IComentariosResponse {
  success: boolean
  data: IComentarioExpediente[]
}

export interface ITimelinePagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ITimelineResponse {
  success: boolean
  data: ITimelineEvento[]
  pagination: ITimelinePagination
}

// ============================================
// Historial de transiciones de estado
// ============================================

/**
 * Item del historial de transiciones (GET /expedientes/:id/transitions)
 */
export interface IHistorialTransicion {
  id: string
  estado_anterior: EstadoExpediente | null
  estado_nuevo: EstadoExpediente | null
  comentario: string | null
  descripcion: string
  created_at: string
  usuario: {
    id: string
    nombre: string
    apellido: string
  } | null
}
