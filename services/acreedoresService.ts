/**
 * Lista de acreedores (Adenda 5 §3). Solo Cofianza: el
 * administrador clasifica; gerencia la consulta. El API valida todo.
 */

import { apiClient } from '@/lib/api'
import type { IAcreedor, IAcreedoresFiltros, IAcreedoresPagina, IClasificarAcreedor, ICrearAcreedor } from '@/types/acreedor'

class AcreedoresService {
  async listar(f: IAcreedoresFiltros = {}): Promise<IAcreedoresPagina> {
    const params = new URLSearchParams()
    if (f.estado) params.append('estado', f.estado)
    if (f.central) params.append('central', f.central)
    if (f.q?.trim()) params.append('q', f.q.trim())
    if (f.page) params.append('page', String(f.page))
    if (f.limit) params.append('limit', String(f.limit))
    const qs = params.toString()
    const r = (await apiClient.get(`/admin/acreedores${qs ? `?${qs}` : ''}`)) as unknown as {
      data: IAcreedor[]
      meta?: { total: number; page: number; limit: number }
    }
    return {
      data: r.data ?? [],
      total: r.meta?.total ?? 0,
      page: Number(r.meta?.page) || 1,
      limit: Number(r.meta?.limit) || 50,
    }
  }

  async crear(body: ICrearAcreedor): Promise<IAcreedor> {
    const r = await apiClient.post<IAcreedor>('/admin/acreedores', body)
    return r.data
  }

  async clasificar(id: string, body: IClasificarAcreedor): Promise<IAcreedor> {
    const r = await apiClient.put<IAcreedor>(`/admin/acreedores/${id}`, body)
    return r.data
  }
}

export const acreedoresService = new AcreedoresService()
