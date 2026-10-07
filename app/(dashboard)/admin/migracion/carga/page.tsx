/**
 * Carga del archivo de cartera (spec §2.4): primera pasada de validación con
 * reporte por fila y segunda pasada que crea el lote y su Acta de Migración (§3.3).
 */

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button, ConfirmDialog, PageHeader } from '@/components/ui'
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconBuilding2,
  IconCheckCircle,
  IconDownload,
  IconFileCheck,
  IconPlay,
  IconUpload,
  IconX,
} from '@/components/icons'
import {
  Chip,
  FiltroBar,
  Kpi,
  KpiRow,
  SeccionEstado,
  SeccionHeader,
  Tabla,
  Td,
  money,
  useSeccion,
  type ChipTone,
} from '@/components/dashboard/secciones/_shared'
import { guardarArchivo, migracionService } from '@/services/migracionService'
import type { RepresentanteLegal, ResultadoValidacion, ValidacionResultado } from '@/types/migracion'

// El mismo tope que la API (multer, 5 MB). El de filas lo valida la API con su calibración.
const MAX_BYTES = 5 * 1024 * 1024

const INPUT =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'

const RESULTADO: Record<ResultadoValidacion, { label: string; tone: ChipTone }> = {
  aceptada: { label: 'Aceptada', tone: 'green' },
  advertencia: { label: 'Con advertencia', tone: 'yellow' },
  rechazada: { label: 'Rechazada', tone: 'red' },
}

const REP_VACIO: RepresentanteLegal = {
  rep_legal_nombre: '',
  rep_legal_documento: '',
  rep_legal_email: '',
  rep_legal_celular: '',
}

const CAMPOS_REP: { key: keyof RepresentanteLegal; label: string; type: string }[] = [
  { key: 'rep_legal_nombre', label: 'Nombre completo', type: 'text' },
  { key: 'rep_legal_documento', label: 'Número de documento', type: 'text' },
  { key: 'rep_legal_email', label: 'Correo electrónico', type: 'email' },
  { key: 'rep_legal_celular', label: 'Celular', type: 'tel' },
]

const msg = (e: unknown, def: string) => (e instanceof Error && e.message) || def

/** Inmobiliarias que pueden cargar: sin suspensión y con al menos una destinación completa. */
async function cargarOrgs() {
  const preseleccion = new URLSearchParams(window.location.search).get('inmobiliaria')
  const orgs = (await migracionService.listarInmobiliarias())
    .filter((o) => !o.suspension && o.habilitaciones.some((h) => h.faltantes.length === 0))
    .map((o) => ({
      id: o.id,
      nombre: o.nombre,
      destinaciones: o.habilitaciones.filter((h) => h.faltantes.length === 0).map((h) => h.destinacion),
    }))
  return { orgs, preseleccion: orgs.some((o) => o.id === preseleccion) ? preseleccion : null }
}

export default function CargaMigracionPage() {
  const router = useRouter()
  const { data, loading, error, reload } = useSeccion(cargarOrgs)
  const [orgElegida, setOrgElegida] = useState<string | null>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [validacion, setValidacion] = useState<ValidacionResultado | null>(null)
  const [filtro, setFiltro] = useState<ResultadoValidacion | ''>('')
  const [rep, setRep] = useState<RepresentanteLegal>(REP_VACIO)
  const [ocupado, setOcupado] = useState<'plantilla' | 'validar' | 'reporte' | null>(null)
  const [confirmar, setConfirmar] = useState(false)

  const orgs = data?.orgs ?? []
  const orgId = orgElegida ?? data?.preseleccion ?? ''
  const org = orgs.find((o) => o.id === orgId)

  // Cambiar de inmobiliaria o de archivo invalida el reporte: se procesa exactamente lo validado.
  const reiniciar = () => {
    setValidacion(null)
    setFiltro('')
  }

  const elegirArchivo = (f: File | undefined) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.xlsx')) return toast.error('Cargue la plantilla de Cofianza en formato Excel (.xlsx).')
    if (f.size > MAX_BYTES) return toast.error('El archivo supera 5 MB. Divídalo en varios lotes.')
    setArchivo(f)
    reiniciar()
  }

  const conOcupado = async (tipo: NonNullable<typeof ocupado>, fn: () => Promise<void>, def: string) => {
    setOcupado(tipo)
    try {
      await fn()
    } catch (e) {
      toast.error(msg(e, def))
    } finally {
      setOcupado(null)
    }
  }

  const validar = () =>
    conOcupado(
      'validar',
      async () => {
        if (!archivo) return
        setValidacion(await migracionService.validar(orgId, archivo))
        setFiltro('')
      },
      'No se pudo validar el archivo',
    )

  const procesar = async () => {
    if (!archivo) return
    try {
      const r = await migracionService.procesar(orgId, archivo, rep)
      toast.success(`Lote ${r.lote.numero} creado con ${r.resumen.aceptadas + r.resumen.advertencias} contratos.`)
      router.push(`/admin/migracion/lotes/${r.lote.id}`)
    } catch (e) {
      toast.error(msg(e, 'No se pudo procesar el archivo'))
    }
  }

  const resumen = validacion?.resumen
  const usables = resumen ? resumen.aceptadas + resumen.advertencias : 0
  const filas = (validacion?.filas ?? []).filter((f) => !filtro || f.resultado === filtro)
  const repCompleto = Object.values(rep).every((v) => v.trim().length > 0)
  const toggle = (r: ResultadoValidacion) => setFiltro((f) => (f === r ? '' : r))

  return (
    <div className="space-y-8">
      <Link href="/admin/migracion" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <IconArrowLeft size={16} /> Migración de cartera
      </Link>

      <PageHeader
        title="Cargar archivo de cartera"
        subtitle="Valide primero el archivo; luego procese los contratos aceptados para crear el lote y enviar el Acta de Migración."
        actions={
          <Button
            variante="secondary"
            disabled={ocupado !== null}
            onClick={() =>
              conOcupado('plantilla', async () => guardarArchivo(await migracionService.descargarPlantilla()), 'No se pudo descargar la plantilla')
            }
          >
            <IconDownload size={16} /> {ocupado === 'plantilla' ? 'Descargando…' : 'Plantilla de cartera'}
          </Button>
        }
      />

      <section>
        <SeccionHeader title="1. Inmobiliaria y archivo" subtitle="Solo aparecen las inmobiliarias habilitadas y sin suspensión." />
        <SeccionEstado
          loading={loading}
          error={error}
          onRetry={reload}
          vacio={
            orgs.length === 0 && {
              icon: IconBuilding2,
              titulo: 'No hay inmobiliarias habilitadas para cargar',
              descripcion: 'Complete la habilitación de al menos una destinación desde Migración de cartera.',
              action: (
                <Link href="/admin/migracion" className="text-sm font-semibold text-primary-700 hover:underline">
                  Ir a Migración de cartera
                </Link>
              ),
            }
          }
        >
          <div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 md:grid-cols-2">
            <div>
              <label htmlFor="org" className="block text-sm font-medium text-gray-900">
                Inmobiliaria
              </label>
              <select
                id="org"
                value={orgId}
                disabled={ocupado !== null}
                onChange={(e) => {
                  setOrgElegida(e.target.value)
                  reiniciar()
                }}
                className={`${INPUT} mt-1`}
              >
                <option value="">Seleccione…</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre}
                  </option>
                ))}
              </select>
              {org && <p className="mt-1 text-xs text-gray-500">Habilitada para: {org.destinaciones.join(' y ')}.</p>}
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-900">Archivo (.xlsx, máximo 5 MB)</span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <label
                  htmlFor="archivo"
                  className={`inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 ${
                    ocupado ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'
                  }`}
                >
                  <IconUpload size={16} /> {archivo ? 'Cambiar archivo' : 'Seleccionar archivo'}
                </label>
                <input
                  id="archivo"
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sr-only"
                  disabled={ocupado !== null}
                  onChange={(e) => {
                    elegirArchivo(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
                {archivo && <span className="truncate text-sm text-gray-700">{archivo.name}</span>}
              </div>
              <p className="mt-1 text-xs text-gray-500">El máximo de contratos por carga viene indicado en la plantilla.</p>
            </div>

            <div className="flex justify-end md:col-span-2">
              <Button onClick={validar} disabled={!org || !archivo || ocupado !== null}>
                <IconFileCheck size={16} /> {ocupado === 'validar' ? 'Validando…' : 'Validar archivo'}
              </Button>
            </div>
          </div>
        </SeccionEstado>
      </section>

      {validacion && resumen && (
        <section>
          <SeccionHeader
            title="2. Reporte de validación"
            subtitle="Esta revisión no crea nada. Solo se procesan las filas aceptadas y con advertencia."
            right={
              <Button
                variante="secondary"
                tamano="sm"
                disabled={ocupado !== null}
                onClick={() =>
                  conOcupado(
                    'reporte',
                    async () => guardarArchivo(await migracionService.validarXlsx(orgId, archivo!)),
                    'No se pudo descargar el reporte',
                  )
                }
              >
                <IconDownload size={14} /> {ocupado === 'reporte' ? 'Descargando…' : 'Descargar reporte'}
              </Button>
            }
          />
          <KpiRow cols={4}>
            <Kpi label="Filas" value={resumen.total} onClick={() => setFiltro('')} active={!filtro} />
            <Kpi label="Aceptadas" value={resumen.aceptadas} tone="green" Icon={IconCheckCircle} onClick={() => toggle('aceptada')} active={filtro === 'aceptada'} />
            <Kpi label="Con advertencia" value={resumen.advertencias} tone="orange" Icon={IconAlertTriangle} onClick={() => toggle('advertencia')} active={filtro === 'advertencia'} />
            <Kpi label="Rechazadas" value={resumen.rechazadas} tone="red" Icon={IconX} onClick={() => toggle('rechazada')} active={filtro === 'rechazada'} />
          </KpiRow>

          <div className="mt-4">
            <FiltroBar count={`${filas.length} de ${resumen.total} filas`} onClear={filtro ? () => setFiltro('') : undefined}>
              <span className="text-xs text-gray-500">
                {filtro ? `Mostrando: ${RESULTADO[filtro].label.toLowerCase()}` : 'Use las tarjetas para filtrar por resultado.'}
              </span>
            </FiltroBar>
            <Tabla head={['Fila', 'Resultado', 'Inmueble', 'Arrendatario', 'Canon', 'Reportable', 'Tarifa', 'Motivos y advertencias']} zebra>
              {filas.map((f) => (
                <tr key={f.n_fila}>
                  <Td className="font-semibold">{f.n_fila}</Td>
                  <Td>
                    <Chip tone={RESULTADO[f.resultado].tone}>{RESULTADO[f.resultado].label}</Chip>
                  </Td>
                  <Td>
                    {f.direccion ?? '—'}
                    {f.municipio && <span className="block text-ink-500">{f.municipio}</span>}
                  </Td>
                  <Td>
                    {f.arrendatario ?? '—'}
                    {f.documento && <span className="block text-ink-500">{f.documento}</span>}
                  </Td>
                  <Td className="whitespace-nowrap">{f.canon == null ? '—' : money(f.canon)}</Td>
                  <Td>{f.reportable == null ? '—' : f.reportable ? 'Sí' : 'No'}</Td>
                  <Td className="whitespace-nowrap">{f.tarifa_pct == null ? '—' : `${f.tarifa_pct} %`}</Td>
                  <Td className="min-w-64">
                    {f.motivos.length === 0 && f.advertencias.length === 0 && '—'}
                    <ul className="space-y-0.5">
                      {f.motivos.map((m, i) => (
                        <li key={`m${i}`} className="text-red-700">{m}</li>
                      ))}
                      {f.advertencias.map((a, i) => (
                        <li key={`a${i}`} className="text-coral-700">{a}</li>
                      ))}
                    </ul>
                  </Td>
                </tr>
              ))}
            </Tabla>
            {filas.length === 0 && <p className="mt-3 text-center text-xs text-gray-500">No hay filas con este resultado.</p>}
          </div>
        </section>
      )}

      {validacion && (
        <section>
          <SeccionHeader
            title="3. Representante legal y procesamiento"
            subtitle="El representante legal de la inmobiliaria firma el Acta de Migración por Auco."
          />
          {usables === 0 ? (
            <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
              Ningún contrato del archivo es aceptable. Corrija el archivo según el reporte y valídelo de nuevo.
            </div>
          ) : (
            <form
              className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault()
                setConfirmar(true)
              }}
            >
              {CAMPOS_REP.map((c) => (
                <div key={c.key}>
                  <label htmlFor={c.key} className="block text-sm font-medium text-gray-900">
                    {c.label}
                  </label>
                  <input
                    id={c.key}
                    type={c.type}
                    required
                    value={rep[c.key]}
                    onChange={(e) => setRep((r) => ({ ...r, [c.key]: e.target.value }))}
                    className={`${INPUT} mt-1`}
                  />
                </div>
              ))}
              <div className="flex justify-end md:col-span-2">
                <Button type="submit" disabled={!repCompleto || ocupado !== null}>
                  <IconPlay size={16} /> Procesar {usables} {usables === 1 ? 'contrato' : 'contratos'}
                </Button>
              </div>
            </form>
          )}
        </section>
      )}

      <ConfirmDialog
        isOpen={confirmar}
        onClose={() => setConfirmar(false)}
        onConfirm={procesar}
        title="Procesar el archivo"
        confirmLabel="Procesar"
        message={
          <div className="space-y-2">
            <p>
              Se creará un lote de <strong>{org?.nombre}</strong> con {usables} {usables === 1 ? 'contrato' : 'contratos'}
              {resumen?.rechazadas ? ` y se descartarán ${resumen.rechazadas} filas rechazadas` : ''}.
            </p>
            <p>
              Los contratos se activan cuando {rep.rep_legal_nombre || 'el representante legal'} firme el Acta de Migración.
            </p>
          </div>
        }
      />
    </div>
  )
}
