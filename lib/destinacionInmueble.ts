/**
 * Destinación del inmueble (reporte Oficina Virtual 25-nov, punto 8): la misma
 * regla que la API (src/modules/inmuebles/destinacion.ts: usosPermitidosPara,
 * motivoDestinacionIncoherente, usoEfectivo). Si cambia una, cambia la otra.
 * Pura, sin React.
 *
 *   tipo                                vivienda  comercial  mixto
 *   apartamento, apartaestudio, casa       sí        sí        sí
 *   casa_finca, finca                      sí        sí        sí
 *   local, oficina, bodega                 no        sí        sí
 *   lote, parqueadero                      no        sí        no
 *
 * Sin tipo (inmuebles migrados que no lo traían) manda el uso.
 */

export type DestinacionElegible = 'vivienda' | 'comercial' | 'mixto'
export type DestinacionInmueble = DestinacionElegible

/** Tipos que nunca son vivienda. */
export const TIPOS_NO_VIVIENDA: readonly string[] = ['local', 'oficina', 'bodega', 'lote', 'parqueadero']
/** De esos, los que tampoco admiten mixto: no tienen parte habitable. */
const SIN_PARTE_HABITABLE: readonly string[] = ['lote', 'parqueadero']

const NOMBRE_TIPO: Readonly<Record<string, string>> = {
  local: 'Un local',
  oficina: 'Una oficina',
  bodega: 'Una bodega',
  lote: 'Un lote',
  parqueadero: 'Un parqueadero',
}

/** Destinaciones que el formulario ofrece para este tipo. */
export function usosPermitidosPara(tipo: string | null | undefined): DestinacionElegible[] {
  if (!tipo || !TIPOS_NO_VIVIENDA.includes(tipo)) return ['vivienda', 'comercial', 'mixto']
  return SIN_PARTE_HABITABLE.includes(tipo) ? ['comercial'] : ['comercial', 'mixto']
}

/** null = se puede guardar. El mismo texto que responde la API (400 DESTINACION_INCOHERENTE). */
export function mensajeDestinacionIncoherente(tipo: string | null | undefined, uso: string | null | undefined): string | null {
  if (!uso) return null
  const elegible = uso === 'local_comercial' ? 'comercial' : uso
  if ((usosPermitidosPara(tipo) as string[]).includes(elegible)) return null
  const quien = (tipo && NOMBRE_TIPO[tipo]) || 'Este tipo de inmueble'
  return uso === 'vivienda'
    ? `${quien} no puede tener destinación vivienda: elija ${tipo && SIN_PARTE_HABITABLE.includes(tipo) ? 'comercial' : 'comercial o mixta'}. El contrato que genera la plataforma es solo para vivienda.`
    : `${quien} no tiene parte habitable, así que no puede tener destinación mixta: elija comercial.`
}

/** Destinación con la que cuenta la plataforma: un tipo que no es vivienda nunca es vivienda, diga lo que diga el uso. */
export function destinacionDelInmueble(inm: { tipo?: string | null; uso?: string | null }): DestinacionInmueble | null {
  const { tipo, uso } = inm
  if (tipo && TIPOS_NO_VIVIENDA.includes(tipo)) {
    return uso === 'mixto' && !SIN_PARTE_HABITABLE.includes(tipo) ? 'mixto' : 'comercial'
  }
  if (uso === 'vivienda') return 'vivienda'
  if (uso === 'comercial' || uso === 'local_comercial') return 'comercial'
  if (uso === 'mixto') return 'mixto'
  return null
}

/**
 * Qué hace el asistente del estudio con este inmueble:
 *   - 'libre': de vivienda (o sin destinación conocida: decide la API);
 *   - 'bloqueo': comercial o mixto con el interruptor de la Gerencia apagado
 *     (Adenda de precios §6.1: el estudio no se crea ni se cobra);
 *   - 'aviso': comercial o mixto con el interruptor encendido (§6.2): el estudio
 *     sigue, pero el contrato de vivienda no se podrá generar.
 */
export type EstudioSegunDestinacion = 'libre' | 'aviso' | 'bloqueo'

export function estudioSegunDestinacion(
  inm: { tipo?: string | null; uso?: string | null },
  comercialHabilitado: boolean,
): EstudioSegunDestinacion {
  const d = destinacionDelInmueble(inm)
  if (d === 'comercial' || d === 'mixto') return comercialHabilitado ? 'aviso' : 'bloqueo'
  return 'libre'
}

/** Tarjeta no seleccionable en el paso 1 (Adenda de precios §6.4: «en desarrollo», no «rechazado»). */
export const MSG_DESTINACION_BLOQUEO =
  'Destinación comercial o mixta: los estudios de estos inmuebles están en desarrollo y el contrato de la plataforma es solo para vivienda. Si en realidad es de vivienda, corrija su ficha.'

/** Interruptor encendido: el estudio sigue, el contrato de vivienda no. */
export const MSG_DESTINACION_AVISO =
  'Con este inmueble no se podrá generar el contrato de vivienda de la plataforma: su destinación es comercial o mixta, y el contrato comercial todavía no está habilitado. El estudio evalúa a la persona, pero el contrato no se podrá hacer aquí.'

/** Estudio sin propiedad con destinación comercial (interruptor encendido). */
export const MSG_DESTINACION_AVISO_SIN_INMUEBLE =
  'Con destinación comercial no se podrá generar el contrato de vivienda de la plataforma, y el contrato comercial todavía no está habilitado: el estudio evalúa a la persona, pero el contrato no se podrá hacer aquí.'

/** Ayuda del formulario del inmueble. */
export const NOTA_CONTRATO_SOLO_VIVIENDA =
  'El contrato que genera la plataforma es solo para vivienda: con destinación comercial o mixta no se podrá generar.'
