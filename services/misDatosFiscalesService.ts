/**
 * misDatosFiscalesService — gestion de datos fiscales del solicitante autenticado.
 *
 * Pega contra /api/v1/applicants/me/datos-fiscales (GET + PATCH). Solo el rol
 * solicitante tiene acceso a estos endpoints.
 */

import { apiClient } from '@/lib/api'

export interface IMisDatosFiscales {
  id: string | null
  /** 'natural' = persona individual; 'juridica' = empresa con NIT. */
  tipo_persona: 'natural' | 'juridica'
  nombre: string
  apellido: string
  /** Solo aplica cuando tipo_persona='juridica'. */
  razon_social: string | null
  tipo_documento: string
  numero_documento: string
  /** DV del NIT colombiano (1 digito). Solo aplica cuando tipo_documento='nit'. */
  digito_verificacion: string | null
  email: string
  telefono: string | null
  direccion: string | null
  municipio_id: string | null
  municipio_nombre: string | null
  /** Codigo DIAN de responsabilidad fiscal. ZZ=No aplica (default). */
  tribute_code: string
  /** Lista de campos que faltan o son invalidos para emitir factura. */
  faltantes: string[]
}

export interface IUpdateMisDatosFiscales {
  tipo_persona?: 'natural' | 'juridica'
  razon_social?: string
  tipo_documento?: string
  numero_documento?: string
  digito_verificacion?: string
  email?: string
  telefono?: string
  direccion?: string
  municipio_id?: string
  municipio_nombre?: string
  tribute_code?: string
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
