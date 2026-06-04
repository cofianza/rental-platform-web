/**
 * Vista agrupada de contratos para el tab Contratos de la Oficina Virtual
 * (mockup 13_v2): 3 secciones por etapa — Pendientes de generar (borrador),
 * En proceso de firma (pendiente_firma) y Contratos activos (firmado/vigente).
 * Reutiliza la lista existente (contratoService.getAllContratos) — sin lógica
 * nueva de datos, solo se agrupa por estado.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { IconLoader, IconArrowRight, IconAlertTriangle } from '@/components/icons'
import { ESTADOS_CONTRATO, formatCurrency, formatDateTime, type EstadoContratoKey } from '@/lib/constants'
import { contratoService } from '@/services/contratoService'
import type { IContratoListItem, EstadoContrato } from '@/types/contrato'

const arrendatario = (c: IContratoListItem): string => {
  const s = c.expedientes?.solicitantes
  const nombre = s ? `${s.nombre ?? ''} ${s.apellido ?? ''}`.trim() : ''
  return nombre || '—'
}

function Propiedad({ c }: { c: IContratoListItem }) {
  const inm = c.expedientes?.inmuebles
  if (!inm) return <span className="text-gray-400">—</span>
  return (
    <div>
      <span className="text-gray-900">
        {inm.codigo && (
          <span className="mr-1.5 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-bold">{inm.codigo}</span>
        )}
        {inm.direccion}
      </span>
      {inm.ciudad && <span className="block text-xs text-gray-500">{inm.ciudad}</span>}
    </div>
  )
}

function EstadoChip({ estado }: { estado: EstadoContrato }) {
  const cfg = ESTADOS_CONTRATO[estado as EstadoContratoKey]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg?.bgColor || 'bg-gray-100'} ${cfg?.textColor || 'text-gray-700'}`}
    >
      {cfg?.label || estado}
    </span>
  )
}

function Accion({ id, label }: { id: string; label: string }) {
  return (
    <Link
      href={`/contratos/${id}`}
      className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-900"
    >
      {label} <IconArrowRight size={13} />
    </Link>
  )
}

function Panel({
  title,
  dot,
  subtitle,
  count,
  head,
  children,
  vacio,
}: {
  title: string
  dot: string
  subtitle?: string
  count: number
  head: string[]
  children: React.ReactNode
  vacio: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
            {count}
          </span>
        </div>
        {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
      </div>
      {count === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">{vacio}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                {head.map((h, i) => (
                  <th key={i} className="px-4 py-2.5 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">{children}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function ContratosAgrupados() {
  const [contratos, setContratos] = useState<IContratoListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    contratoService
      .getAllContratos({ limit: 100, page: 1, sortBy: 'created_at', sortDir: 'desc' })
      .then((r) => {
        if (!cancel) setContratos(r.data)
      })
      .catch((e) => {
        if (!cancel) setError(e instanceof Error ? e.message : 'Error al cargar contratos')
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
        <IconLoader size={28} className="animate-spin text-primary-600" />
        <span className="sr-only">Cargando contratos…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        <IconAlertTriangle size={20} className="mx-auto mb-2" />
        {error}
      </div>
    )
  }

  const pendientes = contratos.filter((c) => c.estado === 'borrador')
  const enFirma = contratos.filter((c) => c.estado === 'pendiente_firma')
  const activos = contratos.filter((c) => c.estado === 'firmado' || c.estado === 'vigente')
  const fecha = (iso: string | null) => (iso ? formatDateTime(iso) : '—')

  return (
    <div className="space-y-5">
      {/* Pendientes de generar (borrador) */}
      <Panel
        title="Pendientes de generar contrato"
        dot="bg-coral-500"
        subtitle="Borradores listos para finalizar o enviar a firma"
        count={pendientes.length}
        head={['Arrendatario', 'Propiedad', 'Canon', 'Generado', 'Estado', '']}
        vacio="No hay contratos en borrador."
      >
        {pendientes.map((c) => (
          <tr key={c.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{arrendatario(c)}</td>
            <td className="px-4 py-3"><Propiedad c={c} /></td>
            <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
              {c.valor_arriendo ? formatCurrency(c.valor_arriendo) : '—'}
            </td>
            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fecha(c.fecha_generacion ?? c.created_at)}</td>
            <td className="px-4 py-3 whitespace-nowrap"><EstadoChip estado={c.estado} /></td>
            <td className="px-4 py-3 text-right whitespace-nowrap"><Accion id={c.id} label="Continuar" /></td>
          </tr>
        ))}
      </Panel>

      {/* En proceso de firma (pendiente_firma) */}
      <Panel
        title="En proceso de firma"
        dot="bg-blue-500"
        subtitle="Esperando firmas"
        count={enFirma.length}
        head={['Arrendatario', 'Propiedad', 'Estado', 'Generado', '']}
        vacio="Ningún contrato en proceso de firma."
      >
        {enFirma.map((c) => (
          <tr key={c.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{arrendatario(c)}</td>
            <td className="px-4 py-3"><Propiedad c={c} /></td>
            <td className="px-4 py-3 whitespace-nowrap"><EstadoChip estado={c.estado} /></td>
            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fecha(c.fecha_generacion ?? c.created_at)}</td>
            <td className="px-4 py-3 text-right whitespace-nowrap"><Accion id={c.id} label="Ver" /></td>
          </tr>
        ))}
      </Panel>

      {/* Contratos activos (firmado / vigente) */}
      <Panel
        title="Contratos activos"
        dot="bg-primary-600"
        subtitle="Contratos vigentes"
        count={activos.length}
        head={['Arrendatario', 'Propiedad', 'Canon', 'Inicio', 'Estado', '']}
        vacio="Sin contratos activos."
      >
        {activos.map((c) => (
          <tr key={c.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{arrendatario(c)}</td>
            <td className="px-4 py-3"><Propiedad c={c} /></td>
            <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
              {c.valor_arriendo ? formatCurrency(c.valor_arriendo) : '—'}
            </td>
            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{c.fecha_inicio || '—'}</td>
            <td className="px-4 py-3 whitespace-nowrap"><EstadoChip estado={c.estado} /></td>
            <td className="px-4 py-3 text-right whitespace-nowrap"><Accion id={c.id} label="Ver" /></td>
          </tr>
        ))}
      </Panel>
    </div>
  )
}
