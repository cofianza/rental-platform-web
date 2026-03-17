/**
 * Servicio de Pagos - HP-350
 * Llamadas a la API para pagos de expedientes
 */

import { apiClient } from '@/lib/api'

// ============================================
// Types
// ============================================

export interface IPago {
  id: string
  expediente_id: string
  concepto: string
  descripcion: string | null
  monto: number
  moneda: string
  metodo: string
  estado: string
  payment_link_url: string | null
  external_id: string | null
  transaction_ref: string | null
  comprobante_storage_key: string | null
  comprobante_nombre_original: string | null
  comprobante_tipo_mime: string | null
  referencia_bancaria: string | null
  notas: string | null
  fecha_pago: string | null
  created_at: string
  updated_at: string
  creado_por: string
  email_pagador: string | null
  nombre_pagador: string | null
  eventos?: IPagoEvento[]
}

export interface IPagoEvento {
  id: string
  pago_id: string
  tipo: string
  detalles: Record<string, unknown> | null
  origen: string
  created_at: string
}

export interface IRegistrarPagoManualInput {
  concepto: string
  monto: number
  metodo: 'transferencia' | 'efectivo' | 'cheque'
  descripcion?: string
  referencia_bancaria?: string
  notas?: string
  fecha_pago: string
  comprobante_storage_key?: string
  comprobante_nombre_original?: string
  comprobante_tipo_mime?: string
  comprobante_tamano_bytes?: number
}

export interface IPresignedUrlResponse {
  signedUrl: string
  storage_key: string
  token: string
  expires_in: number
}

export interface IComprobanteUrlResponse {
  url: string
  nombre_original: string | null
  expires_in: number
}

// ============================================
// Service
// ============================================

class PagoService {
  /**
   * Lista pagos de un expediente
   */
  async listByExpediente(expedienteId: string, params?: {
    page?: number
    limit?: number
    concepto?: string
    estado?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.concepto) searchParams.append('concepto', params.concepto)
    if (params?.estado) searchParams.append('estado', params.estado)

    const qs = searchParams.toString()
    const url = `/expedientes/${expedienteId}/pagos${qs ? `?${qs}` : ''}`
    const response = await apiClient.get<IPago[]>(url)
    return response
  }

  /**
   * Obtiene detalle de un pago con sus eventos
   */
  async getById(pagoId: string) {
    const response = await apiClient.get<IPago>(`/pagos/${pagoId}`)
    return response.data
  }

  /**
   * Genera presigned URL para subir comprobante
   */
  async getComprobantePresignedUrl(file: File): Promise<IPresignedUrlResponse> {
    const response = await apiClient.post<IPresignedUrlResponse>('/pagos/comprobante/presigned-url', {
      nombre_original: file.name,
      tipo_mime: file.type,
      tamano_bytes: file.size,
    })
    return response.data
  }

  /**
   * Sube archivo de comprobante a Supabase Storage
   */
  async uploadComprobante(signedUrl: string, file: File): Promise<void> {
    const response = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })

    if (!response.ok) {
      throw new Error('Error al subir el comprobante')
    }
  }

  /**
   * Registra pago manual
   */
  async registrarPagoManual(expedienteId: string, input: IRegistrarPagoManualInput): Promise<IPago> {
    const response = await apiClient.post<IPago>(`/expedientes/${expedienteId}/pagos/manual`, input)
    return response.data
  }

  /**
   * Flow completo: subir comprobante + registrar pago manual
   */
  async registrarPagoManualConComprobante(
    expedienteId: string,
    input: Omit<IRegistrarPagoManualInput, 'comprobante_storage_key' | 'comprobante_nombre_original' | 'comprobante_tipo_mime' | 'comprobante_tamano_bytes'>,
    file?: File | null,
  ): Promise<IPago> {
    let comprobanteData: Partial<IRegistrarPagoManualInput> = {}

    if (file) {
      // Step 1: Get presigned URL
      const presigned = await this.getComprobantePresignedUrl(file)
      // Step 2: Upload file
      await this.uploadComprobante(presigned.signedUrl, file)
      // Step 3: Include metadata
      comprobanteData = {
        comprobante_storage_key: presigned.storage_key,
        comprobante_nombre_original: file.name,
        comprobante_tipo_mime: file.type,
        comprobante_tamano_bytes: file.size,
      }
    }

    return this.registrarPagoManual(expedienteId, { ...input, ...comprobanteData })
  }

  /**
   * Obtiene URL de descarga del comprobante
   */
  async getComprobanteUrl(pagoId: string): Promise<IComprobanteUrlResponse> {
    const response = await apiClient.get<IComprobanteUrlResponse>(`/pagos/${pagoId}/comprobante`)
    return response.data
  }

  /**
   * Cancela un pago pendiente
   */
  async cancelar(pagoId: string): Promise<IPago> {
    const response = await apiClient.patch<IPago>(`/pagos/${pagoId}/cancelar`)
    return response.data
  }

  /**
   * Reenvía link de pago por email
   */
  async reenviarLink(pagoId: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/pagos/${pagoId}/reenviar-link`)
    return response.data
  }
}

export const pagoService = new PagoService()
