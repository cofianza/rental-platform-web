'use client'

/**
 * Registra la revocación que pidió el titular (solo Cofianza). Si la API responde que el estudio tiene
 * autorizaciones vigentes de dos solicitantes, expone las opciones para que se elija de quién es la
 * solicitud y se reintente con ese solicitante. Cualquier otra respuesta se maneja como siempre.
 */

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { autorizacionService } from '@/services/autorizacionService'
import { titularesDeRevocacionAmbigua, type ITitularRevocacion } from '@/lib/revocacionTitulares'
import type { IRevocarInput } from '@/types/autorizacion'

export function useRevocarAutorizacion(expedienteId: string, alTerminar?: () => void) {
  const [revocando, setRevocando] = useState(false)
  /** No null = la API pidió elegir el solicitante; se guardan los datos ya escritos para reintentar. */
  const [eleccion, setEleccion] = useState<{ titulares: ITitularRevocacion[]; input: IRevocarInput } | null>(null)

  /** true = quedó registrada. */
  const revocar = useCallback(
    async (input: IRevocarInput): Promise<boolean> => {
      setRevocando(true)
      try {
        await autorizacionService.revocar(expedienteId, input)
        toast.success('Revocación registrada')
        setEleccion(null)
        alTerminar?.()
        return true
      } catch (err) {
        const titulares = input.solicitante_id ? null : titularesDeRevocacionAmbigua(err)
        if (titulares) {
          setEleccion({ titulares, input })
        } else {
          toast.error(err instanceof Error ? err.message : 'Error al revocar')
        }
        return false
      } finally {
        setRevocando(false)
      }
    },
    [expedienteId, alTerminar],
  )

  /** Reintenta con el solicitante elegido (los datos de la solicitud son los mismos). */
  const revocarDe = useCallback(
    async (solicitanteId: string): Promise<boolean> => {
      if (!eleccion) return false
      return revocar({ ...eleccion.input, solicitante_id: solicitanteId })
    },
    [eleccion, revocar],
  )

  const cancelarEleccion = useCallback(() => setEleccion(null), [])

  return { revocar, revocarDe, revocando, titularesAElegir: eleccion?.titulares ?? null, cancelarEleccion }
}
