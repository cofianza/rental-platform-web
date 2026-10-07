/**
 * Migración de cartera (backoffice, spec §1.1 y §8): inmobiliarias con su
 * habilitación por destinación y suspensión, y los lotes cargados.
 */

'use client'

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader, Button, buttonClasses } from '@/components/ui'
import { IconBuilding2, IconDownload, IconFolderOpen, IconUpload, IconShieldCheck } from '@/components/icons'
import {
  Chip,
  SeccionEstado,
  SeccionHeader,
  Tabla,
  Td,
  fechaCorta,
  money,
  useSeccion,
  type ChipTone,
} from '@/components/dashboard/secciones/_shared'
import { guardarArchivo, migracionService } from '@/services/migracionService'
import type { Destinacion, EstadoLote, InmobiliariaMigracion, LoteResumen } from '@/types/migracion'

const ESTADO_LOTE: Record<EstadoLote, { label: string; tone: ChipTone }> = {
  procesado: { label: 'Procesado', tone: 'blue' },
  en_firma: { label: 'Acta en firma', tone: 'yellow' },
  activo: { label: 'Activo', tone: 'green' },
  expirado: { label: 'Expirado', tone: 'gray' },
  cancelado: { label: 'Cancelado', tone: 'red' },
}

/** Chip del estado de habilitación de una destinación (§1.1.5). */
function ChipHabilitacion({ org, destinacion }: { org: InmobiliariaMigracion; destinacion: Destinacion }) {
  const h = org.habilitaciones.find((x) => x.destinacion === destinacion)
  if (!h) return <Chip tone="gray">Sin revisar</Chip>
  if (h.estado === 'no_habilitada') return <Chip tone="red">No habilitada</Chip>
  if (h.faltantes.length > 0)
    return (
      <>
        <Chip tone="orange">Incompleta</Chip>
        <span className="mt-1 block text-[11px] text-ink-500">Falta: {h.faltantes.join('; ')}</span>
      </>
    )
  return h.estado === 'con_observaciones' ? (
    <Chip tone="yellow">Con observaciones</Chip>
  ) : (
    <Chip tone="green">Habilitada</Chip>
  )
}

const puedeCargar = (o: InmobiliariaMigracion) =>
  !o.suspension && o.habilitaciones.some((h) => h.faltantes.length === 0)

async function cargar() {
  const [orgs, lotes] = await Promise.all([migracionService.listarInmobiliarias(), migracionService.listarLotes()])
  return { orgs, lotes }
}

const INPUT =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'

/** Reportes en Excel: liquidación mensual de la tarifa (§4.7) y contratos sobre formato anterior (§8.5). */
function Reportes({ orgs }: { orgs: { id: string; nombre: string }[] }) {
  const [mes, setMes] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).slice(0, 7))
  const [orgId, setOrgId] = useState('')
  const [ocupado, setOcupado] = useState<'liquidacion' | 'formato' | null>(null)

  const bajar = async (cual: 'liquidacion' | 'formato') => {
    setOcupado(cual)
    try {
      guardarArchivo(
        cual === 'liquidacion'
          ? await migracionService.liquidacionXlsx(mes, orgId || undefined)
          : await migracionService.reporteFormatoAnteriorXlsx(orgId || undefined),
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo descargar el reporte')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-ink-200 bg-white p-4">
      <label className="text-xs font-medium text-gray-700">
        Inmobiliaria
        <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className={`${INPUT} mt-1 block w-64`}>
          <option value="">Todas</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-gray-700">
        Mes de la liquidación
        <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className={`${INPUT} mt-1 block`} />
      </label>
      <Button variante="secondary" onClick={() => bajar('liquidacion')} disabled={!!ocupado || !mes}>
        <IconDownload size={16} /> {ocupado === 'liquidacion' ? 'Descargando…' : 'Liquidación mensual'}
      </Button>
      <Button variante="secondary" onClick={() => bajar('formato')} disabled={!!ocupado}>
        <IconDownload size={16} /> {ocupado === 'formato' ? 'Descargando…' : 'Contratos sobre formato anterior'}
      </Button>
    </div>
  )
}

export default function MigracionPage() {
  const { data, loading, error, reload } = useSeccion(cargar)
  const [descargando, setDescargando] = useState(false)

  const descargarPlantilla = async () => {
    setDescargando(true)
    try {
      guardarArchivo(await migracionService.descargarPlantilla())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo descargar la plantilla')
    } finally {
      setDescargando(false)
    }
  }

  const orgs = data?.orgs ?? []
  const lotes: LoteResumen[] = data?.lotes ?? []

  return (
    <div className="space-y-8">
      <PageHeader
        title="Migración de cartera"
        subtitle="Habilite a cada inmobiliaria, cargue su archivo de cartera y siga el estado de cada lote."
        actions={
          <>
            <Button variante="secondary" onClick={descargarPlantilla} disabled={descargando}>
              <IconDownload size={16} /> {descargando ? 'Descargando…' : 'Plantilla de cartera'}
            </Button>
            <Link href="/admin/migracion/carga" className={buttonClasses('primary')}>
              <IconUpload size={16} /> Cargar archivo
            </Link>
          </>
        }
      />

      <section>
        <SeccionHeader
          title="Inmobiliarias"
          subtitle="La carga solo se permite con la habilitación completa de al menos una destinación y sin suspensión."
        />
        <SeccionEstado
          loading={loading}
          error={error}
          onRetry={reload}
          vacio={
            orgs.length === 0 && {
              icon: IconBuilding2,
              titulo: 'No hay inmobiliarias para mostrar',
              descripcion: 'Aún no hay inmobiliarias activas en la plataforma.',
            }
          }
        >
          <Tabla head={['Inmobiliaria', 'Vivienda', 'Comercial', 'Migraciones', '']}>
            {orgs.map((o) => (
              <tr key={o.id}>
                <Td className="font-semibold">{o.nombre}</Td>
                <Td>
                  <ChipHabilitacion org={o} destinacion="vivienda" />
                </Td>
                <Td>
                  <ChipHabilitacion org={o} destinacion="comercial" />
                </Td>
                <Td>
                  {o.suspension ? (
                    <>
                      <Chip tone="red">Suspendidas desde {fechaCorta(o.suspension.desde)}</Chip>
                      {o.suspension.motivo && <span className="mt-1 block text-[11px] text-ink-500">{o.suspension.motivo}</span>}
                    </>
                  ) : (
                    <Chip tone="green">Activas</Chip>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/migracion/habilitacion/${o.id}`}
                      className={buttonClasses('secondary', 'sm')}
                    >
                      <IconShieldCheck size={14} /> Habilitación
                    </Link>
                    {puedeCargar(o) && (
                      <Link
                        href={`/admin/migracion/carga?inmobiliaria=${o.id}`}
                        className={buttonClasses('primary', 'sm')}
                      >
                        <IconUpload size={14} /> Cargar
                      </Link>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </Tabla>
        </SeccionEstado>
      </section>

      <section>
        <SeccionHeader title="Lotes" subtitle="Cada carga procesada crea un lote que se activa con la firma del Acta de Migración." />
        <SeccionEstado
          loading={loading}
          error={error}
          onRetry={reload}
          vacio={
            lotes.length === 0 && {
              icon: IconFolderOpen,
              titulo: 'Aún no hay lotes',
              descripcion: 'Los lotes aparecen aquí cuando se procesa un archivo de cartera.',
            }
          }
        >
          <Tabla head={['Lote', 'Inmobiliaria', 'Estado', 'Aceptadas', 'Rechazadas', 'Advertencias', 'Exposición', 'Creado', 'Vence / activado', '']}>
            {lotes.map((l) => (
              <tr key={l.id}>
                <Td className="font-semibold">{l.numero}</Td>
                <Td>{l.inmobiliaria?.nombre ?? '—'}</Td>
                <Td>
                  <Chip tone={ESTADO_LOTE[l.estado].tone}>{ESTADO_LOTE[l.estado].label}</Chip>
                </Td>
                <Td>{l.total_aceptadas}</Td>
                <Td>{l.total_rechazadas}</Td>
                <Td>{l.total_advertencias}</Td>
                <Td className="whitespace-nowrap">
                  {money(Number(l.exposicion_cop))}
                  {l.alerta_exposicion_en && (
                    <span className="ml-1">
                      <Chip tone="orange">Alerta</Chip>
                    </span>
                  )}
                </Td>
                <Td className="whitespace-nowrap">{fechaCorta(l.created_at)}</Td>
                <Td className="whitespace-nowrap">
                  {l.activado_en ? `Activado ${fechaCorta(l.activado_en)}` : `Vence ${fechaCorta(l.vence_en)}`}
                </Td>
                <Td className="text-right">
                  <Link href={`/admin/migracion/lotes/${l.id}`} className={buttonClasses('secondary', 'sm')}>
                    Ver lote
                  </Link>
                </Td>
              </tr>
            ))}
          </Tabla>
        </SeccionEstado>
      </section>

      <section>
        <SeccionHeader
          title="Reportes"
          subtitle="Liquidación de la tarifa mensual de la cartera migrada y contratos firmados sobre un formato anterior al revisado (quedan NO REPORTABLES salvo verificación)."
        />
        {!loading && !error && <Reportes orgs={orgs} />}
      </section>
    </div>
  )
}
