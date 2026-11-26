/**
 * Adenda 6 §2 + Adenda 6.1: la autorización de datos V3.1. Nuestra versión interna es 'V3.1' (y
 * 'V3.1-coarrendatario'); a la persona se le muestra «Versión 3.1», como dice el propio texto. La V3 (24-nov) nunca
 * se publicó: la reemplaza la V3.1.
 */
export function versionVisible(version: string | null | undefined): string {
  if (!version) return ''
  const v3 = /^V(\d+(?:\.\d+)?)(?:-coarrendatario)?$/.exec(version)
  return v3 ? v3[1] : version
}

/** ¿La autorización se firmó con el texto V3.1 (casilla 4A, dos finalidades opcionales)? */
export function esTextoV3(version: string | null | undefined): boolean {
  return version === 'V3.1' || version === 'V3.1-coarrendatario'
}

/** Las dos casillas del numeral 5.2 de la V3.1, literales (la casilla es el consentimiento: no se recorta). */
export const CASILLAS_5_2_V3 = {
  analitica:
    'Autorizo el uso de mis datos para fines de analítica avanzada, segmentación, perfilamiento comercial y estructuración de productos o servicios propios de COFIANZA o de terceros aliados.',
  comercial:
    'Autorizo el envío de información comercial, promociones, ofertas y comunicaciones de mercadeo de productos o servicios propios de COFIANZA o de aliados estratégicos, por cualquier medio.',
} as const

/**
 * Adenda 6.1 §3: el cotejo se hace una sola vez, al firmar el contrato (no al autorizar). Lo que significa la casilla
 * 4A, dicho igual en las dos pantallas (solicitante y segundo firmante).
 */
export const COTEJO_AL_FIRMAR =
  'El cotejo con foto se hace al firmar el contrato. Si no autoriza el cotejo, o no queda aprobado, el contrato se firma con firma autenticada en notaría, a su costo.'

/** Ayuda de la casilla 4A (numeral 4A de la V3.1: «puede marcarla ahora o al momento de firmar el contrato»). */
export const AYUDA_CASILLA_4A =
  'Puede marcarla ahora o al firmar el contrato. Si no la marca, su solicitud se estudia igual; el cotejo con foto se hace al firmar y, sin esta autorización, el contrato se firma con firma autenticada en notaría, a su costo.'
