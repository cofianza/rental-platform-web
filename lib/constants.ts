/**
 * Constantes del dominio - Cofianza 2.0
 * Configuración de navegación, estados, formatos y constantes del negocio
 */

// ============================================
// NAVEGACIÓN DEL DASHBOARD
// ============================================

import type { Resource } from '@/types/permissions'
import type { UserRole } from '@/types/auth'

export interface NavItem {
  label: string
  href: string
  icon: string // Nombre del ícono (para usar con librería de íconos)
  description?: string
  resource?: Resource // Recurso asociado para filtrado RBAC
  // Si se especifica, el item solo se muestra si user.rol ∈ requiredRoles.
  // Se combina (AND) con el check de `resource`. Útil para ocultar rutas a
  // roles que técnicamente tienen `read` pero no deben verlas en la nav
  // (ej: solicitante tiene citas.read pero el kanban es solo operativo).
  requiredRoles?: UserRole[]
  // Grupo del sidebar (mockup 15_*: Principal / Operación / Financiero /
  // Administración). El Sidebar renderiza un encabezado por grupo. Ítems sin
  // grupo se muestran planos arriba.
  group?: string
}

// Grupos del sidebar en el orden de aparición (mockup 15_*).
export const NAV_GROUPS = ['Principal', 'Operación', 'Financiero', 'Administración'] as const

export const NAV_ITEMS: NavItem[] = [
  // ── Principal ──────────────────────────────────────────────
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    description: 'Vista general y KPIs',
    resource: 'dashboard',
    group: 'Principal',
  },

  // ── Operación ──────────────────────────────────────────────
  // Gestión de aliados (perfiles) — solo administrador. Reusan el recurso
  // 'usuarios' para el chequeo RBAC (el admin lo tiene); el CRUD real se
  // apoya en userService filtrando por rol.
  {
    label: 'Inmobiliarias',
    href: '/inmobiliarias',
    icon: 'Building2',
    description: 'Aliados inmobiliarios: contratos, canon y estado',
    resource: 'usuarios',
    requiredRoles: ['administrador'],
    group: 'Operación',
  },
  {
    label: 'Propietarios',
    href: '/propietarios',
    icon: 'User',
    description: 'Propietarios directos y su portafolio',
    resource: 'usuarios',
    requiredRoles: ['administrador'],
    group: 'Operación',
  },
  {
    label: 'Inquilinos',
    href: '/inquilinos',
    icon: 'UserCheck',
    description: 'Arrendatarios con contrato activo',
    resource: 'usuarios',
    requiredRoles: ['administrador'],
    group: 'Operación',
  },
  {
    // Rename Mario 12-may-2026: "Inmuebles" -> "Propiedades y Vitrina".
    // En la nueva propuesta UI ambas funcionalidades viven en una sola
    // pantalla con filter-chips (Todas/En vitrina/Pausadas/Sin publicar).
    // La ruta sigue siendo /inmuebles para preservar deep-links.
    label: 'Propiedades y Vitrina',
    href: '/inmuebles',
    icon: 'Home',
    description: 'Gestión de propiedades y publicación en la vitrina',
    resource: 'inmuebles',
    group: 'Operación',
  },
  {
    label: 'Expedientes',
    href: '/expedientes',
    icon: 'FolderOpen',
    description: 'Casos de arrendamiento',
    resource: 'expedientes',
    group: 'Operación',
  },
  {
    // Contratos: la ruta /contratos ya existe con su flujo. Se expone en el
    // sidebar para los roles operativos (antes solo se accedía vía expediente).
    label: 'Contratos',
    href: '/contratos',
    icon: 'FileText',
    description: 'Contratos de arrendamiento',
    resource: 'contratos',
    requiredRoles: ['administrador', 'operador_analista', 'gerencia_consulta'],
    group: 'Operación',
  },
  {
    label: 'Citas',
    href: '/citas',
    icon: 'Calendar',
    description: 'Gestiona visitas a tus inmuebles',
    resource: 'citas',
    requiredRoles: ['administrador', 'operador_analista', 'propietario', 'inmobiliaria', 'gerencia_consulta'],
    group: 'Operación',
  },
  {
    label: 'Disponibilidad',
    href: '/disponibilidad',
    icon: 'Clock',
    description: 'Horarios para agendar visitas',
    resource: 'disponibilidad',
    requiredRoles: ['propietario', 'inmobiliaria', 'administrador'],
    group: 'Operación',
  },

  // ── Financiero ─────────────────────────────────────────────
  {
    label: 'Ingresos',
    href: '/ingresos',
    icon: 'DollarSign',
    description: 'Ingresos por afianzamiento e IVA',
    resource: 'reportes',
    requiredRoles: ['administrador'],
    group: 'Financiero',
  },
  {
    // Mora: la ruta /moras ya existe. No hay Resource 'moras', así que se
    // gatea solo por rol.
    label: 'Mora',
    href: '/moras',
    icon: 'AlertTriangle',
    description: 'Cobranza y gestión de mora',
    requiredRoles: ['administrador', 'operador_analista', 'gerencia_consulta'],
    group: 'Financiero',
  },
  {
    // Rename Mario 12-may-2026: "Facturación" -> "Pagos a Cofianza".
    // El alcance se mantiene (comisiones, facturas Factus, datos fiscales);
    // el label refleja la lógica de negocio (la inmobiliaria le paga a Cofianza).
    label: 'Pagos a Cofianza',
    href: '/facturacion',
    icon: 'Receipt',
    description: 'Comisiones y facturación con Cofianza',
    resource: 'facturas',
    // Excluido propietario: la facturacion la maneja la inmobiliaria a su
    // nombre, no el propietario individual. El propietario consulta los
    // pagos y contratos en su expediente; no necesita el panel fiscal.
    requiredRoles: ['administrador', 'operador_analista', 'gerencia_consulta', 'inmobiliaria', 'solicitante'],
    group: 'Financiero',
  },
  {
    // Rename Mario 12-may-2026: "Reportes" -> "Analítica".
    label: 'Analítica',
    href: '/reportes',
    icon: 'BarChart3',
    description: 'Reportes y analítica de tu operación',
    resource: 'reportes',
    group: 'Financiero',
  },

  // ── Administración ─────────────────────────────────────────
  {
    label: 'Soporte',
    href: '/soporte',
    icon: 'Inbox',
    description: 'Tickets de soporte funcional',
    resource: 'dashboard',
    requiredRoles: ['administrador'],
    group: 'Administración',
  },
  {
    label: 'Usuarios',
    href: '/usuarios',
    icon: 'Users',
    description: 'Gestión de usuarios',
    resource: 'usuarios',
    group: 'Administración',
  },
  {
    label: 'Bitácora',
    href: '/bitacora',
    icon: 'ClipboardList',
    description: 'Registro de actividad',
    resource: 'bitacora',
    group: 'Administración',
  },
  {
    label: 'Plantillas',
    href: '/plantillas-contrato',
    icon: 'ScrollText',
    description: 'Plantillas de contrato',
    resource: 'plantillas',
    group: 'Administración',
  },
  {
    label: 'Configuración',
    href: '/configuracion',
    icon: 'Settings',
    description: 'Configuración del sistema',
    resource: 'configuracion',
    group: 'Administración',
  },
]

// ============================================
// ESTADOS DEL SISTEMA
// ============================================

export type EstadoExpediente =
  | 'borrador'
  | 'en_revision'
  | 'informacion_incompleta'
  | 'aprobado'
  | 'rechazado'
  | 'condicionado'
  | 'cerrado'

export type EstadoInmueble = 'disponible' | 'en_estudio' | 'arrendado' | 'no_disponible'

export interface EstadoConfig {
  label: string
  color: string // Clase de Tailwind
  bgColor: string
  textColor: string
  borderColor: string
}

/**
 * Configuración visual de estados de expedientes
 * Con colores consistentes según reglas de negocio
 */
export const ESTADOS_EXPEDIENTE: Record<EstadoExpediente, EstadoConfig> = {
  borrador: {
    label: 'Borrador',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-300',
  },
  en_revision: {
    label: 'En Revisión',
    color: 'amber',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
  },
  informacion_incompleta: {
    label: 'Información Incompleta',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-300',
  },
  aprobado: {
    label: 'Aprobado',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
  },
  rechazado: {
    label: 'Rechazado',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
  },
  condicionado: {
    label: 'Condicionado',
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-300',
  },
  cerrado: {
    label: 'Cerrado',
    color: 'slate',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-300',
  },
}

export const ESTADOS_INMUEBLE: Record<EstadoInmueble, EstadoConfig> = {
  disponible: {
    label: 'Disponible',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
  },
  en_estudio: {
    label: 'En Estudio',
    color: 'amber',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
  },
  arrendado: {
    label: 'Arrendado',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300',
  },
  no_disponible: {
    label: 'No Disponible',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-300',
  },
}

// ============================================
// ESTADOS DE CONTRATO
// ============================================

export type EstadoContratoKey =
  | 'borrador'
  | 'en_revision'
  | 'aprobado'
  | 'pendiente_firma'
  | 'firmado'
  | 'vigente'
  | 'finalizado'
  | 'cancelado'

export const ESTADOS_CONTRATO: Record<EstadoContratoKey, EstadoConfig> = {
  borrador: {
    label: 'Borrador',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-300',
  },
  en_revision: {
    label: 'En Revisión',
    color: 'amber',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
  },
  aprobado: {
    label: 'Aprobado',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
  },
  pendiente_firma: {
    label: 'Enviado a Firma',
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-300',
  },
  firmado: {
    label: 'Firmado',
    color: 'teal',
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-300',
  },
  vigente: {
    label: 'Vigente',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300',
  },
  finalizado: {
    label: 'Finalizado',
    color: 'slate',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-300',
  },
  cancelado: {
    label: 'Cancelado',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
  },
}

// ============================================
// ESTADOS DE ESTUDIO DE RIESGO
// ============================================

export type EstadoEstudioType =
  | 'solicitado'
  | 'pago_pendiente'
  | 'pagado'
  | 'autorizado'
  | 'formulario_enviado'
  | 'formulario_completado'
  | 'documentos_cargados'
  | 'en_proceso'
  | 'completado'
  | 'fallido'
  | 'cancelado'

export type ResultadoEstudioType = 'pendiente' | 'aprobado' | 'rechazado' | 'condicionado'

export const ESTADOS_ESTUDIO: Record<EstadoEstudioType, EstadoConfig> = {
  solicitado: {
    label: 'Solicitado',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300',
  },
  pago_pendiente: {
    label: 'Pago Pendiente',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-300',
  },
  pagado: {
    label: 'Pagado',
    color: 'teal',
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-300',
  },
  autorizado: {
    label: 'Autorizado',
    color: 'cyan',
    bgColor: 'bg-cyan-100',
    textColor: 'text-cyan-700',
    borderColor: 'border-cyan-300',
  },
  formulario_enviado: {
    label: 'Enlace Enviado',
    color: 'cyan',
    bgColor: 'bg-cyan-100',
    textColor: 'text-cyan-700',
    borderColor: 'border-cyan-300',
  },
  formulario_completado: {
    label: 'Form. Completado',
    color: 'indigo',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-300',
  },
  documentos_cargados: {
    label: 'Docs Cargados',
    color: 'violet',
    bgColor: 'bg-violet-100',
    textColor: 'text-violet-700',
    borderColor: 'border-violet-300',
  },
  en_proceso: {
    label: 'En Proceso',
    color: 'amber',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
  },
  completado: {
    label: 'Completado',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
  },
  fallido: {
    label: 'Fallido',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
  },
  cancelado: {
    label: 'Cancelado',
    color: 'slate',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-300',
  },
}

export const ESTADOS_RESULTADO_ESTUDIO: Record<ResultadoEstudioType, EstadoConfig> = {
  pendiente: {
    label: 'Pendiente',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-300',
  },
  aprobado: {
    label: 'Aprobado',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
  },
  rechazado: {
    label: 'Rechazado',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
  },
  condicionado: {
    label: 'Condicionado',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-300',
  },
}

// ============================================
// FORMATOS Y UTILIDADES
// ============================================

/**
 * Formatea valores monetarios en pesos colombianos (COP)
 * Formato: $1.500.000 (punto como separador de miles, sin decimales)
 *
 * @param value - Valor numérico a formatear
 * @returns String formateado con símbolo $ y separadores de miles
 *
 * @example
 * formatCurrency(1500000) // "$1.500.000"
 * formatCurrency(500000) // "$500.000"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Formatea fechas al formato colombiano
 * @param date - Fecha a formatear (ISO con hora o "YYYY-MM-DD" date-only)
 * @returns String con formato dd/mm/yyyy
 *
 * Cuidado: las strings "YYYY-MM-DD" (date-only, ej. fecha_inicio del contrato)
 * `new Date()` las parsea como UTC midnight. Al formatear con timeZone
 * America/Bogota (UTC-5) se restan 5h y termina mostrando el dia ANTERIOR
 * (ej. "2026-06-02" sale como "01/06/2026"). Para esas, detectamos el patron
 * y construimos la fecha al mediodia UTC, que en cualquier zona horaria de
 * America cae el mismo dia calendario.
 */
export function formatDate(date: Date | string): string {
  let d: Date
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, day] = date.split('-').map(Number)
    d = new Date(Date.UTC(y, m - 1, day, 12, 0, 0))
  } else {
    d = typeof date === 'string' ? new Date(date) : date
  }
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/**
 * Formatea fechas con hora al formato colombiano.
 *
 * Forzamos `timeZone: 'America/Bogota'` (UTC-5) porque sin él Intl usa la
 * timezone del browser y los propietarios fuera de Colombia (p. ej. en
 * México UTC-6) veían las citas con 1 hora menos que el solicitante. La
 * regla del negocio: las horas son siempre Colombia, sin importar dónde
 * viva el usuario.
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

// ============================================
// CONSTANTES DEL NEGOCIO
// ============================================

/**
 * Tipos de documento válidos en Colombia
 */
export const TIPOS_DOCUMENTO = {
  CC: 'Cédula de Ciudadanía',
  CE: 'Cédula de Extranjería',
  NIT: 'NIT',
  PASAPORTE: 'Pasaporte',
} as const

/**
 * Estratos socioeconómicos en Colombia (1-6)
 */
export const ESTRATOS = [1, 2, 3, 4, 5, 6] as const

/**
 * Tipos de inmueble
 */
export const TIPOS_INMUEBLE = {
  APARTAMENTO: 'Apartamento',
  CASA: 'Casa',
  LOCAL: 'Local Comercial',
  OFICINA: 'Oficina',
  BODEGA: 'Bodega',
  LOTE: 'Lote',
} as const

/**
 * Roles del sistema
 */
export const ROLES = {
  ADMINISTRADOR: 'Administrador',
  OPERADOR: 'Operador/Analista',
  GERENCIA: 'Gerencia/Consulta',
} as const

/**
 * Límites del sistema
 */
export const LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_PHOTOS_PER_PROPERTY: 10,
  ITEMS_PER_PAGE: 20,
} as const

/**
 * URLs de la API
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

/**
 * Mensajes de error comunes
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Error de conexión. Por favor, verifica tu conexión a internet.',
  UNAUTHORIZED: 'No tienes autorización para realizar esta acción.',
  NOT_FOUND: 'El recurso solicitado no fue encontrado.',
  SERVER_ERROR: 'Error en el servidor. Por favor, intenta de nuevo más tarde.',
  VALIDATION_ERROR: 'Error de validación. Verifica los datos ingresados.',
} as const

// ============================================
// AUTENTICACIÓN (HP-95)
// ============================================

/**
 * Mensajes de error de autenticación
 */
export const AUTH_MESSAGES = {
  INVALID_CREDENTIALS: 'Credenciales inválidas. Verifica tu correo y contraseña.',
  INACTIVE_ACCOUNT: 'Tu cuenta está inactiva. Contacta al administrador.',
  EMAIL_NOT_CONFIRMED: 'Aún no has verificado tu correo. Revisa tu bandeja de entrada (y la carpeta de spam).',
  SESSION_EXPIRED: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
  NETWORK_ERROR: 'Error de conexión. Por favor, verifica tu conexión a internet.',
  SERVER_ERROR: 'Error en el servidor. Por favor, intenta de nuevo más tarde.',
} as const

/**
 * Rutas de autenticación
 */
export const AUTH_ROUTES = {
  LOGIN: '/login',
  REGISTER: '/registro',
  REGISTER_PROPIETARIO: '/registro/propietario',
  REGISTER_INMOBILIARIA: '/registro/inmobiliaria',
  REGISTER_SOLICITANTE: '/registro/solicitante',
  REGISTER_SUCCESS: '/registro/exito',
  VERIFY_EMAIL: '/verificar-email',
  FORGOT_PASSWORD: '/recuperar-contrasena',
  RESET_PASSWORD: '/restablecer-contrasena',
  DASHBOARD: '/dashboard',
} as const

/**
 * Rutas protegidas que requieren autenticación
 */
export const PROTECTED_ROUTES = [
  '/dashboard',
  '/inmuebles',
  '/expedientes',
  '/estudios',
  '/reportes',
  '/facturacion',
  '/usuarios',
  '/configuracion',
] as const

/**
 * Rutas públicas de autenticación (no requieren sesión)
 */
export const PUBLIC_AUTH_ROUTES = [
  '/login',
  '/registro',
  '/registro/propietario',
  '/registro/inmobiliaria',
  '/registro/exito',
  '/verificar-email',
  '/recuperar-contrasena',
  '/restablecer-contrasena',
] as const
