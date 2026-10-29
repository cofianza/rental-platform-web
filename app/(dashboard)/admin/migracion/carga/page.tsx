/**
 * Carga del archivo de cartera (spec §2.4): primera pasada de validación con
 * reporte por fila y segunda pasada que crea el lote y su Acta de Migración (§3.3).
 * Adenda 1 §5: el archivo es el que exporta el sistema de la inmobiliaria, con
 * su mapeo de columnas y la vista previa confirmada, o la plantilla de Cofianza.
 */

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button, ConfirmDialog, PageHeader } from '@/components/ui'
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconBuilding2,
  IconCheckCircle,
  IconDownload,
  IconEye,
  IconFileCheck,
  IconPlay,
  IconSettings,
  IconShield,
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
  fechaCorta,
  money,
  useSeccion,
  type ChipTone,
} from '@/components/dashboard/secciones/_shared'
import { ApiClientError } from '@/lib/api'
import { CoincidenciasListas } from '@/components/migracion/CoincidenciasListas'
import { EstadoListas, masAntigua } from '@/components/migracion/EstadoListas'
import { DialogoEquivalencias, EditorMapeo, MAPEO_VACIO, TablaVistaPrevia, campoUI } from '@/components/migracion/MapeoNativo'
import { guardarArchivo, migracionService } from '@/services/migracionService'
import type {
  CampoMapeo,
  CargaNativa,
  EstadoListasFila,
  MapeoColumnas,
  RepresentanteLegal,
  ResultadoValidacion,
  ValidacionResultado,
  VistaPreviaNativa,
} from '@/types/migracion'

// El mismo tope que la API (multer, 5 MB). El de filas lo valida la API con su calibración.
const MAX_BYTES = 5 * 1024 * 1024

const INPUT =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'

const RESULTADO: Record<ResultadoValidacion, { label: string; tone: ChipTone }> = {
  aceptada: { label: 'Aceptada', tone: 'green' },
  advertencia: { label: 'Con advertencia', tone: 'yellow' },
  rechazada: { label: 'Rechazada', tone: 'red' },
}

// Adenda 1 §6: el estado de la verificación en listas, junto al resultado de la fila.
const LISTAS: Partial<Record<EstadoListasFila, { label: string; tone: ChipTone }>> = {
  por_confirmar: { label: 'Listas: por confirmar', tone: 'orange' },
  confirmada: { label: 'Listas: confirmada', tone: 'red' },
  descartada: { label: 'Listas: descartada', tone: 'gray' },
}

type Filtro = ResultadoValidacion | 'listas' | ''

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

type TipoArchivo = 'nativo' | 'plantilla'

const TIPOS_ARCHIVO: { valor: TipoArchivo; titulo: string; ayuda: string }[] = [
  {
    valor: 'nativo',
    titulo: 'Archivo de su sistema',
    ayuda: 'El archivo tal como lo exporta el sistema de la inmobiliaria. Usted indica de qué columna sale cada dato.',
  },
  { valor: 'plantilla', titulo: 'Plantilla de Cofianza', ayuda: 'La plantilla diligenciada, con los datos del lote en la hoja Instrucciones.' },
]

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
  // Adenda 1 §4.4: códigos internos que la inmobiliaria relaciona con mora (texto libre, como lo envía).
  const [conMora, setConMora] = useState('')
  const [validacion, setValidacion] = useState<ValidacionResultado | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('')
  const [rep, setRep] = useState<RepresentanteLegal>(REP_VACIO)
  const [ocupado, setOcupado] = useState<'plantilla' | 'validar' | 'reporte' | 'vista' | 'guardar' | 'mapeo' | null>(null)
  const [confirmar, setConfirmar] = useState(false)
  // Adenda 1 §5: archivo nativo con mapeo (por defecto) o plantilla de Cofianza.
  const [tipoArchivo, setTipoArchivo] = useState<TipoArchivo>('nativo')
  const [mapeo, setMapeo] = useState<MapeoColumnas>(MAPEO_VACIO)
  const [mapeoGuardadoEn, setMapeoGuardadoEn] = useState<string | null>(null)
  // §5.4: la vista previa vale para el archivo y el mapeo con que se generó; validar y procesar exigen confirmarla.
  const [vista, setVista] = useState<VistaPreviaNativa | null>(null)
  const [vistaVigente, setVistaVigente] = useState(false)
  const [confirmada, setConfirmada] = useState(false)
  const [equivalencias, setEquivalencias] = useState<{ campo: CampoMapeo; precargar: string[] } | null>(null)

  const orgs = data?.orgs ?? []
  const orgId = orgElegida ?? data?.preseleccion ?? ''
  const org = orgs.find((o) => o.id === orgId)
  const nativo = tipoArchivo === 'nativo'
  // Lo que se confirmó en la vista previa: viaja tal cual a validar, al reporte y a procesar.
  const nativa: CargaNativa | undefined =
    nativo && vistaVigente && confirmada && vista?.confirmacion ? { mapeo: vista.mapeo, confirmacion: vista.confirmacion } : undefined

  // Cambiar de inmobiliaria o de archivo invalida el reporte: se procesa exactamente lo validado.
  const reiniciar = () => {
    setValidacion(null)
    setFiltro('')
  }
  // Cambiar el archivo, el mapeo, la inmobiliaria o el tipo de archivo invalida además la vista previa.
  const invalidar = () => {
    setVistaVigente(false)
    setConfirmada(false)
    reiniciar()
  }

  const conOcupado = async (tipo: NonNullable<typeof ocupado>, fn: () => Promise<void>, def: string) => {
    setOcupado(tipo)
    try {
      await fn()
    } catch (e) {
      // El archivo o el mapeo cambiaron desde la vista previa: hay que verla y confirmarla de nuevo.
      if (e instanceof ApiClientError && e.code === 'MIGRACION_VISTA_PREVIA_SIN_CONFIRMAR') invalidar()
      toast.error(msg(e, def))
    } finally {
      setOcupado(null)
    }
  }

  const verVistaPrevia = (m: MapeoColumnas = mapeo, f: File | null = archivo) => {
    if (!f || !orgId) return
    void conOcupado(
      'vista',
      async () => {
        const r = await migracionService.vistaPrevia(orgId, f, m)
        setVista(r)
        setMapeo(r.mapeo) // el efectivo, con la hoja resuelta
        setVistaVigente(true)
        setConfirmada(false)
      },
      'No se pudo generar la vista previa',
    )
  }

  // §5.5: el mapeo guardado de la inmobiliaria; con el archivo ya elegido, la vista previa sale enseguida.
  useEffect(() => {
    if (!orgId) return
    let vigente = true
    // Mientras llega no se elige archivo ni se genera vista previa: saldría con el mapeo de la inmobiliaria anterior.
    setOcupado('mapeo')
    migracionService
      .mapeo(orgId)
      .catch(() => {
        toast.error('No se pudo cargar el mapeo guardado')
        return null
      })
      .then((r) => {
        if (!vigente) return
        setOcupado(null)
        const m = r?.definicion ?? MAPEO_VACIO
        setMapeo(m)
        setMapeoGuardadoEn(r?.actualizado_en ?? null)
        if (nativo) verVistaPrevia(m)
      })
    return () => {
      vigente = false
    }
    // Solo al cambiar de inmobiliaria: el archivo y el modo vigentes se leen en ese momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const cambiarMapeo = (m: MapeoColumnas) => {
    setMapeo(m)
    invalidar()
  }

  const elegirArchivo = (f: File | undefined) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.xlsx')) return toast.error('Cargue el archivo en formato Excel (.xlsx).')
    if (f.size > MAX_BYTES) return toast.error('El archivo supera 5 MB. Divídalo en varios lotes.')
    setArchivo(f)
    invalidar()
    if (nativo) verVistaPrevia(mapeo, f)
  }

  // mantenerFiltro: la revalidación tras decidir una coincidencia en listas deja al analista donde estaba.
  const validar = (mantenerFiltro = false) =>
    conOcupado(
      'validar',
      async () => {
        // §5.4: el archivo nativo no avanza sin la vista previa confirmada.
        if (!archivo || (nativo && !nativa)) return
        setValidacion(await migracionService.validar(orgId, archivo, conMora, nativa))
        if (!mantenerFiltro) setFiltro('')
      },
      'No se pudo validar el archivo',
    )

  const procesar = async () => {
    if (!archivo || (nativo && !nativa)) return
    try {
      const r = await migracionService.procesar(orgId, archivo, rep, conMora, nativa)
      toast.success(`Lote ${r.lote.numero} creado con ${r.resumen.aceptadas + r.resumen.advertencias} contratos.`)
      router.push(`/admin/migracion/lotes/${r.lote.id}`)
    } catch (e) {
      if (e instanceof ApiClientError && e.code === 'MIGRACION_VISTA_PREVIA_SIN_CONFIRMAR') invalidar()
      toast.error(msg(e, 'No se pudo procesar el archivo'))
    }
  }

  const guardarMapeo = () =>
    conOcupado(
      'guardar',
      async () => {
        const r = await migracionService.guardarMapeo(orgId, mapeo)
        setMapeoGuardadoEn(r.actualizado_en)
        toast.success(`Mapeo guardado. Se usará en las próximas cargas de ${org?.nombre ?? 'esta inmobiliaria'}.`)
      },
      'No se pudo guardar el mapeo',
    )

  // Numeración de las secciones: en el archivo nativo van antes el mapeo y la vista previa.
  const n = (i: number) => (nativo ? i + 2 : i)
  const sinEquivalencia = Object.entries(vista?.sin_equivalencia ?? {}) as [CampoMapeo, string[]][]

  const resumen = validacion?.resumen
  const lote = validacion?.declaracion_lote
  const usables = resumen ? resumen.aceptadas + resumen.advertencias : 0
  const filas = (validacion?.filas ?? []).filter((f) =>
    filtro === 'listas' ? f.listas?.estado === 'por_confirmar' : !filtro || f.resultado === filtro,
  )
  const repCompleto = Object.values(rep).every((v) => v.trim().length > 0)
  const toggle = (r: Exclude<Filtro, ''>) => setFiltro((f) => (f === r ? '' : r))
  // Adenda 1 §6: sin decidir todas las coincidencias en listas no se procesa (la API responde 409).
  const porConfirmar = resumen?.listas_por_confirmar ?? 0
  const confirmadas = resumen?.listas_confirmadas ?? 0
  const verificacion = validacion?.verificacion_listas

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
            <div className="md:col-span-2">
              <EstadoListas compacto />
            </div>
            <fieldset className="md:col-span-2">
              <legend className="text-sm font-medium text-gray-900">¿Qué archivo envió la inmobiliaria?</legend>
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                {TIPOS_ARCHIVO.map((t) => (
                  <label
                    key={t.valor}
                    className={`flex cursor-pointer gap-2 rounded-lg border p-3 text-sm ${
                      tipoArchivo === t.valor ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipo-archivo"
                      value={t.valor}
                      checked={tipoArchivo === t.valor}
                      disabled={ocupado !== null}
                      onChange={() => {
                        setTipoArchivo(t.valor)
                        invalidar()
                        if (t.valor === 'nativo') verVistaPrevia()
                      }}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block font-semibold text-gray-900">{t.titulo}</span>
                      <span className="block text-xs text-gray-600">{t.ayuda}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
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
                  invalidar()
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
              <p className="mt-1 text-xs text-gray-500">
                {nativo
                  ? 'Solo Excel (.xlsx). Si el sistema exporta CSV o .xls, ábralo en Excel y guárdelo como .xlsx sin cambiar columnas.'
                  : 'El máximo de contratos por carga viene indicado en la plantilla.'}
              </p>
            </div>

            {/* Adenda 1 §4.4 y §4.6: la excepción de mora del lote, por código interno. Cambiarla invalida el reporte. */}
            <div className="md:col-span-2">
              <label htmlFor="con-mora" className="block text-sm font-medium text-gray-900">
                Contratos declarados con mora (opcional)
              </label>
              <textarea
                id="con-mora"
                rows={2}
                value={conMora}
                disabled={ocupado !== null}
                onChange={(e) => {
                  setConMora(e.target.value)
                  reiniciar()
                }}
                placeholder="APT-501, LOC-102"
                className={`${INPUT} mt-1`}
              />
              <p className="mt-1 text-xs text-gray-500">
                Códigos internos de los contratos que, según la inmobiliaria, no están al día o tuvieron mora en los meses que exige la
                declaración. Sepárelos con coma o en renglones distintos. Esos contratos no se migran: quedan rechazados y el Acta los
                relaciona como excepción.
              </p>
            </div>

            {!nativo && (
              <div className="flex justify-end md:col-span-2">
                <Button onClick={() => validar()} disabled={!org || !archivo || ocupado !== null}>
                  <IconFileCheck size={16} /> {ocupado === 'validar' ? 'Validando…' : 'Validar archivo'}
                </Button>
              </div>
            )}
          </div>
        </SeccionEstado>
      </section>

      {/* Adenda 1 §5.1-§5.5: de qué columna sale cada dato; queda guardado para la inmobiliaria. */}
      {nativo && org && archivo && (
        <section>
          <SeccionHeader
            title="2. Mapeo de columnas"
            subtitle="Indique de qué columna del archivo sale cada dato. El mapeo queda guardado para las próximas cargas de esta inmobiliaria."
          />
          <p className="mb-3 text-sm text-gray-700">
            {mapeoGuardadoEn
              ? `Mapeo guardado el ${fechaCorta(mapeoGuardadoEn)}.`
              : 'Esta inmobiliaria no tiene mapeo guardado: configúrelo una vez.'}
          </p>
          <EditorMapeo
            mapeo={mapeo}
            hojas={vista?.hojas ?? []}
            encabezados={vista?.encabezados ?? []}
            disabled={ocupado !== null}
            onChange={cambiarMapeo}
            onEstructura={(m) => {
              // Salir del campo sin cambiar la hoja ni la fila no anula la vista previa ya confirmada.
              if (vistaVigente && m.hoja === vista?.mapeo.hoja && m.fila_encabezados === vista?.mapeo.fila_encabezados) return
              cambiarMapeo(m)
              verVistaPrevia(m)
            }}
            onEquivalencias={(campo) => setEquivalencias({ campo, precargar: [] })}
          />
          {vista && vistaVigente && (vista.errores.length > 0 || vista.avisos.length > 0) && (
            <ul className="mt-3 space-y-1 text-sm">
              {vista.errores.map((e) => (
                <li key={e} className="text-red-700">
                  {e}
                </li>
              ))}
              {vista.avisos.map((a) => (
                <li key={a} className="text-amber-700">
                  {a}
                </li>
              ))}
            </ul>
          )}
          {!vistaVigente && (
            <p role="status" className="mt-3 text-sm text-amber-700">
              {vista ? 'Cambió el mapeo: actualice la vista previa antes de seguir.' : 'Genere la vista previa para ver las columnas del archivo.'}
            </p>
          )}
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button variante="secondary" disabled={ocupado !== null} onClick={guardarMapeo}>
              <IconSettings size={16} /> {ocupado === 'guardar' ? 'Guardando…' : 'Guardar mapeo'}
            </Button>
            <Button disabled={ocupado !== null} onClick={() => verVistaPrevia()}>
              <IconEye size={16} /> {ocupado === 'vista' ? 'Generando…' : 'Actualizar vista previa'}
            </Button>
          </div>
        </section>
      )}

      {/* Adenda 1 §5.4: las primeras diez filas transformadas; sin confirmarlas el lote no avanza. */}
      {nativo && org && archivo && vista && vistaVigente && (
        <section>
          <SeccionHeader
            title="3. Vista previa: primeras 10 filas transformadas"
            subtitle="Así quedan los datos después de aplicar el mapeo, cada uno en su columna. Revíselos antes de seguir: un dato en la columna equivocada no se nota hasta que hay una mora."
          />
          <p className="mb-3 text-sm text-gray-700">
            El archivo tiene {vista.total_filas} {vista.total_filas === 1 ? 'contrato' : 'contratos'}; se muestran las primeras {vista.filas.length}{' '}
            filas.
          </p>
          <TablaVistaPrevia vista={vista} />
          {sinEquivalencia.length > 0 && (
            <div role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">Valores sin equivalencia en todo el archivo. Las filas con estos valores se rechazarán (en tipo de inmueble, el inmueble se carga sin ese dato):</p>
              <ul className="mt-2 space-y-2">
                {sinEquivalencia.map(([campo, valores]) => (
                  <li key={campo} className="flex flex-wrap items-center gap-2">
                    <span>
                      {campoUI(campo).corta}: {valores.map((v) => `«${v}»`).join(', ')}
                    </span>
                    <Button
                      variante="secondary"
                      tamano="sm"
                      disabled={ocupado !== null}
                      onClick={() => setEquivalencias({ campo, precargar: valores })}
                    >
                      Agregar equivalencias
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
            <label className="flex items-start gap-2 text-sm text-gray-900">
              <input
                type="checkbox"
                checked={confirmada}
                disabled={!vista.confirmacion || ocupado !== null}
                onChange={(e) => {
                  setConfirmada(e.target.checked)
                  reiniciar()
                }}
                className="mt-0.5"
              />
              <span>
                Revisé las diez filas transformadas: cada dato quedó en su columna y con el valor correcto.
                {!vista.confirmacion && <span className="block text-xs text-red-700">Corrija los errores del mapeo para poder confirmar.</span>}
              </span>
            </label>
            <Button onClick={() => validar()} disabled={!confirmada || !nativa || ocupado !== null}>
              <IconFileCheck size={16} /> {ocupado === 'validar' ? 'Validando…' : 'Validar archivo'}
            </Button>
          </div>
        </section>
      )}

      {validacion && resumen && (
        <section>
          <SeccionHeader
            title={`${n(2)}. Reporte de validación`}
            subtitle="Esta revisión no crea nada. Solo se procesan las filas aceptadas y con advertencia."
            right={
              <Button
                variante="secondary"
                tamano="sm"
                disabled={ocupado !== null}
                onClick={() =>
                  conOcupado(
                    'reporte',
                    async () => guardarArchivo(await migracionService.validarXlsx(orgId, archivo!, conMora, nativa)),
                    'No se pudo descargar el reporte',
                  )
                }
              >
                <IconDownload size={14} /> {ocupado === 'reporte' ? 'Descargando…' : 'Descargar reporte'}
              </Button>
            }
          />
          {/* Adenda 1 §4.5: lo que el archivo declara para el lote; las columnas vacías toman estos valores. */}
          {lote && (
            <p className="mb-3 text-sm text-gray-700">
              <span className="font-semibold">Datos del lote ({nativo ? 'declarados en el mapeo' : 'hoja Instrucciones'}):</span> municipio {lote.municipio ?? 'sin indicar'} · tipo de
              documento {lote.tipo_documento ?? 'sin indicar'} · autoriza el reporte a centrales:{' '}
              {lote.autoriza_reporte == null ? 'sin indicar (cada contrato debe traer su respuesta)' : lote.autoriza_reporte ? 'Sí' : 'No'}
              {!!lote.contratos_con_mora?.length && ` · declarados con mora: ${lote.contratos_con_mora.join(', ')}`}.
            </p>
          )}
          {verificacion && (
            <p className="mb-3 text-sm text-gray-700">
              <span className="font-semibold">Listas restrictivas:</span> se verificaron {verificacion.arrendatarios_verificados}{' '}
              {verificacion.arrendatarios_verificados === 1 ? 'arrendatario' : 'arrendatarios'} contra OFAC SDN, OFAC consolidada no SDN y ONU
              (copias del {fechaCorta(masAntigua(verificacion.listas))}).
            </p>
          )}
          {porConfirmar > 0 && (
            <div role="alert" className="mb-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Coincidencias en listas restrictivas por confirmar ({porConfirmar})</p>
                <p className="mt-0.5">
                  Revise cada coincidencia en la tabla. Si es la misma persona, confírmela: el contrato no se migra, no figura en el Acta y se avisa
                  a los administradores para el protocolo SAGRILAFT. Si no lo es, descártela con el motivo. No se puede procesar el archivo mientras
                  haya coincidencias por confirmar.
                </p>
              </div>
            </div>
          )}
          <KpiRow cols={5}>
            <Kpi label="Filas" value={resumen.total} onClick={() => setFiltro('')} active={!filtro} />
            <Kpi label="Aceptadas" value={resumen.aceptadas} tone="green" Icon={IconCheckCircle} onClick={() => toggle('aceptada')} active={filtro === 'aceptada'} />
            <Kpi label="Con advertencia" value={resumen.advertencias} tone="orange" Icon={IconAlertTriangle} onClick={() => toggle('advertencia')} active={filtro === 'advertencia'} />
            <Kpi label="Rechazadas" value={resumen.rechazadas} tone="red" Icon={IconX} onClick={() => toggle('rechazada')} active={filtro === 'rechazada'} />
            <Kpi
              label="Por confirmar en listas"
              value={porConfirmar}
              tone="orange"
              Icon={IconShield}
              onClick={() => toggle('listas')}
              active={filtro === 'listas'}
            />
          </KpiRow>
          {/* Adenda 1 §7: sin documento del arrendatario la fila no se rechaza; entra al acta sin cobertura. */}
          {(resumen.pendientes_identificacion ?? 0) > 0 && (
            <p className="mt-3 text-sm text-amber-700">
              {resumen.pendientes_identificacion === 1 ? 'Un contrato no trae' : `${resumen.pendientes_identificacion} contratos no traen`} el
              documento del arrendatario: {resumen.pendientes_identificacion === 1 ? 'entra' : 'entran'} al acta como PENDIENTES DE IDENTIFICACIÓN, sin
              cobertura hasta que la inmobiliaria entregue el documento.
            </p>
          )}

          <div className="mt-4">
            <FiltroBar count={`${filas.length} de ${resumen.total} filas`} onClear={filtro ? () => setFiltro('') : undefined}>
              <span className="text-xs text-gray-500">
                {filtro === 'listas'
                  ? 'Mostrando: por confirmar en listas'
                  : filtro
                    ? `Mostrando: ${RESULTADO[filtro].label.toLowerCase()}`
                    : 'Use las tarjetas para filtrar por resultado.'}
              </span>
            </FiltroBar>
            <Tabla head={['Fila', 'Resultado', 'Inmueble', 'Arrendatario', 'Canon', 'Reportable', 'Tarifa', 'Motivos y advertencias']} zebra>
              {filas.map((f) => (
                <tr key={f.n_fila}>
                  <Td className="font-semibold">{f.n_fila}</Td>
                  <Td>
                    <div className="flex flex-col items-start gap-1">
                      <Chip tone={RESULTADO[f.resultado].tone}>{RESULTADO[f.resultado].label}</Chip>
                      {f.listas && LISTAS[f.listas.estado] && <Chip tone={LISTAS[f.listas.estado]!.tone}>{LISTAS[f.listas.estado]!.label}</Chip>}
                    </div>
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
                  <Td className="whitespace-nowrap">{f.tarifa_pct == null ? '—' : `${f.tarifa_pct.toLocaleString('es-CO')} %`}</Td>
                  <Td className="min-w-64">
                    {f.motivos.length === 0 && f.advertencias.length === 0 && !f.listas?.coincidencias.length && '—'}
                    <ul className="space-y-0.5">
                      {f.motivos.map((m, i) => (
                        <li key={`m${i}`} className="text-red-700">{m}</li>
                      ))}
                      {f.advertencias.map((a, i) => (
                        <li key={`a${i}`} className="text-coral-700">{a}</li>
                      ))}
                    </ul>
                    {!!f.listas?.coincidencias.length && (
                      <CoincidenciasListas
                        inmobiliariaId={orgId}
                        persona={{ documento: f.documento, nombre: f.arrendatario ?? '', n_fila: f.n_fila }}
                        listas={f.listas}
                        onDecidida={() => validar(true)}
                      />
                    )}
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
            title={`${n(3)}. Representante legal y procesamiento`}
            subtitle="El representante legal de la inmobiliaria firma el Acta de Migración por Auco."
          />
          {usables === 0 ? (
            <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
              Ningún contrato del archivo es aceptable. Corrija el archivo según el reporte y valídelo de nuevo.
            </div>
          ) : (
            <>
              {porConfirmar > 0 && (
                <div role="alert" className="mb-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
                  Resuelva {porConfirmar === 1 ? 'la coincidencia' : `las ${porConfirmar} coincidencias`} en listas restrictivas antes de procesar.
                </div>
              )}
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
                  <Button type="submit" disabled={!repCompleto || ocupado !== null || porConfirmar > 0}>
                    <IconPlay size={16} /> Procesar {usables} {usables === 1 ? 'contrato' : 'contratos'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </section>
      )}

      {equivalencias && mapeo.campos[equivalencias.campo] && (
        <DialogoEquivalencias
          key={equivalencias.campo}
          campo={equivalencias.campo}
          regla={mapeo.campos[equivalencias.campo]!}
          precargar={equivalencias.precargar}
          onClose={() => setEquivalencias(null)}
          onAplicar={(eq) => {
            const m = { ...mapeo, campos: { ...mapeo.campos, [equivalencias.campo]: { ...mapeo.campos[equivalencias.campo]!, equivalencias: eq } } }
            setEquivalencias(null)
            cambiarMapeo(m)
            verVistaPrevia(m)
          }}
        />
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
              {/* §2.4.4 y §3.2: las rechazadas no se descartan, el acta las lista con su motivo. */}
              {resumen && resumen.rechazadas - confirmadas > 0
                ? `; ${resumen.rechazadas - confirmadas} ${resumen.rechazadas - confirmadas === 1 ? 'fila rechazada quedará listada' : 'filas rechazadas quedarán listadas'} en el acta con su motivo`
                : ''}
              .
            </p>
            {/* Adenda 1 §6: la fila con coincidencia confirmada no entra al lote ni al acta. */}
            {confirmadas > 0 && (
              <p>
                {confirmadas} {confirmadas === 1 ? 'contrato' : 'contratos'} con coincidencia confirmada en listas restrictivas no se{' '}
                {confirmadas === 1 ? 'migra' : 'migran'} y no {confirmadas === 1 ? 'figura' : 'figuran'} en el Acta.
              </p>
            )}
            {nativo && (
              <p>
                El mapeo aplicado se guarda para las próximas cargas de esta inmobiliaria y queda registrado con el lote, junto con el archivo
                original.
              </p>
            )}
            <p>
              {/* §3.3-§3.4: la activación es la última firma, la de Cofianza. */}
              Los contratos se activan cuando firmen el Acta de Migración {rep.rep_legal_nombre || 'el representante legal'} y Cofianza.
            </p>
          </div>
        }
      />
    </div>
  )
}
