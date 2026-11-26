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

/**
 * Adenda 6 §7 (revisión de lógica): qué se dice al reasignar el estudio a una propiedad de canon mayor (se evalúa de
 * nuevo antes de trasladarlo). «Sin costo» solo si la API lo dice (`reevaluacion_sin_costo` del estudio): en uno
 * anterior a la Adenda 6 con el reporte vencido, evaluar de nuevo requiere una consulta adicional y la API responde su
 * valor antes de cobrar nada. Sin el dato no se promete. Puro.
 */
export function textoReasignarConReevaluacion(sinCosto: boolean | null | undefined): string {
  return sinCosto === true
    ? 'El canon es mayor al aprobado: el estudio se evalúa de nuevo con este canon antes de trasladarlo, sin costo. Si la evaluación ya no está vigente, no se traslada ni se cobra nada.'
    : 'El canon es mayor al aprobado: el estudio se evalúa de nuevo con este canon antes de trasladarlo. Si eso requiere una consulta adicional, verá su valor antes de pagarla; si la evaluación ya no está vigente, no se traslada ni se cobra nada.'
}
