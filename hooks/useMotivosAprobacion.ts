/**
 * Motivos de aprobación que este estudio no admite y por qué. Con `habilitado`
 * atado a la apertura del formulario, cada apertura lee el estado actual.
 * Adenda 5 §7: trae también R10 (rechazar por la mora del tramo de revisión),
 * que la API rechaza con 400 fuera de ese tramo.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { expedienteService } from '@/services/expedienteService'

export function useMotivosAprobacion(expedienteId: string | undefined, habilitado: boolean) {
  const [noAplican, setNoAplican] = useState<Record<string, string>>({})
  const [error, setError] = useState(false)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (!expedienteId || !habilitado) return
    let vivo = true
    expedienteService
      .getMotivosAprobacion(expedienteId)
      .then((r) => {
        if (!vivo) return
        setNoAplican(r)
        setError(false)
      })
      .catch(() => {
        if (vivo) setError(true)
      })
    return () => {
      vivo = false
    }
  }, [expedienteId, habilitado, intento])

  const reintentar = useCallback(() => setIntento((n) => n + 1), [])
  return { noAplican, error, reintentar }
}
