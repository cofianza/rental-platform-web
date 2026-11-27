/**
 * Quién hizo un pago registrado a mano (Adenda 6 §6): lo indica Cofianza al registrarlo, según el comprobante. La
 * inmobiliaria y el propietario son los del estudio (los resuelve la API); la persona va con nombre y correo. Es un
 * dato de auditoría; con el saldo a favor activo, la API lo usa para saber a quién le corresponde lo pagado si el
 * estudio termina sin consultar. Pura.
 */

export type TipoPagadorManual = 'inmobiliaria' | 'propietario' | 'persona' | 'no_se_sabe'

export interface IPagadorManualVista {
  tipo: TipoPagadorManual
  nombre: string | null
  email: string | null
}

/** Conceptos del registro a mano que exigen decir quién pagó (la consulta adicional nunca se registra a mano). */
export const CONCEPTOS_CON_PAGADOR = new Set(['estudio'])

/** Lo que se muestra en el detalle del pago. null si no se registró. */
export function textoPagadorManual(p: IPagadorManualVista | null | undefined): string | null {
  if (!p) return null
  const nombre = p.nombre?.trim()
  switch (p.tipo) {
    case 'inmobiliaria':
      return nombre ? `La inmobiliaria del estudio (${nombre})` : 'La inmobiliaria del estudio'
    case 'propietario':
      return nombre ? `El propietario del inmueble (${nombre})` : 'El propietario del inmueble'
    case 'persona':
      return [nombre, p.email ? `(${p.email})` : null].filter(Boolean).join(' ') || 'Una persona'
    case 'no_se_sabe':
      return 'Sin identificar en el comprobante'
    default:
      return null
  }
}

/** Correo con forma de correo (la API lo vuelve a validar). */
export const correoValido = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
