/**
 * Widget "Solicitudes de visita recibidas" para la pantalla Propiedades y
 * Vitrina (mockup 13_v2). Tabla con las visitas recibidas (citas en estado
 * solicitada/confirmada): solicitante, celular, propiedad, comentario, fecha,
 * estado y acción ("Iniciar estudio" para las pendientes, "Ver" para el resto)
 * — cada una enlaza al expediente. Reutiliza citaService.listMisCitas.
 *
 * Si no hay solicitudes activas, no renderiza nada (no ensucia la pantalla).
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { IconLoader, IconArrowRight, IconPhone } from '@/components/icons'
import { citaService } from '@/services/citaService'
import { ESTADO_CITA_CONFIG, type ICita } from '@/types/cita'

// Estados "recibidos" y aún relevantes que mostramos en la tabla.
const ESTADOS_VISIBLES = new Set(['solicitada', 'confirmada'])

function formatFecha(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const hoy = new Date()
  const ayer = new Date(hoy)
  ayer.setDate(hoy.getDate() - 1)
  const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const hora = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  if (mismoDia(d, hoy)) return `Hoy, ${hora}`
  if (mismoDia(d, ayer)) return `Ayer, ${hora}`
  return `${d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}, ${hora}`
}

export function SolicitudesVisitaWidget() {
  const [citas, setCitas] = useState<ICita[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    citaService
      .listMisCitas({ limit: 20, page: 1 })
      .then((r) => setCitas(r.data.filter((c) => ESTADOS_VISIBLES.has(c.estado))))
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
          <span className="w-2 h-2 rounded-full bg-coral-500 shrink-0" />
          <h3 className="text-sm font-semibold text-coral-900">Solicitudes de visita recibidas</h3>
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-coral-600 text-white text-xs font-bold">
            {citas.length}
          </span>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap">
          <IconPhone size={13} className="shrink-0" />
          Cada solicitud genera un WhatsApp al asesor
        </span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2.5">Solicitante</th>
              <th className="px-4 py-2.5">Celular</th>
              <th className="px-4 py-2.5">Propiedad</th>
              <th className="px-4 py-2.5">Comentario</th>
              <th className="px-4 py-2.5">Fecha</th>
              <th className="px-4 py-2.5">Estado</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {citas.map((c) => {
              const sol = c.expediente?.solicitante
              const inm = c.expediente?.inmueble
              const nombre = sol ? `${sol.nombre} ${sol.apellido}`.trim() : 'Sin solicitante'
              const cfg = ESTADO_CITA_CONFIG[c.estado]
              const esSolicitada = c.estado === 'solicitada'
              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{nombre}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {sol?.telefono ? (
                      <a
                        href={`tel:${sol.telefono}`}
                        className="inline-flex items-center gap-1 text-gray-600 hover:text-primary-600"
                      >
                        <IconPhone size={13} /> {sol.telefono}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-900">{inm?.direccion ?? '—'}</span>
                    {inm?.ciudad && <span className="block text-xs text-gray-500">{inm.ciudad}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="block max-w-[18rem] truncate">{c.notas_solicitante || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatFecha(c.fecha_propuesta)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-semibold ${cfg.bgColor} ${cfg.color}`}
                    >
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/expedientes/${c.expediente_id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-900"
                    >
                      {esSolicitada ? 'Iniciar estudio' : 'Ver'}
                      <IconArrowRight size={13} />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
