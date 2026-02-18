import type { IAuditLogFilters } from '@/types/bitacora'

export const ACTION_LABELS: Record<string, string> = {
  login_success: 'Inicio de sesion',
  login_failed: 'Login fallido',
  logout: 'Cierre de sesion',
  password_reset_request: 'Solicitud de recuperacion',
  password_reset_complete: 'Contrasena restablecida',
  user_created: 'Usuario creado',
  user_updated: 'Usuario editado',
  user_deactivated: 'Usuario desactivado',
  user_activated: 'Usuario activado',
  user_role_changed: 'Cambio de rol',
  config_changed: 'Configuracion modificada',
}

export const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  login_success: { bg: 'bg-blue-100', text: 'text-blue-800' },
  login_failed: { bg: 'bg-blue-100', text: 'text-blue-800' },
  logout: { bg: 'bg-blue-100', text: 'text-blue-800' },
  user_created: { bg: 'bg-green-100', text: 'text-green-800' },
  user_activated: { bg: 'bg-green-100', text: 'text-green-800' },
  user_updated: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  user_role_changed: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  user_deactivated: { bg: 'bg-red-100', text: 'text-red-800' },
  password_reset_request: { bg: 'bg-orange-100', text: 'text-orange-800' },
  password_reset_complete: { bg: 'bg-orange-100', text: 'text-orange-800' },
  config_changed: { bg: 'bg-purple-100', text: 'text-purple-800' },
}

export const ENTITY_LABELS: Record<string, string> = {
  user: 'Usuario',
  session: 'Sesion',
  config: 'Configuracion',
  expediente: 'Expediente',
  contrato: 'Contrato',
}

export const ACTION_OPTIONS = [
  { value: '', label: 'Todas las acciones' },
  { value: 'login_success', label: 'Inicio de sesion' },
  { value: 'login_failed', label: 'Login fallido' },
  { value: 'logout', label: 'Cierre de sesion' },
  { value: 'user_created', label: 'Usuario creado' },
  { value: 'user_updated', label: 'Usuario editado' },
  { value: 'user_activated', label: 'Usuario activado' },
  { value: 'user_deactivated', label: 'Usuario desactivado' },
  { value: 'password_reset_request', label: 'Solicitud recuperacion' },
  { value: 'password_reset_complete', label: 'Contrasena restablecida' },
]

export const ENTITY_OPTIONS = [
  { value: '', label: 'Todas las entidades' },
  { value: 'user', label: 'Usuario' },
  { value: 'session', label: 'Sesion' },
  { value: 'config', label: 'Configuracion' },
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
