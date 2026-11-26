/**
 * Inicio de la inmobiliaria como lista de tareas (reporte de la Oficina Virtual del 25-nov, puntos 10 y 11).
 *
 * Primero, una línea por grupo con su total real (GET /oficina-virtual/conteos, sección «acciones»): «Tiene 11
 * contratos por generar», «4 estudios aprobados necesitan otro inmueble», «1 estudio espera autorización». Al tocar
 * la línea se despliega aquí su lista (hasta 5, con «Ver los N en …» hacia la sección que tiene la lista completa) o,
 * si aquí no hay filas que mostrar, se va directo a esa sección con su filtro. Cada estudio sale en UN grupo: la API
 * da «Requieren su acción» sin los que ya tienen el suyo (lib/inicioTareas.ts).
 *
 * Mientras carga, esqueleto; si los totales no se pudieron leer, «Reintentar» (nunca un «No tiene pendientes» falso).
 * Quien solo consulta (miembro de solo lectura) ve lo mismo, con «Ver» en vez de la acción.
 */

'use client'

import { useState, type ComponentType } from 'react'
import Link from 'next/link'
import {
  IconAlertTriangle,
  IconBuilding2,
  IconCalendar,
  IconCheckCircle,
  IconChevronDown,
  IconChevronRight,
  IconClipboardList,
  IconClock,
  IconFileText,
  IconShield,
  IconShieldCheck,
  IconUserCheck,
  IconUserPlus,
  type IconProps,
} from '@/components/icons'
import { Skeleton } from '@/components/ui/Skeleton'
import { CitaItemRow, ExpedienteItemRow } from '@/components/dashboard/AccionesPendientesWidget'
import { useAccionesPendientes, type AccionesPendientes } from '@/hooks/useAccionesPendientes'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import { accionesDesdeFilas, lineasDeInicio, textoVerTodos, type ClaveTarea, type LineaTarea } from '@/lib/inicioTareas'
import { ETAPAS_SEGUNDO_FIRMANTE_EN_CURSO } from '@/lib/etapaEstudio'
import { formatNumeroEstudio, cn } from '@/lib/utils'
import type { IExpediente } from '@/types/expediente'
import type { IEstudioPendiente } from '@/types/oficinaVirtual'

const ICONO: Record<ClaveTarea, ComponentType<IconProps>> = {
  contratos_por_generar: IconFileText,
  aprobados_canon_excede: IconBuilding2,
  aprobados_segundo_firmante: IconUserPlus,
  evaluaciones_por_habilitar: IconShieldCheck,
  citas_por_confirmar: IconCalendar,
  citas_por_realizar: IconClock,
  requieren_accion_otros: IconClipboardList,
  esperando_autorizacion: IconUserCheck,
  aprobados_en_verificacion: IconShield,
}

const esSegundo = (e: IExpediente) => ETAPAS_SEGUNDO_FIRMANTE_EN_CURSO.includes(e.traba_contrato?.codigo as never)
const esCanon = (e: IExpediente) => e.traba_contrato?.codigo === 'canon_excede'

/** Las acciones de cada grupo, contadas con las filas que se ven (solo con una API sin la sección «acciones»). */
function accionesDeFilas(d: AccionesPendientes) {
  return accionesDesdeFilas({
    porConfirmar: d.porConfirmar.length,
    porRealizar: d.porRealizar.length,
    porHabilitar: d.porHabilitar.length,
    porGenerarContrato: d.porGenerarContrato.length,
    canonExcede: d.aprobadosConTraba.filter(esCanon).length,
    segundoFirmante: d.aprobadosConTraba.filter(esSegundo).length,
    enVerificacion: d.aprobadosConTraba.filter((e) => !esCanon(e) && !esSegundo(e)).length,
    requierenAccion: d.requierenAccion,
  })
}

export function TareasInicio() {
  const puedeEditar = usePuedeEditar()
  const { data, isLoading, error, refetch } = useAccionesPendientes()
  const [abiertas, setAbiertas] = useState<ReadonlySet<ClaveTarea>>(new Set())
  const titulo = puedeEditar ? 'Sus pendientes' : 'Pendientes de la inmobiliaria'

  const encabezado = (
    <div className="border-b border-gray-200 px-4 py-3 sm:px-6">
      <h1 id="inicio-pendientes" className="text-lg font-semibold text-gray-900">
        {titulo}
      </h1>
    </div>
  )

  if (isLoading) {
    return (
      <section aria-labelledby="inicio-pendientes" className="rounded-lg border border-gray-200 bg-white">
        {encabezado}
        <div role="status" className="space-y-3 p-4 sm:px-6">
          <span className="sr-only">Cargando sus pendientes…</span>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </section>
    )
  }

  // Sin los totales no se dice nada que no se sabe: ni las líneas recortadas ni «No tiene pendientes».
  if (error || data.fuente === 'fallo') {
    return (
      <section aria-labelledby="inicio-pendientes" className="rounded-lg border border-gray-200 bg-white">
        {encabezado}
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-gray-800 sm:px-6">
          <span>No se pudieron cargar sus pendientes. Intente de nuevo en un momento.</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex min-h-10 items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Reintentar
          </button>
        </div>
      </section>
    )
  }

  const acciones = data.fuente === 'api' && data.acciones ? data.acciones : accionesDeFilas(data)
  const lineas = lineasDeInicio(acciones)

  if (lineas.length === 0) {
    return (
      <section aria-labelledby="inicio-pendientes" className="rounded-lg border border-gray-200 bg-white">
        {encabezado}
        <div className="flex items-start gap-3 p-4 sm:px-6">
          <span className="shrink-0 rounded-lg bg-primary-50 p-2 text-primary-700" aria-hidden="true">
            <IconCheckCircle size={18} />
          </span>
          <div className="text-sm">
            <p className="font-semibold text-gray-900">No tiene pendientes</p>
            <p className="mt-0.5 text-gray-600">
              Cuando una visita, un estudio o un contrato necesite algo, aparecerá aquí.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const alternar = (clave: ClaveTarea) =>
    setAbiertas((prev) => {
      const s = new Set(prev)
      if (s.has(clave)) s.delete(clave)
      else s.add(clave)
      return s
    })

  return (
    <section aria-labelledby="inicio-pendientes" className="rounded-lg border border-gray-200 bg-white">
      {encabezado}
      <ul className="divide-y divide-gray-100">
        {lineas.map((l) => (
          <LineaPendiente
            key={l.clave}
            linea={l}
            filas={filasDe(l.clave, data, puedeEditar)}
            abierta={abiertas.has(l.clave)}
            onAlternar={() => alternar(l.clave)}
          />
        ))}
      </ul>
    </section>
  )
}

/** Las filas que se despliegan en cada línea (hasta 5). Sin filas, la línea lleva directo a su sección. */
function filasDe(clave: ClaveTarea, d: AccionesPendientes, puedeEditar: boolean): React.ReactNode[] {
  const accion = (texto: string) => (puedeEditar ? texto : 'Ver')
  const aprobados = (filtro: (e: IExpediente) => boolean) =>
    d.aprobadosConTraba
      .filter(filtro)
      .slice(0, 5)
      .map((e) => <ExpedienteItemRow key={e.id} expediente={e} ctaLabel="Ver qué falta" />)
  switch (clave) {
    case 'contratos_por_generar':
      return d.porGenerarContrato.map((e) => <ExpedienteItemRow key={e.id} expediente={e} ctaLabel={accion('Generar contrato')} />)
    case 'aprobados_canon_excede':
      return aprobados(esCanon)
    case 'aprobados_segundo_firmante':
      return aprobados(esSegundo)
    case 'aprobados_en_verificacion':
      return aprobados((e) => !esCanon(e) && !esSegundo(e))
    case 'evaluaciones_por_habilitar':
      return d.porHabilitar.map((c) => <CitaItemRow key={c.id} cita={c} ctaLabel={accion('Habilitar evaluación')} destino="expediente" />)
    case 'citas_por_confirmar':
      return d.porConfirmar.map((c) => <CitaItemRow key={c.id} cita={c} ctaLabel={accion('Confirmar')} destino="cita" />)
    case 'citas_por_realizar':
      return d.porRealizar.map((c) => <CitaItemRow key={c.id} cita={c} ctaLabel={accion('Marcar realizada')} destino="cita" />)
    case 'requieren_accion_otros':
      // Solo con el total exacto: la muestra es de los que no están en otro grupo.
      return (d.acciones?.otros_muestra ?? []).map((e) => <EstudioPendienteRow key={e.id} estudio={e} />)
    case 'esperando_autorizacion':
      return []
  }
}

const CLASE_LINEA =
  'flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 sm:px-6'

function LineaPendiente({
  linea,
  filas,
  abierta,
  onAlternar,
}: {
  linea: LineaTarea
  filas: React.ReactNode[]
  abierta: boolean
  onAlternar: () => void
}) {
  const Icono = ICONO[linea.clave]
  const icono = (
    <span
      aria-hidden="true"
      className={cn('shrink-0 rounded-lg p-2', linea.tono === 'accion' ? 'bg-coral-50 text-coral-700' : 'bg-gray-100 text-gray-600')}
    >
      <Icono size={16} />
    </span>
  )
  const texto = <span className="min-w-0 flex-1 text-sm font-semibold text-gray-900">{linea.texto}</span>

  // Sin filas que desplegar aquí (p. ej. «espera autorización»), la línea va a la lista de su sección, filtrada.
  if (filas.length === 0) {
    return (
      <li>
        <Link href={linea.destino.href} className={CLASE_LINEA}>
          {icono}
          {texto}
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary-700">
            Ver<span className="hidden sm:inline"> en {linea.destino.seccion}</span>
            <IconChevronRight size={14} />
          </span>
        </Link>
      </li>
    )
  }

  const panel = `tarea-${linea.clave}`
  return (
    <li>
      <button type="button" onClick={onAlternar} aria-expanded={abierta} aria-controls={panel} className={CLASE_LINEA}>
        {icono}
        {texto}
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary-700">
          {abierta ? 'Ocultar' : 'Ver'}
          <IconChevronDown size={14} className={cn('transition-transform', abierta && 'rotate-180')} />
        </span>
      </button>
      <div id={panel} hidden={!abierta} className="space-y-2 px-4 pb-4 sm:px-6">
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">{filas}</ul>
        <Link
          href={linea.destino.href}
          className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800"
        >
          {textoVerTodos(linea)}
          <IconChevronRight size={14} />
        </Link>
      </div>
    </li>
  )
}

/** Un estudio de «Requieren su acción» sin otro grupo: número, dirección y nombre; el detalle dice qué falta. */
function EstudioPendienteRow({ estudio }: { estudio: IEstudioPendiente }) {
  return (
    <li>
      <Link href={`/expedientes/${estudio.id}`} className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-gray-50">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 text-xs">
            <span className="whitespace-nowrap font-mono text-primary-700">Estudio {formatNumeroEstudio(estudio.numero)}</span>
            {estudio.direccion && (
              <span className="min-w-0 max-w-full truncate text-gray-600" title={estudio.direccion}>
                · {estudio.direccion}
              </span>
            )}
          </div>
          {estudio.solicitante && <p className="mt-0.5 truncate text-xs text-gray-500">{estudio.solicitante}</p>}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700">
          <IconAlertTriangle size={12} aria-hidden="true" />
          Ver qué falta
        </span>
      </Link>
    </li>
  )
}
