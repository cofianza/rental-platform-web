/**
 * Constantes de usuarios - HP-117
 */

import type { UserRole } from '@/types/user'

/**
 * Labels de roles para mostrar en UI
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  administrador: 'Administrador',
  operador_analista: 'Operador/Analista',
  gerencia_consulta: 'Gerencia/Consulta',
  propietario: 'Propietario',
  inmobiliaria: 'Inmobiliaria',
}

/**
 * Colores de badges por rol
 */
export const ROLE_COLORS: Record<UserRole, string> = {
  administrador: 'purple',
  operador_analista: 'blue',
  gerencia_consulta: 'green',
  propietario: 'teal',
  inmobiliaria: 'orange',
}

/**
 * Clases de Tailwind para badges de rol
 */
export const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  administrador: 'bg-purple-100 text-purple-800',
  operador_analista: 'bg-blue-100 text-blue-800',
  gerencia_consulta: 'bg-green-100 text-green-800',
  propietario: 'bg-teal-100 text-teal-800',
  inmobiliaria: 'bg-orange-100 text-orange-800',
}

/**
 * Clases de Tailwind para badges de estado
 */
export const STATUS_BADGE_CLASSES = {
  activo: 'bg-green-100 text-green-800',
  inactivo: 'bg-red-100 text-red-800',
}

/**
 * Opciones de items por página
 */
export const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50]

/**
 * Filtros por defecto
 */
export const DEFAULT_FILTERS = {
  search: '',
  role: '' as const,
  is_active: '' as const,
  page: 1,
  limit: 10,
  sortBy: 'created_at',
  sortOrder: 'desc' as const,
}

/**
 * Opciones de rol para select
 */
export const ROLE_OPTIONS: { value: UserRole | ''; label: string }[] = [
  { value: '', label: 'Todos los roles' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'operador_analista', label: 'Operador/Analista' },
  { value: 'gerencia_consulta', label: 'Gerencia/Consulta' },
  { value: 'propietario', label: 'Propietario' },
  { value: 'inmobiliaria', label: 'Inmobiliaria' },
]

/**
 * Opciones de estado para select
 */
export const STATUS_OPTIONS: { value: 'true' | 'false' | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
]

/**
 * Mensajes de la UI
 */
export const USER_MESSAGES = {
  CREATE_SUCCESS: 'Usuario creado exitosamente',
  UPDATE_SUCCESS: 'Usuario actualizado exitosamente',
  ACTIVATE_SUCCESS: 'Usuario activado exitosamente',
  DEACTIVATE_SUCCESS: 'Usuario desactivado exitosamente',
  CREATE_ERROR: 'Error al crear usuario',
  UPDATE_ERROR: 'Error al actualizar usuario',
  ACTIVATE_ERROR: 'Error al activar usuario',
  DEACTIVATE_ERROR: 'Error al desactivar usuario',
  FETCH_ERROR: 'Error al cargar usuarios',
  NO_RESULTS: 'No se encontraron usuarios',
  CONFIRM_DEACTIVATE: '¿Estás seguro de que deseas desactivar este usuario?',
  CONFIRM_ACTIVATE: '¿Estás seguro de que deseas activar este usuario?',
}
