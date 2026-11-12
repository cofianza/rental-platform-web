/** Frases armadas de la página de autorización (las que dependen de datos). */

import type { IPagoProspecto } from '@/types/autorizacion'

// B1: el título dice lo mismo que el cuerpo de la pantalla de «ya firmaste».
export function tituloFirmado(pagoRequerido: boolean, pago: IPagoProspecto | null, esperaAgotada: boolean): string {
  if (!pagoRequerido || pago?.estado === 'completado' || pago?.estado === 'sin_enlace') return '¡Autorización firmada!'
  if (pago?.estado === 'procesando') return 'Su pago está en proceso'
  if (pago?.payment_link_url || !esperaAgotada) return 'Falta un paso: pague su estudio'
  return '¡Autorización firmada!'
}

// B7: la inmobiliaria o «El propietario del inmueble» (API), o un sujeto neutro.
// Siempre va al inicio de la frase: así el nombre no choca con «a»/«al».
export function quienTramita(solicitadoPor: string | null): string {
  return solicitadoPor?.trim() || 'Quien tramita su arriendo'
}

// Los sujetos genéricos de quienTramita en medio de una frase: «el propietario del inmueble».
export function enMedioDeFrase(quien: string): string {
  return quien.replace(/^(El|Quien) /, (m) => m.toLowerCase())
}

export function textoIntentos(n: number): string {
  return n === 1 ? 'Tiene 1 intento' : `Tiene ${n} intentos`
}

export function mensajeIntentosRestantes(n: number): string {
  return `El número de documento no coincide con el registrado. Verifíquelo e intente de nuevo. ${
    n === 1 ? 'Le queda 1 intento.' : `Le quedan ${n} intentos.`
  }`
}

export function enlaceNoActivo(quien: string): string {
  return `Este enlace ya no está activo. ${quien} le puede enviar uno nuevo; si tiene dudas, escríbanos: abajo están nuestros datos.`
}

// «su nombre, su apellido y su correo o su WhatsApp»
export function unirConY(partes: string[]): string {
  return partes.length < 2 ? (partes[0] ?? '') : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
}

// Pantalla de repaso (A3): el número como se lee en el documento físico.
// Solo muestra; a la API viaja lo que se escribió, sin tocar.
//   cc / ce / ti: 1.023.456.789 · NIT: 900.123.456-7 · pasaporte: en mayúsculas
//   PPT, PEP y cualquier otro: tal cual (no se escriben con puntos).
export function formatearDocumento(valor: string, tipo: string | null | undefined): string {
  const v = valor.trim().replace(/\s+/g, '')
  const puntos = (d: string) => d.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const limpio = v.replace(/\./g, '')
  if ((tipo === 'cc' || tipo === 'ce' || tipo === 'ti') && /^\d+$/.test(limpio)) return puntos(limpio)
  if (tipo === 'nit') {
    const m = limpio.match(/^(\d+)-?(\d)?$/)
    if (m) return m[2] ? `${puntos(m[1])}-${m[2]}` : puntos(m[1])
  }
  if (tipo === 'pasaporte') return v.toUpperCase()
  return v
}
