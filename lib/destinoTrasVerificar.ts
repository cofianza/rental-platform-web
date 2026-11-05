/**
 * Lo que el arrendatario estaba haciendo cuando creó su cuenta (el inmueble que
 * le interesó o la invitación a su estudio), para retomarlo después de
 * confirmar el correo. Desde que el registro de la vitrina exige verificar el
 * correo ya no hay sesión al registrarse: el enlace llega por correo y se abre
 * en otra pestaña, donde sessionStorage está vacío. Por eso va en localStorage,
 * con vencimiento igual al del enlace (24 horas).
 *
 * Solo sirve en el mismo navegador; si confirma en otro equipo, entra a su
 * panel como cualquier ingreso. Nunca lanza: sin almacenamiento no hay destino.
 */
import { rutaInterna } from '@/lib/utils'

const CLAVE = 'cofianza_destino_tras_verificar'
const VIGENCIA_MS = 24 * 60 * 60 * 1000

export function guardarDestinoTrasVerificar(destino: string): void {
  if (!rutaInterna(destino)) return
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ destino, guardado: Date.now() }))
  } catch {
    // sin localStorage: después de confirmar entra a su panel
  }
}

/** Destino guardado y vigente, o null. No lo borra (puede volver a esta página). */
export function leerDestinoTrasVerificar(): string | null {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return null
    const { destino, guardado } = JSON.parse(crudo) as { destino?: string; guardado?: number }
    if (typeof guardado !== 'number' || Date.now() - guardado > VIGENCIA_MS) {
      localStorage.removeItem(CLAVE)
      return null
    }
    return rutaInterna(destino)
  } catch {
    return null
  }
}

export function olvidarDestinoTrasVerificar(): void {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // nada que limpiar
  }
}
