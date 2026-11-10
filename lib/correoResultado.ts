/**
 * El correo donde la persona quiere recibir el resultado de su evaluación, que
 * registra ella misma al autorizar. La pantalla lo pide solo cuando la API
 * manda `contacto_resultado.requerido`; sin esa clave, la autorización es la
 * de siempre. La API vuelve a validar el formato.
 */

// La misma forma que acepta la API (z.email de Zod 4): sin tildes, sin puntos seguidos ni en los extremos
// de la parte local, y un dominio con al menos dos letras al final.
const FORMATO = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/

export function correoResultadoValido(correo: string): boolean {
  const c = correo.trim()
  return c.length > 0 && c.length <= 254 && FORMATO.test(c)
}

/** Lo que se agrega al cuerpo de la firma: nada si la pantalla no lo pide. */
export function correoParaEnviar(requerido: boolean | undefined, correo: string): { correo_resultado?: string } {
  return requerido ? { correo_resultado: correo.trim() } : {}
}

/**
 * Lo que se agrega al cuerpo de la aceptación cuando la API pide comprobar el documento antes
 * (`contacto_resultado.documento_requerido`): el número que la persona escribió. Nada si no lo pide.
 */
export function documentoParaEnviar(requerido: boolean | undefined, numero: string): { numero_documento?: string } {
  return requerido ? { numero_documento: numero.trim() } : {}
}

/** «a <correo>» si la API lo mandó; si no, «al correo que usted registró» (sin el dato). Con la preposición. */
export function destinoDelCorreo(correo: string | null | undefined): string {
  const c = correo?.trim()
  return c ? `a ${c}` : 'al correo que usted registró'
}
