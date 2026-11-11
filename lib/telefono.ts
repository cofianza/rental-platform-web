/**
 * Espejo de rental-platform-api/src/lib/telefono.ts (noEsCelularColombiano): un
 * número de Colombia (+57, 0057, 57 con 10 dígitos o 10 dígitos sin indicativo)
 * que no es un celular. El celular empieza por 3 y tiene 10 dígitos; a un fijo
 * no le llega por WhatsApp el enlace para firmar. Los de otros países no se juzgan.
 * Si cambia allá, se cambia aquí: el API sigue siendo la puerta.
 */
export function noEsCelularColombiano(telefono: string | null | undefined): boolean {
  const limpio = (telefono ?? '').trim().replace(/[\s().-]/g, '')
  const digitos = limpio.replace(/\D/g, '')
  const nacional = limpio.startsWith('+57')
    ? digitos.slice(2)
    : limpio.startsWith('0057')
      ? digitos.slice(4)
      : digitos.length === 12 && digitos.startsWith('57') && !limpio.startsWith('+')
        ? digitos.slice(2)
        : digitos.length === 10 && !limpio.startsWith('+')
          ? digitos
          : null
  return nacional !== null && !/^3\d{9}$/.test(nacional)
}

/** Junto al campo: el número escrito es un fijo (o no es un celular de Colombia). */
export const MENSAJE_NO_ES_CELULAR =
  'Escriba un celular: en Colombia empieza por 3 y tiene 10 dígitos. A un teléfono fijo no le llega por WhatsApp el enlace para firmar.'
