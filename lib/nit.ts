/** Dígito de verificación DIAN (módulo 11) de los dígitos de un NIT, sin el DV. */
export function digitoVerificacionNit(digits: string): number {
  const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]
  let sum = 0
  const reversed = digits.split('').reverse()
  for (let i = 0; i < reversed.length; i++) {
    sum += parseInt(reversed[i], 10) * weights[i]
  }
  const remainder = sum % 11
  return remainder >= 2 ? 11 - remainder : remainder
}

/** "900123456-8": ¿el dígito de verificación corresponde al número? */
export function validateNitModulo11(nit: string): boolean {
  const match = nit.match(/^(\d{1,15})-(\d)$/)
  return !!match && digitoVerificacionNit(match[1]) === parseInt(match[2], 10)
}

/**
 * Qué tiene mal un NIT escrito a mano (puntos y espacios se ignoran); null si está bien.
 * Mismo criterio que el asistente de contratos del API (problemaNit).
 */
export function problemaNit(nit: string): string | null {
  const s = nit.replace(/[.\s]/g, '')
  const m = /^(\d{1,15})(?:-(\d))?$/.exec(s)
  if (!m) return 'NIT: escríbelo con números y el dígito de verificación (ej. 900123456-8)'
  const dv = digitoVerificacionNit(m[1])
  if (m[2] === undefined) return `NIT: falta el dígito de verificación (con ese número sería ${dv}; confírmalo en el RUT)`
  // Puede estar mal el número y no el dígito: se pide revisar ambos, no copiar el dígito.
  return Number(m[2]) === dv
    ? null
    : `NIT: el dígito de verificación no corresponde al número (con ese número sería ${dv}); revisa ambos en el RUT`
}
