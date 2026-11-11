/**
 * Cuántos días sirve el reporte de la central desde la consulta. La cifra la
 * manda la API (`dias_vigencia_reporte` del historial de la apelación: con la
 * Adenda 5, la del panel). Sin el dato (historial que no se pudo leer, o una API
 * anterior si la web se publica primero) queda el texto de siempre, el de la
 * Política (30 días): así, con la adenda apagada, ninguna pantalla cambia.
 * Puro, sin React.
 */
const TEXTO_DE_SIEMPRE = ' (30 días desde la consulta)'

export function vigenciaDesdeLaConsulta(dias: number | null | undefined): string {
  if (typeof dias !== 'number' || !Number.isInteger(dias) || dias <= 0) return TEXTO_DE_SIEMPRE
  return ` (${dias} ${dias === 1 ? 'día' : 'días'} desde la consulta)`
}
