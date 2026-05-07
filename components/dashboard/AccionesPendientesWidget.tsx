/**
 * Widget de acciones pendientes — dashboard del propietario/inmobiliaria.
 * Muestra 4 categorias: confirmar cita, realizar cita, habilitar estudio,
 * generar contrato. Cada item es un link al panel correspondiente:
 *   - Acciones de cita → /citas (kanban con la accion)
 *   - Generar contrato → /expedientes/[id] (donde vive AccionContratoPendienteCard)
 * No duplicamos modales aqui — el usuario ejecuta desde el destino.
 */

'use client'

import Link from 'next/link'
import { EmptyState } from '@/components/ui'
import { IconLoader, IconCalendar, IconClock, IconShieldCheck, IconChevronRight, IconFolderOpen } from '@/components/icons'
import { useAccionesPendientes } from '@/hooks/useAccionesPendientes'
import { formatDateTime } from '@/lib/constants'
import type { ICita } from '@/types/cita'
import type { IExpediente } from '@/types/expediente'

export function AccionesPendientesWidget() {
  const { data, isLoading, error } = useAccionesPendientes()

  if (isLoading) {
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

  if (data.total === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <EmptyState
          icon={IconCalendar}
          title="Todo al dia"
          description="No tienes acciones pendientes en este momento."
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Tus proximas acciones</h2>
        <Link
          href="/citas"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
        >
          Ver todas las citas
          <IconChevronRight size={14} />
        </Link>
      </div>

      {data.porConfirmar.length > 0 && (
        <CitaSection
          title="Citas por confirmar"
          icon={<IconCalendar size={16} className="text-blue-600" />}
          items={data.porConfirmar}
          ctaLabel="Confirmar"
        />
      )}

      {data.porRealizar.length > 0 && (
        <CitaSection
          title="Citas por realizar"
          icon={<IconClock size={16} className="text-amber-600" />}
          items={data.porRealizar}
          ctaLabel="Marcar realizada"
        />
      )}

      {data.porHabilitar.length > 0 && (
        <CitaSection
          title="Estudios por habilitar"
          icon={<IconShieldCheck size={16} className="text-green-600" />}
          items={data.porHabilitar}
          ctaLabel="Habilitar estudio"
        />
      )}

      {data.porGenerarContrato.length > 0 && (
        <ExpedienteSection
          title="Contratos por generar"
          icon={<IconFolderOpen size={16} className="text-primary-600" />}
          items={data.porGenerarContrato}
          ctaLabel="Generar contrato"
        />
      )}
    </div>
  )
}

function CitaSection({
  title,
  icon,
  items,
  ctaLabel,
}: {
  title: string
  icon: React.ReactNode
  items: ICita[]
  ctaLabel: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-gray-700">
          {title} <span className="text-gray-400 font-normal">({items.length})</span>
        </h3>
      </div>
      <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
        {items.map((cita) => (
          <CitaItemRow key={cita.id} cita={cita} ctaLabel={ctaLabel} />
        ))}
      </ul>
    </div>
  )
}

function CitaItemRow({ cita, ctaLabel }: { cita: ICita; ctaLabel: string }) {
  const expediente = cita.expediente
  const inmueble = expediente?.inmueble
  const solicitante = expediente?.solicitante
  const fecha = cita.fecha_confirmada || cita.fecha_propuesta

  return (
    <li className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-primary-700">{expediente?.numero ?? '—'}</span>
          {inmueble && (
            <span className="text-gray-600 truncate" title={inmueble.direccion}>
              · {inmueble.direccion}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
          {solicitante && (
            <span>
              {solicitante.nombre} {solicitante.apellido}
            </span>
          )}
          {fecha && (
            <>
              <span>·</span>
              <span>{formatDateTime(fecha)}</span>
            </>
          )}
        </div>
      </div>
      <Link
        href="/citas"
        className="shrink-0 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 rounded hover:bg-primary-100"
      >
        {ctaLabel}
      </Link>
    </li>
  )
}

function ExpedienteSection({
  title,
  icon,
  items,
  ctaLabel,
}: {
  title: string
  icon: React.ReactNode
  items: IExpediente[]
  ctaLabel: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-gray-700">
          {title} <span className="text-gray-400 font-normal">({items.length})</span>
        </h3>
      </div>
      <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
        {items.map((exp) => (
          <ExpedienteItemRow key={exp.id} expediente={exp} ctaLabel={ctaLabel} />
        ))}
      </ul>
    </div>
  )
}

function ExpedienteItemRow({ expediente, ctaLabel }: { expediente: IExpediente; ctaLabel: string }) {
  const inmueble = expediente.inmueble
  const solicitante = expediente.solicitante

  return (
    <li className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-primary-700">{expediente.numero_expediente ?? '—'}</span>
          {inmueble && (
            <span className="text-gray-600 truncate" title={inmueble.direccion}>
              · {inmueble.direccion}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
          {solicitante && (
            <span className="truncate">{solicitante.nombre}</span>
          )}
          <span>·</span>
          <span className="text-green-700 shrink-0">Estudio aprobado</span>
        </div>
      </div>
      <Link
        href={`/expedientes/${expediente.id}`}
        className="shrink-0 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 rounded hover:bg-primary-100"
      >
        {ctaLabel}
      </Link>
    </li>
  )
}
