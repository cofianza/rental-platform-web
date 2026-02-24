/**
 * Constantes para el Wizard de Creacion de Expedientes - HP-247
 */

// ============================================
// Pasos del wizard
// ============================================

export const WIZARD_STEPS = [
  'Inmueble',
  'Solicitante',
  'Configuracion',
  'Confirmacion',
] as const

export type WizardStepName = (typeof WIZARD_STEPS)[number]

// ============================================
// Opciones de formulario
// ============================================

export const TIPO_PERSONA_OPTIONS = [
  { value: 'natural', label: 'Persona Natural' },
  { value: 'juridica', label: 'Persona Juridica' },
] as const

export const TIPO_DOCUMENTO_OPTIONS = [
  { value: 'cc', label: 'Cedula de Ciudadania' },
  { value: 'ce', label: 'Cedula de Extranjeria' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'nit', label: 'NIT' },
] as const

export const NIVEL_EDUCATIVO_OPTIONS = [
  { value: 'primaria', label: 'Primaria' },
  { value: 'secundaria', label: 'Secundaria' },
  { value: 'tecnico', label: 'Tecnico' },
  { value: 'universitario', label: 'Universitario' },
  { value: 'posgrado', label: 'Posgrado' },
] as const

// Departamentos de Colombia
export const DEPARTAMENTOS_COLOMBIA = [
  'Amazonas',
  'Antioquia',
  'Arauca',
  'Atlantico',
  'Bogota D.C.',
  'Bolivar',
  'Boyaca',
  'Caldas',
  'Caqueta',
  'Casanare',
  'Cauca',
  'Cesar',
  'Choco',
  'Cordoba',
  'Cundinamarca',
  'Guainia',
  'Guaviare',
  'Huila',
  'La Guajira',
  'Magdalena',
  'Meta',
  'Narino',
  'Norte de Santander',
  'Putumayo',
  'Quindio',
  'Risaralda',
  'San Andres y Providencia',
  'Santander',
  'Sucre',
  'Tolima',
  'Valle del Cauca',
  'Vaupes',
  'Vichada',
] as const

// ============================================
// Mensajes del wizard
// ============================================

export const WIZARD_MESSAGES = {
  // Paso 1
  STEP1_TITLE: 'Seleccionar Inmueble',
  STEP1_SUBTITLE: 'Busque y seleccione el inmueble para el expediente',
  SEARCH_INMUEBLE_PLACEHOLDER: 'Buscar por codigo, direccion o ciudad...',
  INMUEBLE_REQUIRED: 'Debe seleccionar un inmueble',
  INMUEBLE_HAS_ACTIVE_EXPEDIENTE: 'Este inmueble ya tiene un expediente activo',
  NO_INMUEBLES_FOUND: 'No se encontraron inmuebles',
  MIN_SEARCH_CHARS: 'Ingrese al menos 2 caracteres para buscar',

  // Paso 2
  STEP2_TITLE: 'Datos del Solicitante',
  STEP2_SUBTITLE: 'Busque un solicitante existente o cree uno nuevo',
  SEARCH_SOLICITANTE_PLACEHOLDER: 'Ingrese numero de documento',
  SOLICITANTE_NOT_FOUND: 'No se encontro solicitante con ese documento',
  CREATE_NEW_SOLICITANTE: 'Crear nuevo solicitante',
  USE_EXISTING_SOLICITANTE: 'Buscar solicitante existente',
  SOLICITANTE_FOUND: 'Solicitante encontrado',

  // Paso 3
  STEP3_TITLE: 'Configuracion',
  STEP3_SUBTITLE: 'Configure opciones adicionales del expediente',
  NOTAS_LABEL: 'Notas internas',
  NOTAS_PLACEHOLDER: 'Notas internas sobre el expediente (opcional)...',
  NOTAS_MAX_LENGTH: 'Las notas no deben exceder 5000 caracteres',
  ANALISTA_LABEL: 'Asignar responsable',
  ANALISTA_PLACEHOLDER: 'Seleccionar responsable (opcional)',
  NO_ANALISTAS: 'No hay analistas disponibles',

  // Paso 4
  STEP4_TITLE: 'Confirmacion',
  STEP4_SUBTITLE: 'Revise los datos antes de crear el expediente',
  CONFIRM_CREATE: 'Crear Expediente',
  CREATING: 'Creando expediente...',
  SUCCESS: 'Expediente creado exitosamente',
  ERROR: 'Error al crear el expediente',

  // Navegacion
  PREVIOUS: 'Anterior',
  NEXT: 'Siguiente',
  CANCEL: 'Cancelar',

  // Secciones del formulario de solicitante
  SECTION_DATOS_BASICOS: 'Datos Basicos',
  SECTION_CONTACTO: 'Contacto',
  SECTION_UBICACION: 'Ubicacion',
  SECTION_LABORAL: 'Informacion Laboral',
  SECTION_ADICIONAL: 'Informacion Adicional',

  // Labels de campos
  LABEL_TIPO_PERSONA: 'Tipo de persona',
  LABEL_NOMBRE: 'Nombre(s)',
  LABEL_APELLIDO: 'Apellido(s)',
  LABEL_TIPO_DOCUMENTO: 'Tipo de documento',
  LABEL_NUMERO_DOCUMENTO: 'Numero de documento',
  LABEL_EMAIL: 'Email',
  LABEL_TELEFONO: 'Telefono',
  LABEL_DIRECCION: 'Direccion',
  LABEL_DEPARTAMENTO: 'Departamento',
  LABEL_CIUDAD: 'Ciudad',
  LABEL_OCUPACION: 'Ocupacion',
  LABEL_ACTIVIDAD_ECONOMICA: 'Actividad economica',
  LABEL_EMPRESA: 'Nombre del empleador',
  LABEL_INGRESOS: 'Ingresos mensuales',
  LABEL_NIVEL_EDUCATIVO: 'Nivel educativo',
  LABEL_PARENTESCO: 'Parentesco',
  LABEL_HABITARA_INMUEBLE: 'Habitara el inmueble',

  // Placeholders
  PLACEHOLDER_NOMBRE: 'Ingrese nombre(s)',
  PLACEHOLDER_APELLIDO: 'Ingrese apellido(s)',
  PLACEHOLDER_DOCUMENTO: 'Ingrese numero',
  PLACEHOLDER_EMAIL: 'correo@ejemplo.com',
  PLACEHOLDER_TELEFONO: '+57 3001234567',
  PLACEHOLDER_DIRECCION: 'Direccion completa',
  PLACEHOLDER_CIUDAD: 'Ciudad',
  PLACEHOLDER_OCUPACION: 'Ocupacion o cargo',
  PLACEHOLDER_ACTIVIDAD: 'Actividad economica',
  PLACEHOLDER_EMPRESA: 'Nombre de empresa',
  PLACEHOLDER_INGRESOS: '0',
  PLACEHOLDER_PARENTESCO: 'Ej: Padre, Madre, Conyuge',
} as const

// ============================================
// Valores por defecto del formulario
// ============================================

export const DEFAULT_SOLICITANTE_FORM = {
  tipo_persona: '' as const,
  nombre: '',
  apellido: '',
  tipo_documento: '' as const,
  numero_documento: '',
  email: '',
  telefono: '',
  direccion: '',
  departamento: '',
  ciudad: '',
  ocupacion: '',
  actividad_economica: '',
  empresa: '',
  ingresos_mensuales: undefined as number | undefined,
  nivel_educativo: '' as const,
  parentesco: '',
  habitara_inmueble: false,
}
