/**
 * MisExpedientesActivosWidget — dashboard del propietario / inmobiliaria.
 * Lista los expedientes activos (no terminales) de los inmuebles del usuario,
 * con un texto breve de "que sigue" segun el estado actual. Da visibilidad
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
import { Badge } from '@/components/ui'
import { IconLoader, IconFolderOpen, IconChevronRight } from '@/components/icons'
import { expedienteService } from '@/services/expedienteService'
import type { IExpediente, EstadoExpediente } from '@/types/expediente'

const ESTADOS_ACTIVOS: EstadoExpediente[] = [
  'borrador',
  'en_revision',
  'informacion_incompleta',
  'aprobado',
  'condicionado',
]

// Texto guia segun estado: que paso del flujo es y de quien es la siguiente
// accion. Mantener corto (cabe en una linea).
const SIGUIENTE_PASO: Record<string, { label: string; tone: 'gray' | 'amber' | 'primary' | 'green' }> = {
  borrador: { label: 'Cita previa pendiente', tone: 'gray' },
  en_revision: { label: 'Estudio crediticio en curso', tone: 'amber' },
  informacion_incompleta: { label: 'Solicitante completando documentacion', tone: 'amber' },
  aprobado: { label: 'Genera el contrato para continuar', tone: 'primary' },
  condicionado: { label: 'Revisa documentos del coarrendatario', tone: 'primary' },
}

const TONE_CLASSES: Record<string, string> = {
  gray: 'text-gray-600',
  amber: 'text-amber-700',
  primary: 'text-primary-700 font-semibold',
  green: 'text-green-700',
}

export function MisExpedientesActivosWidget() {
  const [expedientes, setExpedientes] = useState<IExpediente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        const msg = err instanceof Error ? err.message : 'Error al cargar tus expedientes'
        setError(msg)
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

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
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
        {error}
      </div>
    )
  }

  if (expedientes.length === 0) {
    return null // Si no hay activos, no ocupamos espacio (otros widgets toman su lugar).
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Solicitudes activas</h2>
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
          const paso = SIGUIENTE_PASO[exp.estado] || { label: 'En proceso', tone: 'gray' }
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
                      {exp.numero_expediente ?? '—'}
                    </span>
                    <Badge estado={exp.estado} />
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {inmueble?.direccion || 'Sin inmueble'}
                    {solicitante ? ` · ${solicitante.nombre}` : ''}
                  </div>
                  <div className={`text-xs mt-1 ${TONE_CLASSES[paso.tone]}`}>
                    → {paso.label}
                  </div>
                </div>
                <IconChevronRight size={16} className="text-gray-400 shrink-0" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
