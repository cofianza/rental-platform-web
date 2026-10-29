/**
 * Etapa del estudio para el detalle (revisión del Resumen, 23-oct). El estado
 * formal del expediente no alcanza: «borrador» cubre la visita, la
 * autorización, el pago y la consulta. La etapa sale de las mismas lecturas que
 * hacen las tarjetas del Resumen (coalescidas: no son peticiones extra).
 */

'use client'

import { useEffect, useState } from 'react'
import { citaService } from '@/services/citaService'
import { autorizacionService } from '@/services/autorizacionService'
import { pagoEstudioService } from '@/services/pagoEstudioService'
import { estudioService } from '@/services/estudioService'
import { contratoService } from '@/services/contratoService'
import type { EstadoExpediente } from '@/lib/constants'

export {
  calcularEtapa,
  ETAPA_LABEL,
  PASOS_DETALLE,
  PASO_DE_ETAPA,
  turnoDeEtapa,
  type DatosEtapa,
  type EtapaEstudio,
  type Turno,
} from '@/lib/etapaEstudio'
import { calcularEtapa, type EtapaEstudio } from '@/lib/etapaEstudio'

interface ExpedienteEtapa {
  id: string
  estado: EstadoExpediente
  estado_pre_cancelacion?: EstadoExpediente | null
  estudio_habilitado?: boolean
  estudio_rechazado?: boolean | null
  cita_omitida?: boolean
  inmueble?: { id: string } | null
}

/**
 * etapa null mientras carga. `conPago`: el rol puede leer el estado del pago.
 * `version`: el contador de cargas del detalle (la página da el contexto de
 * refresco, así que aquí llega por parámetro). `esperaHasta`: hasta cuándo el
 * titular espera al coarrendatario (Adenda 4 §12), para la franja «Qué sigue».
 */
export function useEtapaEstudio(
  expediente: ExpedienteEtapa | null,
  conPago: boolean,
  version: number,
): { etapa: EtapaEstudio | null; esperaHasta: string | null } {
  const [leida, setLeida] = useState<{ etapa: EtapaEstudio | null; esperaHasta: string | null }>({ etapa: null, esperaHasta: null })
  const id = expediente?.id
  const estado = expediente?.estado
  const pre = expediente?.estado_pre_cancelacion ?? null
  const habilitado = expediente?.estudio_habilitado ?? false
  const rechazado = !!expediente?.estudio_rechazado
  const citaOmitida = expediente?.cita_omitida ?? false
  const tieneInmueble = !!expediente?.inmueble

  useEffect(() => {
    if (!id || !estado) return
    let cancel = false
    const preDecision = !['aprobado', 'condicionado', 'rechazado', 'cerrado'].includes(estado)
    Promise.all([
      preDecision && !habilitado && tieneInmueble && !citaOmitida
        ? citaService.getCitasByExpediente(id).catch(() => [])
        : Promise.resolve([]),
      preDecision && habilitado ? autorizacionService.getStatus(id).catch(() => null) : Promise.resolve(null),
      preDecision && habilitado && conPago ? pagoEstudioService.getEstado(id).catch(() => null) : Promise.resolve(null),
      preDecision && habilitado ? estudioService.getEstudiosForExpediente(id, 1, 10).catch(() => null) : Promise.resolve(null),
      estado === 'aprobado' ? contratoService.getContratosForExpediente(id, { limit: 20 }).catch(() => null) : Promise.resolve(null),
    ]).then(([citas, aut, pago, estudios, contratos]) => {
      if (cancel) return
      const titular = estudios?.data
        .filter((e) => e.tipo !== 'con_coarrendatario' && e.estado !== 'cancelado')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      const esperaHasta = titular?.espera_autorizacion?.hasta ?? null
      const etapa = calcularEtapa({
        estado,
        estadoPreCancelacion: pre,
        habilitado,
        estudioRechazado: rechazado,
        citaResuelta: citaOmitida || citas.some((c) => c.estado === 'realizada'),
        tieneInmueble,
        autorizacionEstado: aut?.estado ?? null,
        // Mismo veredicto que la lista (vencido por el reloj o detenido).
        enlaceVencido: !!titular?.expiracion?.expirado,
        pago: pago ? { estado: pago.estado, puede_avanzar: pago.puede_avanzar, paga: pago.paga } : null,
        titularEstado: titular?.estado ?? null,
        esperaHasta,
        contratosEstados: (contratos?.data ?? []).map((c) => c.estado),
      })
      setLeida({ etapa, esperaHasta })
    })
    return () => {
      cancel = true
    }
  }, [id, estado, pre, habilitado, rechazado, citaOmitida, tieneInmueble, conPago, version])

  return leida
}
