/**
 * Adenda 5 (solo Cofianza): la escalera de mora vigente del titular y el estado
 * del paz y salvo, para la decisión de la revisión manual. Con `habilitado` en
 * false no se pide nada (otros roles reciben 403). `version` vuelve a leer
 * después de exigir o acreditar el paz y salvo.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { expedienteService } from '@/services/expedienteService'
import type { IMoraVigente } from '@/types/estudio'

interface Lectura {
  clave: string
  dato: IMoraVigente | null
  error: boolean
}

export function useMoraVigente(expedienteId: string, habilitado: boolean, version = 0) {
  const [intento, setIntento] = useState(0)
  // La lectura recuerda para qué petición es: «cargando» = la última no ha llegado.
  const clave = `${expedienteId}:${version}:${intento}`
  const [lectura, setLectura] = useState<Lectura | null>(null)

  useEffect(() => {
    if (!habilitado) return
    let vivo = true
    expedienteService.moraVigente(expedienteId).then(
      (r) => {
        if (vivo) setLectura({ clave, dato: r ?? null, error: false })
      },
      () => {
        // Un error conserva lo último que se leyó: el analista no pierde la lista por un 429.
        if (vivo) setLectura((prev) => ({ clave, dato: prev?.dato ?? null, error: true }))
      },
    )
    return () => {
      vivo = false
    }
  }, [expedienteId, habilitado, clave])

  const reintentar = useCallback(() => setIntento((n) => n + 1), [])
  return {
    moraVigente: habilitado ? (lectura?.dato ?? null) : null,
    cargando: habilitado && lectura?.clave !== clave,
    error: habilitado && lectura?.clave === clave && lectura.error,
    reintentar,
  }
}
