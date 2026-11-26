'use client'

/**
 * Las cifras de la Oficina Virtual (oficinaVirtualService). Mientras cargan, `isLoading` (la pantalla pinta el
 * esqueleto, nunca un 0). Al recargar se conservan las cifras anteriores. `disponible: false` = la API todavía no
 * tiene el endpoint (la pantalla vuelve a lo de antes); undefined = todavía no se sabe.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { oficinaVirtualService } from '@/services/oficinaVirtualService'
import type { IConteosOficina, SeccionOficina } from '@/types/oficinaVirtual'

export function useConteosOficina(
  secciones: readonly SeccionOficina[],
  /** Volver a contar al regresar a la pestaña del navegador (un estudio movido en otra pestaña). */
  { alVolver = false }: { alVolver?: boolean } = {},
) {
  const clave = [...secciones].sort().join(',')
  const [data, setData] = useState<IConteosOficina | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [disponible, setDisponible] = useState<boolean | undefined>(undefined)
  const ultima = useRef(0)

  const refetch = useCallback(async () => {
    const n = ++ultima.current
    setIsLoading(true)
    try {
      const r = await oficinaVirtualService.getConteos(clave.split(',') as SeccionOficina[])
      if (n !== ultima.current) return
      setDisponible(r !== null)
      if (r) setData(r)
      setError(null)
    } catch (err) {
      if (n !== ultima.current) return
      // Una lectura anterior que sí llegó se conserva.
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las cifras')
    } finally {
      if (n === ultima.current) setIsLoading(false)
    }
  }, [clave])

  useEffect(() => {
    void refetch()
    if (!alVolver) return
    const volver = () => {
      if (document.visibilityState === 'visible') void refetch()
    }
    document.addEventListener('visibilitychange', volver)
    return () => document.removeEventListener('visibilitychange', volver)
  }, [refetch, alVolver])

  return { data, isLoading, error, disponible, refetch }
}
