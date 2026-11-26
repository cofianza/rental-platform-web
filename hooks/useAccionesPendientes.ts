/**
 * Carga las citas + expedientes accionables del usuario y los clasifica en
 * 4 categorías para el dashboard del propietario / inmobiliaria.
 *
 * Categorías:
 *   1. Citas por confirmar (estado=solicitada)
 *   2. Citas por realizar (confirmada y fecha <= hoy)
 *   3. Estudios por habilitar (cita realizada + estudio_habilitado=false)
 *   4. Contratos por generar (expediente aprobado/condicionado y sin contrato)
 *   5. Aprobados con algo por resolver antes del contrato (traba_contrato: canon o segundo firmante sin
 *      terminar). No cuentan como «por generar»; el vencido no va en ninguna: ya no es una acción.
 *
 * Categoría 4 cubre el gap: tras estudio aprobado, el orchestrator deja el
 * expediente en 'aprobado' SIN contrato y espera que el propietario decida
 * duración + fecha desde AccionContratoPendienteCard. Antes de este hook,
 * ese paso no se exponía en el dashboard y el propietario quedaba "ciego".
 *
 * Categoría 4 la calcula cargarAprobadosSinContrato (useAprobadosSinContrato),
 * la misma función que la vista de Contratos: un solo criterio (H23).
 *
 * Además, el total de «Requieren mi acción» de la lista (mismo criterio del
 * API): sin él el inicio decía «Todo al día» con estudios esperando al gestor
 * (consulta fallida, enlace vencido, condicionado…).
 *
 * Reporte de la Oficina Virtual (25-nov), puntos 1 y 11: cada grupo muestra hasta 5 filas, pero su número es el TOTAL
 * de la API (GET /oficina-virtual/conteos, sección «acciones»: los mismos criterios de cada lista, sin recortes). Antes
 * el inicio contaba las 5 filas que mostraba y Contratos el total. Con una API anterior, el número de filas, como antes.
 *
 * Puntos 10 y 11 (segunda parte): el Inicio de la inmobiliaria (TareasInicio) lee además la sección completa
 * (`acciones`, con «Requieren su acción» sin los de los otros grupos), de dónde salen los totales (`fuente`: si la
 * sección falló, el Inicio muestra «Reintentar», nunca un «Todo al día» falso) y todos los aprobados con traba
 * leídos (para desplegar cada grupo: canon, segundo firmante, verificación). Una evaluación por habilitar sale una
 * vez por estudio aunque tenga dos visitas realizadas.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { citaService } from '@/services/citaService'
import { cargarAprobadosSinContrato, tieneTrabaContrato } from '@/hooks/useAprobadosSinContrato'
import { expedienteService } from '@/services/expedienteService'
import { oficinaVirtualService } from '@/services/oficinaVirtualService'
import type { ICita } from '@/types/cita'
import type { IExpediente } from '@/types/expediente'
import type { IAccionesOficina } from '@/types/oficinaVirtual'
import { totalesDeAcciones, type TotalesAcciones } from '@/lib/conteosOficina'


export interface AccionesPendientes {
  porConfirmar: ICita[]            // estado=solicitada
  porRealizar: ICita[]             // estado=confirmada y fecha_confirmada <= hoy
  porHabilitar: ICita[]            // estado=realizada && expediente.estudio_habilitado===false
  porGenerarContrato: IExpediente[] // estado=aprobado/condicionado sin contrato activo
  /** Aprobados sin contrato con traba_contrato (canon o segundo firmante sin terminar); el vencido no entra. */
  conTrabaContrato: IExpediente[]
  /** El total de cada grupo (puede ser mayor que las filas: se muestran hasta 5). */
  totales: TotalesAcciones
  /** La suma de los totales: 0 = «Todo al día» (si tampoco hay «Requieren mi acción»). */
  total: number
  /** Total del filtro «Requieren mi acción» de /expedientes (0 si no se pudo leer). */
  requierenAccion: number
  /** La sección «acciones» de GET /oficina-virtual/conteos (null si no llegó). */
  acciones: IAccionesOficina | null
  /** De dónde salen los totales: la API; las filas (API anterior, sin el endpoint); o la sección falló. */
  fuente: 'api' | 'filas' | 'fallo'
  /** Todos los aprobados con traba leídos (sin el vencido), para desplegar cada grupo en el Inicio. */
  aprobadosConTraba: IExpediente[]
}

const EMPTY: AccionesPendientes = {
  porConfirmar: [],
  porRealizar: [],
  porHabilitar: [],
  porGenerarContrato: [],
  conTrabaContrato: [],
  totales: { porConfirmar: 0, porRealizar: 0, porHabilitar: 0, porGenerarContrato: 0, conTrabaContrato: 0, esperandoAutorizacion: null },
  total: 0,
  requierenAccion: 0,
  acciones: null,
  fuente: 'filas',
  aprobadosConTraba: [],
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
      const [citasRes, expedientesRes, conteosRes] = await Promise.allSettled([
        citaService.listMisCitas({ limit: 50 }),
        // Solo aprobados: un condicionado todavía no admite contrato (lo decide
        // Cofianza) y salía como «Estudio aprobado · Generar contrato».
        cargarAprobadosSinContrato(20),
        // Los totales de cada grupo y de «Requieren mi acción» (reporte de la Oficina Virtual, punto 11).
        oficinaVirtualService.getConteos(['acciones']),
      ])
      const acciones = conteosRes.status === 'fulfilled' ? (conteosRes.value?.acciones ?? null) : null
      // null del servicio = la API no tiene el endpoint (versión anterior); una sección en null = no se pudo calcular.
      const fuente: AccionesPendientes['fuente'] =
        conteosRes.status === 'rejected' ? 'fallo' : conteosRes.value === null ? 'filas' : acciones ? 'api' : 'fallo'
      // Sin los totales (API anterior, o la sección no se pudo calcular), el de «Requieren mi acción» como antes
      // (limit 1): sin él el inicio diría «Todo al día» con estudios esperando.
      const requierenAccion = acciones
        ? acciones.requieren_accion
        : await expedienteService
            .getExpedientes({ estudio_filtro: 'requiere_accion', page: 1, limit: 1 })
            .then((r) => r.meta.total)
            .catch(() => 0)

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
        // «No habilitar» deja estudio_habilitado en false: ya se decidió, no es pendiente. Una vez por estudio (punto 10).
        const vistos = new Set<string>()
        porHabilitar = citas
          .filter((c) => {
            if (c.estado !== 'realizada' || c.expediente?.estudio_habilitado !== false || c.expediente.estudio_rechazado) return false
            if (vistos.has(c.expediente.id)) return false
            vistos.add(c.expediente.id)
            return true
          })
          .slice(0, 5)
      }

      // ── Categoria contratos por generar (5 visibles, como las otras) ──
      const aprobadosSinContrato = expedientesRes.status === 'fulfilled' ? expedientesRes.value : []
      const porGenerarContrato: IExpediente[] = aprobadosSinContrato.filter((e) => !tieneTrabaContrato(e)).slice(0, 5)
      const aprobadosConTraba: IExpediente[] = aprobadosSinContrato.filter(
        (e) => tieneTrabaContrato(e) && e.traba_contrato?.codigo !== 'vencido',
      )
      const conTrabaContrato: IExpediente[] = aprobadosConTraba.slice(0, 5)

      const totales = totalesDeAcciones(acciones, {
        porConfirmar: porConfirmar.length,
        porRealizar: porRealizar.length,
        porHabilitar: porHabilitar.length,
        porGenerarContrato: porGenerarContrato.length,
        conTrabaContrato: conTrabaContrato.length,
      })
      setData({
        porConfirmar,
        porRealizar,
        porHabilitar,
        porGenerarContrato,
        conTrabaContrato,
        totales,
        total: totales.porConfirmar + totales.porRealizar + totales.porHabilitar + totales.porGenerarContrato + totales.conTrabaContrato,
        requierenAccion,
        acciones,
        fuente,
        aprobadosConTraba,
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
