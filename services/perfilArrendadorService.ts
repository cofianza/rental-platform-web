/**
 * Servicio: datos del arrendador (inmobiliaria / propietario) editables
 * por el propio usuario para que aparezcan correctamente en los contratos
 * de arrendamiento que se generan desde la plantilla.
 */

import { apiClient } from '@/lib/api'
import { API_BASE_URL } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth.store'

export interface IPerfilArrendador {
  id: string
  nombre: string
  apellido: string
  rol: string
  tipo_documento: string | null
  numero_documento: string | null
  razon_social: string | null
  representante_legal: string | null
  domicilio_direccion: string | null
  domicilio_ciudad: string | null
  ciudad: string | null
  matricula_arrendador: string | null
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
  representante_legal?: string | null
  domicilio_direccion?: string | null
  domicilio_ciudad?: string | null
  matricula_arrendador?: string | null
  whatsapp_recaudo?: string | null
  email_recaudo?: string | null
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
    // multipart/form-data: usamos fetch directo porque apiClient solo
    // soporta JSON. Auth: leemos el token del store (mismo patrón que api.ts).
    const formData = new FormData()
    formData.append('logo', file)
    const token = useAuthStore.getState().accessToken
    const response = await fetch(`${API_BASE_URL}/perfil-arrendador/me/logo`, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: 'include',
    })
    const json = await response.json()
    if (!response.ok) {
      throw new Error(json?.message || 'Error al subir el logo')
    }
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
