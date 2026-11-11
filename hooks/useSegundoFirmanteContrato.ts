'use client'

/**
 * ¿El estudio tiene segundo firmante (coarrendatario) que el contrato anterior
 * no incluye? Ese contrato (GenerarContratoModal: el del propietario directo, o
 * el de antes del asistente V3) no lo imprime ni lo hace firmar, y la API lo
 * rechaza (CONTRATO_REQUIERE_COARRENDATARIO, COARRENDATARIO_PENDIENTE). Con esto
 * la web no ofrece «Generar contrato» para que la API diga que no.
 *
 * Cuenta la invitación viva y el coarrendatario que aceptó, salvo si su
 * evaluación terminó rechazada (la API arma el contrato sin él). La API sigue
 * siendo la puerta: si la lectura falla, se ofrece el botón como antes.
 */

import { useEffect, useState } from 'react'
import { coarrendatarioService, type ICoarrendatario } from '@/services/coarrendatarioService'

export function tieneSegundoFirmante(coa: ICoarrendatario | null): boolean {
  if (!coa) return false
  if (coa.estado === 'pendiente_aceptacion') return new Date(coa.token_expiracion) > new Date()
  if (coa.estado === 'aceptado') return true
  if (coa.estado === 'estudio_completado') return coa.estudio?.resultado !== 'rechazado'
  return false
}

/** null = todavía no se sabe (o no aplica); `version` vuelve a leer. */
export function useSegundoFirmanteContrato(expedienteId: string, aplica: boolean, version?: unknown): boolean | null {
  const [lectura, setLectura] = useState<{ clave: string; valor: boolean } | null>(null)
  const clave = `${expedienteId}:${String(version ?? '')}`
  useEffect(() => {
    if (!aplica) return
    let vivo = true
    coarrendatarioService.getDelExpediente(expedienteId).then(
      (coa) => { if (vivo) setLectura({ clave, valor: tieneSegundoFirmante(coa) }) },
      () => { if (vivo) setLectura({ clave, valor: false }) },
    )
    return () => { vivo = false }
  }, [expedienteId, aplica, clave])
  if (!aplica) return null
  // Mientras llega la lectura nueva se conserva la anterior del mismo estudio (sin parpadeo).
  return lectura && lectura.clave.startsWith(`${expedienteId}:`) ? lectura.valor : null
}
