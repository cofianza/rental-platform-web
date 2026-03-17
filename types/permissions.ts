/**
 * Tipos de permisos RBAC - Cofianza 2.0
 * Mirror de los tipos del backend (src/config/permissions.ts)
 */

export type Resource =
  | 'usuarios'
  | 'expedientes'
  | 'estudios'
  | 'contratos'
  | 'plantillas'
  | 'inmuebles'
  | 'reportes'
  | 'configuracion'
  | 'bitacora'
  | 'dashboard'
  | 'solicitantes'
  | 'documentos'
  | 'pagos'
  | 'facturas'

export type Action =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'export'
  | 'validar'
  | 'descargar'
  | 'read_own'

export type InternalRole = 'administrador' | 'operador_analista' | 'gerencia_consulta'

export type PermissionMap = Record<Resource, Action[]>

export interface PermissionsResponse {
  rol: InternalRole
  permissions: PermissionMap
}
