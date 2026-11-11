/**
 * Textos de «Cómo se calcula» a partir de las tablas de puntos que entrega el
 * API (GET /admin/calibracion/tablas). Las tablas del motor no se escriben en
 * este repo, que es público (M-3): aquí solo se les da forma de frase.
 */

export interface FilaTabla {
  corte: number
  puntos: number
}

const num = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 4 }).replace(/^-/, '−')
/** Con signo: «+10», «−15», «0». */
export const conSigno = (n: number) => (n > 0 ? `+${num(n)}` : num(n))

/** Puntos de un valor en una tabla por cota inferior (de mayor a menor). */
export function puntosPorCotaInferior(tabla: readonly FilaTabla[], valor: number): number {
  for (const f of tabla) if (valor >= f.corte) return f.puntos
  return 0
}

/** Puntos de un valor en una tabla por cota superior inclusiva (de menor a mayor). */
export function puntosPorCotaSuperior(tabla: readonly FilaTabla[], valor: number): number {
  for (const f of tabla) if (valor <= f.corte) return f.puntos
  return 0
}

/** Puntaje de la central (cota inferior): «A o más: x · B-(A−1): y · … · desde el mínimo hasta …: z». */
export function textoPuntajeCentral(tabla: readonly FilaTabla[]): string {
  return tabla
    .map((f, i) => {
      if (i === 0) return `${num(f.corte)} o más: ${num(f.puntos)}`
      const hasta = tabla[i - 1].corte - 1
      if (i === tabla.length - 1) return `desde el mínimo hasta ${num(hasta)}: ${num(f.puntos)}`
      return `${num(f.corte)}-${num(hasta)}: ${num(f.puntos)}`
    })
    .join(' · ')
}

/**
 * Tabla de porcentajes por cota superior con el último tramo terminando en
 * `max`. Si el máximo queda por debajo de un corte, la tabla termina ahí.
 */
export function textoPorcentajes(tabla: readonly FilaTabla[], max: number): string {
  const partes: string[] = []
  let desde = 0
  for (const [i, f] of tabla.entries()) {
    const ultimo = i === tabla.length - 1 || f.corte >= max
    const tope = ultimo ? max : f.corte
    partes.push(desde === 0 ? `Hasta ${num(tope)} %: ${num(f.puntos)}` : `más de ${num(desde)} y hasta ${num(tope)} %: ${num(f.puntos)}`)
    if (ultimo) break
    desde = f.corte
  }
  return partes.join(' · ')
}

const meses = (m: number) => (m % 12 === 0 ? `${m / 12} ${m === 12 ? 'año' : 'años'}` : `${m} meses`)

/** Antigüedad (cota inferior, en meses), dicha en años cuando el corte lo permite. */
export function textoAntiguedad(tabla: readonly FilaTabla[]): string {
  return tabla
    .map((f, i) => {
      if (i === 0) {
        return (f.corte - 1) % 12 === 0 && f.corte > 1 ? `Más de ${meses(f.corte - 1)}: ${num(f.puntos)}` : `${meses(f.corte)} o más: ${num(f.puntos)}`
      }
      const siguiente = tabla[i - 1].corte
      if (f.corte === 0) return `menos de ${meses(siguiente)}: ${num(f.puntos)}`
      const hasta = siguiente - 1
      return hasta % 12 === 0
        ? `de ${meses(f.corte)} a ${meses(hasta)}: ${num(f.puntos)}`
        : `de ${meses(f.corte)} a menos de ${meses(siguiente)}: ${num(f.puntos)}`
    })
    .join(' · ')
}
