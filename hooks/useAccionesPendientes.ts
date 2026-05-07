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
      // Para cada expediente aprobado/condicionado, verificar si ya existe un
      // contrato activo. Solo entran a la lista los que NO tienen contrato.
      // Limitamos a 5 visibles (igual que las otras categorias).
      let porGenerarContrato: IExpediente[] = []
      if (expedientesRes.status === 'fulfilled') {
        const candidatos = expedientesRes.value.data
        const checks = await Promise.all(
          candidatos.map(async (exp) => {
            try {
              const contratos = await contratoService.getContratosForExpediente(exp.id, {
                page: 1,
                limit: 5,
              })
              const activos = (contratos.data || []).filter((c) => c.estado !== 'cancelado')
              return activos.length === 0 ? exp : null
            } catch {
              // Si falla la consulta de contratos para un expediente puntual,
              // lo omitimos del listado (mejor que romper toda la categoria).
              return null
            }
          }),
        )
        porGenerarContrato = checks.filter((e): e is IExpediente => e !== null).slice(0, 5)
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
