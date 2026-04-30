/**
 * Servicio de Facturación — conecta al backend real (Factus / DIAN).
 *
 * Antes era un mock; ahora pega contra GET /api/v1/facturas (listar y ver) y
 * POST /api/v1/pagos/:pagoId/facturar (disparar manualmente la facturación).
 *
 * Como el shape del backend (factus_number, cufe, qr_url, total, tax_amount)
 * difiere del IFactura del frontend (numero, subtotal, iva, total, emisor_*,
 * receptor_*), aplicamos un adapter para mantener la UI existente sin
 * cambios estructurales.
 */

import { apiClient } from '@/lib/api'
import { API_BASE_URL } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth.store'
import type {
  IDatosFiscales,
  IDatosFiscalesInput,
  IFactura,
  IFacturaListResponse,
  IFacturaFilters,
  ICrearFacturaInput,
  IAnularFacturaInput,
  IDocumentoPresignedUrl,
} from '@/types/facturacion'

// ============================================
// Datos fiscales de override al facturar un pago
// ============================================

export interface IDatosFiscalesPagoFactura {
  numero_documento?: string
  tipo_documento?: string
  nombre_completo?: string
  direccion?: string
  email?: string
  telefono?: string
  /** Codigo DANE de 5 digitos. */
  municipio_codigo?: string
}

// ============================================
// Tipos del backend (snake_case, shape Factus)
// ============================================

interface BackendFactura {
  id: string
  expediente_id: string
  pago_id: string | null
  numero_factura: string | null
  factus_number: string | null
  cufe: string | null
  qr_url: string | null
  qr_image_base64?: string | null
  pdf_url?: string | null
  xml_url?: string | null
  total: number | string | null
  tax_amount: number | string | null
  concepto: string | null
  estado: 'solicitada' | 'emitida' | 'cancelada'
  error_mensaje: string | null
  validada_en: string | null
  created_at: string
  updated_at?: string
  razon_social?: string | null
  nit?: string | null
  direccion_fiscal?: string | null
}

// ============================================
// Adapter: backend → IFactura del frontend
// ============================================

function toNumber(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'string' ? parseFloat(v) : v
  return Number.isFinite(n) ? n : 0
}

function adaptFactura(row: BackendFactura): IFactura {
  const total = toNumber(row.total)
  const iva = toNumber(row.tax_amount)
  const subtotal = Math.max(0, total - iva)
  const numero = row.factus_number || row.numero_factura || row.id.slice(0, 8).toUpperCase()

  return {
    id: row.id,
    numero,
    fecha: row.validada_en || row.created_at,
    concepto: row.concepto || 'Servicio Cofianza',
    subtotal,
    iva,
    total,
    estado: row.estado,
    emisor_razon_social: 'Cofianza',
    emisor_nit: '',
    emisor_direccion: '',
    receptor_razon_social: row.razon_social || '',
    receptor_documento: row.nit || '',
    receptor_direccion: row.direccion_fiscal || '',
    receptor_email: '',
    pdf_url: row.pdf_url ?? null,
    pdf_storage_key: null,
    xml_url: row.xml_url ?? null,
    xml_storage_key: null,
    factus_number: row.factus_number ?? null,
    pago_id: row.pago_id || null,
    datos_fiscales_id: '',
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at,
    creado_por: '',
    anulado_por: null,
    fecha_anulacion: null,
    motivo_anulacion: row.error_mensaje || null,
  }
}

// ============================================
// Servicio
// ============================================

class FacturacionService {
  // ── Datos Fiscales (no usados por Factus — Cofianza configura sus datos
  //    de emisor en el panel de Factus, no en nuestro sistema). Devolvemos
  //    null/no-op para que la UI no rompa.
  // ------------------------------------------

  async getDatosFiscales(): Promise<IDatosFiscales | null> {
    return null
  }

  async saveDatosFiscales(input: IDatosFiscalesInput): Promise<IDatosFiscales> {
    // Placeholder — los datos del cliente se toman del solicitante; los del
    // emisor (Cofianza) se configuran en el panel de Factus.
    return {
      id: 'noop',
      usuario_id: 'noop',
      tipo_documento: input.tipo_documento,
      numero_documento: input.numero_documento,
      razon_social: input.razon_social,
      regimen_tributario: input.regimen_tributario,
      direccion_fiscal: input.direccion_fiscal,
      ciudad: input.ciudad,
      departamento: input.departamento,
      email_fiscal: input.email_fiscal,
      telefono_fiscal: input.telefono_fiscal || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  // ── Facturas
  // ------------------------------------------

  async listFacturas(filters?: IFacturaFilters): Promise<IFacturaListResponse> {
    const params = new URLSearchParams()
    if (filters?.estado) params.set('estado', filters.estado)
    if (filters?.page) params.set('page', String(filters.page))
    if (filters?.limit) params.set('limit', String(filters.limit))

    const qs = params.toString()
    const response = (await apiClient.get(`/facturas${qs ? `?${qs}` : ''}`)) as unknown as {
      data: BackendFactura[]
      meta?: { pagination?: { total: number; page: number; limit: number; totalPages: number } }
      pagination?: { total: number; page: number; limit: number; totalPages: number }
    }

    const rows = response.data || []
    let facturas = rows.map(adaptFactura)

    // Filtrado client-side adicional (búsqueda por texto, fechas).
    if (filters?.busqueda) {
      const q = filters.busqueda.toLowerCase()
      facturas = facturas.filter(
        (f) =>
          f.numero.toLowerCase().includes(q) ||
          f.concepto.toLowerCase().includes(q) ||
          f.receptor_razon_social.toLowerCase().includes(q),
      )
    }
    if (filters?.fecha_desde) facturas = facturas.filter((f) => f.fecha >= filters.fecha_desde!)
    if (filters?.fecha_hasta) facturas = facturas.filter((f) => f.fecha <= filters.fecha_hasta!)

    const pagination = response.meta?.pagination ||
      response.pagination || {
        total: facturas.length,
        page: filters?.page || 1,
        limit: filters?.limit || 20,
        totalPages: 1,
      }

    return { facturas, pagination }
  }

  async getFacturaById(id: string): Promise<IFactura | null> {
    try {
      const response = (await apiClient.get(`/facturas/${id}`)) as unknown as { data: BackendFactura }
      return adaptFactura(response.data)
    } catch {
      return null
    }
  }

  /**
   * No expuesto directamente — la facturación se dispara desde el pago via
   * POST /pagos/:pagoId/facturar. Mantenemos la firma para compatibilidad
   * con el código UI existente, pero requiere `pago_id` para funcionar.
   */
  async crearFactura(input: ICrearFacturaInput): Promise<IFactura> {
    if (!input.pago_id) {
      throw new Error(
        'La facturación se dispara desde un pago confirmado. Ejecuta facturarPago(pagoId).',
      )
    }
    return this.facturarPago(input.pago_id)
  }

  /**
   * Devuelve los datos fiscales que se usarian para emitir la factura, sin
   * tocar Factus. El frontend los muestra en un modal de confirmacion para
   * que el usuario verifique o ajuste antes de la emision real.
   */
  async previewFacturaPago(pagoId: string): Promise<{
    ya_emitida: boolean
    factura_id?: string
    factura_numero?: string | null
    datos_actuales: {
      nombre_completo: string
      tipo_documento: string
      numero_documento: string
      email: string
      telefono: string
      direccion: string
      municipio_codigo: string
      municipio_nombre: string
    }
    faltantes: string[]
    monto: number
    concepto: string
  }> {
    const response = (await apiClient.get(`/pagos/${pagoId}/factura/preview`)) as unknown as {
      data: {
        ya_emitida: boolean
        factura_id?: string
        factura_numero?: string | null
        datos_actuales: {
          nombre_completo: string
          tipo_documento: string
          numero_documento: string
          email: string
          telefono: string
          direccion: string
          municipio_codigo: string
          municipio_nombre: string
        }
        faltantes: string[]
        monto: number
        concepto: string
      }
    }
    return response.data
  }

  /**
   * Dispara la creación de factura para un pago confirmado.
   * Si vienen `datosFiscales` en el body, el backend valida estricto y
   * lanza CLIENTE_DATOS_INCOMPLETOS con `details.faltantes` si falta algun
   * campo requerido (numero_documento, direccion, telefono, email,
   * municipio_codigo). Sin override, usa los datos del solicitante con
   * defaults silenciosos.
   */
  async facturarPago(
    pagoId: string,
    datosFiscales?: IDatosFiscalesPagoFactura,
  ): Promise<IFactura> {
    const response = (await apiClient.post(
      `/pagos/${pagoId}/facturar`,
      datosFiscales || {},
    )) as unknown as {
      data: { id: string; factus_number: string | null; cufe: string | null; estado: string }
    }
    // El POST devuelve el ID — recargamos la factura completa.
    const full = await this.getFacturaById(response.data.id)
    if (!full) throw new Error('Factura creada pero no se pudo recuperar el detalle.')
    return full
  }

  async anularFactura(_id: string, _input: IAnularFacturaInput): Promise<IFactura> {
    throw new Error(
      'Anular facturas se hace desde Factus directamente vía nota crédito. Aún no expuesto en este panel.',
    )
  }

  // ── Documentos: hoy las URLs PDF/XML las sirve Factus directamente.
  //    Mantenemos las firmas como no-op para no romper la UI.
  // ------------------------------------------

  async getUploadPresignedUrl(_facturaId: string, _tipo: 'pdf' | 'xml'): Promise<IDocumentoPresignedUrl> {
    throw new Error('La factura electrónica se genera y archiva en Factus — no se sube manualmente.')
  }

  async confirmarUploadDocumento(_facturaId: string, _tipo: 'pdf' | 'xml', _storageKey: string): Promise<IFactura> {
    throw new Error('No aplica para facturas electrónicas Factus.')
  }

  /**
   * Descarga PDF o XML de una factura emitida desde Factus.
   * Hace fetch del endpoint backend que proxea a Factus, crea un blob URL
   * y dispara la descarga automaticamente. El blob URL se revoca despues.
   */
  async descargarFactusDocumento(
    facturaId: string,
    tipo: 'pdf' | 'xml',
    options?: { inline?: boolean },
  ): Promise<{ url: string; fileName: string }> {
    const token = useAuthStore.getState().accessToken
    const inlineQs = options?.inline ? '?inline=true' : ''
    const response = await fetch(
      `${API_BASE_URL}/facturas/${facturaId}/factus/${tipo}${inlineQs}`,
      {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      },
    )
    if (!response.ok) {
      let msg = `Error al descargar ${tipo.toUpperCase()}`
      try {
        const errBody = (await response.json()) as { message?: string }
        if (errBody?.message) msg = errBody.message
      } catch {
        // body no JSON
      }
      throw new Error(msg)
    }

    // Extraer filename del Content-Disposition si esta presente
    const cd = response.headers.get('content-disposition') || ''
    const fileNameMatch = /filename="?([^";]+)"?/i.exec(cd)
    const fileName = fileNameMatch?.[1] || `factura.${tipo}`

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    return { url, fileName }
  }

  /**
   * Disparador rapido: descarga el archivo al disco con el nombre original.
   * Usado por los botones "Descargar PDF / XML" en la UI.
   */
  async descargarYGuardar(facturaId: string, tipo: 'pdf' | 'xml'): Promise<void> {
    const { url, fileName } = await this.descargarFactusDocumento(facturaId, tipo)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  /**
   * @deprecated Mantener por compatibilidad — usa descargarYGuardar() o
   * descargarFactusDocumento() segun necesites el blob URL.
   */
  async getDownloadUrl(facturaId: string, tipo: 'pdf' | 'xml'): Promise<{ url: string; expires_in: number }> {
    const { url } = await this.descargarFactusDocumento(facturaId, tipo, { inline: true })
    return { url, expires_in: 0 }
  }

  async eliminarDocumento(_facturaId: string, _tipo: 'pdf' | 'xml'): Promise<IFactura> {
    throw new Error('No aplica para facturas electrónicas Factus.')
  }

  // ── Configuración admin: tarifas de IVA por concepto ───────
  async getTarifasIva(): Promise<{ concepto: string; tasa: number }[]> {
    const response = (await apiClient.get('/facturas/configuracion-iva')) as unknown as {
      data: { concepto: string; tasa: number }[]
    }
    return response.data
  }

  async updateTarifasIva(
    tarifas: { concepto: string; tasa: number }[],
  ): Promise<{ concepto: string; tasa: number }[]> {
    const response = (await apiClient.put('/facturas/configuracion-iva', { tarifas })) as unknown as {
      data: { concepto: string; tasa: number }[]
    }
    return response.data
  }
}

export const facturacionService = new FacturacionService()
