/**
 * Qué acciones tiene un interesado de la vitrina según su estado (reporte de la Oficina Virtual del 25-nov, punto 5).
 * Un interesado descartado solo se puede reabrir: «Contactado» y «Crear estudio» aparecen cuando está activo (nuevo o
 * contactado), y «Contactado» solo mientras sigue nuevo. Pura.
 */

export type EstadoInteresado = 'nuevo' | 'contactado' | 'descartado'

export interface AccionesInteresado {
  crearEstudio: boolean
  contactado: boolean
  descartar: boolean
  reabrir: boolean
}

export function accionesInteresado(estado: EstadoInteresado): AccionesInteresado {
  if (estado === 'descartado') return { crearEstudio: false, contactado: false, descartar: false, reabrir: true }
  return { crearEstudio: true, contactado: estado === 'nuevo', descartar: true, reabrir: false }
}
