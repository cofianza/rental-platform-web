/**
 * Widget "Solicitudes de visita recibidas" para la pantalla Propiedades y
 * Vitrina (nueva propuesta UI Mario 12-may-2026).
 *
 * Lista las citas con estado='solicitada' (visitas propuestas por
 * arrendatarios que aun no aprueba el propietario). Cada fila muestra
 * solicitante + propiedad + fecha + CTA "Ver expediente →" para que el
 * propietario decida (confirmar, reprogramar o cancelar la visita).
 *
 * Si hay >=1 solicitud abre el card; si no hay ninguna, no renderiza
 * nada (no ensucia la pantalla).
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { IconCalendar, IconLoader, IconChevronRight } from '@/components/icons'
import { citaService } from '@/services/citaService'
import type { ICita } from '@/types/cita'

function formatFechaCorta(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SolicitudesVisitaWidget() {
  const [citas, setCitas] = useState<ICita[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    citaService
      .listMisCitas({ estado: 'solicitada', limit: 10, page: 1 })
      .then((r) => setCitas(r.data))
      .catch(() => setCitas([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-2 text-sm text-gray-500">
        <IconLoader size={16} className="animate-spin" />
        Cargando solicitudes de visita…
      </div>
    )
  }

  if (citas.length === 0) return null

  return (
    <div className="bg-white border border-coral-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-coral-50 border-b border-coral-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconCalendar size={18} className="text-coral-700 shrink-0" />
          <h3 className="text-sm font-semibold text-coral-900">
            Solicitudes de visita pendientes
          </h3>
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-coral-600 text-white text-xs font-bold">
            {citas.length}
          </span>
        </div>
        <Link
          href="/citas"
          className="text-xs font-medium text-coral-700 hover:text-coral-900 hover:underline"
        >
          Ver todas →
        </Link>
      </div>

      {/* Tabla */}
      <div className="divide-y divide-gray-100">
        {citas.map((c) => {
          const solicitante = c.expediente?.solicitante
          const inmueble = c.expediente?.inmueble
          const nombre = solicitante
            ? `${solicitante.nombre} ${solicitante.apellido}`.trim()
            : 'Sin solicitante'
          return (
            <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {nombre}
                  {solicitante?.telefono && (
                    <span className="text-gray-500 font-normal"> · {solicitante.telefono}</span>
                  )}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {inmueble ? `${inmueble.direccion}, ${inmueble.ciudad}` : 'Inmueble no disponible'}
                  {c.fecha_propuesta && (
                    <span> · Propuesta: {formatFechaCorta(c.fecha_propuesta)}</span>
                  )}
                </p>
              </div>
              <Link
                href={`/expedientes/${c.expediente_id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-900 whitespace-nowrap"
              >
                Ver expediente <IconChevronRight size={14} />
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
