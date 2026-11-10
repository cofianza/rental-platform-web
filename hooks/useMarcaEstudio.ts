'use client'

/**
 * Marca que Cofianza registra o retira sobre una persona del estudio. La API
 * decide quién puede hacerlo y vuelve a decidir el estudio; aquí solo se envía
 * y se informa el resultado.
 */

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { estudioService } from '@/services/estudioService'

export interface DatosMarca {
  persona: 'solicitante' | 'coarrendatario'
  soporte: string
  motivo: string
}

export function useMarcaEstudio(estudioId: string, alTerminar?: () => void) {
  const [guardando, setGuardando] = useState(false)

  /** false = falló: quien llama conserva lo escrito para reintentar. */
  const enviar = useCallback(
    async (accion: () => Promise<{ desenlace_texto?: string }>, hecho: string): Promise<boolean> => {
      setGuardando(true)
      try {
        await accion()
        toast.success(hecho)
        alTerminar?.()
        return true
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo guardar. Inténtelo de nuevo.')
        return false
      } finally {
        setGuardando(false)
      }
    },
    [alTerminar],
  )

  const marcar = useCallback(
    (datos: DatosMarca) => enviar(() => estudioService.marcarRestitucion(estudioId, datos), 'Marca registrada.'),
    [enviar, estudioId],
  )
  const retirar = useCallback(
    (motivo: string) => enviar(() => estudioService.retirarMarcaRestitucion(estudioId, motivo), 'Marca retirada.'),
    [enviar, estudioId],
  )

  return { marcar, retirar, guardando }
}
