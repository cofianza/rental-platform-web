/**
 * useClausulasAdmin — /admin/clausulas-adicionales (Entrega 4). Una instancia por
 * pestaña: `origen: 'biblioteca'` (biblioteca de Cofianza) o `'propia'` (registro
 * de las cláusulas de las inmobiliarias). Paginado de 50 con "Cargar más".
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ApiClientError } from '@/lib/api'
import {
  clausulasService,
  type CambioEstado,
  type ClausulaEntrada,
  type EstadoRegistro,
  type PaginaRegistro,
} from '@/services/clausulasService'
import { guardarClausula } from '@/hooks/useClausulasAdicionales'
import type { OrigenClausula, UsoClausula } from '@/types/contratoV3'

/** Usos por cláusula, cargados al expandir la fila. */
export type EstadoUsos = UsoClausula[] | 'cargando' | 'error'

export function useClausulasAdmin(filtros: { origen: OrigenClausula; estado?: EstadoRegistro; q?: string }) {
  const { origen, estado, q = '' } = filtros
  const [pagina, setPagina] = useState<(PaginaRegistro & { page: number }) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [usos, setUsos] = useState<Record<string, EstadoUsos>>({})
  // Solo pinta la respuesta de la última petición (filtros que cambian mientras se escribe).
  const ultima = useRef(0)
  const pintado = useRef(false)

  const cargar = useCallback(
    async (page: number) => {
      const n = ++ultima.current
      setError(null)
      try {
        const r = await clausulasService.registro({ origen, estado, q, page })
        if (n !== ultima.current) return
        setPagina((prev) =>
          page === 1 || !prev ? { ...r, page } : { items: [...prev.items, ...r.items], total: r.total, page },
        )
        pintado.current = true
      } catch (err) {
        if (n !== ultima.current) return
        const msg = err instanceof Error ? err.message : 'No pudimos cargar las cláusulas.'
        if (pintado.current) toast.error(msg)
        else setError(msg)
      }
    },
    [origen, estado, q],
  )

  // Espera a que se deje de escribir en la búsqueda.
  useEffect(() => {
    const t = setTimeout(() => void cargar(1), 250)
    return () => clearTimeout(t)
  }, [cargar])

  const recargar = useCallback(() => cargar(1), [cargar])

  const cargarMas = useCallback(async () => {
    if (!pagina || cargandoMas || pagina.items.length >= pagina.total) return
    setCargandoMas(true)
    try {
      await cargar(pagina.page + 1)
    } finally {
      setCargandoMas(false)
    }
  }, [pagina, cargandoMas, cargar])

  /** Biblioteca: sin `editando` crea; con `editando` edita esa versión. Mismo contrato que en el paso 4. */
  const guardar = useCallback(
    async (c: ClausulaEntrada, editando?: { id: string; version: number }) => {
      const r = await guardarClausula(
        () =>
          editando
            ? clausulasService.editarBiblioteca(editando.id, { ...c, version: editando.version })
            : clausulasService.crearBiblioteca(c),
        () => void recargar(),
      )
      if (r.ok) void recargar()
      return r
    },
    [recargar],
  )

  /** Inhabilitar (motivo obligatorio) o reactivar. true si el API aceptó. */
  const cambiarEstado = useCallback(
    async (id: string, cambio: CambioEstado) => {
      try {
        await clausulasService.cambiarEstado(id, cambio)
        const motivo = cambio.estado === 'inhabilitada' ? cambio.motivo : null
        setPagina(
          (prev) =>
            prev && {
              ...prev,
              items: prev.items.map((i) => (i.id === id ? { ...i, estado: cambio.estado, inhabilitadaMotivo: motivo } : i)),
            },
        )
        toast.success(cambio.estado === 'activa' ? 'Cláusula reactivada.' : 'Cláusula inhabilitada.')
        return true
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo cambiar el estado de la cláusula.')
        if (err instanceof ApiClientError && [404, 409].includes(err.statusCode)) void recargar()
        return false
      }
    },
    [recargar],
  )

  /** Llamar al expandir la fila si `usos[id]` es undefined o 'error'. */
  const cargarUsos = useCallback(async (id: string) => {
    setUsos((u) => ({ ...u, [id]: 'cargando' }))
    try {
      const r = await clausulasService.usos(id)
      setUsos((u) => ({ ...u, [id]: r }))
    } catch {
      setUsos((u) => ({ ...u, [id]: 'error' }))
    }
  }, [])

  return {
    items: pagina?.items ?? [],
    total: pagina?.total ?? 0,
    hayMas: !!pagina && pagina.items.length < pagina.total,
    isLoading: pagina === null && error === null,
    error,
    cargandoMas,
    recargar,
    cargarMas,
    guardar,
    cambiarEstado,
    usos,
    cargarUsos,
  }
}
