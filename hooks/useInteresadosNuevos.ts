'use client'

import { useEffect, useState } from 'react'
import { interesadosService } from '@/services/interesadosService'

/**
 * Conteo de interesados 'nuevo' (sin atender) para el badge de la pestaña
 * Interesados. Solo para inmobiliaria/propietario (pasa `enabled`); fetch una
 * vez al montar el shell. Fail-silent (un badge no debe romper la navegación).
 */
export function useInteresadosNuevos(enabled: boolean): number {
  const [nuevos, setNuevos] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let cancelado = false
    interesadosService
      .contarNuevos()
      .then((n) => {
        if (!cancelado) setNuevos(n)
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [enabled])

  return nuevos
}
