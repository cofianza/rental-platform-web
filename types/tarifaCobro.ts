/**
 * Cobro de la tarifa mensual (plan cobro-tarifa-mensual): cuentas de cobro que
 * Cofianza le emite a cada inmobiliaria, con una línea por contrato y mes.
 * Forma de /api/v1/tarifa-cobro. Los montos numeric de Postgres pueden llegar
 * como texto: se leen con Number().
 */

/** «pagada», «parcial» y «vencida» no se guardan: la API las calcula de las líneas. */
export type SituacionCuenta =
  | 'borrador'
  | 'bloqueada_fiscal'
  | 'emitiendo'
  | 'emitida'
  | 'pagada'
  | 'parcial'
  | 'vencida'
  | 'anulada'

export type EstadoCuenta = 'borrador' | 'bloqueada_fiscal' | 'emitiendo' | 'emitida' | 'anulada'
export type EstadoLinea = 'pendiente' | 'pagada' | 'no_recaudada' | 'anulada'
type Monto = number | string

export interface ICuentaCobro {
  id: string
  inmobiliaria_id: string
  /** AAAA-MM-01: el mes que se cobra. */
  periodo: string
  /** AAAA-MM-DD: el día 10 del mes. */
  vence_en: string
  estado: EstadoCuenta
  base_cop: Monto | null
  iva_cop: Monto | null
  cash_rounding_cop: Monto | null
  total_cop: Monto | null
  factura_id: string | null
  emitida_en: string | null
  recordatorio_n: number
  inmobiliarias: { nombre: string } | null
  situacion: SituacionCuenta
  /** Solo en las emitidas: lo pendiente (las no recaudadas no se cobran todavía). */
  saldo_cop: number | null
  lineas_n: number
  nota_credito_pendiente: boolean
}

export interface ILineaCobro {
  id: string
  contrato_id: string
  periodo: string
  modalidad: string
  origen: 'plataforma' | 'migracion'
  /** false en Trasladada: va en la cuenta pero no en la factura. */
  facturable: boolean
  pct: Monto
  canon_base: Monto
  dias: number
  dias_mes: number
  base_cop: Monto
  iva_pct: Monto
  iva_cop: Monto
  total_cop: Monto
  estado: EstadoLinea
  pagada_en: string | null
  referencia_pago: string | null
  anulada_motivo: string | null
  requiere_nota_credito: boolean
  contrato: { numero: string | null } | null
}

export interface ICuentaCobroDetalle extends Omit<ICuentaCobro, 'lineas_n' | 'nota_credito_pendiente' | 'saldo_cop'> {
  saldo_cop: number
  cliente_nit: string | null
  cliente_razon_social: string | null
  notas: string | null
  lineas: ILineaCobro[]
}

/** Lo que pide la API al marcar un pago: la referencia y el día en que la inmobiliaria pagó. */
export interface IDatosPagoTarifa {
  referencia: string
  /** AAAA-MM-DD */
  fecha: string
}
