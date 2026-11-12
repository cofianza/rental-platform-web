'use client'

/**
 * Adenda 5 §19: el analista reintenta la consulta a TransUnion por el saldo en
 * mora que no respondió. La API decide si aplica, hace UNA consulta (la paga
 * Cofianza) y redacta el mensaje; aquí solo se envía, se informa y se espera la
 * recarga del detalle (también si falló: el botón debe reflejar el estado real)
 * antes de volver a habilitar el botón. Cada envío es una consulta real: el
 * candado propio evita un segundo envío aunque se llame sin el diálogo.
 */

import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { estudioService } from '@/services/estudioService'

/** Mensajes largos y con lo que hay que hacer: más tiempo en pantalla. */
const DURACION = 12000

export function useReintentoSaldoTransUnion(estudioId: string, alTerminar?: () => Promise<unknown> | void) {
  const [reintentando, setReintentando] = useState(false)
  /** El error del último intento, para dejarlo a la vista (el toast se va). */
  const [ultimoError, setUltimoError] = useState<string | null>(null)
  const enCurso = useRef(false)

  /** false = no se pudo (el error ya se mostró). */
  const reintentar = useCallback(async (): Promise<boolean> => {
    if (enCurso.current) return false
    enCurso.current = true
    setReintentando(true)
    setUltimoError(null)
    let ok = false
    try {
      const r = await estudioService.reintentarSaldoTransUnion(estudioId)
      if (r.resultado === 'no_respondio') toast.warning(r.mensaje, { duration: DURACION })
      // Verde solo si TransUnion completó algún saldo; lo demás es información.
      else if (r.resultado === 'obtenida' && r.completadas > 0) toast.success(r.mensaje, { duration: DURACION })
      else toast.info(r.mensaje, { duration: DURACION })
      ok = true
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo reintentar la consulta. Inténtelo de nuevo.'
      setUltimoError(mensaje)
      toast.error(mensaje, { duration: DURACION })
    }
    try {
      await alTerminar?.()
    } finally {
      enCurso.current = false
      setReintentando(false)
    }
    return ok
  }, [estudioId, alTerminar])

  return { reintentar, reintentando, ultimoError }
}
