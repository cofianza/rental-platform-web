/**
 * MisExpedientesActivosWidget — dashboard del propietario / inmobiliaria.
 * Lista los expedientes activos (no terminales) de los inmuebles del usuario,
 * con la etapa y de quién es el turno (EstadoFila), igual que la lista
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
import { EstadoFila } from '@/components/expedientes/EstadoFila'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
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

export function MisExpedientesActivosWidget() {
  // Solo roles externos (inicio de la inmobiliaria y el propietario): nunca la vista de Cofianza.
  const vista = usePuedeEditar() ? 'gestor' : 'equipo'
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
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {inmueble?.direccion || 'Inmueble por definir'}
                    {solicitante ? ` · ${solicitante.nombre}` : ''}
                  </div>
                  {/* La misma etapa y el mismo turno que la lista. */}
                  <div className="mt-1.5">
                    <EstadoFila expediente={exp} interno={false} vista={vista} compacto />
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
