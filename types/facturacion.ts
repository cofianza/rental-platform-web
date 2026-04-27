/**
 * Tipos para el modulo de Facturacion - HP-354, HP-355, HP-356, HP-357
 */

// ============================================
// Datos Fiscales (HP-354)
// ============================================

export type RegimenTributario =
  | 'simplificado'
  | 'comun'
  | 'gran_contribuyente'

export const REGIMEN_TRIBUTARIO_LABELS: Record<RegimenTributario, string> = {
  simplificado: 'Regimen Simplificado (No responsable de IVA)',
  comun: 'Regimen Comun (Responsable de IVA)',
  gran_contribuyente: 'Gran Contribuyente',
}

export interface IDatosFiscales {
  id: string
  usuario_id: string
  tipo_documento: 'NIT' | 'CC' | 'CE'
  numero_documento: string
  razon_social: string
  regimen_tributario: RegimenTributario
  direccion_fiscal: string
  ciudad: string
  departamento: string
  email_fiscal: string
  telefono_fiscal: string
  created_at: string
  updated_at: string
}

export interface IDatosFiscalesInput {
  tipo_documento: 'NIT' | 'CC' | 'CE'
  numero_documento: string
  razon_social: string
  regimen_tributario: RegimenTributario
  direccion_fiscal: string
  ciudad: string
  departamento: string
  email_fiscal: string
  telefono_fiscal: string
}

// ============================================
// Facturas (HP-355)
// ============================================

export type EstadoFactura = 'solicitada' | 'emitida' | 'cancelada'

export const ESTADO_FACTURA_CONFIG: Record<EstadoFactura, { label: string; color: string; bg: string }> = {
  solicitada: { label: 'Solicitada', color: 'text-amber-700', bg: 'bg-amber-100' },
  emitida: { label: 'Emitida', color: 'text-green-700', bg: 'bg-green-100' },
  cancelada: { label: 'Cancelada', color: 'text-red-700', bg: 'bg-red-100' },
}

export interface IFactura {
  id: string
  numero: string
  fecha: string
  concepto: string
  subtotal: number
  iva: number
  /** Porcentaje real de IVA aplicado en esta factura (0 = exento). */
  iva_porcentaje?: number
  total: number
  estado: EstadoFactura
  // Datos del emisor
  emisor_razon_social: string
  emisor_nit: string
  emisor_direccion: string
  // Datos del receptor (datos fiscales del cliente)
  receptor_razon_social: string
  receptor_documento: string
  receptor_direccion: string
  receptor_email: string
  // Documentos fiscales (HP-356)
  pdf_url: string | null
  pdf_storage_key: string | null
  xml_url: string | null
  xml_storage_key: string | null
  // Relaciones
  pago_id: string | null
  datos_fiscales_id: string
  // Metadata
  created_at: string
  updated_at: string
  creado_por: string
  anulado_por: string | null
  fecha_anulacion: string | null
  motivo_anulacion: string | null
}

export interface ICrearFacturaInput {
  pago_id?: string
  datos_fiscales_id: string
  concepto: string
  subtotal: number
}

export interface IAnularFacturaInput {
  motivo: string
}

// ============================================
// Listado con paginacion
// ============================================

export interface IFacturaListResponse {
  facturas: IFactura[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface IFacturaFilters {
  page?: number
  limit?: number
  estado?: EstadoFactura
  fecha_desde?: string
  fecha_hasta?: string
  busqueda?: string
}

// ============================================
// Documentos Fiscales (HP-356)
// ============================================

export interface IUploadDocumentoInput {
  tipo: 'pdf' | 'xml'
  archivo: File
}

export interface IDocumentoPresignedUrl {
  signedUrl: string
  storage_key: string
  expires_in: number
}
