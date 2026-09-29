/**
 * Lo que se le dice al titular único antes de cerrar su inmobiliaria vacía
 * (salir la cierra). El mismo texto en Equipo y en la invitación a otra.
 */
export function avisoCierreInmobiliaria(nombre: string): { title: string; message: string } {
  return {
    title: `Cerrar ${nombre}`,
    message:
      `Su inmobiliaria ${nombre} se cierra: sus invitaciones pendientes quedan sin efecto y usted deja de ser su ` +
      'titular. No se borra nada, pero su cuenta queda sin inmobiliaria hasta que acepte la invitación de otra.',
  }
}
