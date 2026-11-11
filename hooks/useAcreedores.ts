'use client'

/**
 * Lista de acreedores (Adenda 5 §3): carga con filtros y
 * clasificación. Solo Cofianza; el API decide quién puede escribir.
 */
import { useCallback, useEffect, useState } from 'react'
import { acreedoresService } from '@/services/acreedoresService'
import { useUltimaPeticion } from '@/hooks/useUltimaPeticion'
import type { IAcreedor, IAcreedoresFiltros, IClasificarAcreedor, ICrearAcreedor } from '@/types/acreedor'

export function useAcreedores(filtros: IAcreedoresFiltros, habilitado = true) {
  const [acreedores, setAcreedores] = useState<IAcreedor[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(habilitado)
  // Un fallo de carga no es «lista vacía»: la pantalla lo dice y ofrece reintentar.
  const [error, setError] = useState(false)
  const iniciar = useUltimaPeticion()
  const { estado, central, q, page, limit } = filtros

  const cargar = useCallback(async () => {
    if (!habilitado) return
    const vigente = iniciar()
    setCargando(true)
    try {
      const r = await acreedoresService.listar({ estado, central, q, page, limit })
      if (!vigente()) return
      setAcreedores(r.data)
      setTotal(r.total)
      setError(false)
    } catch {
      if (vigente()) setError(true)
    } finally {
      if (vigente()) setCargando(false)
    }
  }, [habilitado, iniciar, estado, central, q, page, limit])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const clasificar = useCallback(
    async (id: string, body: IClasificarAcreedor) => {
      const fila = await acreedoresService.clasificar(id, body)
      await cargar()
      return fila
    },
    [cargar],
  )

  const crear = useCallback(
    async (body: ICrearAcreedor) => {
      const fila = await acreedoresService.crear(body)
      await cargar()
      return fila
    },
    [cargar],
  )

  return { acreedores, total, cargando, error, recargar: cargar, clasificar, crear }
}
