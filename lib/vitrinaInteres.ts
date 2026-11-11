/**
 * «Me interesa» en la vitrina: lo que la tarjeta decide con la respuesta de la
 * API. Puro, sin React.
 */

/** La API no deja abrir una solicitud sobre este inmueble para esta persona (409 con código propio). */
const CODIGO_SOLICITUD_NO_DISPONIBLE = 'SOLICITUD_NO_DISPONIBLE'

/** Texto neutro: no habla de un estudio activo que la persona no encuentra, ni del motivo. */
export const TEXTO_SOLICITUD_NO_DISPONIBLE =
  'No podemos abrir una solicitud para este inmueble. Si tiene dudas, comuníquese con Cofianza.'

export function esSolicitudNoDisponible(err: unknown): boolean {
  const e = err as { statusCode?: unknown; code?: unknown } | null
  return !!e && e.statusCode === 409 && e.code === CODIGO_SOLICITUD_NO_DISPONIBLE
}
