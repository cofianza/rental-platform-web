/**
 * Paginación de un listado de la API. La API la manda en `meta`
 * (utils/response.ts); algunos controladores viejos la mandaban en
 * `pagination`. Se leen las dos para que la pantalla funcione con la API de
 * antes y la de después, y los números llegan siempre como número.
 */
export interface Paginacion {
  total: number
  page: number
  limit: number
  totalPages: number
}

type ConPaginacion = { meta?: Partial<Paginacion> | null; pagination?: Partial<Paginacion> | null }

export function leerPaginacion(res: unknown, limitPorDefecto: number): Paginacion {
  const r = (res ?? {}) as ConPaginacion
  const p = r.meta ?? r.pagination ?? {}
  const total = Number(p.total) || 0
  const limit = Number(p.limit) || limitPorDefecto
  return {
    total,
    page: Number(p.page) || 1,
    limit,
    totalPages: Number(p.totalPages) || (total > 0 ? Math.ceil(total / limit) : 0),
  }
}
