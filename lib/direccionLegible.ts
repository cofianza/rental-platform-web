/** Direcciones como se digitaron, legibles en las listas de estudios (Cofianza, inmobiliaria y propietario). Pura. */

/** Siglas que se dejan en mayúscula aunque tengan vocales. */
const SIGLAS = new Set(['BBVA', 'NIT', 'SAS', 'IPS', 'EPS', 'UPZ', 'ESE'])
/** Conectores en minúscula salvo al inicio («Calle 10 de la Sierra»). */
const CONECTORES = new Set(['EN', 'EL', 'LA', 'DE', 'DEL', 'LOS', 'LAS', 'Y'])

/**
 * Las direcciones llegan como se digitaron: «CALLE 45 # 12-30 APTO 301» junto a
 * «Calle 10 Sur # 43-21». Solo las escritas todo en mayúsculas se pasan a
 * mayúscula inicial. Quedan igual las palabras con números («40A», «12-30»),
 * las que no tienen vocales («PH», «KR») y las siglas («BBVA», «S.A.S.»).
 */
export function direccionLegible(texto: string): string {
  if (/\p{Ll}/u.test(texto)) return texto
  return texto
    .split(' ')
    .map((w, i) => {
      const letras = w.replace(/[^\p{L}]/gu, '')
      if (!letras || /\d/.test(w)) return w
      const minuscula = w.toLocaleLowerCase('es-CO')
      if (i > 0 && CONECTORES.has(letras)) return minuscula
      if (!/[AEIOUÁÉÍÓÚ]/.test(letras) || SIGLAS.has(letras) || /^(\p{L}\.){2,}/u.test(w)) return w
      return minuscula.charAt(0).toLocaleUpperCase('es-CO') + minuscula.slice(1)
    })
    .join(' ')
}
