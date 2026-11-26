/**
 * Adenda 6.1 §2: el enlace personal llega por WhatsApp y por correo con la MISMA ficha; cada canal lleva su marca y
 * la API guarda, al firmar o aceptar, por cuál llegó la persona (el número o correo al que se envió lo pone la API,
 * nunca la página). Las marcas:
 *   - `?c=w` / `?c=c` en la URL (correo, y el WhatsApp del solicitante, que lleva la URL completa);
 *   - la ficha con `-w` / `-c` al final (el botón del WhatsApp del segundo firmante: Meta arma «base + sufijo»).
 * Sin marca (enlaces de antes): null.
 */

export type CanalEnlace = 'whatsapp' | 'correo'

const POR_MARCA: Record<string, CanalEnlace> = { w: 'whatsapp', c: 'correo' }

/**
 * La ficha limpia (la que se manda a la API) y el canal por el que llegó. `search` es `window.location.search` (o
 * vacío en el servidor). La marca del final de la ficha manda sobre la de la URL: es la del botón que se pulsó.
 */
export function leerEnlace(tokenParam: string, search = ''): { token: string; canal: CanalEnlace | null } {
  const m = /^([^-]+)-([wc])$/.exec(tokenParam)
  if (m) return { token: m[1], canal: POR_MARCA[m[2]] }
  const c = new URLSearchParams(search).get('c')
  return { token: tokenParam, canal: (c && POR_MARCA[c]) || null }
}

/** El canal del enlace abierto en esta pestaña (para la firma o la aceptación). null en el servidor o sin marca. */
export function canalDeEstaPagina(tokenParam: string): CanalEnlace | null {
  if (typeof window === 'undefined') return null
  return leerEnlace(tokenParam, window.location.search).canal
}
