/**
 * Utilidades generales
 * Funciones helper reutilizables
 */

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combina clases de Tailwind CSS sin conflictos
 * Útil para componentes con clases dinámicas
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Ruta interna para redirigir (?redirect=, ?returnTo=) o null. Se decide con el
 * mismo parser del navegador: "//otro-sitio", "/\otro-sitio" o "/<tab>/otro-sitio"
 * empiezan por "/" pero llevan a otro dominio (redirección abierta, phishing).
 */
export function rutaInterna(ruta?: string | null): string | null {
  if (!ruta?.startsWith('/')) return null
  try {
    return new URL(ruta, 'https://cofianza.invalid').host === 'cofianza.invalid' ? ruta : null
  } catch {
    return null
  }
}

/**
 * Flujo §13 (término único «estudio»): el número guardado es «EXP-2026-0005»
 * (lo pone un trigger y NO cambia); a las personas se les muestra
 * «N.° 2026-0005». Solo presentación: rutas, búsquedas y API siguen con el
 * guardado. Donde el texto no dice ya «Estudio», se antepone. Idempotente.
 */
export function formatNumeroEstudio(numero: string | null | undefined): string {
  return numero ? `N.° ${numero.replace(/^(?:EXP-|N\.° )/i, '')}` : ''
}

/**
 * Genera un ID único simple
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * Valida si una cadena es un email válido
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Trunca un texto a un número máximo de caracteres
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Capitaliza la primera letra de cada palabra
 */
export function capitalize(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Pausa la ejecución por un tiempo determinado (útil para demos y testing)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Abre en otra pestaña una URL que se obtiene con un await (enlaces firmados de
 * descarga). Safari de iPhone bloquea el window.open que no ocurre dentro del
 * toque, y tras un await ya no lo es: la pestaña se abre al tocar y recibe la
 * URL cuando llega. Si el navegador no dejó abrirla, se navega en esta misma.
 * Devuelve false si no hubo URL; propaga el error (con la pestaña ya cerrada).
 */
export async function abrirEnPestana(obtenerUrl: () => Promise<string | null | undefined>): Promise<boolean> {
  const pestana = window.open('', '_blank')
  try {
    const url = await obtenerUrl()
    if (!url) {
      pestana?.close()
      return false
    }
    if (pestana) {
      pestana.opener = null
      pestana.location.href = url
    } else {
      window.location.href = url
    }
    return true
  } catch (err) {
    pestana?.close()
    throw err
  }
}
