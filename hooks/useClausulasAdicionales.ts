/**
 * useClausulasAdicionales — catálogo de la inmobiliaria para el paso 4 del
 * asistente V3: biblioteca de Cofianza + sus cláusulas propias (Entrega 4).
 *
 * PORQUÉ sin store: solo lo usa el paso 4 y el servidor es el dueño; guardar y
 * eliminar actualizan la copia local para que la lista del paso 4 encuentre la
 * cláusula recién guardada sin esperar otra carga.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ApiClientError } from '@/lib/api'
import {
  clausulasService,
  hallazgosDe,
  type ClausulaEntrada,
  type ClausulaGuardada,
} from '@/services/clausulasService'
import type { CatalogoClausulas, ClausulaCatalogo, Hallazgo } from '@/types/contratoV3'

export type ResultadoGuardado =
  | { ok: true; clausula: ClausulaCatalogo; avisos: Hallazgo[] }
  | { ok: false; mensaje: string; hallazgos: Hallazgo[]; avisos: Hallazgo[]; revisionNoDisponible: boolean }

/**
 * Guarda una cláusula (inmobiliaria o biblioteca) y traduce la respuesta para EditorClausula.
 * Los toasts los pone esta función; el editor solo pinta en línea:
 * - 422 con hallazgos → `hallazgos` y `avisos` (ListaHallazgos), sin toast;
 * - 503 → `revisionNoDisponible` (el texto sigue en el editor), sin toast;
 * - 404/409 (cambió, fue inhabilitada o ya no existe) → toast y `alCambiar()` para recargar;
 * - cualquier otro error → toast.
 * Éxito: toast.success, o toast.warning si trae avisos (no bloquean).
 */
export async function guardarClausula(
  llamada: () => Promise<ClausulaGuardada>,
  alCambiar: () => void,
): Promise<ResultadoGuardado> {
  try {
    const { avisos = [], ...clausula } = await llamada()
    if (avisos.length) toast.warning(`Cláusula guardada. Revisa: ${avisos.map((a) => a.mensaje).join(' ')}`)
    else toast.success('Cláusula guardada.')
    return { ok: true, clausula, avisos }
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'No se pudo guardar la cláusula.'
    const status = err instanceof ApiClientError ? err.statusCode : 0
    const { hallazgos, avisos } = hallazgosDe(err)
    const fallo = { ok: false as const, mensaje, hallazgos, avisos, revisionNoDisponible: status === 503 }
    if ((status === 422 && hallazgos.length) || status === 503) return fallo
    toast.error(mensaje)
    if (status === 404 || status === 409) alCambiar()
    return fallo
  }
}

const porTitulo = (a: ClausulaCatalogo, b: ClausulaCatalogo) => a.titulo.localeCompare(b.titulo, 'es')

/** `habilitado` = el usuario es RBAC inmobiliaria (a los demás roles el API les responde 403). */
export function useClausulasAdicionales(habilitado = true) {
  const [catalogo, setCatalogo] = useState<CatalogoClausulas | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Ya pintado: si un refresco posterior falla, toast en vez de cambiar la lista por el error.
  const pintado = useRef(false)

  const recargar = useCallback(async () => {
    if (!habilitado) return
    setError(null)
    try {
      setCatalogo(await clausulasService.catalogo())
      pintado.current = true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No pudimos cargar las cláusulas.'
      if (pintado.current) toast.error(msg)
      else setError(msg)
    }
  }, [habilitado])

  useEffect(() => {
    recargar()
  }, [recargar])

  /** Sin `editando` crea; con `editando` edita esa versión (CAS: 409 si ya cambió). */
  const guardar = useCallback(
    async (c: ClausulaEntrada, editando?: { id: string; version: number }) => {
      const r = await guardarClausula(
        () => (editando ? clausulasService.editar(editando.id, { ...c, version: editando.version }) : clausulasService.crear(c)),
        () => void recargar(),
      )
      if (r.ok) {
        const nueva = r.clausula
        setCatalogo((prev) =>
          prev && { ...prev, propias: [...prev.propias.filter((x) => x.id !== nueva.id), nueva].sort(porTitulo) },
        )
      }
      return r
    },
    [recargar],
  )

  /** Borrado lógico. true si el API aceptó. */
  const eliminar = useCallback(
    async (id: string) => {
      try {
        await clausulasService.eliminar(id)
        setCatalogo((prev) => prev && { ...prev, propias: prev.propias.filter((x) => x.id !== id) })
        toast.success('Cláusula eliminada.')
        return true
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la cláusula.')
        if (err instanceof ApiClientError && err.statusCode === 404) void recargar()
        return false
      }
    },
    [recargar],
  )

  return {
    catalogo,
    isLoading: habilitado && catalogo === null && error === null,
    error,
    recargar,
    guardar,
    eliminar,
  }
}
