/**
 * Lo que se le dice al titular único antes de cerrar su inmobiliaria vacía
 * (salir la cierra). El mismo texto en Equipo y en la invitación a otra.
 */
export function avisoCierreInmobiliaria(nombre: string): { title: string; message: string } {
  return {
    title: `Cerrar ${nombre}`,
    message:
      `Tu inmobiliaria ${nombre} se cierra: tus invitaciones pendientes quedan sin efecto y dejas de ser su ` +
      'titular. No se borra nada, pero tu cuenta queda sin inmobiliaria hasta que aceptes la invitación de otra.',
  }
}
