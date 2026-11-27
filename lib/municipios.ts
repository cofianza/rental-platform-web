/**
 * Reporte de la Oficina Virtual (25-nov), punto 4: la ciudad se elige del listado oficial de
 * municipios de Colombia (DIVIPOLA) y se muestra «Municipio, Departamento». Las claves son espejo
 * de claveLugar / claveDepartamento / departamentoSiDistinto de la API
 * (rental-platform-api/src/lib/formatoDatos.ts): si cambian allá, se cambian aquí.
 */

const PLANO: Record<string, string> = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n', à: 'a', è: 'e', ì: 'i', ò: 'o', ù: 'u',
  â: 'a', ê: 'e', î: 'i', ô: 'o', û: 'u', ä: 'a', ë: 'e', ï: 'i', ö: 'o', ç: 'c', ã: 'a', õ: 'o',
}

/** Sin tildes, minúsculas, sin puntuación ni «D.C.»: «Bogotá, D.C.» y «BOGOTA DC» dan «bogota». */
export function claveLugar(v: string | null | undefined): string {
  return (v ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[áéíóúüñàèìòùâêîôûäëïöçãõ]/g, (c) => PLANO[c])
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w && w !== 'dc')
    .join(' ')
}

/** Los nombres de departamento que se escriben distinto del DIVIPOLA. */
const ALIAS_DEPARTAMENTO: Record<string, string> = {
  'archipielago de san andres providencia y santa catalina': 'san andres',
  'san andres providencia y santa catalina': 'san andres',
  'san andres y providencia': 'san andres',
  'distrito capital': 'bogota',
  'santafe de bogota': 'bogota',
  valle: 'valle del cauca',
  guajira: 'la guajira',
}

export function claveDepartamento(v: string | null | undefined): string {
  const k = claveLugar(v)
  return ALIAS_DEPARTAMENTO[k] ?? k
}

/** El departamento junto a la ciudad, salvo en Bogotá, que es su propio departamento. */
export function departamentoSiDistinto(ciudad: string | null | undefined, departamento: string | null | undefined): string | null {
  if (!departamento) return null
  return claveLugar(ciudad) === 'bogota' && claveDepartamento(departamento) === 'bogota' ? null : departamento
}

/** «Caldas, Antioquia»; «Bogotá, D.C.» (sin repetirlo); solo la ciudad si no hay departamento. */
export function etiquetaMunicipio(ciudad: string | null | undefined, departamento: string | null | undefined): string {
  const dep = departamentoSiDistinto(ciudad, departamento)
  return [ciudad?.trim(), dep?.trim()].filter(Boolean).join(', ')
}

/** Una opción del buscador de municipios (GET /factus/municipalities). */
export interface OpcionMunicipio {
  code: string
  name: string
  department: { name: string }
}

/**
 * ¿Esta opción del catálogo es la ciudad y el departamento guardados? Mismo nombre y mismo
 * departamento sin mirar tildes ni mayúsculas (el DIVIPOLA no repite un nombre dentro de un
 * departamento); «Bogotá» con «Cundinamarca» también es Bogotá, D.C.
 */
export function esElMunicipio(opcion: OpcionMunicipio, ciudad: string | null | undefined, departamento: string | null | undefined): boolean {
  const n = claveLugar(ciudad)
  const d = claveDepartamento(departamento)
  if (!n || !d) return false
  if (n === 'bogota' && (d === 'bogota' || d === 'cundinamarca')) return opcion.code === '11001'
  return claveLugar(opcion.name) === n && claveDepartamento(opcion.department.name) === d
}
