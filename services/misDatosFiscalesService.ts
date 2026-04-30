/**
 * misDatosFiscalesService — gestion de datos fiscales del solicitante autenticado.
 *
 * Pega contra /api/v1/applicants/me/datos-fiscales (GET + PATCH). Solo el rol
 * solicitante tiene acceso a estos endpoints.
 */

import { apiClient } from '@/lib/api'

export interface IMisDatosFiscales {
  id: string | null
  nombre: string
  apellido: string
  tipo_documento: string
  numero_documento: string
  email: string
  telefono: string | null
  direccion: string | null
  municipio_id: string | null
  municipio_nombre: string | null
  /** Lista de campos que faltan o son invalidos para emitir factura. */
  faltantes: string[]
}

export interface IUpdateMisDatosFiscales {
  tipo_documento?: string
  numero_documento?: string
  email?: string
  telefono?: string
  direccion?: string
  municipio_id?: string
  municipio_nombre?: string
}

class MisDatosFiscalesService {
  private basePath = '/applicants/me/datos-fiscales'

  async get(): Promise<IMisDatosFiscales> {
    const res = await apiClient.get<IMisDatosFiscales>(this.basePath)
    return res.data
  }

  async update(input: IUpdateMisDatosFiscales): Promise<IMisDatosFiscales> {
    const res = await apiClient.patch<IMisDatosFiscales>(this.basePath, input)
    return res.data
  }
}

export const misDatosFiscalesService = new MisDatosFiscalesService()
