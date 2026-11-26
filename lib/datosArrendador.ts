/**
 * «Datos de mi inmobiliaria» (reporte de la Oficina Virtual del 25-nov, punto 13): el único lugar con los datos de la
 * inmobiliaria para contratos y facturas, su contacto y sus documentos legales. Las rutas viejas («Datos para
 * contrato» y «Mi Inmobiliaria») redirigen aquí (next.config.ts). El propietario usa la misma página con su nombre. Pura.
 */

export const RUTA_DATOS_INMOBILIARIA = '/configuracion/datos-inmobiliaria'

/** Las rutas que existían antes: redirigen a RUTA_DATOS_INMOBILIARIA (correos y notificaciones ya enviados). */
export const RUTAS_VIEJAS_DATOS_INMOBILIARIA = ['/configuracion/datos-contrato', '/configuracion/mi-inmobiliaria'] as const

/** El nombre de la página según quién la mira: la inmobiliaria o el propietario (una persona, sin organización). */
export function tituloDatosArrendador(rol: string | null | undefined): string {
  return rol === 'propietario' ? 'Mis datos de propietario' : 'Datos de mi inmobiliaria'
}

/** «/configuracion/datos-inmobiliaria?returnTo=…» para volver a donde estaba después de guardar. */
export function rutaDatosConRegreso(returnTo: string): string {
  return `${RUTA_DATOS_INMOBILIARIA}?returnTo=${encodeURIComponent(returnTo)}`
}
