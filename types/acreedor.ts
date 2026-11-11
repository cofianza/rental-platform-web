/**
 * Lista de acreedores (Adenda 5 §3): cómo se clasifica cada
 * acreedor que reportan las centrales. Solo la ve Cofianza. Las reglas de
 * clasificación viven en el API; aquí solo los nombres para mostrar.
 */

export type CentralAcreedor = 'datacredito' | 'transunion'
export type EstadoAcreedor = 'pendiente' | 'activo'
export type CategoriaAcreedor =
  | 'banco'
  | 'cooperativa'
  | 'fondo_empleados'
  | 'prestamista_efectivo_o_tarjetas'
  | 'libranza'
  | 'telco'
  | 'real'

export interface IAcreedor {
  id: string
  central: CentralAcreedor
  acreedor_id: string
  nombre: string | null
  /** null mientras está pendiente de clasificar. */
  categoria: CategoriaAcreedor | null
  estado: EstadoAcreedor
  /** Cuántas evaluaciones lo vieron sin clasificar. */
  visto_en_estudios: number
  visto_ultima_vez: string | null
  actualizado_en: string
  motivo: string | null
}

export interface IAcreedoresFiltros {
  estado?: EstadoAcreedor
  central?: CentralAcreedor
  q?: string
  page?: number
  limit?: number
}

export interface IAcreedoresPagina {
  data: IAcreedor[]
  total: number
  page: number
  limit: number
}

export interface IClasificarAcreedor {
  categoria: CategoriaAcreedor
  nombre?: string
  motivo: string
}

export interface ICrearAcreedor extends IClasificarAcreedor {
  central: CentralAcreedor
  acreedor_id: string
}

/** Nombres para mostrar (en el orden del selector). */
export const CATEGORIAS_ACREEDOR: { valor: CategoriaAcreedor; etiqueta: string }[] = [
  { valor: 'banco', etiqueta: 'Banco' },
  { valor: 'cooperativa', etiqueta: 'Cooperativa' },
  { valor: 'fondo_empleados', etiqueta: 'Fondo de empleados' },
  { valor: 'prestamista_efectivo_o_tarjetas', etiqueta: 'Prestamista o emisor de tarjetas' },
  { valor: 'libranza', etiqueta: 'Libranza' },
  { valor: 'telco', etiqueta: 'Telefonía, televisión o internet' },
  { valor: 'real', etiqueta: 'Comercio y otros sectores' },
]

export const NOMBRE_CENTRAL: Record<CentralAcreedor, string> = {
  datacredito: 'DataCrédito',
  transunion: 'TransUnion',
}
