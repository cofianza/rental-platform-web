/**
 * Traduccion de errores tecnicos a lenguaje del prospecto.
 *
 * En las pantallas publicas (autorizar, coarrendatario, invitacion) el
 * prospecto no tiene sesion, ni soporte a la mano, ni idea de a quien
 * preguntarle. Mostrarle "Too many requests" o "Invalid input" lo deja sin
 * saber si fue culpa suya ni que hacer despues — y el 429 es especialmente
 * injusto: viene del limitador por IP y en Colombia el CGNAT de las
 * operadoras hace que se lo gane gente que nunca hizo un segundo intento.
 */

import { ApiClientError } from '@/lib/api'

/**
 * @param err  lo que capturo el catch (normalmente un ApiClientError).
 * @param fallback  que decirle si el error no trae nada aprovechable.
 */
export function mensajeParaProspecto(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError) {
    if (err.code === 'RATE_LIMIT_EXCEEDED' || err.statusCode === 429) {
      return 'Demasiados intentos desde tu red. Espera un minuto e inténtalo de nuevo.'
    }
    if (err.code === 'NETWORK_ERROR' || err.statusCode === 0) {
      return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'
    }
    if (err.statusCode >= 500) {
      return 'Tuvimos un problema de nuestro lado. Inténtalo en unos minutos.'
    }
    // Zod: el detalle por campo dice que corregir; el mensaje generico no.
    if (err.code === 'VALIDATION_ERROR') {
      return err.details?.[0]?.message ?? fallback
    }
    // Resto de 4xx: son errores de negocio y la API ya los redacta en espanol.
    return err.message || fallback
  }

  // fetch caido antes de llegar al cliente (offline, DNS, CORS).
  if (err instanceof TypeError) {
    return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'
  }

  return fallback
}
