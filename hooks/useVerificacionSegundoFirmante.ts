'use client'

/**
 * El segundo firmante válido que quedó «en verificación» (Auco no respondió la
 * consulta de listas a tiempo, o sus antecedentes piden revisión). El analista
 * lo da por verificado con una constancia, o le pide otra vez la consulta a
 * Auco. La API decide si aplica; aquí se envía, se informa y se espera la
 * recarga del detalle (también si falló: los botones reflejan el estado real).
 * El candado propio evita un segundo envío: cada reintento es una consulta que
 * Auco le cobra a Cofianza.
 */

import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ApiClientError } from '@/lib/api'
import { estudioService } from '@/services/estudioService'

const DURACION = 12000

/** Respuestas que solo informan (otro analista ya lo pidió o el resultado ya llegó): no son un error. */
const SOLO_INFORMAN = ['REINTENTO_EN_CURSO', 'ANTECEDENTES_YA_VERIFICADOS', 'EXPEDIENTE_ESTADO_CAMBIADO']

export function useVerificacionSegundoFirmante(
  estudioId: string,
  o: { seResuelveSolo: boolean; alTerminar?: () => Promise<unknown> | void },
) {
  const { seResuelveSolo, alTerminar } = o
  const [enviando, setEnviando] = useState<'resolver' | 'reintentar' | null>(null)
  /** El error del último intento, para dejarlo a la vista (el toast se va). */
  const [ultimoError, setUltimoError] = useState<string | null>(null)
  const enCurso = useRef(false)

  const enviar = useCallback(
    async (accion: 'resolver' | 'reintentar', nota?: string): Promise<boolean> => {
      if (enCurso.current) return false
      enCurso.current = true
      setEnviando(accion)
      setUltimoError(null)
      let ok = false
      try {
        if (accion === 'resolver') {
          const r = await estudioService.resolverVerificacionSegundo(estudioId, nota ?? '')
          if (r.resultado === 'aprobado') {
            toast.success('Verificación registrada: el estudio se decide con las dos personas.', { duration: DURACION })
          } else {
            toast.info('Verificación registrada: esta persona no es válida como segundo firmante.', { duration: DURACION })
          }
        } else {
          await estudioService.reintentarVerificacionSegundo(estudioId)
          toast.info(
            seResuelveSolo
              ? 'Se le pidió de nuevo la consulta a Auco. Si el resultado llega limpio, el estudio se decide solo.'
              : 'Se le pidió de nuevo la consulta a Auco. Cuando llegue el resultado, apruebe el estudio con «Aprobar estudio» y deje constancia.',
            { duration: DURACION },
          )
        }
        ok = true
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : 'No se pudo completar la acción. Inténtelo de nuevo.'
        if (err instanceof ApiClientError && !!err.code && SOLO_INFORMAN.includes(err.code)) {
          toast.info(mensaje, { duration: DURACION })
        } else {
          setUltimoError(mensaje)
          toast.error(mensaje, { duration: DURACION })
        }
      }
      try {
        await alTerminar?.()
      } finally {
        enCurso.current = false
        setEnviando(null)
      }
      return ok
    },
    [estudioId, alTerminar, seResuelveSolo],
  )

  const darPorVerificado = useCallback((nota: string) => enviar('resolver', nota), [enviar])
  const reintentar = useCallback(() => enviar('reintentar'), [enviar])

  return { darPorVerificado, reintentar, enviando, ultimoError }
}
