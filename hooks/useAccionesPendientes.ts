/**
 * Carga las citas del usuario y clasifica en 3 categorías accionables.
 * Una sola llamada a `listMisCitas({ limit: 50 })`, filtrado en memoria.
 * TODO: si el dataset supera 50 en producción, paginar por categoría.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { citaService } from '@/services/citaService'
import type { ICita } from '@/types/cita'

export interface AccionesPendientes {
  porConfirmar: ICita[]     // estado=solicitada
  porRealizar: ICita[]      // estado=confirmada y fecha_confirmada <= hoy
  porHabilitar: ICita[]     // estado=realizada && expediente.estudio_habilitado===false
  total: number
}

const EMPTY: AccionesPendientes = {
  porConfirmar: [],
  porRealizar: [],
  porHabilitar: [],
  total: 0,
}

export function useAccionesPendientes() {
  const [data, setData] = useState<AccionesPendientes>(EMPTY)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data: citas } = await citaService.listMisCitas({ limit: 50 })
      const today = new Date()
      today.setHours(23, 59, 59, 999) // "antes o igual a hoy"

      const porConfirmar = citas.filter((c) => c.estado === 'solicitada').slice(0, 5)
      const porRealizar = citas
        .filter((c) => {
          if (c.estado !== 'confirmada') return false
          const f = c.fecha_confirmada || c.fecha_propuesta
          if (!f) return false
          return new Date(f).getTime() <= today.getTime()
        })
        .slice(0, 5)
      const porHabilitar = citas
        .filter((c) => c.estado === 'realizada' && c.expediente?.estudio_habilitado === false)
        .slice(0, 5)

      setData({
        porConfirmar,
        porRealizar,
        porHabilitar,
        total: porConfirmar.length + porRealizar.length + porHabilitar.length,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar acciones pendientes'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, isLoading, error, refetch }
}
