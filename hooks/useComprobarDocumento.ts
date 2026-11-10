'use client'

/**
 * Comprueba el número de documento que escribe el invitado en su enlace público. Si coincide, entrega el
 * correo para prellenar; si no, expone el mensaje de la API para mostrarlo junto al campo.
 */

import { useCallback, useState } from 'react'
import { coarrendatarioService } from '@/services/coarrendatarioService'
import { ApiClientError } from '@/lib/api'
import { mensajeParaProspecto } from '@/lib/errorMessages'

/** `alNoDisponible`: la API dejó de pedir la comprobación; quien llama recarga la invitación. */
export function useComprobarDocumento(token: string | undefined, alNoDisponible?: () => void) {
  const [comprobando, setComprobando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** El correo para prellenar ('' si no hay) cuando coincide; null si no se pudo comprobar. */
  const comprobar = useCallback(
    async (numero: string): Promise<string | null> => {
      if (!token) return null
      setComprobando(true)
      setError(null)
      try {
        const r = await coarrendatarioService.confirmarDocumento(token, numero.trim())
        return r.correo_resultado ?? ''
      } catch (err) {
        if (alNoDisponible && err instanceof ApiClientError && err.code === 'A5D_NO_VIGENTE') {
          alNoDisponible()
          return null
        }
        setError(mensajeParaProspecto(err, 'No se pudo comprobar su documento.'))
        return null
      } finally {
        setComprobando(false)
      }
    },
    [token, alNoDisponible],
  )

  const limpiarError = useCallback(() => setError(null), [])

  return { comprobar, comprobando, error, limpiarError }
}
