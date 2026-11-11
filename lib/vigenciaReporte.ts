/**
 * Cuántos días sirve el reporte de la central desde la consulta. La cifra la
 * manda la API (`dias_vigencia_reporte` del historial de la apelación); aquí no
 * se escribe ninguna. Sin el dato (API anterior, historial sin leer) no se
 * inventa: el texto queda solo con la fecha. Puro, sin React.
 */
export function vigenciaDesdeLaConsulta(dias: number | null | undefined): string {
  if (typeof dias !== 'number' || !Number.isInteger(dias) || dias <= 0) return ''
  return ` (${dias} ${dias === 1 ? 'día' : 'días'} desde la consulta)`
}
