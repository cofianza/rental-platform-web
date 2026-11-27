/**
 * El número de documento mientras se escribe. Espejo de rental-platform-api/src/lib/documentoIdentidad.ts:
 * con puntos o espacios las centrales lo rechazan («1.234.567.890» dejó un estudio en «Consulta fallida»).
 * Aquí solo se limpia lo que se teclea o se pega; el API sigue siendo la puerta (normaliza y valida).
 *
 * - Cédula de ciudadanía: solo dígitos.
 * - NIT: sin espacios, puntos ni comas; conserva el guion del dígito de verificación (el API lo separa
 *   en la ficha y lo conserva en «Mi cuenta», como lo guarda el registro).
 * - Los demás: sin espacios, puntos, comas, guiones ni apóstrofos, en mayúsculas (el pasaporte conserva sus letras).
 */
export function documentoAlEscribir(tipo: string | null | undefined, valor: string): string {
  const t = (tipo ?? '').trim().toLowerCase()
  if (t === 'cc') return valor.replace(/\D/g, '')
  const sinSeparadores = valor.replace(/[\s.,'’]/g, '').toUpperCase()
  return t === 'nit' ? sinSeparadores : sinSeparadores.replace(/[-‐‑‒–—―−]/g, '')
}

/** Teclado del celular para el número: el pasaporte y el NIT (guion del DV) llevan teclado de texto. */
export function tecladoDocumento(tipo: string | null | undefined): 'numeric' | 'text' {
  const t = (tipo ?? '').trim().toLowerCase()
  return t === 'pasaporte' || t === 'nit' ? 'text' : 'numeric'
}

/**
 * Al cambiar el tipo con el número ya escrito: se vuelve a limpiar con la regla del tipo nuevo (de
 * pasaporte a cédula se van las letras de una vez). Al salir de NIT, su dígito de verificación («-8»)
 * no se pega al número.
 */
export function documentoAlCambiarTipo(
  tipoAnterior: string | null | undefined,
  tipoNuevo: string | null | undefined,
  numero: string,
): string {
  const saleDeNit = (tipoAnterior ?? '').trim().toLowerCase() === 'nit' && (tipoNuevo ?? '').trim().toLowerCase() !== 'nit'
  return documentoAlEscribir(tipoNuevo, saleDeNit ? numero.replace(/\s*[-‐‑‒–—―−]\s*\d\s*$/, '') : numero)
}
