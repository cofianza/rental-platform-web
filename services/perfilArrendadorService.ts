/**
 * Servicio: datos del arrendador (inmobiliaria / propietario) editables
 * por el propio usuario para que aparezcan correctamente en los contratos
 * de arrendamiento que se generan desde la plantilla.
 */

import { apiClient } from '@/lib/api'

export type TipoDocumentoRepresentante = 'cc' | 'ce' | 'pasaporte'

export interface IPerfilArrendador {
  id: string
  nombre: string
  apellido: string
  rol: string
  tipo_documento: string | null
  numero_documento: string | null
  nit: string | null
  razon_social: string | null
  afianzadora_tipo: 'afianzadora' | 'aseguradora' | 'ninguna' | null
  afianzadora_actual: string | null
  representante_legal: string | null
  /** Documento del representante legal (ambos o ninguno). Lo exige el
   *  asistente de contratos V3; el flujo anterior no lo pide. */
  representante_legal_tipo_documento?: TipoDocumentoRepresentante | null
  representante_legal_documento?: string | null
  domicilio_direccion: string | null
  /** Dirección y teléfono del perfil: la API los usa al facturar. */
  direccion?: string | null
  telefono?: string | null
  domicilio_ciudad: string | null
  /** Municipio DANE para la factura cuando el arrendador paga el estudio (Adenda 2 §7). */
  municipio_codigo?: string | null
  municipio_nombre?: string | null
  ciudad: string | null
  matricula_arrendador: string | null
  matricula_expedida_por: string | null
  matricula_fecha: string | null
  logo_storage_key: string | null
  logo_url: string | null
  whatsapp_recaudo: string | null
  email_recaudo: string | null
  cuenta_recaudo_banco: string | null
  cuenta_recaudo_tipo: 'ahorros' | 'corriente' | null
  cuenta_recaudo_numero: string | null
  cuenta_recaudo_titular_nombre: string | null
  cuenta_recaudo_titular_nit: string | null
}

export interface IUpdatePerfilArrendadorInput {
  razon_social?: string | null
  nit?: string | null
  afianzadora_tipo?: 'afianzadora' | 'aseguradora' | 'ninguna' | null
  afianzadora_actual?: string | null
  representante_legal?: string | null
  representante_legal_tipo_documento?: TipoDocumentoRepresentante | null
  representante_legal_documento?: string | null
  domicilio_direccion?: string | null
  domicilio_ciudad?: string | null
  municipio_codigo?: string | null
  municipio_nombre?: string | null
  matricula_arrendador?: string | null
  matricula_expedida_por?: string | null
  matricula_fecha?: string | null
  whatsapp_recaudo?: string | null
  email_recaudo?: string | null
  /** Teléfono de la organización (factura electrónica de sus compras). */
  telefono?: string | null
  cuenta_recaudo_banco?: string | null
  cuenta_recaudo_tipo?: 'ahorros' | 'corriente' | null
  cuenta_recaudo_numero?: string | null
  cuenta_recaudo_titular_nombre?: string | null
  cuenta_recaudo_titular_nit?: string | null
}

export interface IPerfilCompletitud {
  completo: boolean
  faltantes: { campo: string; etiqueta: string }[]
  rol: string
}

class PerfilArrendadorService {
  async getMe(): Promise<IPerfilArrendador> {
    const res = (await apiClient.get('/perfil-arrendador/me')) as unknown as {
      data: IPerfilArrendador
    }
    return res.data
  }

  async getCompletitud(): Promise<IPerfilCompletitud> {
    const res = (await apiClient.get('/perfil-arrendador/me/completitud')) as unknown as {
      data: IPerfilCompletitud
    }
    return res.data
  }

  async updateMe(input: IUpdatePerfilArrendadorInput): Promise<IPerfilArrendador> {
    const res = (await apiClient.put('/perfil-arrendador/me', input)) as unknown as {
      data: IPerfilArrendador
    }
    return res.data
  }

  async uploadLogo(file: File): Promise<IPerfilArrendador> {
    // multipart/form-data: apiClient.raw (sin Content-Type JSON).
    const formData = new FormData()
    formData.append('logo', file)
    const response = await apiClient.raw('/perfil-arrendador/me/logo', { method: 'POST', body: formData })
    const json = await response.json()
    return json.data as IPerfilArrendador
  }

  async deleteLogo(): Promise<IPerfilArrendador> {
    const res = (await apiClient.delete('/perfil-arrendador/me/logo')) as unknown as {
      data: IPerfilArrendador
    }
    return res.data
  }
}

export const perfilArrendadorService = new PerfilArrendadorService()
