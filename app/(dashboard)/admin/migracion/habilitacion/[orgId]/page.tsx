/**
 * Habilitación de migración de una inmobiliaria (spec §1.1.4-§1.1.5): revisión
 * manual de la plantilla por destinación, documentos, convenio vigente y
 * suspensión de nuevas migraciones (§7.2.2).
 */

'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button, ConfirmDialog, MotivoDialog, PageHeader } from '@/components/ui'
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCheckCircle,
  IconExternalLink,
  IconPower,
  IconUpload,
} from '@/components/icons'
import { Chip, SeccionEstado, fechaCorta, useSeccion } from '@/components/dashboard/secciones/_shared'
import { errorPdf, migracionService } from '@/services/migracionService'
import type {
  Destinacion,
  EstadoHabilitacion,
  GuardarHabilitacionBody,
  HabilitacionConEstado,
  TipoDocumentoHabilitacion,
} from '@/types/migracion'

const msg = (e: unknown, def: string) => (e instanceof Error && e.message) || def

const INPUT =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'

type SiNo = '' | 'si' | 'no'
const aSiNo = (v: boolean | null | undefined): SiNo => (v == null ? '' : v ? 'si' : 'no')
const deSiNo = (v: SiNo) => (v === '' ? null : v === 'si')

function PreguntaSiNo({
  id,
  label,
  ayuda,
  value,
  onChange,
}: {
  id: string
  label: string
  ayuda?: string
  value: SiNo
  onChange: (v: SiNo) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-900">
        {label}
      </label>
      {ayuda && <p className="mt-0.5 text-xs text-gray-500">{ayuda}</p>}
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as SiNo)} className={`${INPUT} mt-1 sm:w-48`}>
        <option value="">Sin revisar</option>
        <option value="si">Sí</option>
        <option value="no">No</option>
      </select>
    </div>
  )
}

function CampoTexto({
  id,
  label,
  ayuda,
  value,
  onChange,
}: {
  id: string
  label: string
  ayuda?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-900">
        {label}
      </label>
      {ayuda && <p className="mt-0.5 text-xs text-gray-500">{ayuda}</p>}
      <textarea id={id} rows={2} value={value} onChange={(e) => onChange(e.target.value)} className={`${INPUT} mt-1`} />
    </div>
  )
}

function Documento({
  id,
  label,
  url,
  disabled,
  onCargar,
}: {
  id: string
  label: string
  url: string | null
  disabled: boolean
  onCargar: (f: File) => Promise<void>
}) {
  const [subiendo, setSubiendo] = useState(false)
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-gray-900">{label}</span>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-700 hover:underline">
            Ver PDF <IconExternalLink size={12} />
          </a>
        ) : (
          <Chip tone="orange">Pendiente</Chip>
        )}
      </div>
      <label
        htmlFor={id}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 ${
          disabled || subiendo ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'
        }`}
      >
        <IconUpload size={14} /> {subiendo ? 'Cargando…' : url ? 'Reemplazar' : 'Cargar PDF'}
      </label>
      <input
        id={id}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        disabled={disabled || subiendo}
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          const invalido = errorPdf(f)
          if (invalido) return toast.error(invalido)
          setSubiendo(true)
          try {
            await onCargar(f)
          } finally {
            setSubiendo(false)
          }
        }}
      />
    </div>
  )
}

function TarjetaDestinacion({
  orgId,
  destinacion,
  h,
  onCambio,
}: {
  orgId: string
  destinacion: Destinacion
  h: HabilitacionConEstado | undefined
  onCambio: () => void
}) {
  const comercial = destinacion === 'comercial'
  const [estado, setEstado] = useState<EstadoHabilitacion | ''>(h?.estado ?? '')
  const [arrendador, setArrendador] = useState(aSiNo(h?.arrendador_es_inmobiliaria))
  const [habeas, setHabeas] = useState(aSiNo(h?.habeas_subrogatario))
  const [deposito, setDeposito] = useState(aSiNo(h?.deposito_dinero))
  const [imputacion, setImputacion] = useState(h?.orden_imputacion ?? '')
  const [prorroga, setProrroga] = useState(h?.regimen_prorroga ?? '')
  const [renovacion, setRenovacion] = useState(h?.renovacion_comercial ?? '')
  const [observaciones, setObservaciones] = useState(h?.observaciones ?? '')
  const [convenio, setConvenio] = useState(h?.convenio_vigente_confirmado ?? false)
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    if (!estado) return
    const body: GuardarHabilitacionBody = {
      estado,
      arrendador_es_inmobiliaria: deSiNo(arrendador),
      habeas_subrogatario: deSiNo(habeas),
      deposito_dinero: deSiNo(deposito),
      orden_imputacion: imputacion.trim() || null,
      regimen_prorroga: prorroga.trim() || null,
      renovacion_comercial: comercial ? renovacion.trim() || null : null,
      observaciones: observaciones.trim() || null,
      convenio_vigente_confirmado: convenio,
    }
    setGuardando(true)
    try {
      await migracionService.guardarHabilitacion(orgId, destinacion, body)
      toast.success(`Revisión de ${destinacion} guardada.`)
      onCambio()
    } catch (e) {
      toast.error(msg(e, 'No se pudo guardar la revisión'))
    } finally {
      setGuardando(false)
    }
  }

  const cargarDoc = (tipo: TipoDocumentoHabilitacion) => async (f: File) => {
    try {
      await migracionService.cargarDocumento(orgId, destinacion, tipo, f)
      toast.success(tipo === 'plantilla' ? 'Plantilla de contrato cargada.' : 'Convenio de migración cargado.')
      onCambio()
    } catch (e) {
      toast.error(msg(e, 'No se pudo cargar el documento'))
    }
  }

  const p = `${destinacion}-`
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-lg font-bold capitalize text-gray-900">{destinacion}</h2>
          <p className="text-xs text-gray-500">
            {h?.revisado_en ? `Última revisión: ${fechaCorta(h.revisado_en)}` : 'Plantilla sin revisar'}
          </p>
        </div>
        {h && h.faltantes.length === 0 ? (
          <Chip tone="green">
            <IconCheckCircle size={12} /> Puede cargar archivos
          </Chip>
        ) : (
          <Chip tone="orange">No puede cargar archivos</Chip>
        )}
      </header>

      <div className="space-y-5 px-5 py-4">
        {h && h.faltantes.length > 0 && (
          <div className="flex gap-2 rounded-lg border border-coral-200 bg-coral-50 px-3 py-2 text-xs text-coral-800">
            <IconAlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>Falta: {h.faltantes.join('; ')}.</span>
          </div>
        )}

        <h3 className="text-sm font-semibold text-gray-700">Revisión de la plantilla</h3>
        <PreguntaSiNo
          id={`${p}arrendador`}
          label="¿La inmobiliaria figura como arrendadora?"
          ayuda="Si firma como mandataria y el arrendador es el propietario, la subrogación apuntaría a un tercero sin convenio: no se habilita o se exige la adhesión del propietario."
          value={arrendador}
          onChange={setArrendador}
        />
        <PreguntaSiNo
          id={`${p}habeas`}
          label="¿La cláusula de habeas data autoriza reportar a quien sea acreedor o subrogatario?"
          ayuda="Si no lo autoriza, Cofianza no podrá reportar a centrales a los arrendatarios migrados que incumplan."
          value={habeas}
          onChange={setHabeas}
        />
        <PreguntaSiNo
          id={`${p}deposito`}
          label="¿La plantilla contempla depósito en dinero?"
          ayuda={
            comercial
              ? 'En comercial es legalmente admisible y no descalifica.'
              : 'En vivienda está prohibido (artículo 16 de la Ley 820 de 2003): es causal de observación.'
          }
          value={deposito}
          onChange={setDeposito}
        />
        <CampoTexto id={`${p}imputacion`} label="Orden de imputación de pagos" value={imputacion} onChange={setImputacion} />
        <CampoTexto
          id={`${p}prorroga`}
          label="Régimen de prórroga"
          ayuda="Determina cuándo aplica la extensión automática de la fianza."
          value={prorroga}
          onChange={setProrroga}
        />
        {comercial && (
          <CampoTexto
            id={`${p}renovacion`}
            label="Régimen de renovación y desahucio (artículos 518 a 523 del Código de Comercio)"
            ayuda="Determina cuándo opera la extensión automática de la fianza a las renovaciones."
            value={renovacion}
            onChange={setRenovacion}
          />
        )}
        <CampoTexto id={`${p}observaciones`} label="Observaciones" value={observaciones} onChange={setObservaciones} />

        <div>
          <label htmlFor={`${p}estado`} className="block text-sm font-medium text-gray-900">
            Resultado de la revisión
          </label>
          <select
            id={`${p}estado`}
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoHabilitacion | '')}
            className={`${INPUT} mt-1 sm:w-64`}
          >
            <option value="">Seleccione…</option>
            <option value="habilitada">Habilitada</option>
            <option value="con_observaciones">Habilitada con observaciones</option>
            <option value="no_habilitada">No habilitada</option>
          </select>
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-900">
          <input
            type="checkbox"
            checked={convenio}
            onChange={(e) => setConvenio(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span>Confirmo que el convenio de inmobiliaria está vigente y firmado.</span>
        </label>

        <div className="flex justify-end">
          <Button onClick={guardar} disabled={guardando || !estado}>
            {guardando ? 'Guardando…' : h ? 'Guardar revisión' : 'Registrar revisión'}
          </Button>
        </div>

        <h3 className="text-sm font-semibold text-gray-700">Documentos</h3>
        {!h && <p className="text-xs text-gray-500">Registre primero la revisión para poder cargar los documentos.</p>}
        <Documento
          id={`${p}plantilla`}
          label="Plantilla de contrato revisada"
          url={h?.plantilla_url ?? null}
          disabled={!h}
          onCargar={cargarDoc('plantilla')}
        />
        <Documento
          id={`${p}convenio`}
          label="Convenio de migración firmado por el representante legal"
          url={h?.convenio_migracion_url ?? null}
          disabled={!h}
          onCargar={cargarDoc('convenio')}
        />
      </div>
    </section>
  )
}

export default function HabilitacionMigracionPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const { data, loading, error, reload } = useSeccion(() => migracionService.estadoOrg(orgId))
  const [suspendiendo, setSuspendiendo] = useState(false)
  const [reactivando, setReactivando] = useState(false)

  const suspender = async (motivo: string) => {
    try {
      await migracionService.suspender(orgId, motivo)
      toast.success('Migraciones suspendidas.')
      setSuspendiendo(false)
      reload()
    } catch (e) {
      toast.error(msg(e, 'No se pudo suspender'))
      return false
    }
  }

  const reactivar = async () => {
    try {
      await migracionService.reactivar(orgId)
      toast.success('Migraciones reactivadas.')
      reload()
    } catch (e) {
      // Solo la Gerencia General puede reactivar: se muestra el mensaje de la API.
      toast.error(msg(e, 'No se pudo reactivar'))
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/migracion" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <IconArrowLeft size={16} /> Migración de cartera
      </Link>

      {/* Skeleton solo en la primera carga: recargar no debe desmontar la otra tarjeta con cambios sin guardar. */}
      <SeccionEstado loading={loading && !data} error={error} onRetry={reload}>
        {data && (
          <>
            <PageHeader
              title={data.inmobiliaria.nombre}
              subtitle="Habilitación de migración. Cada destinación se revisa y habilita por separado."
            />

            <section
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-5 py-4 ${
                data.suspension ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="text-sm">
                {data.suspension ? (
                  <>
                    <p className="font-semibold text-red-800">
                      Migraciones suspendidas desde {fechaCorta(data.suspension.desde)}
                    </p>
                    {data.suspension.motivo && <p className="mt-0.5 text-red-700">{data.suspension.motivo}</p>}
                    <p className="mt-0.5 text-xs text-red-700">Solo la Gerencia General puede reactivarlas.</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-gray-900">Migraciones activas</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Al suspender, la inmobiliaria no puede cargar nuevos archivos. Los contratos ya migrados no cambian.
                    </p>
                  </>
                )}
              </div>
              {data.suspension ? (
                <Button variante="secondary" onClick={() => setReactivando(true)}>
                  <IconPower size={16} /> Reactivar
                </Button>
              ) : (
                <Button variante="danger" onClick={() => setSuspendiendo(true)}>
                  <IconPower size={16} /> Suspender
                </Button>
              )}
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              {(['vivienda', 'comercial'] as const).map((d) => {
                const h = data.habilitaciones.find((x) => x.destinacion === d)
                // La key reinicia el formulario con lo guardado tras cada cambio.
                return <TarjetaDestinacion key={`${d}-${h?.revisado_en ?? 'nueva'}`} orgId={orgId} destinacion={d} h={h} onCambio={reload} />
              })}
            </div>
          </>
        )}
      </SeccionEstado>

      <MotivoDialog
        isOpen={suspendiendo}
        onClose={() => setSuspendiendo(false)}
        onConfirm={suspender}
        title="Suspender migraciones"
        descripcion="La inmobiliaria no podrá cargar nuevos archivos de cartera hasta que la Gerencia General las reactive."
        label="Motivo de la suspensión"
        confirmLabel="Suspender"
        variant="danger"
      />
      <ConfirmDialog
        isOpen={reactivando}
        onClose={() => setReactivando(false)}
        onConfirm={reactivar}
        title="Reactivar migraciones"
        message="La inmobiliaria podrá volver a cargar archivos de cartera. Solo la Gerencia General puede hacerlo."
        confirmLabel="Reactivar"
      />
    </div>
  )
}
