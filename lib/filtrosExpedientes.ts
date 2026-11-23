/**
 * Cómo reacciona una lista de estudios o de evaluaciones a un cambio de filtros (reporte de Gerencia,
 * 21-nov, punto 12):
 * - la búsqueda espera a que se deje de escribir; el chip, la pestaña, el orden y la página cargan ya;
 * - las filas de otra pestaña (otro chip u otra bandeja) no se muestran mientras carga la elegida: se
 *   muestra el esqueleto. Con la misma pestaña (página, orden, búsqueda) se siguen viendo con «Actualizando…».
 * Pura.
 */

import type { IExpedienteFilters } from '@/types/expediente'
import type { IEstudioFilters } from '@/types/estudio'

/** Lo que hace de los filtros una «pestaña»: el chip de la vista de quien gestiona y la bandeja de Cofianza. */
export function clavePestana(f: Pick<IExpedienteFilters, 'estudio_filtro' | 'estado'>): string {
  return `${f.estudio_filtro ?? 'todos'}|${[...(f.estado ?? [])].sort().join(',')}`
}

/** La pestaña de la lista de evaluaciones (/estudios): la bandeja son estados y, a veces, un resultado. */
export function clavePestanaEstudios(f: Pick<IEstudioFilters, 'estado' | 'resultado'>): string {
  return `${[...(f.estado ?? [])].sort().join(',')}|${f.resultado ?? ''}`
}

const igual = (a: unknown, b: unknown): boolean =>
  Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((v, i) => v === b[i]) : a === b

/**
 * Solo cambió el texto de la búsqueda (la página puede volver a la 1 con ella). Sin filtros
 * anteriores (primera carga) es false: se carga ya.
 */
export function soloCambioLaBusqueda<T extends { search: string; page: number }>(prev: T | null, next: T): boolean {
  if (!prev || prev.search === next.search) return false
  const claves = new Set([...Object.keys(prev), ...Object.keys(next)]) as Set<keyof T>
  for (const k of claves) {
    if (k === 'search' || k === 'page') continue
    if (!igual(prev[k], next[k])) return false
  }
  return true
}
