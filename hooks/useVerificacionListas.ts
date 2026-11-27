'use client'

/**
 * Adenda 6 §4: el analista verificó las listas restrictivas de una persona directamente en Auco y registra la fecha,
 * el resultado y la evidencia. La API decide si aplica; aquí se envía, se informa y se espera la recarga del detalle
 * (también si falló: la tarjeta refleja lo que diga la API). El candado evita un segundo envío.
 */

import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ApiClientError } from '@/lib/api'
import { estudioService } from '@/services/estudioService'
import type { ResultadoVerificacionListas } from '@/types/estudio'

const DURACION = 12000
/** Respuestas que solo informan (las listas llegaron de Auco entretanto, o ya estaban registradas): no son un error. */
const SOLO_INFORMAN = ['EXPEDIENTE_ESTADO_CAMBIADO', 'LISTAS_NO_REGISTRABLES']

export function useVerificacionListas(estudioId: string, alTerminar?: () => Promise<unknown> | void) {
  const [enviando, setEnviando] = useState(false)
  const [ultimoError, setUltimoError] = useState<string | null>(null)
  const enCurso = useRef(false)

  const registrar = useCallback(
    async (datos: { fecha_consulta: string; resultado: ResultadoVerificacionListas; nota?: string; otros_hallazgos?: boolean; evidencia: File }): Promise<boolean> => {
      if (enCurso.current) return false
      enCurso.current = true
      setEnviando(true)
      setUltimoError(null)
      let ok = false
      try {
        const r = await estudioService.registrarVerificacionListas(estudioId, datos)
        if (r.resultado === 'sin_coincidencias') {
          toast.success(
            r.expediente_estado === 'condicionado'
              ? 'Verificación de listas registrada: sin coincidencias. Si el estudio sigue en revisión de Cofianza, apruébelo.'
              : 'Verificación de listas registrada: sin coincidencias. El estudio sigue su curso.',
            { duration: DURACION },
          )
        } else if (r.listas === 'confirmada') {
          toast.info(
            r.expediente_estado === 'rechazado'
              ? 'Verificación de listas registrada: con coincidencias. Quedó confirmada y el estudio, no aprobado.'
              : 'Verificación de listas registrada: con coincidencias. Quedó confirmada y la operación, bloqueada por listas.',
            { duration: DURACION },
          )
        } else if (r.listas === 'por_confirmar') {
          toast.info('Verificación de listas registrada: con coincidencias. Confirme la coincidencia en este mismo detalle.', { duration: DURACION })
        } else {
          toast.info('Verificación de listas registrada: con coincidencias. Revise el estado del estudio.', { duration: DURACION })
        }
        ok = true
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : 'No se pudo registrar la verificación. Inténtelo de nuevo.'
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
        setEnviando(false)
      }
      return ok
    },
    [estudioId, alTerminar],
  )

  return { registrar, enviando, ultimoError }
}
