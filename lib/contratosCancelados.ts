/**
 * Adenda 6 §9: cuando los contadores de inquilinos o de canon dan cero porque TODOS los contratos de la cuenta están
 * cancelados, la pantalla lo dice: «0 inquilinos activos (4 contratos cancelados)». null si hay contratos activos, si no
 * hay cancelados, si hay algún contrato en otro estado (en firma o terminado: la causa del cero es otra) o si la API
 * todavía no manda los datos. Pura.
 */
export function notaContratosCancelados(
  activos: number | null | undefined,
  cancelados: number | null | undefined,
  noCancelados: number | null | undefined,
): string | null {
  if (activos !== 0 || noCancelados !== 0) return null
  if (typeof cancelados !== 'number' || !Number.isFinite(cancelados) || cancelados <= 0) return null
  return `(${cancelados.toLocaleString('es-CO')} ${cancelados === 1 ? 'contrato cancelado' : 'contratos cancelados'})`
}
