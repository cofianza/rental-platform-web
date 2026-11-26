/**
 * Widget de acciones pendientes — dashboard del propietario/inmobiliaria.
 * Muestra 4 categorias: confirmar cita, realizar cita, habilitar estudio,
 * generar contrato (más el total de «Requieren mi acción» de la lista, con
 * enlace al filtro). Cada item lleva al sitio exacto de SU accion, no al
 * tablero completo (antes todas las filas apuntaban a /citas a secas):
 *   - Confirmar / marcar realizada → /citas#cita-[id] (la tarjeta del kanban)
 *   - Habilitar evaluacion → /expedientes/[id] (detalle del estudio)
 *   - Generar contrato → /expedientes/[id] (donde vive AccionContratoPendienteCard)
 * No duplicamos modales aqui — el usuario ejecuta desde el destino.
 *
 * Reporte de la Oficina Virtual (25-nov), punto 1: cada grupo dice su TOTAL (el de su lista, de la API) aunque
 * muestre hasta 5 filas, con «Ver los N» hacia la lista completa: el inicio contaba las filas que mostraba (5) y
 * Contratos el total.
 */

'use client'

import Link from 'next/link'
import { EmptyState } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { IconCalendar, IconClock, IconShieldCheck, IconChevronRight, IconFolderOpen } from '@/components/icons'
import { useAccionesPendientes } from '@/hooks/useAccionesPendientes'
import { formatDateTime } from '@/lib/constants'
import type { ICita } from '@/types/cita'
import type { IExpediente } from '@/types/expediente'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import { formatNumeroEstudio } from '@/lib/utils'
import { etapaDeTraba, etiquetaTraba } from '@/lib/etapaEstudio'

/** Son acciones (confirmar, habilitar, generar): quien solo consulta no las ve. */
export function AccionesPendientesWidget() {
  const puedeEditar = usePuedeEditar()
  return puedeEditar ? <AccionesPendientes /> : null
}

function AccionesPendientes() {
  const { data, isLoading, error, refetch } = useAccionesPendientes()

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 space-y-3">
        <span className="sr-only">Cargando acciones pendientes…</span>
        <Skeleton className="h-5 w-40 max-w-full" />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 flex flex-wrap items-center justify-between gap-3">
        <span>{error}</span>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          Reintentar
        </button>
      </div>
    )
  }

  // «Todo al día» solo si tampoco hay filas en «Requieren mi acción».
  if (data.total === 0 && data.requierenAccion === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <EmptyState
          icon={IconCalendar}
          title="Todo al día"
          description="No tiene acciones pendientes en este momento."
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 space-y-5">
      {/* A 390 px el título y el enlace no caben en una línea: el enlace baja entero (no los dos partidos en dos). */}
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <h2 className="text-lg font-semibold text-gray-900">Sus próximas acciones</h2>
        <Link
          href="/citas"
          className="min-h-10 text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
        >
          Ver todas las citas
          <IconChevronRight size={14} />
        </Link>
      </div>

      {data.requierenAccion > 0 && (
        <Link
          href="/expedientes?estudio_filtro=requiere_accion"
          className="flex items-center justify-between gap-3 rounded-lg border border-coral-200 bg-coral-50 px-3 py-2.5 text-sm text-coral-700 hover:bg-coral-100 transition-colors"
        >
          <span>
            <span className="font-semibold">
              {data.requierenAccion === 1 ? '1 estudio requiere' : `${data.requierenAccion} estudios requieren`} su acción
            </span>{' '}
            en la lista de estudios
          </span>
          <IconChevronRight size={14} className="shrink-0" />
        </Link>
      )}

      {data.totales.porConfirmar > 0 && (
        <CitaSection
          title="Citas por confirmar"
          icon={<IconCalendar size={16} className="text-blue-600" />}
          items={data.porConfirmar}
          total={data.totales.porConfirmar}
          verTodas="/citas"
          ctaLabel="Confirmar"
          destino="cita"
        />
      )}

      {data.totales.porRealizar > 0 && (
        <CitaSection
          title="Citas por realizar"
          icon={<IconClock size={16} className="text-amber-600" />}
          items={data.porRealizar}
          total={data.totales.porRealizar}
          verTodas="/citas"
          ctaLabel="Marcar realizada"
          destino="cita"
        />
      )}

      {data.totales.porHabilitar > 0 && (
        <CitaSection
          title="Evaluaciones por habilitar"
          icon={<IconShieldCheck size={16} className="text-green-600" />}
          items={data.porHabilitar}
          total={data.totales.porHabilitar}
          verTodas="/citas"
          ctaLabel="Habilitar evaluación"
          destino="expediente"
        />
      )}

      {data.totales.porGenerarContrato > 0 && (
        <ExpedienteSection
          title="Contratos por generar"
          icon={<IconFolderOpen size={16} className="text-primary-600" />}
          items={data.porGenerarContrato}
          total={data.totales.porGenerarContrato}
          verTodas="/contratos"
          ctaLabel="Generar contrato"
        />
      )}

      {/* Reporte de Gerencia (21-nov): aprobados que todavía no pueden pasar al contrato; sin «Generar contrato».
          El mismo nombre que su panel de la pestaña Contratos (ContratosInmobiliariaView). */}
      {data.totales.conTrabaContrato > 0 && (
        <ExpedienteSection
          title="Aprobados con algo por resolver"
          icon={<IconFolderOpen size={16} className="text-amber-600" />}
          items={data.conTrabaContrato}
          total={data.totales.conTrabaContrato}
          verTodas="/contratos"
          ctaLabel="Ver qué falta"
        />
      )}
    </div>
  )
}

/** El encabezado del grupo con su TOTAL y, si hay más que las filas que se ven, «Ver los N» hacia la lista completa. */
function EncabezadoGrupo({
  title,
  icon,
  total,
  vistos,
  verTodas,
  femenino = false,
}: {
  title: string
  icon: React.ReactNode
  total: number
  vistos: number
  verTodas: string
  /** «Ver las 7» (citas, evaluaciones) o «Ver los 7» (contratos, aprobados). */
  femenino?: boolean
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-gray-700">
          {title} <span className="font-normal text-gray-500">({total.toLocaleString('es-CO')})</span>
        </h3>
      </div>
      {total > vistos && (
        <Link
          href={verTodas}
          aria-label={`Ver ${femenino ? 'las' : 'los'} ${total.toLocaleString('es-CO')}: ${title.toLowerCase()}`}
          className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800"
        >
          {vistos > 0 ? `Ver ${femenino ? 'las' : 'los'} ${total.toLocaleString('es-CO')}` : 'Ver la lista'}
          <IconChevronRight size={14} />
        </Link>
      )}
    </div>
  )
}

function CitaSection({
  title,
  icon,
  items,
  total,
  verTodas,
  ctaLabel,
  destino,
}: {
  title: string
  icon: React.ReactNode
  items: ICita[]
  /** El total del grupo (puede ser mayor que las filas). */
  total: number
  verTodas: string
  ctaLabel: string
  /** Donde se ejecuta la accion: la tarjeta del kanban o el detalle del estudio. */
  destino: 'expediente' | 'cita'
}) {
  return (
    <div>
      <EncabezadoGrupo title={title} icon={icon} total={total} vistos={items.length} verTodas={verTodas} femenino />
      {items.length > 0 && (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
          {items.map((cita) => (
            <CitaItemRow key={cita.id} cita={cita} ctaLabel={ctaLabel} destino={destino} />
          ))}
        </ul>
      )}
    </div>
  )
}

/** Una visita con su acción (también la usa el Inicio de la inmobiliaria, TareasInicio). */
export function CitaItemRow({
  cita,
  ctaLabel,
  destino,
}: {
  cita: ICita
  ctaLabel: string
  destino: 'expediente' | 'cita'
}) {
  const expediente = cita.expediente
  const inmueble = expediente?.inmueble
  const solicitante = expediente?.solicitante
  const fecha = cita.fecha_confirmada || cita.fecha_propuesta
  // El hash lo consume /citas para hacer scroll hasta la tarjeta (id="cita-<id>").
  const href =
    destino === 'expediente' && expediente ? `/expedientes/${expediente.id}` : `/citas#cita-${cita.id}`

  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          {/* El número no se parte; a 390 px la dirección baja a su propia línea y se trunca ahí. */}
          <div className="flex flex-wrap items-center gap-x-2 text-xs">
            <span className="whitespace-nowrap font-mono text-primary-700">{expediente?.numero ? `Estudio ${formatNumeroEstudio(expediente.numero)}` : '—'}</span>
            {inmueble?.direccion && (
              <span className="min-w-0 max-w-full truncate text-gray-600" title={inmueble.direccion}>
                · {inmueble.direccion}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500 mt-0.5">
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
        <span className="shrink-0 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 rounded">
          {ctaLabel}
        </span>
      </Link>
    </li>
  )
}

function ExpedienteSection({
  title,
  icon,
  items,
  total,
  verTodas,
  ctaLabel,
}: {
  title: string
  icon: React.ReactNode
  items: IExpediente[]
  /** El total del grupo (puede ser mayor que las filas). */
  total: number
  verTodas: string
  ctaLabel: string
}) {
  return (
    <div>
      <EncabezadoGrupo title={title} icon={icon} total={total} vistos={items.length} verTodas={verTodas} />
      {items.length > 0 && (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
          {items.map((exp) => (
            <ExpedienteItemRow key={exp.id} expediente={exp} ctaLabel={ctaLabel} />
          ))}
        </ul>
      )}
    </div>
  )
}

/** Un estudio aprobado sin contrato con su acción (también la usa el Inicio de la inmobiliaria, TareasInicio). */
export function ExpedienteItemRow({ expediente, ctaLabel }: { expediente: IExpediente; ctaLabel: string }) {
  const inmueble = expediente.inmueble
  const solicitante = expediente.solicitante
  // Aprobado con traba (canon o segundo firmante sin terminar): el mismo nombre que la lista.
  const etapaTraba = etapaDeTraba(expediente.traba_contrato?.codigo)

  return (
    <li>
      <Link
        href={`/expedientes/${expediente.id}`}
        className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          {/* El número no se parte; a 390 px la dirección baja a su propia línea y se trunca ahí. */}
          <div className="flex flex-wrap items-center gap-x-2 text-xs">
            <span className="whitespace-nowrap font-mono text-primary-700">{expediente.numero_expediente ? `Estudio ${formatNumeroEstudio(expediente.numero_expediente)}` : '—'}</span>
            {inmueble?.direccion && (
              <span className="min-w-0 max-w-full truncate text-gray-600" title={inmueble.direccion}>
                · {inmueble.direccion}
              </span>
            )}
          </div>
          {etapaTraba ? (
            // La etiqueta de la traba es larga («Aprobado · segundo firmante en verificación»): va en su propia
            // línea para no truncar el nombre a 390 px.
            <div className="mt-0.5 text-xs text-gray-500">
              {solicitante && <p className="truncate">{solicitante.nombre}</p>}
              <p className="text-amber-800">{etiquetaTraba(etapaTraba, expediente.traba_contrato)}</p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500 mt-0.5">
              {solicitante && <span className="min-w-0 max-w-full truncate">{solicitante.nombre}</span>}
              <span>·</span>
              <span className="text-green-700 shrink-0">Estudio aprobado</span>
            </div>
          )}
        </div>
        <span className="shrink-0 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 rounded">
          {ctaLabel}
        </span>
      </Link>
    </li>
  )
}
