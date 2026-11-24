/**
 * El segundo firmante que frena el contrato de un estudio ya aprobado (bloque 4): no ha respondido, ya aceptó y
 * su evaluación sigue en curso, o Cofianza lo verifica. Qué bloqueos son, y cuándo se ofrece «Seguir sin él».
 * Pura: la pinta components/contratos/v3/BloqueosContrato.
 */

import type { ITrabaContrato } from '@/types/expediente'
import type { Bloqueo } from '@/types/contratoV3'

/**
 * El segundo firmante ya aceptó y Cofianza lo verifica. Código propio de la web para el freno que se arma con
 * traba_contrato (`coarrendatario_en_verificacion`); si la API lo envía como bloqueo con este nombre, es el mismo.
 */
export const COARRENDATARIO_EN_VERIFICACION = 'COARRENDATARIO_EN_VERIFICACION'

/** El segundo firmante ya aceptó, pero su evaluación no ha terminado o Cofianza la verifica: se puede esperar o seguir sin él. */
export const SEGUNDO_FIRMANTE_EN_CURSO = ['COARRENDATARIO_SIN_EVALUAR', COARRENDATARIO_EN_VERIFICACION]

/**
 * Todos los frenos del contrato por el segundo firmante (sin responder, en evaluación o en verificación): también
 * los 409 al generar el contrato anterior, que se dejan a la vista con el mensaje de la API (no en un toast).
 */
export const FRENOS_DEL_SEGUNDO_FIRMANTE = ['COARRENDATARIO_PENDIENTE', ...SEGUNDO_FIRMANTE_EN_CURSO]

/**
 * La traba del estudio es la del segundo firmante que ya aceptó (en evaluación, con la consulta fallida o en
 * verificación): la API la manda con su salida «seguir sin él» (el freno que la web arma con ella la lleva).
 */
export const trabaAdmiteSeguirSinEl = (traba?: Pick<ITrabaContrato, 'codigo'> | null): boolean =>
  traba?.codigo === 'coarrendatario_en_evaluacion' || traba?.codigo === 'coarrendatario_en_verificacion'

/**
 * El bloqueo del segundo firmante que ya aceptó tiene la salida «Seguir sin él»: lo dice la API en el propio
 * bloqueo (`puede_seguir_sin_el`, solo con true). Sin el campo (una API anterior, o la Adenda 5 apagada) no se
 * ofrece: el bloqueo queda como antes, con lo que diga su mensaje.
 */
export const bloqueoOfreceSeguirSinEl = (b: Pick<Bloqueo, 'codigo' | 'puede_seguir_sin_el'>): boolean =>
  SEGUNDO_FIRMANTE_EN_CURSO.includes(b.codigo) && b.puede_seguir_sin_el === true

/** El aviso de la prima al seguir sin el segundo firmante (estudios anteriores a la Adenda 5), en cualquiera de sus trabas. */
export const avisoPrimaDeTraba = (traba?: ITrabaContrato | null): string | undefined =>
  traba && (traba.codigo === 'coarrendatario_pendiente' || trabaAdmiteSeguirSinEl(traba)) ? traba.aviso_prima : undefined
