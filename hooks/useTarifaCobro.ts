/**
 * Cuentas de cobro de la tarifa mensual: carga con estado de carga y error.
 * Estado local (no store): la lista no se comparte fuera de su pestaña.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { tarifaCobroService } from '@/services/tarifaCobroService'
import type { ICuentaCobro, ICuentaCobroDetalle } from '@/types/tarifaCobro'

function useCarga<T>(cargar: (() => Promise<T>) | null) {
  const [data, setData] = useState<T | null>(null)
  const [cargando, setCargando] = useState(!!cargar)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    if (!cargar) return
    setCargando(true)
    try {
      setData(await cargar())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar las cuentas de cobro')
    } finally {
      setCargando(false)
    }
  }, [cargar])

  useEffect(() => {
    recargar()
  }, [recargar])

  return { data, cargando, error, recargar }
}

/** `periodo` AAAA-MM-01, o vacío para todos los meses. */
export function useCuentasCobro(periodo: string) {
  const cargar = useCallback(() => tarifaCobroService.listarCuentas({ periodo: periodo || undefined }), [periodo])
  const { data, ...resto } = useCarga<ICuentaCobro[]>(cargar)
  return { cuentas: data ?? [], ...resto }
}

export function useCuentaCobro(id: string | null) {
  const cargar = useCallback(() => tarifaCobroService.obtenerCuenta(id!), [id])
  const { data, ...resto } = useCarga<ICuentaCobroDetalle>(id ? cargar : null)
  return { cuenta: id ? data : null, ...resto }
}
