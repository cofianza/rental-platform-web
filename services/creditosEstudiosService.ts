/**
 * Servicio: creditos de estudios para inmobiliarias.
 * Permite comprar paquetes (Stripe Checkout), consultar saldo y
 * liberar estudios consumiendo creditos pre-comprados.
 */

import { apiClient } from '@/lib/api'

export interface IPaqueteCreditos {
  id: string
  nombre: string
  descripcion: string | null
  cantidad_estudios: number
  precio_cop: number
  vence_en_dias: number | null
  activo: boolean
  orden: number
  created_at: string
  updated_at: string
}

export interface ILoteCredito {
  id: string
  cantidad_disponible: number
  cantidad_inicial: number
  vence_en: string | null
  origen: string
  created_at: string
}

export interface ISaldoCreditos {
  saldo_total: number
  saldo_perpetuo: number
  saldo_con_vencimiento: number
  proximo_vencimiento: string | null
  lotes: ILoteCredito[]
}

export interface IMovimientoCredito {
  id: string
  tipo: 'compra' | 'consumo' | 'expiracion' | 'ajuste'
  cantidad: number
  saldo_resultante: number
  expediente_id: string | null
  solicitante_id: string | null
  lote_id: string | null
  notas: string | null
  created_at: string
  /** Solo presente cuando tipo='compra' — id de la compra que origino el lote. */
  compra_id?: string | null
  /** Si la compra ya esta facturada, viene la referencia. */
  factura?: { id: string; factus_number: string | null; estado: string } | null
}

export interface ICompraCredito {
  id: string
  paquete_id: string
  cantidad_estudios: number
  precio_cop: number
  vence_en_dias: number | null
  estado: 'pendiente' | 'completado' | 'fallido' | 'cancelado'
  stripe_session_id: string | null
  payment_link_url: string | null
  completed_at: string | null
  created_at: string
}

export interface IComprarPaqueteResponse {
  checkout_url: string
  compra_id: string
}

export interface ILiberarEstudioResponse {
  pago_id: string
  saldo_restante: number
  lote_id: string
}

export interface IDatosFiscalesFactura {
  razon_social?: string
  nit?: string
  direccion?: string
  email?: string
  telefono?: string
  /** Codigo DANE (5 digitos). */
  municipio_codigo?: string
  municipio_nombre?: string
  /** Codigo DIAN: '13'=CC, '31'=NIT, etc. Si no se proporciona, se infiere. */
  tipo_documento?: string
}

export interface ICreatePaqueteInput {
  nombre: string
  descripcion?: string
  cantidad_estudios: number
  precio_cop: number
  vence_en_dias?: number | null
  activo?: boolean
  orden?: number
}

class CreditosEstudiosService {
  // ---------- Inmobiliaria ----------

  async listPaquetes(): Promise<IPaqueteCreditos[]> {
    const res = (await apiClient.get('/creditos-estudios/paquetes')) as unknown as {
      data: IPaqueteCreditos[]
    }
    return res.data
  }

  async getMiSaldo(): Promise<ISaldoCreditos> {
    const res = (await apiClient.get('/creditos-estudios/me/saldo')) as unknown as {
      data: ISaldoCreditos
    }
    return res.data
  }

  async getMisMovimientos(params?: { page?: number; limit?: number; tipo?: string }): Promise<{
    movimientos: IMovimientoCredito[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.tipo) qs.set('tipo', params.tipo)
    const url = `/creditos-estudios/me/movimientos${qs.toString() ? `?${qs}` : ''}`
    const res = (await apiClient.get(url)) as unknown as {
      data: IMovimientoCredito[]
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }
    return { movimientos: res.data, pagination: res.pagination }
  }

  async getMisCompras(): Promise<ICompraCredito[]> {
    const res = (await apiClient.get('/creditos-estudios/me/compras')) as unknown as {
      data: ICompraCredito[]
    }
    return res.data
  }

  async comprarPaquete(paqueteId: string): Promise<IComprarPaqueteResponse> {
    const res = (await apiClient.post('/creditos-estudios/me/comprar', {
      paquete_id: paqueteId,
    })) as unknown as { data: IComprarPaqueteResponse }
    return res.data
  }

  async liberarEstudio(expedienteId: string, notas?: string): Promise<ILiberarEstudioResponse> {
    const res = (await apiClient.post(`/expedientes/${expedienteId}/liberar-estudio-credito`, {
      notas,
    })) as unknown as { data: ILiberarEstudioResponse }
    return res.data
  }

  /**
   * Factura una compra de paquete. Si el body es vacio, el backend
   * lee los datos del perfil. Si faltan datos requeridos, lanza
   * Error con `details.faltantes` (lista de campos que el frontend
   * debe pedir en un modal y reenviar).
   */
  async facturarCompra(
    compraId: string,
    datosFiscales?: IDatosFiscalesFactura,
  ): Promise<{ id: string; factus_number: string | null; cufe: string | null; estado: string }> {
    const res = (await apiClient.post(
      `/creditos-estudios/me/compras/${compraId}/facturar`,
      datosFiscales || {},
    )) as unknown as { data: { id: string; factus_number: string | null; cufe: string | null; estado: string } }
    return res.data
  }

  // ---------- Super admin ----------

  async adminListPaquetes(): Promise<IPaqueteCreditos[]> {
    const res = (await apiClient.get('/admin/paquetes-creditos-estudios')) as unknown as {
      data: IPaqueteCreditos[]
    }
    return res.data
  }

  async adminCreatePaquete(input: ICreatePaqueteInput): Promise<IPaqueteCreditos> {
    const res = (await apiClient.post('/admin/paquetes-creditos-estudios', input)) as unknown as {
      data: IPaqueteCreditos
    }
    return res.data
  }

  async adminUpdatePaquete(id: string, input: Partial<ICreatePaqueteInput>): Promise<IPaqueteCreditos> {
    const res = (await apiClient.put(`/admin/paquetes-creditos-estudios/${id}`, input)) as unknown as {
      data: IPaqueteCreditos
    }
    return res.data
  }

  async adminDeletePaquete(id: string): Promise<void> {
    await apiClient.delete(`/admin/paquetes-creditos-estudios/${id}`)
  }
}

export const creditosEstudiosService = new CreditosEstudiosService()
