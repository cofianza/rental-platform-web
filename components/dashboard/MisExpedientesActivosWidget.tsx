/**
 * MisExpedientesActivosWidget — dashboard del propietario / inmobiliaria.
 * Lista los expedientes activos (no terminales) de los inmuebles del usuario,
 * con el estado de la evaluación y de quién es el turno, igual que la lista
 * (antes un «qué sigue» fijo por estado: «Cita previa pendiente» a todo
 * borrador, «Genere el contrato» con el contrato ya en firma). Da visibilidad
 * pasiva: incluso cuando no hay accion del propietario, deberia ver donde
 * va cada solicitud.
 *
 * Diferencia con AccionesPendientesWidget:
 *   - AccionesPendientesWidget = "lo que debes hacer ahora" (citas + contrato).
 *   - Este widget = "todas tus solicitudes activas y en que paso estan".
 *
 * Filtra por RLS: el endpoint /expedientes ya devuelve solo los de inmuebles
 * del propietario autenticado.
 */

'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { EstudioResultadoBadge } from '@/components/estudios/EstudioResultadoBadge'
import { ProcessStepBadge } from '@/components/expedientes/ExpedienteBadges'
import { IconLoader, IconFolderOpen, IconChevronRight, IconRefresh } from '@/components/icons'
import { expedienteService } from '@/services/expedienteService'
import type { IExpediente, EstadoExpediente } from '@/types/expediente'
import { formatNumeroEstudio } from '@/lib/utils'

const ESTADOS_ACTIVOS: EstadoExpediente[] = [
  'borrador',
  'en_revision',
  'informacion_incompleta',
  'aprobado',
  'condicionado',
]

// Mismos textos que la pastilla de la lista (depende_de lo calcula el API).
const TURNO: Record<NonNullable<IExpediente['depende_de']>, string> = {
  gestor: 'Su turno',
  prospecto: 'Esperando al prospecto',
  cofianza: 'Cofianza procesando',
}

export function MisExpedientesActivosWidget() {
  const [expedientes, setExpedientes] = useState<IExpediente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let cancelled = false
    expedienteService
      .getExpedientes({
        estado: ESTADOS_ACTIVOS,
        page: 1,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc',
      })
      .then((res) => {
        if (cancelled) return
        setExpedientes(res.data || [])
      })
      .catch((err) => {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'Error al cargar sus estudios'
        setError(msg)
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [intento])

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-6">
          <IconLoader size={24} className="animate-spin text-primary-600" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 flex flex-wrap items-center justify-between gap-3">
        <span>{error}</span>
        <button
          type="button"
          onClick={() => {
            setError(null)
            setLoading(true)
            setIntento((n) => n + 1)
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          <IconRefresh size={14} />
          Reintentar
        </button>
      </div>
    )
  }

  if (expedientes.length === 0) {
    return null // Si no hay activos, no ocupamos espacio (otros widgets toman su lugar).
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Estudios activos</h2>
        <Link
          href="/expedientes"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
        >
          Ver todos
          <IconChevronRight size={14} />
        </Link>
      </div>

      <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
        {expedientes.map((exp) => {
          const ev = exp.estudio_vigente
          const inmueble = exp.inmueble
          const solicitante = exp.solicitante
          return (
            <li key={exp.id}>
              <Link
                href={`/expedientes/${exp.id}`}
                className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                  <IconFolderOpen size={18} className="text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-mono font-medium text-primary-700">
                      {formatNumeroEstudio(exp.numero_expediente) || '—'}
                    </span>
                    {/* El paso, como en la lista (el estado formal decía «Borrador»). */}
                    <ProcessStepBadge estado={exp.estado} citaRealizada={exp.cita_realizada ?? false} />
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {inmueble?.direccion || 'Inmueble por definir'}
                    {solicitante ? ` · ${solicitante.nombre}` : ''}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <EstudioResultadoBadge
                      estado={ev?.estado}
                      resultado={ev?.resultado}
                      score={ev?.score}
                      expirado={ev?.expirado}
                      estadoBloqueo={ev?.estado_bloqueo}
                      esperaCoarrendatario={!!ev?.condicion_coarrendatario}
                      sinEjecutar={ev?.sin_ejecutar}
                    />
                    {/* Identidad rechazada: el badge ya dice qué hacer (comunicarse con Cofianza). */}
                    {exp.depende_de && ev?.estado_bloqueo !== 'identidad_rechazada' && (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          exp.depende_de === 'gestor'
                            ? 'border-coral-200 bg-coral-50 text-coral-700'
                            : 'border-gray-200 bg-gray-50 text-gray-600'
                        }`}
                      >
                        {/* El condicionado lo decide un analista: no es una consulta en curso (igual que la lista). */}
                        {exp.estado === 'condicionado' && exp.depende_de === 'cofianza' ? 'En revisión de Cofianza' : TURNO[exp.depende_de]}
                      </span>
                    )}
                  </div>
                </div>
                <IconChevronRight size={16} className="text-gray-500 shrink-0" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
