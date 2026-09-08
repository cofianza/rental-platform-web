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
 * Se resuelve en 2 consultas (no 1 por expediente): se piden los aprobados y
 * luego, con sus ids, los contratos de todos ellos de una sola vez.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { contratoService } from '@/services/contratoService'
import { expedienteService } from '@/services/expedienteService'
import type { IExpediente } from '@/types/expediente'

export function useAprobadosSinContrato() {
  const [expedientes, setExpedientes] = useState<IExpediente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data: candidatos } = await expedienteService.getExpedientes({
        estado: ['aprobado'],
        page: 1,
        limit: 50,
        sortBy: 'created_at',
        sortOrder: 'desc',
      })

      if (candidatos.length === 0) {
        setExpedientes([])
        return
      }

      const { data: contratos } = await contratoService.getAllContratos({
        expediente_ids: candidatos.map((e) => e.id).join(','),
        limit: 100,
      })
      // Un contrato cancelado NO cuenta: ese estudio vuelve a necesitar contrato.
      const conContrato = new Set(
        contratos.filter((c) => c.estado !== 'cancelado').map((c) => c.expediente_id),
      )
      setExpedientes(candidatos.filter((e) => !conContrato.has(e.id)))
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
