/**
 * useAprobadosSinContrato — estudios APROBADOS que todavía no tienen contrato.
 *
 * PORQUÉ: la pestaña Contratos solo sabía de contratos ya generados, así que un
 * estudio aprobado al que le falta el contrato no aparecía en ninguna parte: el
 * gestor tenía que ir a Estudios, filtrar por aprobados y abrirlos uno por uno.
 * El único sitio que lo calculaba era el widget del dashboard, y allí va capado
 * a 5. Este hook extrae ese cálculo SIN recorte para que la vista de Contratos
 * pueda listarlos completos.
 *
 * El cálculo vive en cargarAprobadosSinContrato (también lo usa el widget).
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { contratoService } from '@/services/contratoService'
import { expedienteService } from '@/services/expedienteService'
import type { IExpediente } from '@/types/expediente'

/**
 * Aprobados sin contrato activo (un contrato cancelado no cuenta). ÚNICA fuente
 * de este cálculo (H23): la usan esta vista y el widget de acciones pendientes.
 * Si el API marca `tiene_contrato_vivo` basta una consulta; si no, se piden los
 * contratos de todos los candidatos de una vez.
 */
export async function cargarAprobadosSinContrato(limit: number): Promise<IExpediente[]> {
  const { data: candidatos } = await expedienteService.getExpedientes({
    estado: ['aprobado'],
    page: 1,
    limit,
    sortBy: 'created_at',
    sortOrder: 'desc',
    con_contrato_vivo: true,
  })
  if (candidatos.length === 0) return []
  if (candidatos[0].tiene_contrato_vivo !== undefined) return candidatos.filter((e) => !e.tiene_contrato_vivo)

  const { data: contratos } = await contratoService.getAllContratos({
    expediente_ids: candidatos.map((e) => e.id).join(','),
    limit: 100,
  })
  const conContrato = new Set(contratos.filter((c) => c.estado !== 'cancelado').map((c) => c.expediente_id))
  return candidatos.filter((e) => !conContrato.has(e.id))
}

export function useAprobadosSinContrato() {
  const [expedientes, setExpedientes] = useState<IExpediente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setExpedientes(await cargarAprobadosSinContrato(50))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los estudios aprobados')
      setExpedientes([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { expedientes, isLoading, error, refetch }
}
