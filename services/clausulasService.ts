/**
 * Cláusulas adicionales (Contratos V3, Entrega 4).
 * - Inmobiliaria: su catálogo (biblioteca de Cofianza + cláusulas propias). El API
 *   responde 404 mientras CONTRATOS_V3_ENABLED esté apagado.
 * - Administrador: biblioteca y registro de las cláusulas de todas las inmobiliarias.
 * Guardar corre las reglas (y la IA si está encendida): 422 CLAUSULA_NO_PERMITIDA trae
 * `details: {hallazgos, avisos}`; léelos con `hallazgosDe`.
 */

import { apiClient, ApiClientError } from '@/lib/api'
import type {
  CatalogoClausulas,
  ClausulaCatalogo,
  ClausulaRegistro,
  Hallazgo,
  OrigenClausula,
  UsoClausula,
} from '@/types/contratoV3'

export interface ClausulaEntrada { titulo: string; texto: string }
/** Lo que devuelve guardar. `avisos` (p. ej. cita_numero) no bloquean; el API puede omitirlos. */
export type ClausulaGuardada = ClausulaCatalogo & { avisos?: Hallazgo[] }
export type EstadoRegistro = ClausulaRegistro['estado']
export interface FiltrosRegistro { origen?: OrigenClausula; estado?: EstadoRegistro; q?: string; page?: number }
export interface PaginaRegistro { items: ClausulaRegistro[]; total: number }
export type CambioEstado = { estado: 'inhabilitada'; motivo: string } | { estado: 'activa' }

/** Hallazgos y avisos de un 422 del API (guardar cláusula o el paso 4). Vacíos si no vienen. */
export function hallazgosDe(err: unknown): { hallazgos: Hallazgo[]; avisos: Hallazgo[]; indice: number | null } {
  // ApiClientError tipa details como lista de campos; aquí el API manda un objeto.
  const d = (err instanceof ApiClientError ? err.details : undefined) as unknown as
    | { hallazgos?: unknown; avisos?: unknown; indice?: unknown }
    | undefined
  return {
    hallazgos: Array.isArray(d?.hallazgos) ? (d.hallazgos as Hallazgo[]) : [],
    avisos: Array.isArray(d?.avisos) ? (d.avisos as Hallazgo[]) : [],
    indice: typeof d?.indice === 'number' ? d.indice : null,
  }
}

const AGENCIA = '/clausulas-adicionales'
const ADMIN = '/admin/clausulas-adicionales'

export const clausulasService = {
  // ── Inmobiliaria ──
  async catalogo(): Promise<CatalogoClausulas> {
    return (await apiClient.get<CatalogoClausulas>(AGENCIA)).data
  },
  async crear(c: ClausulaEntrada): Promise<ClausulaGuardada> {
    return (await apiClient.post<ClausulaGuardada>(AGENCIA, c)).data
  },
  /** `version` = la que se editó (CAS): 409 CLAUSULA_CAMBIADA si ya no es la vigente. */
  async editar(id: string, c: ClausulaEntrada & { version: number }): Promise<ClausulaGuardada> {
    return (await apiClient.put<ClausulaGuardada>(`${AGENCIA}/${id}`, c)).data
  },
  /** Borrado lógico: los contratos que ya la usan conservan su texto. */
  async eliminar(id: string): Promise<void> {
    await apiClient.delete(`${AGENCIA}/${id}`)
  },

  // ── Administrador ──
  async registro(f: FiltrosRegistro = {}): Promise<PaginaRegistro> {
    const qs = new URLSearchParams()
    if (f.origen) qs.set('origen', f.origen)
    if (f.estado) qs.set('estado', f.estado)
    if (f.q?.trim()) qs.set('q', f.q.trim())
    if (f.page && f.page > 1) qs.set('page', String(f.page))
    const query = qs.toString()
    return (await apiClient.get<PaginaRegistro>(`${ADMIN}${query ? `?${query}` : ''}`)).data
  },
  async usos(id: string): Promise<UsoClausula[]> {
    return (await apiClient.get<UsoClausula[]>(`${ADMIN}/${id}/usos`)).data
  },
  /** Cláusula de la biblioteca: admite hasta 10 [[campo]]. */
  async crearBiblioteca(c: ClausulaEntrada): Promise<ClausulaGuardada> {
    return (await apiClient.post<ClausulaGuardada>(ADMIN, c)).data
  },
  async editarBiblioteca(id: string, c: ClausulaEntrada & { version: number }): Promise<ClausulaGuardada> {
    return (await apiClient.put<ClausulaGuardada>(`${ADMIN}/${id}`, c)).data
  },
  /** Inhabilitar (con motivo, lo ve la inmobiliaria) o reactivar. Solo hacia adelante. */
  async cambiarEstado(id: string, cambio: CambioEstado): Promise<void> {
    await apiClient.patch(`${ADMIN}/${id}/estado`, cambio)
  },
}
