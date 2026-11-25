/**
 * Adenda 6 §2: la autorización de datos V3. Nuestra versión interna es 'V3' (y 'V3-coarrendatario'); a la
 * persona se le muestra «Versión 3», como dice el propio texto.
 */
export function versionVisible(version: string | null | undefined): string {
  if (!version) return ''
  const v3 = /^V(\d+)(?:-coarrendatario)?$/.exec(version)
  return v3 ? v3[1] : version
}

/** Las dos casillas del numeral 5.2 de la V3, literales (la casilla es el consentimiento: no se recorta). */
export const CASILLAS_5_2_V3 = {
  analitica:
    'Autorizo el uso de mis datos para fines de analítica avanzada, segmentación, perfilamiento comercial y estructuración de productos o servicios propios de COFIANZA o de terceros aliados.',
  comercial:
    'Autorizo el envío de información comercial, promociones, ofertas y comunicaciones de mercadeo de productos o servicios propios de COFIANZA o de aliados estratégicos, por cualquier medio.',
} as const

/** Lo que pasa sin el cotejo aprobado (Adenda 6 §2), dicho igual en todas las pantallas. */
export const SIN_COTEJO_NOTARIA = 'Sin el cotejo aprobado, el contrato se firma con firma autenticada en notaría, a su costo.'

/**
 * Adenda 6 §2: por qué no se ofrece el cotejo del numeral 4A. Con `no_cotejable: 'tipo_documento'` (Auco no coteja,
 * p. ej., PEP ni tarjeta de identidad) se dice así; sin el dato (otra razón, o una API anterior), el texto de siempre.
 */
export function cotejoNoDisponible(noCotejable: string | null | undefined): string {
  return noCotejable === 'tipo_documento'
    ? 'El cotejo con foto del numeral 4A no se puede hacer con este tipo de documento.'
    : 'El cotejo con foto del numeral 4A no está disponible en este momento.'
}
