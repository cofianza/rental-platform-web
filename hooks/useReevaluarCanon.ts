'use client'

/**
 * Pide a la API evaluar de nuevo un estudio con el canon actual de su
 * inmueble. La API decide si procede, si tiene costo y cómo queda el estudio;
 * aquí solo se envía la solicitud y se informa lo que responde.
 */

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { estudioService } from '@/services/estudioService'
import { ApiClientError } from '@/lib/api'

/** Respuestas de la API que ya son definitivas: reintentar lo mismo no cambia nada. */
const SIN_REINTENTO = ['CANON_NO_HABILITADO', 'REQUIERE_CONSULTA_ADICIONAL', 'CANON_REQUIERE_REEVALUACION', 'ESTUDIO_NO_PORTABLE', 'ESTUDIO_NO_REASIGNABLE']

export function useReevaluarCanon(alTerminar?: () => void) {
  const [evaluando, setEvaluando] = useState(false)

  /** null = quedó evaluado; si no, el mensaje de la API para mostrar y si tiene sentido reintentar. */
  const reevaluar = useCallback(
    async (estudioId: string, inmuebleId: string): Promise<{ mensaje: string; reintentar: boolean } | null> => {
      setEvaluando(true)
      try {
        const res = await estudioService.reasignar(estudioId, inmuebleId)
        toast.success(
          res.desenlace_texto
            ? `El estudio se evaluó de nuevo con el canon del inmueble, sin costo. Resultado: ${res.desenlace_texto}.`
            : 'El estudio se evaluó de nuevo con el canon del inmueble, sin costo.',
        )
        // El certificado emitido lleva impreso el canon: si no se pudo regenerar, hay que saberlo antes de entregarlo.
        if (res.certificado === 'desactualizado') {
          toast.warning('El certificado emitido quedó con el canon anterior. Regenérelo desde el estudio antes de entregarlo.', { duration: 10000 })
        } else if (res.certificado === 'regenerado') {
          toast.info('El certificado se regeneró con el canon nuevo, conservando su código y su vencimiento.')
        }
        alTerminar?.()
        return null
      } catch (err) {
        return {
          mensaje: err instanceof Error ? err.message : 'No se pudo evaluar de nuevo el estudio. Inténtelo de nuevo.',
          reintentar: !(err instanceof ApiClientError && SIN_REINTENTO.includes(err.code ?? '')),
        }
      } finally {
        setEvaluando(false)
      }
    },
    [alTerminar],
  )

  return { reevaluar, evaluando }
}
