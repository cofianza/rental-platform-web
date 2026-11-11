/**
 * Lo que decide la pantalla pública del segundo firmante (/coarrendatario/[token])
 * antes de pintar nada. Puro, sin React.
 */

/** Pantalla final de quien ya salió del estudio: en usted, sin culpa ni motivo. */
export const TEXTO_YA_NO_HACE_PARTE = 'Ya no hace parte de este estudio. No tiene que hacer nada.'

/** La API responde así el enlace de un segundo firmante que ya salió del estudio. */
const CODIGO_RETIRADO = 'COARRENDATARIO_RETIRADO'

/** ¿El error de la API dice que esta persona ya no hace parte del estudio? */
export function esInvitacionRetirada(err: unknown): boolean {
  const e = err as { statusCode?: unknown; code?: unknown } | null
  return !!e && e.statusCode === 410 && e.code === CODIGO_RETIRADO
}

export type FaseInicialInvitacion = 'lista' | 'aceptado' | 'rechazado' | 'retirado'

/** La pantalla con que abre el enlace según el estado de la invitación. Quien ya salió nunca ve el formulario. */
export function faseInicialInvitacion(estado: string): FaseInicialInvitacion {
  if (estado === 'retirado') return 'retirado'
  if (estado === 'aceptado' || estado === 'estudio_completado') return 'aceptado'
  if (estado === 'rechazado_invitacion') return 'rechazado'
  return 'lista'
}
