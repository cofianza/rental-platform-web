import type { IAuditLogFilters } from '@/types/bitacora'

/**
 * Etiquetas de las acciones auditadas.
 *
 * La API registra ~120 acciones (AUDIT_ACTIONS en
 * rental-platform-api/src/lib/auditLog.ts) pero aquí solo estaban las de
 * login/usuario: todo lo demás salía en la bitácora como el slug crudo
 * ("estudio_resultado_registered"), ilegible para quien audita.
 *
 * Vocabulario: el caso se llama "estudio" (expediente_* en código) y la
 * consulta al buró es "evaluación crediticia" (estudio_* en código).
 */
export const ACTION_LABELS: Record<string, string> = {
  // Sesión
  login_success: 'Inicio de sesión',
  login_failed: 'Inicio de sesión fallido',
  logout: 'Cierre de sesión',
  password_reset_request: 'Solicitud de recuperación',
  password_reset_complete: 'Contraseña restablecida',
  password_reset_by_admin: 'Contraseña restablecida por un admin',

  // Usuarios y configuración
  user_created: 'Usuario creado',
  user_updated: 'Usuario editado',
  user_deactivated: 'Usuario desactivado',
  user_activated: 'Usuario activado',
  user_deleted: 'Usuario eliminado',
  user_role_changed: 'Cambio de rol',
  config_changed: 'Configuración modificada',

  // Inmuebles y fotos
  inmueble_created: 'Inmueble creado',
  inmueble_updated: 'Inmueble editado',
  inmueble_deleted: 'Inmueble eliminado',
  foto_created: 'Foto agregada',
  foto_updated: 'Foto editada',
  foto_deleted: 'Foto eliminada',
  foto_set_fachada: 'Foto marcada como fachada',
  fotos_reordered: 'Fotos reordenadas',

  // Solicitantes
  solicitante_created: 'Solicitante creado',
  solicitante_updated: 'Solicitante editado',
  solicitante_deactivated: 'Solicitante desactivado',

  // Estudios (expedientes)
  expediente_created: 'Estudio creado',
  expediente_updated: 'Estudio editado',

  // Comentarios y asignaciones
  comment_created: 'Comentario agregado',
  comment_updated: 'Comentario editado',
  comment_deleted: 'Comentario eliminado',
  assignment_created: 'Estudio asignado',

  // Documentos
  documento_uploaded: 'Documento cargado',
  documento_deleted: 'Documento eliminado',
  documento_aprobado: 'Documento aprobado',
  documento_rechazado: 'Documento rechazado',
  documento_descargado: 'Documento descargado',
  documento_reemplazado: 'Documento reemplazado',
  tipo_documento_created: 'Tipo de documento creado',
  tipo_documento_updated: 'Tipo de documento editado',
  tipo_documento_toggled: 'Tipo de documento activado/desactivado',
  tipo_documento_reordered: 'Tipos de documento reordenados',

  // Evaluación crediticia
  estudio_created: 'Evaluación solicitada',
  estudio_cancelled: 'Evaluación cancelada',
  estudio_link_sent: 'Enlace de evaluación enviado',
  estudio_form_submitted: 'Formulario de evaluación enviado',
  estudio_resultado_registered: 'Resultado de evaluación registrado',
  estudio_provider_executed: 'Consulta al buró ejecutada',
  estudio_provider_failed: 'Consulta al buró fallida',
  estudio_autorizacion_bloqueada: 'Consulta bloqueada por falta de autorización',
  estudio_provider_result_received: 'Respuesta del buró recibida',
  estudio_reasignado: 'Evaluación movida a otro inmueble',
  estudio_soporte_uploaded: 'Soporte de re-evaluación cargado',
  estudio_reevaluacion_solicitada: 'Re-evaluación solicitada',
  estudio_tarifa_override: 'Tarifa negociada de la evaluación',
  certificado_generated: 'Certificado generado',

  // Autorización (habeas data)
  autorizacion_enlace_sent: 'Enlace de autorización enviado',
  autorizacion_firmada: 'Autorización firmada',
  autorizacion_revocada: 'Autorización revocada',
  autorizacion_biometria: 'Cotejo biométrico',

  // Calibración del modelo
  calibracion_parametro_cambiado: 'Parámetro de calibración cambiado',

  // Plantillas y contratos
  plantilla_created: 'Plantilla creada',
  plantilla_updated: 'Plantilla editada',
  plantilla_deleted: 'Plantilla eliminada',
  contrato_generated: 'Contrato generado',
  contrato_regenerated: 'Contrato regenerado',
  contrato_downloaded: 'Contrato descargado',
  contrato_version_downloaded: 'Versión del contrato descargada',
  contrato_transitioned: 'Contrato cambió de estado',
  contrato_firmado_uploaded: 'Contrato firmado cargado',
  contrato_firmado_downloaded: 'Contrato firmado descargado',
  contrato_firmado_verified: 'Contrato firmado verificado',
  contrato_renewed: 'Contrato renovado',
  contrato_archivo_uploaded: 'Archivo del contrato cargado',
  contrato_archivo_downloaded: 'Archivo del contrato descargado',
  contrato_archivo_deleted: 'Archivo del contrato eliminado',

  // Firma electrónica
  firma_solicitud_created: 'Solicitud de firma creada',
  firma_solicitud_resent: 'Solicitud de firma reenviada',
  firma_solicitud_cancelled: 'Solicitud de firma cancelada',
  firma_auco_signed: 'Firmante firmó en Auco',
  firma_completada: 'Firma completada',
  firma_evidencia_consulted: 'Evidencia de firma consultada',
  firma_acuse_downloaded: 'Acuse de firma descargado',
  firma_identidad_consentimiento: 'Consentimiento biométrico en la firma',
  firma_identidad_biometria: 'Cotejo biométrico en la firma',
  firma_identidad_revisada: 'Identidad revisada por un analista',
  revision_manual_decidida: 'Revisión manual decidida',

  // Pagos
  pago_created: 'Pago creado',
  pago_manual_registered: 'Pago manual registrado',
  pago_completed: 'Pago completado',
  pago_refunded: 'Pago reembolsado',
  pago_cancelled: 'Pago cancelado',
  pago_link_resent: 'Enlace de pago reenviado',
  pago_webhook_processed: 'Webhook de pago procesado',
  pago_state_transitioned: 'Pago cambió de estado',

  // WhatsApp
  whatsapp_enviado: 'WhatsApp enviado',
  whatsapp_fallido: 'WhatsApp fallido',
  whatsapp_mock: 'WhatsApp simulado',

  // Equipo de la inmobiliaria
  miembro_invitado: 'Miembro invitado',
  miembro_revocado: 'Miembro revocado',
  miembro_acepto: 'Miembro aceptó la invitación',
  miembro_rol_cambiado: 'Rol del miembro cambiado',
}

/**
 * Color por prefijo de acción. Antes era un mapa acción→color con 11 entradas,
 * así que el 90% de la bitácora salía en gris.
 * El orden importa: se resuelve con el primer prefijo que coincide, y los
 * desenlaces negativos (fallido/eliminado/rechazado/cancelado) van primero
 * para que se vean en rojo sea cual sea su módulo.
 */
export const ACTION_PREFIX_COLORS: Array<[string, { bg: string; text: string }]> = [
  ['login_failed', { bg: 'bg-red-100', text: 'text-red-800' }],
  ['whatsapp_fallido', { bg: 'bg-red-100', text: 'text-red-800' }],
  ['estudio_provider_failed', { bg: 'bg-red-100', text: 'text-red-800' }],
  ['estudio_autorizacion_bloqueada', { bg: 'bg-red-100', text: 'text-red-800' }],
  ['login_', { bg: 'bg-blue-100', text: 'text-blue-800' }],
  ['logout', { bg: 'bg-blue-100', text: 'text-blue-800' }],
  ['password_', { bg: 'bg-blue-100', text: 'text-blue-800' }],
  ['user_', { bg: 'bg-yellow-100', text: 'text-yellow-800' }],
  ['miembro_', { bg: 'bg-yellow-100', text: 'text-yellow-800' }],
  ['expediente_', { bg: 'bg-primary-100', text: 'text-primary-800' }],
  ['comment_', { bg: 'bg-primary-100', text: 'text-primary-800' }],
  ['assignment_', { bg: 'bg-primary-100', text: 'text-primary-800' }],
  ['documento_', { bg: 'bg-amber-100', text: 'text-amber-800' }],
  ['tipo_documento_', { bg: 'bg-amber-100', text: 'text-amber-800' }],
  ['estudio_', { bg: 'bg-purple-100', text: 'text-purple-800' }],
  ['certificado_', { bg: 'bg-purple-100', text: 'text-purple-800' }],
  ['autorizacion_', { bg: 'bg-purple-100', text: 'text-purple-800' }],
  ['calibracion_', { bg: 'bg-purple-100', text: 'text-purple-800' }],
  ['contrato_', { bg: 'bg-indigo-100', text: 'text-indigo-800' }],
  ['plantilla_', { bg: 'bg-indigo-100', text: 'text-indigo-800' }],
  ['firma_', { bg: 'bg-indigo-100', text: 'text-indigo-800' }],
  ['pago_', { bg: 'bg-green-100', text: 'text-green-800' }],
  ['inmueble_', { bg: 'bg-cyan-100', text: 'text-cyan-800' }],
  ['foto_', { bg: 'bg-cyan-100', text: 'text-cyan-800' }],
  ['solicitante_', { bg: 'bg-cyan-100', text: 'text-cyan-800' }],
  ['whatsapp_', { bg: 'bg-gray-100', text: 'text-gray-800' }],
  ['config_', { bg: 'bg-purple-100', text: 'text-purple-800' }],
]

/** Claves de AUDIT_ENTITIES en la API. */
export const ENTITY_LABELS: Record<string, string> = {
  user: 'Usuario',
  session: 'Sesión',
  config: 'Configuración',
  inmueble: 'Inmueble',
  foto_inmueble: 'Foto de inmueble',
  solicitante: 'Solicitante',
  expediente: 'Estudio',
  comentario: 'Comentario',
  asignacion: 'Asignación',
  documento: 'Documento',
  tipo_documento: 'Tipo de documento',
  estudio: 'Evaluación crediticia',
  documento_soporte: 'Soporte',
  certificado: 'Certificado',
  autorizacion: 'Autorización',
  calibracion: 'Calibración',
  plantilla: 'Plantilla',
  contrato: 'Contrato',
  pago: 'Pago',
  whatsapp: 'WhatsApp',
  inmobiliaria_miembro: 'Miembro de inmobiliaria',
}

function toOption(value: string): { value: string; label: string } {
  return { value, label: ACTION_LABELS[value] ?? value }
}

/**
 * Opciones del filtro de acción, agrupadas por módulo. El filtro plano ofrecía
 * 9 acciones de 120: si buscabas "quién aprobó este documento" no había
 * ninguna opción que lo dijera.
 */
export const ACTION_GROUPS: Array<{
  label: string
  options: Array<{ value: string; label: string }>
}> = [
  {
    label: 'Sesión',
    options: [
      'login_success',
      'login_failed',
      'logout',
      'password_reset_request',
      'password_reset_complete',
      'password_reset_by_admin',
    ].map(toOption),
  },
  {
    label: 'Usuarios y equipo',
    options: [
      'user_created',
      'user_updated',
      'user_activated',
      'user_deactivated',
      'user_deleted',
      'user_role_changed',
      'config_changed',
      'miembro_invitado',
      'miembro_acepto',
      'miembro_rol_cambiado',
      'miembro_revocado',
    ].map(toOption),
  },
  {
    label: 'Inmuebles',
    options: [
      'inmueble_created',
      'inmueble_updated',
      'inmueble_deleted',
      'foto_created',
      'foto_deleted',
      'foto_set_fachada',
    ].map(toOption),
  },
  {
    label: 'Estudios',
    options: [
      'expediente_created',
      'expediente_updated',
      'assignment_created',
      'comment_created',
      'solicitante_created',
      'solicitante_updated',
    ].map(toOption),
  },
  {
    label: 'Documentos',
    options: [
      'documento_uploaded',
      'documento_aprobado',
      'documento_rechazado',
      'documento_reemplazado',
      'documento_descargado',
      'documento_deleted',
    ].map(toOption),
  },
  {
    label: 'Evaluación crediticia',
    options: [
      'estudio_created',
      'estudio_link_sent',
      'estudio_form_submitted',
      'estudio_provider_executed',
      'estudio_provider_result_received',
      'estudio_provider_failed',
      'estudio_autorizacion_bloqueada',
      'estudio_resultado_registered',
      'estudio_reasignado',
      'estudio_reevaluacion_solicitada',
      'estudio_cancelled',
      'certificado_generated',
    ].map(toOption),
  },
  {
    label: 'Autorización y calibración',
    options: [
      'autorizacion_enlace_sent',
      'autorizacion_firmada',
      'autorizacion_revocada',
      'autorizacion_biometria',
      'calibracion_parametro_cambiado',
    ].map(toOption),
  },
  {
    label: 'Contratos y firma',
    options: [
      'contrato_generated',
      'contrato_transitioned',
      'contrato_downloaded',
      'contrato_firmado_uploaded',
      'contrato_renewed',
      'firma_solicitud_created',
      'firma_auco_signed',
      'firma_completada',
      'firma_solicitud_cancelled',
      'firma_identidad_consentimiento',
      'firma_identidad_biometria',
      'firma_identidad_revisada',
      'plantilla_created',
      'plantilla_updated',
    ].map(toOption),
  },
  {
    label: 'Pagos',
    options: [
      'pago_created',
      'pago_completed',
      'pago_manual_registered',
      'pago_link_resent',
      'pago_refunded',
      'pago_cancelled',
    ].map(toOption),
  },
  {
    label: 'WhatsApp',
    options: ['whatsapp_enviado', 'whatsapp_fallido'].map(toOption),
  },
]

export const ENTITY_OPTIONS = [
  { value: '', label: 'Todas las entidades' },
  ...Object.entries(ENTITY_LABELS).map(([value, label]) => ({ value, label })),
]

export const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50]

export const DEFAULT_FILTERS: IAuditLogFilters = {
  page: 1,
  limit: 10,
  userId: '',
  action: '',
  entityType: '',
  dateFrom: '',
  dateTo: '',
  sortOrder: 'desc',
}

export const BITACORA_MESSAGES = {
  FETCH_ERROR: 'Error al cargar la bitacora',
  NO_RESULTS: 'No se encontraron registros de auditoria',
}
