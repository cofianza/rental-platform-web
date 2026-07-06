/**
 * Constantes de Inmuebles - HP-174
 */

import type { TipoInmueble, UsoInmueble, EstadoInmueble } from '@/types/inmueble'

// Opciones de tipo de inmueble
export const TIPO_OPTIONS: { value: TipoInmueble | ''; label: string }[] = [
  { value: '', label: 'Todos los tipos' },
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'apartaestudio', label: 'Apartaestudio' },
  { value: 'casa', label: 'Casa' },
  { value: 'casa_finca', label: 'Casa Finca' },
  { value: 'finca', label: 'Finca' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'local', label: 'Local' },
  { value: 'bodega', label: 'Bodega' },
  { value: 'lote', label: 'Lote' },
  { value: 'parqueadero', label: 'Parqueadero' },
]

// Opciones de uso
export const USO_OPTIONS: { value: UsoInmueble; label: string }[] = [
  { value: 'vivienda', label: 'Vivienda' },
  { value: 'comercial', label: 'Comercio' },
  { value: 'mixto', label: 'Mixto' },
]

// Opciones de estado
export const ESTADO_OPTIONS: { value: EstadoInmueble | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'disponible', label: 'Disponible' },
  { value: 'en_estudio', label: 'En Estudio' },
  { value: 'ocupado', label: 'Ocupado' },
  { value: 'inactivo', label: 'Inactivo' },
]

// Opciones de estrato (Colombia)
export const ESTRATO_OPTIONS: { value: number | ''; label: string }[] = [
  { value: '', label: 'Todos los estratos' },
  { value: 1, label: 'Estrato 1' },
  { value: 2, label: 'Estrato 2' },
  { value: 3, label: 'Estrato 3' },
  { value: 4, label: 'Estrato 4' },
  { value: 5, label: 'Estrato 5' },
  { value: 6, label: 'Estrato 6' },
  { value: 7, label: 'Estrato 7' },
]

// Labels de tipo
export const TIPO_LABELS: Record<TipoInmueble, string> = {
  apartamento: 'Apartamento',
  apartaestudio: 'Apartaestudio',
  casa: 'Casa',
  casa_finca: 'Casa Finca',
  finca: 'Finca',
  oficina: 'Oficina',
  local: 'Local',
  bodega: 'Bodega',
  lote: 'Lote',
  parqueadero: 'Parqueadero',
}

// Labels de estado
export const ESTADO_LABELS: Record<EstadoInmueble, string> = {
  disponible: 'Disponible',
  en_estudio: 'En Estudio',
  ocupado: 'Ocupado',
  inactivo: 'Inactivo',
}

// Colores de badge de estado
export const ESTADO_BADGE_CLASSES: Record<EstadoInmueble, string> = {
  disponible: 'bg-green-100 text-green-800',
  en_estudio: 'bg-yellow-100 text-yellow-800',
  ocupado: 'bg-blue-100 text-blue-800',
  inactivo: 'bg-gray-100 text-gray-800',
}

// Colores de badge de tipo
export const TIPO_BADGE_CLASSES: Record<TipoInmueble, string> = {
  apartamento: 'bg-purple-100 text-purple-800',
  apartaestudio: 'bg-purple-100 text-purple-800',
  casa: 'bg-indigo-100 text-indigo-800',
  casa_finca: 'bg-indigo-100 text-indigo-800',
  finca: 'bg-emerald-100 text-emerald-800',
  oficina: 'bg-cyan-100 text-cyan-800',
  local: 'bg-orange-100 text-orange-800',
  bodega: 'bg-stone-100 text-stone-800',
  lote: 'bg-lime-100 text-lime-800',
  parqueadero: 'bg-slate-100 text-slate-800',
}

// Opciones de items por página
export const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50]

// Mensajes
export const INMUEBLE_MESSAGES = {
  // CRUD
  CREATE_SUCCESS: 'Inmueble creado exitosamente',
  CREATE_ERROR: 'Error al crear el inmueble',
  UPDATE_SUCCESS: 'Inmueble actualizado exitosamente',
  UPDATE_ERROR: 'Error al actualizar el inmueble',
  DELETE_SUCCESS: 'Inmueble eliminado exitosamente',
  DELETE_ERROR: 'Error al eliminar el inmueble',
  FETCH_ERROR: 'Error al cargar los inmuebles',

  // Confirmación
  CONFIRM_DELETE: '¿Estás seguro de que deseas eliminar este inmueble? Esta acción marcará el inmueble como inactivo.',

  // Estados vacíos
  NO_RESULTS: 'No se encontraron inmuebles con los filtros seleccionados.',
  EMPTY_STATE: 'No hay inmuebles registrados. ¡Crea el primero!',

  // Validaciones
  FOTO_REQUIRED: 'La foto de fachada es obligatoria',
  DIRECCION_REQUIRED: 'La dirección es requerida',
  CIUDAD_REQUIRED: 'La ciudad es requerida',
  DEPARTAMENTO_REQUIRED: 'El departamento es requerido',
  TIPO_REQUIRED: 'El tipo de inmueble es requerido',
  ESTRATO_REQUIRED: 'El estrato es requerido',
  VALOR_ARRIENDO_REQUIRED: 'El valor de arrendamiento es requerido',
  PROPIETARIO_REQUIRED: 'Debe seleccionar un propietario',

  // Upload
  UPLOAD_ERROR: 'Error al subir la imagen',
  UPLOAD_SUCCESS: 'Imagen subida exitosamente',
  INVALID_FILE_TYPE: 'Tipo de archivo no permitido. Solo se aceptan JPEG, PNG y WebP.',
  FILE_TOO_LARGE: 'El archivo excede el tamaño máximo de 5MB.',
}

// Columnas ordenables
export const SORTABLE_COLUMNS = ['codigo', 'ciudad', 'valor_arriendo', 'area_m2', 'created_at', 'tipo', 'estrato', 'estado'] as const
