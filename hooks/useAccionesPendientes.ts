/**
 * Carga las citas + expedientes accionables del usuario y los clasifica en
 * 4 categorías para el dashboard del propietario / inmobiliaria.
 *
 * Categorías:
 *   1. Citas por confirmar (estado=solicitada)
 *   2. Citas por realizar (confirmada y fecha <= hoy)
 *   3. Estudios por habilitar (cita realizada + estudio_habilitado=false)
 *   4. Contratos por generar (expediente aprobado/condicionado y sin contrato)
 *
 * Categoría 4 cubre el gap: tras estudio aprobado, el orchestrator deja el
 * expediente en 'aprobado' SIN contrato y espera que el propietario decida
 * duración + fecha desde AccionContratoPendienteCard. Antes de este hook,
 * ese paso no se exponía en el dashboard y el propietario quedaba "ciego".
 *
 * Categoría 4 se resuelve en UNA consulta (GET /contratos?expediente_ids=…)
 * en vez de 1 por expediente candidato.
 *
 * TODO: si el dataset supera 50 en producción, paginar por categoría.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { citaService } from '@/services/citaService'
import { contratoService } from '@/services/contratoService'
import { expedienteService } from '@/services/expedienteService'
import type { ICita } from '@/types/cita'
import type { IExpediente } from '@/types/expediente'

export interface AccionesPendientes {
  porConfirmar: ICita[]            // estado=solicitada
  porRealizar: ICita[]             // estado=confirmada y fecha_confirmada <= hoy
  porHabilitar: ICita[]            // estado=realizada && expediente.estudio_habilitado===false
  porGenerarContrato: IExpediente[] // estado=aprobado/condicionado sin contrato activo
  total: number
}

const EMPTY: AccionesPendientes = {
  porConfirmar: [],
  porRealizar: [],
  porHabilitar: [],
  porGenerarContrato: [],
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
      // Citas y expedientes-aprobados en paralelo. Errores aislados: si el
      // listado de expedientes falla por permisos, igual mostramos las 3
      // categorias de citas (degradacion suave).
      const [citasRes, expedientesRes] = await Promise.allSettled([
        citaService.listMisCitas({ limit: 50 }),
        expedienteService.getExpedientes({
          estado: ['aprobado', 'condicionado'],
          page: 1,
          limit: 20,
          sortBy: 'created_at',
          sortOrder: 'desc',
        }),
      ])

      const today = new Date()
      today.setHours(23, 59, 59, 999) // "antes o igual a hoy"

      // ── Categorias basadas en citas ──────────────────────
      let porConfirmar: ICita[] = []
      let porRealizar: ICita[] = []
      let porHabilitar: ICita[] = []
      if (citasRes.status === 'fulfilled') {
        const citas = citasRes.value.data
        porConfirmar = citas.filter((c) => c.estado === 'solicitada').slice(0, 5)
        porRealizar = citas
          .filter((c) => {
            if (c.estado !== 'confirmada') return false
            const f = c.fecha_confirmada || c.fecha_propuesta
            if (!f) return false
            return new Date(f).getTime() <= today.getTime()
          })
          .slice(0, 5)
        porHabilitar = citas
          .filter((c) => c.estado === 'realizada' && c.expediente?.estudio_habilitado === false)
          .slice(0, 5)
      }

      // ── Categoria contratos por generar ──────────────────
      // Una sola consulta con los ids candidatos; entran los que NO tienen
      // contrato activo. Limitamos a 5 visibles (igual que las otras).
      let porGenerarContrato: IExpediente[] = []
      if (expedientesRes.status === 'fulfilled' && expedientesRes.value.data.length > 0) {
        const candidatos = expedientesRes.value.data
        try {
          const { data: contratos } = await contratoService.getAllContratos({
            expediente_ids: candidatos.map((e) => e.id).join(','),
            limit: 100,
          })
          const conContrato = new Set(
            contratos.filter((c) => c.estado !== 'cancelado').map((c) => c.expediente_id),
          )
          porGenerarContrato = candidatos.filter((e) => !conContrato.has(e.id)).slice(0, 5)
        } catch {
          // Si falla la consulta de contratos, omitimos la categoria (mejor
          // que romper todo el widget).
        }
      }

      setData({
        porConfirmar,
        porRealizar,
        porHabilitar,
        porGenerarContrato,
        total:
          porConfirmar.length +
          porRealizar.length +
          porHabilitar.length +
          porGenerarContrato.length,
      })

      // Si AMBAS llamadas fallaron, exponemos error visible. Si solo falla
      // una, mostramos la otra y silenciamos (degradacion suave).
      if (citasRes.status === 'rejected' && expedientesRes.status === 'rejected') {
        const reason = citasRes.reason instanceof Error ? citasRes.reason.message : 'Error al cargar acciones pendientes'
        setError(reason)
      }
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
