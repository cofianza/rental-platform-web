/**
 * Migración de cartera (backoffice de Cofianza): tipos de /admin/migracion.
 * Reflejan lo que devuelve la API (src/modules/migracion/*); no se derivan aquí.
 */

export type Destinacion = 'vivienda' | 'comercial'
export type EstadoHabilitacion = 'habilitada' | 'con_observaciones' | 'no_habilitada'
export type TipoDocumentoHabilitacion = 'plantilla' | 'convenio' | 'adhesion'
export type ResultadoValidacion = 'aceptada' | 'advertencia' | 'rechazada'
export type EstadoLote = 'procesado' | 'en_firma' | 'activo' | 'expirado' | 'cancelado'
export type EstadoActa = 'creando' | 'en_firma' | 'completo' | 'incompleto' | 'cancelado' | 'fallido'
export type EstadoMigracion = 'rechazado_validacion' | 'borrador' | 'activa' | 'en_revision' | 'excluido' | 'terminado'
export type ResultadoAuditoria = 'conforme' | 'declaracion_falsa' | 'no_entregado'
export type MotivoReportable = 'autorizacion_arrendatario' | 'verificacion_individual'
export type VistaTablero = 'cofianza' | 'inmobiliaria'

// ── Habilitación (§1.1) ──

export interface Habilitacion {
  id: string
  inmobiliaria_id: string
  destinacion: Destinacion
  estado: EstadoHabilitacion
  arrendador_es_inmobiliaria: boolean | null
  habeas_subrogatario: boolean | null
  orden_imputacion: string | null
  regimen_prorroga: string | null
  deposito_dinero: boolean | null
  renovacion_comercial: string | null
  observaciones: string | null
  plantilla_storage_key: string | null
  convenio_migracion_storage_key: string | null
  convenio_vigente_confirmado: boolean
  /** §1.1.4: el arrendador es el propietario y se exige su adhesión (PDF). */
  adhesion_propietario: boolean
  adhesion_propietario_storage_key: string | null
  /** Versión vigente de la revisión (historial en la API, §1.1.5). */
  revision_id: string | null
  revisado_por: string | null
  revisado_en: string | null
}

export interface HabilitacionConEstado extends Habilitacion {
  /** Qué falta para poder cargar (vacío = utilizable). */
  faltantes: string[]
  /** Enlaces firmados de 10 minutos. */
  plantilla_url: string | null
  convenio_migracion_url: string | null
  adhesion_propietario_url: string | null
}

export interface EstadoMigracionOrg {
  inmobiliaria: { id: string; nombre: string; estado: string }
  suspension: { desde: string; motivo: string | null } | null
  habilitaciones: HabilitacionConEstado[]
}

/** Fila de GET /admin/migracion/inmobiliarias (inmobiliarias no cerradas). */
export interface InmobiliariaMigracion {
  id: string
  /** Razón social del titular o, si no hay, el nombre de la inmobiliaria. */
  nombre: string
  estado: string
  titular: { id: string; nombre: string | null } | null
  ciudad: string | null
  /** perfiles.estado del titular. */
  estado_cuenta: string | null
  habilitaciones: { destinacion: Destinacion; estado: EstadoHabilitacion; faltantes: string[] }[]
  suspension: { desde: string; motivo: string | null } | null
}

export interface GuardarHabilitacionBody {
  estado: EstadoHabilitacion
  arrendador_es_inmobiliaria?: boolean | null
  habeas_subrogatario?: boolean | null
  orden_imputacion?: string | null
  regimen_prorroga?: string | null
  deposito_dinero?: boolean | null
  /** Solo comercial; en vivienda la API lo guarda en null. */
  renovacion_comercial?: string | null
  observaciones?: string | null
  convenio_vigente_confirmado?: boolean
  adhesion_propietario?: boolean
}

export interface SuspensionResultado {
  suspendida: true
  ya_estaba_suspendida: boolean
}

// ── Validación y procesamiento (§2.4) ──

export interface ResumenValidacion {
  total: number
  aceptadas: number
  advertencias: number
  rechazadas: number
}

export interface FilaValidacion {
  n_fila: number
  resultado: ResultadoValidacion
  motivos: string[]
  advertencias: string[]
  direccion: string | null
  municipio: string | null
  arrendatario: string | null
  documento: string | null
  canon: number | null
  reportable: boolean | null
  tarifa_pct: number | null
}

/** Adenda 1 §4.3: lo declarado una vez para el lote en la hoja Instrucciones. */
export interface DeclaracionLote {
  al_dia: boolean
  mora_reciente: boolean
  /** null = el lote no declaró una respuesta común (cada contrato trae la suya). */
  autoriza_reporte: boolean | null
  municipio: string | null
  tipo_documento: string | null
  /** §4.4: códigos internos que la inmobiliaria relacionó con mora; esos contratos se rechazan (§4.6). Ausente en una API anterior. */
  contratos_con_mora?: string[]
}

export interface ValidacionResultado {
  resumen: ResumenValidacion
  declaracion_lote: DeclaracionLote
  filas: FilaValidacion[]
}

/** Representante legal que firma el Acta de Migración por Auco (§3.3). */
export interface RepresentanteLegal {
  rep_legal_nombre: string
  rep_legal_documento: string
  rep_legal_email: string
  rep_legal_celular: string
}

export interface ProcesarResultado extends ValidacionResultado {
  lote: {
    id: string
    numero: string
    estado: EstadoLote
    vence_en: string
    exposicion_cop: number
    alerta_exposicion: boolean
    acta_hash: string
  }
}

// ── Acta de Migración (§3.3) ──

export interface FirmanteActa {
  /** 'representante_legal' | 'cofianza', en orden de firma. */
  parteId: string
  estado: string
  aucoId?: string | null
  firmadoEn?: string | null
}

export interface ActaEnviada {
  acta_id: string
  estado: EstadoActa
  auco_code: string | null
  expira_en: string
}

export interface EstadoActaLote {
  lote: {
    id: string
    numero: string
    estado: EstadoLote
    vence_en: string
    /** §3.3: quién firma por la inmobiliaria (se fija al procesar). */
    rep_legal?: { nombre: string | null; documento: string | null; email: string | null; celular: string | null }
  }
  acta: {
    id: string
    intento: number
    estado: EstadoActa
    auco_code: string | null
    expira_en: string
    firmantes: FirmanteActa[]
    motivo: string | null
    cerrado_en: string | null
    firmada: boolean
  } | null
}

/** Enlace firmado de 10 minutos al PDF del acta (la firmada si ya existe). */
export interface ActaPdf {
  url: string
  firmada: boolean
}

// ── Lotes y tablero (§8) ──

export interface LoteResumen {
  id: string
  numero: string
  estado: EstadoLote
  inmobiliaria_id: string
  inmobiliaria: { nombre: string } | null
  total_aceptadas: number
  total_rechazadas: number
  total_advertencias: number
  exposicion_cop: number | string
  alerta_exposicion_en: string | null
  vence_en: string
  activado_en: string | null
  created_at: string
}

export interface FilaTablero {
  fila_id: string
  n_fila: number
  estado: EstadoMigracion
  estado_etiqueta: string
  direccion: string | null
  municipio: string | null
  arrendatario: string
  documento: string
  canon: number
  reportable: boolean | null
  tarifa_pct: number | null
  motivos: string[]
  advertencias: string[]
  en_revision_motivo: string | null
  excluido_motivo: string | null
  contrato_id: string | null
  contrato_numero: string | null
  exposicion_cop: number
  tarifa_mensual_cop: number
}

export interface TableroLote {
  lote: {
    id: string
    numero: string
    estado: EstadoLote
    inmobiliaria_id: string
    inmobiliaria: string | null
    created_at: string
    vence_en: string
    activado_en: string | null
    /** §7.3.1-§7.3.2: periodo y plazo de auditoría que imprimió el acta del lote. */
    meses_sin_mora?: number
    dias_respuesta_auditoria?: number
  }
  conteos: Record<EstadoMigracion, number>
  /** Lo que puede ver la inmobiliaria. */
  resumen: { total_cargado: number; aceptados: number; rechazados: number; activos: number }
  /** Solo Cofianza (§8.3). */
  cofianza: {
    exposicion_cop: number
    exposicion_al_procesar_cop: number
    tarifa_mensual_cop: number
    tarifa_mensual_con_iva_cop: number
    relacion_pct: number | null
    umbral_alerta_cop: number
    alerta_exposicion_en: string | null
  }
  filas: FilaTablero[]
}

// ── Contrato migrado (una fila del lote) ──

export interface PersonaMigrada {
  nombre: string
  tipo_documento: string
  numero_documento: string
  celular: string | null
  email: string | null
}

/** Forma de migracion_filas.datos. Nulos solo en filas rechazadas. */
export interface DatosFilaMigrada {
  direccion: string | null
  municipio: string | null
  departamento: string | null
  codigo_interno: string | null
  inmueble_id?: string
  destinacion: Destinacion | null
  /** Adenda 1 §2: opcionales, null desde la plantilla nueva. */
  tipo_inmueble: string | null
  estrato: number | null
  canon: number | null
  iva_canon_pct: number
  tarifa_base_pct?: number
  fecha_inicio: string | null
  fecha_vencimiento: string | null
  arrendatario: {
    tipo_persona: 'natural' | 'juridica' | null
    nombre: string | null
    apellido: string
    razon_social: string | null
    tipo_documento: string | null
    numero_documento: string | null
    celular: string | null
    email: string | null
  }
  coarrendatarios: PersonaMigrada[]
  /**
   * Adenda 1 §4: autoriza_reporte (con excepción = difiere del lote) desde la plantilla nueva;
   * plantilla_entregada en los lotes anteriores.
   */
  declaraciones: {
    al_dia: boolean | null
    mora_reciente: boolean | null
    autoriza_reporte?: boolean | null
    autoriza_reporte_excepcion?: boolean
    plantilla_entregada?: boolean | null
  }
  observaciones: string | null
  /** Solo lotes anteriores a la Adenda 1 (§2: ya no se piden). */
  cuota_administracion?: number | null
  paga_servicios?: string | null
  paga_administracion?: string | null
}

export interface AuditoriaMigracion {
  id: string
  requerido_en: string
  vence_en: string
  respuesta_en: string | null
  soportes: { storage_key: string; cargado_en: string }[]
  resultado: ResultadoAuditoria | null
  notas: string | null
  decidido_en: string | null
}

/** Spec §7.3.4: auditoría sin resultado, para la lista de /admin/migracion. */
export interface AuditoriaAbierta {
  id: string
  requerido_en: string
  vence_en: string
  respuesta_en: string | null
  fila_id: string | null
  lote_id: string | null
  lote_numero: string | null
  n_fila: number | null
  contrato_numero: string | null
  direccion: string | null
  inmobiliaria: string | null
}

export interface DetalleFilaMigrada {
  id: string
  lote_id: string
  inmobiliaria_id: string
  n_fila: number
  datos: DatosFilaMigrada
  resultado: ResultadoValidacion
  motivos: string[]
  advertencias: string[]
  reportable: boolean | null
  /** Incluye 'sin_autorizacion_reporte' (Adenda 1) y 'formato_anterior' además de los MotivoReportable. */
  reportable_motivo: string | null
  tarifa_acta_pct: number | string | null
  tarifa_pct: number | string | null
  tarifa_desde: string | null
  verificacion_individual_en: string | null
  en_revision: boolean
  en_revision_motivo: string | null
  excluido_en: string | null
  excluido_motivo: 'declaracion_falsa' | 'auditoria_no_entregada' | null
  contrato: {
    id: string
    numero: string | null
    estado: string
    valor_arriendo: number | string | null
    fecha_firma: string | null
    fecha_terminacion: string | null
  } | null
  lote: { id: string; numero: string; estado: EstadoLote } | null
  estado: EstadoMigracion
  estado_etiqueta: string
  tarifa_vigente_pct: number | null
  auditorias: AuditoriaMigracion[]
  /** Spec §3.8: actas de corrección de este contrato (solo sus propios cambios). */
  correcciones: CorreccionContrato[]
}

// ── Acta de corrección (Spec §3.8) ──

export type EstadoCorreccion = 'en_firma' | 'firmada' | 'aplicada' | 'sin_efecto'

/**
 * Datos que puede traer una corrección. Desde la Adenda 1 se proponen solo los de la plantilla
 * nueva; apellidos, celular y correo quedan por las actas de lotes anteriores.
 */
export type CampoCorregible =
  | 'direccion'
  | 'municipio'
  | 'codigo_interno'
  | 'canon'
  | 'fecha_inicio'
  | 'fecha_vencimiento'
  | 'arrendatario_nombre'
  | 'arrendatario_apellido'
  | 'arrendatario_tipo_documento'
  | 'arrendatario_numero_documento'
  | 'arrendatario_celular'
  | 'arrendatario_email'

/** Sin formato: canon número, fechas AAAA-MM-DD, tipo de documento en minúscula. */
export interface CampoCorregido {
  campo: CampoCorregible
  etiqueta: string
  anterior: string | number | null
  nuevo: string | number | null
}

interface CorreccionBase {
  id: string
  numero: number
  motivo: string
  estado: EstadoCorreccion
  estado_etiqueta: string
  creada_en: string
  aplicada_en: string | null
  acta: { estado: EstadoActa; expira_en: string; cerrado_en: string | null; firmada: boolean } | null
}

/** La corrección vista desde un contrato: solo sus cambios. */
export interface CorreccionContrato extends CorreccionBase {
  campos: CampoCorregido[]
}

/** La corrección vista desde el lote: todos los contratos del acta. */
export interface CorreccionLote extends CorreccionBase {
  contratos: { fila_id: string; contrato_numero: string | null; campos: CampoCorregido[] }[]
}

export interface CorreccionBody {
  motivo: string
  contratos: { fila_id: string; cambios: Partial<Record<CampoCorregible, string | number>> }[]
}

/** La exclusión (directa o por auditoría) devuelve además si se suspendió la inmobiliaria. */
export type DetalleFilaExcluida = DetalleFilaMigrada & { inmobiliaria_suspendida?: boolean }

// ── Reportes (§8.5, §4.7) ──

export interface FilaFormatoAnterior {
  fila_id: string
  inmobiliaria_id: string
  inmobiliaria: string | null
  lote: string | null
  contrato_id: string | null
  contrato_numero: string | null
  estado: EstadoMigracion
  estado_etiqueta: string
  direccion: string | null
  arrendatario: string
  canon: number
  reportable: boolean | null
  verificacion_individual_en: string | null
  tarifa_vigente_pct: number | null
}

export interface LineaLiquidacionMigracion {
  inmobiliaria_id: string
  inmobiliaria: string
  lote: string
  contrato_id: string
  contrato_numero: string | null
  direccion: string | null
  arrendatario: string
  canon: number
  activado_en: string
  reportable: boolean | null
  pct: number
  dias: number
  dias_mes: number
  tarifa: number
  iva: number
  total: number
}

export interface LiquidacionMigracion {
  /** AAAA-MM */
  mes: string
  iva_pct: number
  inmobiliarias: { inmobiliaria_id: string; inmobiliaria: string; contratos: number; tarifa: number; iva: number; total: number }[]
  lineas: LineaLiquidacionMigracion[]
}

/** Archivo descargado: el nombre es el mismo que pone la API en Content-Disposition. */
export interface ArchivoDescargado {
  blob: Blob
  nombre: string
}
