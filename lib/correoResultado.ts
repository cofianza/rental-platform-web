/**
 * El correo donde la persona quiere recibir el resultado de su evaluación, que
 * registra ella misma al autorizar. La pantalla lo pide solo cuando la API
 * manda `contacto_resultado.requerido`; sin esa clave, la autorización es la
 * de siempre. La API vuelve a validar el formato.
 */

const FORMATO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function correoResultadoValido(correo: string): boolean {
  const c = correo.trim()
  return c.length > 0 && c.length <= 254 && FORMATO.test(c)
}

/** Lo que se agrega al cuerpo de la firma: nada si la pantalla no lo pide. */
export function correoParaEnviar(requerido: boolean | undefined, correo: string): { correo_resultado?: string } {
  return requerido ? { correo_resultado: correo.trim() } : {}
}
