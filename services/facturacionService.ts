/**
 * Servicio de Facturacion - HP-354, HP-355, HP-356, HP-357
 * MOCK: Datos simulados hasta que el backend este listo
 */

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
// Mock Data
// ============================================

const MOCK_DATOS_FISCALES: IDatosFiscales = {
  id: 'df-001',
  usuario_id: 'usr-001',
  tipo_documento: 'NIT',
  numero_documento: '900.123.456-7',
  razon_social: 'Empresa Demo S.A.S.',
  regimen_tributario: 'comun',
  direccion_fiscal: 'Calle 100 #15-20 Oficina 501',
  ciudad: 'Bogota',
  departamento: 'Cundinamarca',
  email_fiscal: 'facturacion@empresademo.com',
  telefono_fiscal: '601 234 5678',
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-03-10T14:30:00Z',
}

const MOCK_FACTURAS: IFactura[] = [
  {
    id: 'fac-001',
    numero: 'FAC-2026-0001',
    fecha: '2026-03-20T10:00:00Z',
    concepto: 'Estudio de riesgo crediticio - Expediente EXP-2026-0005',
    subtotal: 150000,
    iva: 28500,
    total: 178500,
    estado: 'emitida',
    emisor_razon_social: 'Habitar Propiedades S.A.S.',
    emisor_nit: '900.987.654-3',
    emisor_direccion: 'Carrera 7 #71-21 Torre B Piso 10, Bogota',
    receptor_razon_social: 'Empresa Demo S.A.S.',
    receptor_documento: '900.123.456-7',
    receptor_direccion: 'Calle 100 #15-20 Oficina 501',
    receptor_email: 'facturacion@empresademo.com',
    pdf_url: 'https://example.com/facturas/FAC-2026-0001.pdf',
    pdf_storage_key: 'facturas/FAC-2026-0001.pdf',
    xml_url: 'https://example.com/facturas/FAC-2026-0001.xml',
    xml_storage_key: 'facturas/FAC-2026-0001.xml',
    pago_id: 'pago-001',
    datos_fiscales_id: 'df-001',
    created_at: '2026-03-20T10:00:00Z',
    updated_at: '2026-03-20T10:00:00Z',
    creado_por: 'usr-admin',
    anulado_por: null,
    fecha_anulacion: null,
    motivo_anulacion: null,
  },
  {
    id: 'fac-002',
    numero: 'FAC-2026-0002',
    fecha: '2026-03-18T14:30:00Z',
    concepto: 'Garantia de arrendamiento - Expediente EXP-2026-0003',
    subtotal: 2500000,
    iva: 475000,
    total: 2975000,
    estado: 'emitida',
    emisor_razon_social: 'Habitar Propiedades S.A.S.',
    emisor_nit: '900.987.654-3',
    emisor_direccion: 'Carrera 7 #71-21 Torre B Piso 10, Bogota',
    receptor_razon_social: 'Empresa Demo S.A.S.',
    receptor_documento: '900.123.456-7',
    receptor_direccion: 'Calle 100 #15-20 Oficina 501',
    receptor_email: 'facturacion@empresademo.com',
    pdf_url: 'https://example.com/facturas/FAC-2026-0002.pdf',
    pdf_storage_key: 'facturas/FAC-2026-0002.pdf',
    xml_url: null,
    xml_storage_key: null,
    pago_id: 'pago-002',
    datos_fiscales_id: 'df-001',
    created_at: '2026-03-18T14:30:00Z',
    updated_at: '2026-03-18T14:30:00Z',
    creado_por: 'usr-admin',
    anulado_por: null,
    fecha_anulacion: null,
    motivo_anulacion: null,
  },
  {
    id: 'fac-003',
    numero: 'FAC-2026-0003',
    fecha: '2026-03-15T09:00:00Z',
    concepto: 'Primer canon de arrendamiento - Expediente EXP-2026-0001',
    subtotal: 3200000,
    iva: 608000,
    total: 3808000,
    estado: 'solicitada',
    emisor_razon_social: 'Habitar Propiedades S.A.S.',
    emisor_nit: '900.987.654-3',
    emisor_direccion: 'Carrera 7 #71-21 Torre B Piso 10, Bogota',
    receptor_razon_social: 'Juan Carlos Perez',
    receptor_documento: '1.234.567.890',
    receptor_direccion: 'Avenida 68 #45-12 Apto 302',
    receptor_email: 'jcperez@email.com',
    pdf_url: null,
    pdf_storage_key: null,
    xml_url: null,
    xml_storage_key: null,
    pago_id: 'pago-003',
    datos_fiscales_id: 'df-002',
    created_at: '2026-03-15T09:00:00Z',
    updated_at: '2026-03-15T09:00:00Z',
    creado_por: 'usr-admin',
    anulado_por: null,
    fecha_anulacion: null,
    motivo_anulacion: null,
  },
  {
    id: 'fac-004',
    numero: 'FAC-2026-0004',
    fecha: '2026-02-28T11:00:00Z',
    concepto: 'Estudio de riesgo crediticio - Expediente EXP-2026-0002',
    subtotal: 150000,
    iva: 28500,
    total: 178500,
    estado: 'cancelada',
    emisor_razon_social: 'Habitar Propiedades S.A.S.',
    emisor_nit: '900.987.654-3',
    emisor_direccion: 'Carrera 7 #71-21 Torre B Piso 10, Bogota',
    receptor_razon_social: 'Maria Lopez Torres',
    receptor_documento: '52.345.678',
    receptor_direccion: 'Calle 80 #11-35',
    receptor_email: 'mlopez@email.com',
    pdf_url: 'https://example.com/facturas/FAC-2026-0004.pdf',
    pdf_storage_key: 'facturas/FAC-2026-0004.pdf',
    xml_url: 'https://example.com/facturas/FAC-2026-0004.xml',
    xml_storage_key: 'facturas/FAC-2026-0004.xml',
    pago_id: 'pago-004',
    datos_fiscales_id: 'df-003',
    created_at: '2026-02-28T11:00:00Z',
    updated_at: '2026-03-01T09:00:00Z',
    creado_por: 'usr-admin',
    anulado_por: 'usr-admin',
    fecha_anulacion: '2026-03-01T09:00:00Z',
    motivo_anulacion: 'Error en datos del receptor',
  },
]

// ============================================
// Helper: Simular delay de red
// ============================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ============================================
// Servicio
// ============================================

class FacturacionService {
  // ------------------------------------------
  // Datos Fiscales (HP-354)
  // ------------------------------------------

  /**
   * Obtiene los datos fiscales del usuario actual
   */
  async getDatosFiscales(): Promise<IDatosFiscales | null> {
    await delay(500)
    // Simular que el usuario tiene datos fiscales
    return MOCK_DATOS_FISCALES
  }

  /**
   * Crea o actualiza los datos fiscales del usuario
   */
  async saveDatosFiscales(input: IDatosFiscalesInput): Promise<IDatosFiscales> {
    await delay(800)
    console.log('[MOCK] Guardando datos fiscales:', input)
    return {
      ...MOCK_DATOS_FISCALES,
      ...input,
      updated_at: new Date().toISOString(),
    }
  }

  // ------------------------------------------
  // Facturas (HP-355)
  // ------------------------------------------

  /**
   * Lista facturas con filtros y paginacion
   */
  async listFacturas(filters?: IFacturaFilters): Promise<IFacturaListResponse> {
    await delay(600)

    let facturas = [...MOCK_FACTURAS]

    // Aplicar filtros
    if (filters?.estado) {
      facturas = facturas.filter((f) => f.estado === filters.estado)
    }
    if (filters?.busqueda) {
      const search = filters.busqueda.toLowerCase()
      facturas = facturas.filter(
        (f) =>
          f.numero.toLowerCase().includes(search) ||
          f.concepto.toLowerCase().includes(search) ||
          f.receptor_razon_social.toLowerCase().includes(search)
      )
    }
    if (filters?.fecha_desde) {
      facturas = facturas.filter((f) => f.fecha >= filters.fecha_desde!)
    }
    if (filters?.fecha_hasta) {
      facturas = facturas.filter((f) => f.fecha <= filters.fecha_hasta!)
    }

    // Paginacion
    const page = filters?.page || 1
    const limit = filters?.limit || 20
    const total = facturas.length
    const totalPages = Math.ceil(total / limit)
    const start = (page - 1) * limit
    const paginatedFacturas = facturas.slice(start, start + limit)

    return {
      facturas: paginatedFacturas,
      pagination: { page, limit, total, totalPages },
    }
  }

  /**
   * Obtiene una factura por ID
   */
  async getFacturaById(id: string): Promise<IFactura | null> {
    await delay(400)
    return MOCK_FACTURAS.find((f) => f.id === id) || null
  }

  /**
   * Crea una nueva factura (solo Admin)
   */
  async crearFactura(input: ICrearFacturaInput): Promise<IFactura> {
    await delay(1000)
    console.log('[MOCK] Creando factura:', input)

    const iva = Math.round(input.subtotal * 0.19)
    const newFactura: IFactura = {
      id: `fac-${Date.now()}`,
      numero: `FAC-2026-${String(MOCK_FACTURAS.length + 1).padStart(4, '0')}`,
      fecha: new Date().toISOString(),
      concepto: input.concepto,
      subtotal: input.subtotal,
      iva,
      total: input.subtotal + iva,
      estado: 'solicitada',
      emisor_razon_social: 'Habitar Propiedades S.A.S.',
      emisor_nit: '900.987.654-3',
      emisor_direccion: 'Carrera 7 #71-21 Torre B Piso 10, Bogota',
      receptor_razon_social: MOCK_DATOS_FISCALES.razon_social,
      receptor_documento: MOCK_DATOS_FISCALES.numero_documento,
      receptor_direccion: MOCK_DATOS_FISCALES.direccion_fiscal,
      receptor_email: MOCK_DATOS_FISCALES.email_fiscal,
      pdf_url: null,
      pdf_storage_key: null,
      xml_url: null,
      xml_storage_key: null,
      pago_id: input.pago_id || null,
      datos_fiscales_id: input.datos_fiscales_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      creado_por: 'usr-admin',
      anulado_por: null,
      fecha_anulacion: null,
      motivo_anulacion: null,
    }

    return newFactura
  }

  /**
   * Anula una factura (solo Admin)
   */
  async anularFactura(id: string, input: IAnularFacturaInput): Promise<IFactura> {
    await delay(800)
    console.log('[MOCK] Anulando factura:', id, input)

    const factura = MOCK_FACTURAS.find((f) => f.id === id)
    if (!factura) throw new Error('Factura no encontrada')

    return {
      ...factura,
      estado: 'cancelada',
      anulado_por: 'usr-admin',
      fecha_anulacion: new Date().toISOString(),
      motivo_anulacion: input.motivo,
      updated_at: new Date().toISOString(),
    }
  }

  // ------------------------------------------
  // Documentos Fiscales (HP-356)
  // ------------------------------------------

  /**
   * Obtiene presigned URL para subir documento
   */
  async getUploadPresignedUrl(facturaId: string, tipo: 'pdf' | 'xml'): Promise<IDocumentoPresignedUrl> {
    await delay(500)
    console.log('[MOCK] Generando presigned URL para:', facturaId, tipo)

    return {
      signedUrl: `https://storage.example.com/upload?factura=${facturaId}&tipo=${tipo}`,
      storage_key: `facturas/${facturaId}/${Date.now()}.${tipo}`,
      expires_in: 900,
    }
  }

  /**
   * Confirma que el documento fue subido y actualiza la factura
   */
  async confirmarUploadDocumento(
    facturaId: string,
    tipo: 'pdf' | 'xml',
    storageKey: string
  ): Promise<IFactura> {
    await delay(600)
    console.log('[MOCK] Confirmando upload:', facturaId, tipo, storageKey)

    const factura = MOCK_FACTURAS.find((f) => f.id === facturaId)
    if (!factura) throw new Error('Factura no encontrada')

    const urlKey = tipo === 'pdf' ? 'pdf_url' : 'xml_url'
    const keyKey = tipo === 'pdf' ? 'pdf_storage_key' : 'xml_storage_key'

    return {
      ...factura,
      [urlKey]: `https://storage.example.com/${storageKey}`,
      [keyKey]: storageKey,
      updated_at: new Date().toISOString(),
    }
  }

  /**
   * Obtiene URL de descarga para un documento
   */
  async getDownloadUrl(facturaId: string, tipo: 'pdf' | 'xml'): Promise<{ url: string; expires_in: number }> {
    await delay(300)
    console.log('[MOCK] Generando URL de descarga:', facturaId, tipo)

    return {
      url: `https://storage.example.com/download/${facturaId}.${tipo}?token=mock`,
      expires_in: 900,
    }
  }

  /**
   * Elimina un documento de la factura (solo Admin)
   */
  async eliminarDocumento(facturaId: string, tipo: 'pdf' | 'xml'): Promise<IFactura> {
    await delay(500)
    console.log('[MOCK] Eliminando documento:', facturaId, tipo)

    const factura = MOCK_FACTURAS.find((f) => f.id === facturaId)
    if (!factura) throw new Error('Factura no encontrada')

    const urlKey = tipo === 'pdf' ? 'pdf_url' : 'xml_url'
    const keyKey = tipo === 'pdf' ? 'pdf_storage_key' : 'xml_storage_key'

    return {
      ...factura,
      [urlKey]: null,
      [keyKey]: null,
      updated_at: new Date().toISOString(),
    }
  }
}

export const facturacionService = new FacturacionService()
