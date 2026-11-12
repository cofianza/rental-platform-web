'use client'

/**
 * Adenda 5 §19: el analista reintenta la consulta a TransUnion por el saldo en
 * mora que no respondió. La API decide si aplica, hace UNA consulta (la paga
 * Cofianza) y redacta el mensaje; aquí solo se envía, se informa y se pide
 * recargar el detalle (también si falló: el botón debe reflejar el estado real).
 */

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { estudioService } from '@/services/estudioService'

export function useReintentoSaldoTransUnion(estudioId: string, alTerminar?: () => void) {
  const [reintentando, setReintentando] = useState(false)

  /** false = no se pudo (el error ya se mostró). */
  const reintentar = useCallback(async (): Promise<boolean> => {
    setReintentando(true)
    try {
      const r = await estudioService.reintentarSaldoTransUnion(estudioId)
      // Mensaje largo y con lo que hay que hacer: más tiempo en pantalla.
      if (r.resultado === 'no_respondio') toast.warning(r.mensaje, { duration: 12000 })
      else toast.success(r.mensaje, { duration: 12000 })
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo reintentar la consulta. Inténtelo de nuevo.')
      return false
    } finally {
      setReintentando(false)
      alTerminar?.()
    }
  }, [estudioId, alTerminar])

  return { reintentar, reintentando }
}
