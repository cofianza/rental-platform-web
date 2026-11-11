'use client'

/**
 * ¿El contrato anterior (GenerarContratoModal: el del propietario directo, o el
 * de antes del asistente V3) se puede hacer en este estudio? Lo dice la API en
 * la ventana del coarrendatario (`contrato_anterior_bloqueado`): con un
 * coarrendatario vinculado, o con un titular de la decisión que no es el
 * solicitante, ese contrato no sirve. Con esto la web no ofrece «Generar
 * contrato» para que la API diga que no.
 *
 * Con un API anterior (sin el campo) se deduce del coarrendatario: cuenta el que
 * aceptó, salvo si su evaluación terminó rechazada. Una invitación sin responder
 * no cuenta (D2, 11-nov: en el canal del propietario ya no se puede aceptar y la
 * API no la toma en cuenta). La API sigue siendo la puerta: si la lectura falla,
 * se ofrece el botón como antes.
 */

import { useEffect, useState } from 'react'
import { coarrendatarioService, type ICoarrendatario } from '@/services/coarrendatarioService'

export interface ContratoAnteriorBloqueado {
  codigo: string
  /** Vacío si lo dedujo la web (API anterior): el aviso usa su texto. */
  motivo: string
}

/** Respaldo con un API anterior: ¿el coarrendatario cuenta para el contrato? */
export function coarrendatarioCuenta(coa: ICoarrendatario | null): boolean {
  if (!coa) return false
  if (coa.estado === 'aceptado') return true
  if (coa.estado === 'estudio_completado') return coa.estudio?.resultado !== 'rechazado'
  return false
}

async function leer(expedienteId: string): Promise<ContratoAnteriorBloqueado | null> {
  const ventana = await coarrendatarioService.getVentana(expedienteId).catch(() => null)
  if (ventana && ventana.contrato_anterior_bloqueado !== undefined) return ventana.contrato_anterior_bloqueado
  const coa = await coarrendatarioService.getDelExpediente(expedienteId)
  return coarrendatarioCuenta(coa) ? { codigo: 'CONTRATO_REQUIERE_COARRENDATARIO', motivo: '' } : null
}

/**
 * undefined = todavía no se sabe (o no aplica); null = se puede generar; si no, por qué no.
 * `version` vuelve a leer.
 */
export function useSegundoFirmanteContrato(
  expedienteId: string,
  aplica: boolean,
  version?: unknown,
): ContratoAnteriorBloqueado | null | undefined {
  const [lectura, setLectura] = useState<{ clave: string; valor: ContratoAnteriorBloqueado | null } | null>(null)
  const clave = `${expedienteId}:${String(version ?? '')}`
  useEffect(() => {
    if (!aplica) return
    let vivo = true
    leer(expedienteId).then(
      (valor) => { if (vivo) setLectura({ clave, valor }) },
      () => { if (vivo) setLectura({ clave, valor: null }) },
    )
    return () => { vivo = false }
  }, [expedienteId, aplica, clave])
  if (!aplica) return undefined
  // Mientras llega la lectura nueva se conserva la anterior del mismo estudio (sin parpadeo).
  return lectura && lectura.clave.startsWith(`${expedienteId}:`) ? lectura.valor : undefined
}
