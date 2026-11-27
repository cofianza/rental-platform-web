/**
 * El saldo a favor de la inmobiliaria en la compra de un paquete de cupos (Adenda 6.1 §6: «se aplica a sus pagos
 * siguientes»). Solo para mostrar, antes de comprar, cuánto cubriría el saldo y cuánto faltaría: la cifra real la
 * decide la API al crear la compra (y la devuelve en la respuesta). Lo pagado con saldo no se vuelve a facturar
 * (Adenda de precios §3.5): la factura sale solo por lo que se paga en Mercado Pago. Pura.
 */

export interface SaldoEnPaquete {
  /** Lo que cubriría el saldo a favor (IVA incluido). */
  aplicaria: number
  /** Lo que faltaría pagar en Mercado Pago (IVA incluido). */
  porPagar: number
  /** El saldo cubre el paquete completo: se paga sin pasar por Mercado Pago. */
  cubre: boolean
}

/** null sin saldo, o sin el total con IVA del paquete (API anterior). */
export function saldoEnPaquete(totalCop: number | null | undefined, saldoCop: number | null | undefined): SaldoEnPaquete | null {
  if (typeof totalCop !== 'number' || !(totalCop > 0)) return null
  if (typeof saldoCop !== 'number' || !(saldoCop > 0)) return null
  const total = Math.round(totalCop)
  const aplicaria = Math.min(total, Math.round(saldoCop))
  return { aplicaria, porPagar: total - aplicaria, cubre: aplicaria >= total }
}
