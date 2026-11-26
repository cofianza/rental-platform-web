/**
 * El ahorro de un paquete de cupos y las condiciones de la compra (reporte de la Oficina Virtual del 25-nov, punto 6).
 *
 * El ahorro se mide contra el estudio individual (PRECIO_ESTUDIO_INDIVIDUAL del panel, base sin IVA: $80.000), que la
 * API manda con cada paquete (`precio_individual_cop`); antes se medía contra el paquete más pequeño y el de 5 no
 * mostraba ninguno. Con 80.000: 5 a 70.000 → 12,5 %, 10 a 64.000 → 20 %, 25 a 56.000 → 30 %. Sin el precio individual
 * (una API anterior) no se muestra ahorro: no se inventa la cifra.
 *
 * Las condiciones son las de la Adenda de precios: §3.1 (vigencia desde la compra; vencida, los cupos no usados se
 * extinguen) y §3.2 (no se reembolsan ni se abonan a otro concepto). Pura.
 */

/** Porcentaje de ahorro por estudio frente al individual, con un decimal como máximo; null si no aplica. */
export function ahorroPaquete(
  paquete: { precio_cop: number; cantidad_estudios: number },
  precioIndividualCop: number | null | undefined,
): number | null {
  if (typeof precioIndividualCop !== 'number' || !(precioIndividualCop > 0)) return null
  if (!(paquete.cantidad_estudios > 0) || !(paquete.precio_cop > 0)) return null
  const porEstudio = paquete.precio_cop / paquete.cantidad_estudios
  const pct = Math.round((1 - porEstudio / precioIndividualCop) * 1000) / 10
  return pct > 0 ? pct : null
}

/** «Ahorro 12,5 %» (coma decimal y espacio duro antes del signo, como la tasa de aprobación). */
export const textoAhorro = (pct: number): string =>
  `Ahorro ${pct.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`

/** Las dos condiciones que se leen antes de pagar (Adenda de precios §3.1 y §3.2). */
export function condicionesCompraPaquete(vigenciaMeses: number | null | undefined): [string, string] {
  const vigencia =
    typeof vigenciaMeses === 'number' && vigenciaMeses > 0
      ? `Cada paquete vence ${vigenciaMeses} ${vigenciaMeses === 1 ? 'mes' : 'meses'} después del pago`
      : 'Cada paquete tiene una vigencia que cuenta desde el pago'
  return [
    `${vigencia}: los cupos que no use antes de esa fecha se extinguen.`,
    'Los cupos no usados no se reembolsan ni se abonan a otro concepto.',
  ]
}
