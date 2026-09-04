/**
 * Constantes de Inmuebles - HP-174
 */

import type { TipoInmueble, UsoInmueble, EstadoInmueble, IInmueble } from '@/types/inmueble'

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

// Opciones de estado.
// 'en_estudio' se retiró del filtro: desde el Flujo de Gerencia §4.2 ese estado
// ya no se escribe (una propiedad con estudios en curso se queda 'disponible'),
// así que filtrar por él devolvería siempre cero. El valor SIGUE en
// ESTADO_LABELS / ESTADO_BADGE_CLASSES para pintar las filas históricas que
// todavía lo tengan.
export const ESTADO_OPTIONS: { value: EstadoInmueble | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'disponible', label: 'Disponible' },
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

// ============================================================
// §4.2 — ¿esta propiedad admite un candidato nuevo?
// ============================================================
//
// Flujo de Gerencia §4.2 (CAMBIO APROBADO): tener estudios en curso YA NO
// bloquea la propiedad. Una inmobiliaria muestra el mismo inmueble a varios
// interesados y necesita evaluarlos en paralelo. Lo unico que impide
// seleccionarla es que ya este comprometida:
//   - 'ocupado' + reservado → un candidato aprobado tiene el contrato en curso
//   - 'ocupado' + arrendado → contrato vigente
//   - 'inactivo'            → el dueño la dio de baja
// 'en_estudio' quedo como legado (ya no se escribe) y por eso SI es
// seleccionable: una fila historica no puede seguir bloqueando.
//
// Viven aqui, y no dentro del wizard, porque hay dos pantallas que eligen
// propiedad con esta misma regla: el paso 1 de creacion del expediente y la
// reasignacion del estudio (§4.3). Duplicarla era volver a abrir la puerta a
// que una de las dos se quedara con la version vieja. El backend las aplica
// igual en estudios-simultaneos.guard.ts — esto es solo la cortesia de no
// ofrecer lo que se va a rechazar.

export function esSeleccionable(i: IInmueble): boolean {
  return i.estado !== 'ocupado' && i.estado !== 'inactivo'
}

export function motivoNoSeleccionable(i: IInmueble): string {
  if (i.estado === 'inactivo') return 'Inactivo: reactívalo desde el detalle del inmueble'
  if (i.reservado && !i.arrendado) {
    return 'Reservado: hay un candidato aprobado y el contrato está en proceso.'
  }
  return 'Ya está arrendado (contrato firmado)'
}
