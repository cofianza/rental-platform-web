/**
 * Tablero de un lote de migración (spec §8): conteo por estado, vista interna
 * de Cofianza (exposición y tarifa), Acta de Migración (§3.3) y la cartera
 * contrato por contrato con sus acciones (§5.1.3, §5.2.5, §6, §7).
 */

'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button, ConfirmDialog, Modal, MotivoDialog, PageHeader, buttonClasses } from '@/components/ui'
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconDollarSign,
  IconDownload,
  IconEye,
  IconFileCheck,
  IconFileText,
  IconFolderOpen,
  IconRefresh,
  IconScrollText,
  IconUpload,
  IconShield,
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
import { abrirEnPestana } from '@/lib/utils'
import { errorPdf, guardarArchivo, migracionService } from '@/services/migracionService'
import type {
  DetalleFilaExcluida,
  DetalleFilaMigrada,
  EstadoActa,
  EstadoLote,
  EstadoMigracion,
  ResultadoAuditoria,
  VistaTablero,
} from '@/types/migracion'

const ESTADO: Record<EstadoMigracion, { label: string; tone: ChipTone }> = {
  borrador: { label: 'Borrador', tone: 'gray' },
  activa: { label: 'Fianza activa por migración', tone: 'green' },
  en_revision: { label: 'En revisión', tone: 'yellow' },
  excluido: { label: 'Excluido', tone: 'red' },
  terminado: { label: 'Terminado', tone: 'blue' },
  rechazado_validacion: { label: 'Rechazado en validación', tone: 'red' },
}

const ESTADO_LOTE: Record<EstadoLote, { label: string; tone: ChipTone }> = {
  procesado: { label: 'Procesado', tone: 'blue' },
  en_firma: { label: 'Acta en firma', tone: 'yellow' },
  activo: { label: 'Activo', tone: 'green' },
  expirado: { label: 'Expirado', tone: 'gray' },
  cancelado: { label: 'Cancelado', tone: 'red' },
}

const ESTADO_ACTA: Record<EstadoActa, { label: string; tone: ChipTone }> = {
  creando: { label: 'Enviando a Auco', tone: 'blue' },
  en_firma: { label: 'En firma', tone: 'yellow' },
  completo: { label: 'Firmada', tone: 'green' },
  incompleto: { label: 'Sin firmar', tone: 'red' },
  cancelado: { label: 'Cancelada', tone: 'gray' },
  fallido: { label: 'Envío fallido', tone: 'red' },
}

const MOTIVO_ACTA: Record<string, string> = {
  AUCO_UPLOAD: 'Auco no recibió el documento. Envíelo de nuevo.',
  HUERFANO: 'El envío a Auco no se confirmó. Envíelo de nuevo.',
  FUERA_PLAZO: 'La última firma llegó después del vencimiento del lote.',
  EXPIRED: 'El proceso de firma venció en Auco.',
  REJECTED: 'Un firmante rechazó el acta en Auco.',
  CANCELADO: 'El lote se canceló antes de la firma.',
}

const FIRMANTE: Record<string, string> = { representante_legal: 'Representante legal', cofianza: 'Cofianza' }

const RESULTADO_AUDITORIA: Record<ResultadoAuditoria, { label: string; tone: ChipTone }> = {
  conforme: { label: 'Conforme', tone: 'green' },
  declaracion_falsa: { label: 'Declaración falsa', tone: 'red' },
  no_entregado: { label: 'Soportes no entregados', tone: 'red' },
}

const INPUT =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'

const msg = (e: unknown, def: string) => (e instanceof Error && e.message) || def
const pct = (n: number | string | null | undefined) =>
  n == null ? '—' : `${Number(n).toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`
const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
const siNo = (b: boolean | null) => (b == null ? '—' : b ? 'Sí' : 'No')

function Marca({ reportable }: { reportable: boolean | null }) {
  if (reportable == null) return <span className="text-ink-400">—</span>
  return reportable ? <Chip tone="green">REPORTABLE</Chip> : <Chip tone="orange">NO REPORTABLE</Chip>
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-900">{children}</dd>
    </div>
  )
}

type Dialogo =
  | { tipo: 'revision' | 'quitarRevision' | 'auditoria' | 'verificacion' | 'excluirNota' | 'cancelarLote' }
  | { tipo: 'excluir'; nota: string }
  | { tipo: 'decision'; auditoriaId: string; resultado: ResultadoAuditoria }

export default function LoteMigracionPage() {
  const { id } = useParams<{ id: string }>()
  const tablero = useSeccion(() => migracionService.tablero(id))
  const acta = useSeccion(() => migracionService.estadoActa(id))

  const [filtro, setFiltro] = useState<EstadoMigracion | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [dialogo, setDialogo] = useState<Dialogo | null>(null)

  // Detalle del contrato migrado (una fila del lote)
  const [filaId, setFilaId] = useState<string | null>(null)
  const [det, setDet] = useState<DetalleFilaMigrada | null>(null)
  const [detError, setDetError] = useState<string | null>(null)
  const [fechaAut, setFechaAut] = useState(hoy)
  const [notas, setNotas] = useState('')
  const [soporte, setSoporte] = useState<File | null>(null)

  const abrirDetalle = async (fid: string) => {
    setFilaId(fid)
    setDet(null)
    setDetError(null)
    setNotas('')
    setSoporte(null)
    setFechaAut(hoy())
    try {
      setDet(await migracionService.detalleFila(fid))
    } catch (e) {
      setDetError(msg(e, 'No se pudo cargar el contrato'))
    }
  }

  /** Corre una acción con candado y toast; devuelve false si falló (MotivoDialog conserva el texto). */
  const correr = async (clave: string, fn: () => Promise<unknown>, error: string) => {
    setOcupado(clave)
    try {
      await fn()
      return true
    } catch (e) {
      const fallas = e instanceof ApiClientError ? (e.details as { fallas?: { firmante: string; motivo: string }[] } | undefined)?.fallas : undefined
      toast.error(msg(e, error), fallas?.length ? { description: fallas.map((f) => `${f.firmante}: ${f.motivo}`).join(' · ') } : undefined)
      return false
    } finally {
      setOcupado(null)
    }
  }

  /** Acción sobre la fila: actualiza el detalle y el tablero. */
  const accionFila = (clave: string, fn: () => Promise<DetalleFilaMigrada | DetalleFilaExcluida>, ok: string) =>
    correr(
      clave,
      async () => {
        const r = await fn()
        setDet(r)
        setNotas('')
        setSoporte(null)
        toast.success(ok)
        if ('inmobiliaria_suspendida' in r && r.inmobiliaria_suspendida)
          toast.warning('Se suspendieron las nuevas migraciones de esta inmobiliaria hasta decisión de la Gerencia General.')
        tablero.reload()
      },
      'No se pudo completar la acción',
    )

  const accionActa = (clave: string, fn: () => Promise<unknown>, ok: string) =>
    correr(
      clave,
      async () => {
        await fn()
        toast.success(ok)
        acta.reload()
        tablero.reload()
      },
      'No se pudo completar la acción',
    )

  const descargarTablero = (vista: VistaTablero) =>
    correr(`xlsx-${vista}`, async () => guardarArchivo(await migracionService.tableroXlsx(id, vista)), 'No se pudo descargar el tablero')

  const t = tablero.data
  const a = acta.data?.acta ?? null
  const loteEstado = acta.data?.lote.estado ?? t?.lote.estado
  const loteAbierto = loteEstado === 'procesado' || loteEstado === 'en_firma'
  const actaViva = a?.estado === 'creando' || a?.estado === 'en_firma'
  const filas = (t?.filas ?? []).filter((f) => !filtro || f.estado === filtro)

  // Misma condición que exigirMigrado en la API: 'terminado' también agrupa contratos cancelados, que no admiten auditoría ni exclusión.
  const migrado = det && !det.excluido_en && (det.contrato?.estado === 'vigente' || det.contrato?.estado === 'finalizado')
  const vigente = det && (det.estado === 'activa' || det.estado === 'en_revision')
  const auditoriaAbierta = det?.auditorias.find((x) => !x.resultado) ?? null

  return (
    <div className="space-y-8">
      <PageHeader
        title={t ? `Lote ${t.lote.numero}` : 'Lote de migración'}
        subtitle={
          t
            ? `${t.lote.inmobiliaria ?? 'Inmobiliaria'} · creado ${fechaCorta(t.lote.created_at)} · ${
                t.lote.activado_en ? `activado ${fechaCorta(t.lote.activado_en)}` : `vence ${fechaCorta(t.lote.vence_en)}`
              }`
            : undefined
        }
        actions={
          <>
            <Link href="/admin/migracion" className={buttonClasses('secondary')}>
              <IconArrowLeft size={16} /> Migración
            </Link>
            <Button variante="secondary" onClick={() => descargarTablero('cofianza')} disabled={!t || !!ocupado}>
              <IconDownload size={16} /> {ocupado === 'xlsx-cofianza' ? 'Descargando…' : 'Tablero (Cofianza)'}
            </Button>
            <Button variante="secondary" onClick={() => descargarTablero('inmobiliaria')} disabled={!t || !!ocupado}>
              <IconDownload size={16} /> {ocupado === 'xlsx-inmobiliaria' ? 'Descargando…' : 'Tablero (inmobiliaria)'}
            </Button>
          </>
        }
      />

      <SeccionEstado loading={tablero.loading} error={tablero.error} onRetry={tablero.reload}>
        {t && (
          <>
            <section>
              <SeccionHeader
                title="Contratos por estado"
                subtitle={`${t.resumen.total_cargado} filas cargadas · ${t.resumen.aceptados} aceptadas · ${t.resumen.rechazados} rechazadas · ${t.resumen.activos} activas. Toque un estado para filtrar.`}
                right={<Chip tone={ESTADO_LOTE[t.lote.estado].tone}>{ESTADO_LOTE[t.lote.estado].label}</Chip>}
              />
              <KpiRow cols={3}>
                {(Object.keys(ESTADO) as EstadoMigracion[]).map((e) => (
                  <Kpi
                    key={e}
                    label={ESTADO[e].label}
                    value={t.conteos[e] ?? 0}
                    tone={ESTADO[e].tone === 'red' ? 'red' : ESTADO[e].tone === 'green' ? 'green' : 'gray'}
                    active={filtro === e}
                    onClick={() => setFiltro(filtro === e ? null : e)}
                  />
                ))}
              </KpiRow>
            </section>

            <section>
              <SeccionHeader title="Solo Cofianza" subtitle="No se comparte con la inmobiliaria. La exposición suma 18 cánones por contrato con cobertura." />
              {t.cofianza.alerta_exposicion_en && (
                <div role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-coral-200 bg-coral-50 p-3 text-sm text-coral-800">
                  <IconAlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <span>
                    El lote superó el umbral de exposición ({money(t.cofianza.umbral_alerta_cop)}) el{' '}
                    {fechaCorta(t.cofianza.alerta_exposicion_en)}. Se avisó a la Gerencia General; la carga no se bloquea.
                  </span>
                </div>
              )}
              <KpiRow cols={3}>
                <Kpi
                  label="Exposición acumulada"
                  value={money(t.cofianza.exposicion_cop)}
                  sub={`Al procesar: ${money(t.cofianza.exposicion_al_procesar_cop)} · umbral ${money(t.cofianza.umbral_alerta_cop)}`}
                  tone={t.cofianza.alerta_exposicion_en ? 'orange' : 'gray'}
                  accent={t.cofianza.alerta_exposicion_en ? 'warning' : 'none'}
                  Icon={IconShield}
                />
                <Kpi
                  label="Tarifa mensual total"
                  value={money(t.cofianza.tarifa_mensual_cop)}
                  sub={`Con IVA: ${money(t.cofianza.tarifa_mensual_con_iva_cop)}`}
                  tone="green"
                  Icon={IconDollarSign}
                />
                <Kpi label="Tarifa / exposición" value={pct(t.cofianza.relacion_pct)} sub="Tarifa mensual sin IVA sobre la exposición" />
              </KpiRow>
            </section>
          </>
        )}
      </SeccionEstado>

      <section>
        <SeccionHeader
          title="Acta de Migración"
          subtitle="La firma del representante legal y de Cofianza por Auco activa todos los contratos del lote a la vez."
        />
        <SeccionEstado loading={acta.loading} error={acta.error} onRetry={acta.reload}>
          <div className="space-y-3 rounded-xl border border-ink-200 bg-white p-4">
            {a ? (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Chip tone={ESTADO_ACTA[a.estado].tone}>{ESTADO_ACTA[a.estado].label}</Chip>
                  <span className="text-ink-600">
                    Intento {a.intento} · {a.cerrado_en ? `cerrada ${fechaCorta(a.cerrado_en)}` : `vence ${fechaCorta(a.expira_en)}`}
                  </span>
                </div>
                {a.motivo && <p className="text-xs text-red-700">{MOTIVO_ACTA[a.motivo] ?? 'El proceso de firma no terminó. Envíe el acta de nuevo.'}</p>}
                <ul className="space-y-1 text-sm">
                  {a.firmantes.map((f) => (
                    <li key={f.parteId} className="flex items-center gap-2">
                      {f.firmadoEn ? <IconFileCheck size={14} className="text-primary-600" /> : <IconFileText size={14} className="text-ink-400" />}
                      <span className="font-medium">{FIRMANTE[f.parteId] ?? f.parteId}</span>
                      <span className="text-ink-500">{f.firmadoEn ? `firmó el ${fechaCorta(f.firmadoEn)}` : 'pendiente'}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-ink-600">El acta está generada y aún no se ha enviado a firma.</p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {loteAbierto && !actaViva && (
                <Button
                  onClick={() => accionActa('enviar', () => migracionService.enviarActa(id), 'Acta enviada a firma por Auco')}
                  disabled={!!ocupado}
                >
                  <IconScrollText size={16} /> {ocupado === 'enviar' ? 'Enviando…' : a ? 'Enviar de nuevo a firma' : 'Enviar a firma'}
                </Button>
              )}
              {a && (
                <Button
                  variante="secondary"
                  onClick={() => accionActa('actualizar', () => migracionService.actualizarActa(id), 'Estado del acta actualizado')}
                  disabled={!!ocupado}
                >
                  <IconRefresh size={16} /> {ocupado === 'actualizar' ? 'Consultando…' : 'Actualizar estado'}
                </Button>
              )}
              <Button
                variante="secondary"
                onClick={() =>
                  correr(
                    'ver-acta',
                    async () => {
                      await abrirEnPestana(async () => (await migracionService.actaPdf(id)).url)
                    },
                    'No se pudo abrir el acta',
                  )
                }
                disabled={!!ocupado}
              >
                <IconEye size={16} /> {a?.firmada ? 'Ver acta firmada' : 'Ver acta'}
              </Button>
              {loteAbierto && (
                <Button variante="danger" onClick={() => setDialogo({ tipo: 'cancelarLote' })} disabled={!!ocupado}>
                  <IconX size={16} /> Cancelar lote
                </Button>
              )}
            </div>
          </div>
        </SeccionEstado>
      </section>

      <section>
        <SeccionHeader title="Contratos del lote" />
        <SeccionEstado
          loading={tablero.loading}
          error={tablero.error}
          onRetry={tablero.reload}
          vacio={filas.length === 0 && { icon: IconFolderOpen, titulo: filtro ? 'No hay contratos en este estado' : 'El lote no tiene filas' }}
        >
          {filtro && (
            <FiltroBar count={`${filas.length} contratos`} onClear={() => setFiltro(null)}>
              <Chip tone={ESTADO[filtro].tone}>{ESTADO[filtro].label}</Chip>
            </FiltroBar>
          )}
          <Tabla head={['Fila', 'Inmueble', 'Arrendatario', 'Canon', 'Estado', 'Marca', 'Tarifa', 'Contrato', '']}>
            {filas.map((f) => (
              <tr key={f.fila_id}>
                <Td>{f.n_fila}</Td>
                <Td>
                  {f.direccion ?? '—'}
                  {f.municipio && <span className="block text-[11px] text-ink-500">{f.municipio}</span>}
                </Td>
                <Td>
                  {f.arrendatario}
                  <span className="block text-[11px] text-ink-500">{f.documento}</span>
                </Td>
                <Td className="whitespace-nowrap">{money(f.canon)}</Td>
                <Td>
                  <Chip tone={ESTADO[f.estado].tone}>{f.estado_etiqueta}</Chip>
                  {f.motivos.length > 0 && <span className="mt-1 block text-[11px] text-red-700">{f.motivos.join('; ')}</span>}
                  {f.en_revision_motivo && <span className="mt-1 block text-[11px] text-amber-700">{f.en_revision_motivo}</span>}
                </Td>
                <Td>
                  <Marca reportable={f.reportable} />
                </Td>
                <Td className="whitespace-nowrap">{pct(f.tarifa_pct)}</Td>
                <Td className="whitespace-nowrap">
                  {f.contrato_id ? (
                    <Link href={`/contratos/${f.contrato_id}`} className="font-semibold text-primary-700 hover:underline">
                      {f.contrato_numero ?? 'Ver'}
                    </Link>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td className="text-right">
                  {f.estado !== 'rechazado_validacion' && (
                    <Button variante="secondary" tamano="sm" onClick={() => abrirDetalle(f.fila_id)}>
                      Detalle
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </Tabla>
        </SeccionEstado>
      </section>

      <Modal isOpen={!!filaId} onClose={() => setFilaId(null)} title={det ? `Contrato migrado · fila ${det.n_fila}` : 'Contrato migrado'} size="xl">
        {detError ? (
          <div role="alert" className="text-center">
            <p className="text-sm text-red-700">{detError}</p>
            <Button variante="secondary" className="mt-3" onClick={() => filaId && abrirDetalle(filaId)}>
              <IconRefresh size={14} /> Reintentar
            </Button>
          </div>
        ) : !det ? (
          <p role="status" className="py-8 text-center text-sm text-ink-500">
            Cargando…
          </p>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={ESTADO[det.estado].tone}>{det.estado_etiqueta}</Chip>
              <Marca reportable={det.reportable} />
              {det.reportable_motivo === 'formato_anterior' && <Chip tone="gray">Firmado sobre formato anterior</Chip>}
              {det.contrato && (
                <Link href={`/contratos/${det.contrato.id}`} className="text-xs font-semibold text-primary-700 hover:underline">
                  Ver contrato {det.contrato.numero ?? ''}
                </Link>
              )}
            </div>
            {det.en_revision_motivo && <p className="text-sm text-amber-700">En revisión: {det.en_revision_motivo}</p>}
            {det.excluido_en && (
              <p className="text-sm text-red-700">
                Excluido el {fechaCorta(det.excluido_en)} ·{' '}
                {det.excluido_motivo === 'auditoria_no_entregada' ? 'soportes de auditoría no entregados' : 'declaración falsa'}. Sin cobertura desde el origen.
              </p>
            )}

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Dato label="Inmueble">
                {det.datos.direccion ?? '—'}
                {det.datos.municipio ? `, ${det.datos.municipio}` : ''}
              </Dato>
              <Dato label="Destinación">{det.datos.destinacion === 'comercial' ? 'Comercial' : 'Vivienda'}</Dato>
              <Dato label="Canon sin IVA">{money(det.datos.canon)}</Dato>
              <Dato label="Arrendatario">
                {[det.datos.arrendatario.nombre, det.datos.arrendatario.apellido].filter(Boolean).join(' ') || det.datos.arrendatario.razon_social}
                <span className="block text-xs text-ink-500">
                  {det.datos.arrendatario.tipo_documento} {det.datos.arrendatario.numero_documento}
                </span>
              </Dato>
              <Dato label="Contacto">
                {det.datos.arrendatario.celular ?? '—'}
                <span className="block text-xs text-ink-500">{det.datos.arrendatario.email ?? ''}</span>
              </Dato>
              <Dato label="Coarrendatarios">{det.datos.coarrendatarios.map((c) => c.nombre).join(', ') || 'Ninguno'}</Dato>
              <Dato label="Vigencia">
                {fechaCorta(det.datos.fecha_inicio)} – {fechaCorta(det.datos.fecha_vencimiento)}
              </Dato>
              <Dato label="Activación">{fechaCorta(det.contrato?.fecha_firma)}</Dato>
              <Dato label="Declaraciones">
                Al día: {siNo(det.datos.declaraciones.al_dia)} · Mora 6 meses: {siNo(det.datos.declaraciones.mora_reciente)} · Plantilla
                entregada: {siNo(det.datos.declaraciones.plantilla_entregada)}
              </Dato>
              <Dato label="Tarifa en el acta">{pct(det.tarifa_acta_pct)}</Dato>
              <Dato label="Tarifa vigente">
                {pct(det.tarifa_vigente_pct)}
                {det.tarifa_desde && <span className="block text-xs text-ink-500">desde {fechaCorta(det.tarifa_desde)}</span>}
              </Dato>
              {det.verificacion_individual_en && <Dato label="Verificación individual">{fechaCorta(det.verificacion_individual_en)}</Dato>}
            </dl>

            {(det.advertencias.length > 0 || det.datos.observaciones) && (
              <div className="text-xs text-ink-600">
                {det.advertencias.map((w) => (
                  <p key={w} className="text-coral-700">
                    {w}
                  </p>
                ))}
                {det.datos.observaciones && <p>Observaciones: {det.datos.observaciones}</p>}
              </div>
            )}

            {migrado && (
              <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4">
                {vigente &&
                  (det.en_revision ? (
                    <Button variante="secondary" tamano="sm" onClick={() => setDialogo({ tipo: 'quitarRevision' })} disabled={!!ocupado}>
                      Quitar de revisión
                    </Button>
                  ) : (
                    <Button variante="secondary" tamano="sm" onClick={() => setDialogo({ tipo: 'revision' })} disabled={!!ocupado}>
                      Marcar en revisión
                    </Button>
                  ))}
                {vigente && det.reportable === false && det.reportable_motivo === 'formato_anterior' && (
                  <Button variante="secondary" tamano="sm" onClick={() => setDialogo({ tipo: 'verificacion' })} disabled={!!ocupado}>
                    <IconFileCheck size={14} /> Verificación individual
                  </Button>
                )}
                {!auditoriaAbierta && (
                  <Button variante="secondary" tamano="sm" onClick={() => setDialogo({ tipo: 'auditoria' })} disabled={!!ocupado}>
                    Requerir auditoría
                  </Button>
                )}
                <Button variante="danger" tamano="sm" onClick={() => setDialogo({ tipo: 'excluirNota' })} disabled={!!ocupado}>
                  Excluir por declaración falsa
                </Button>
              </div>
            )}

            {vigente && det.reportable === false && (
              <div className="rounded-lg border border-ink-200 p-3">
                <p className="text-sm font-semibold text-ink-900">Pasar a REPORTABLE por autorización del arrendatario</p>
                <p className="mt-0.5 text-xs text-ink-500">La tarifa baja a la base desde el mes siguiente a la autorización.</p>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <label className="text-xs font-medium text-gray-700">
                    Fecha de la autorización
                    <input type="date" max={hoy()} value={fechaAut} onChange={(e) => setFechaAut(e.target.value)} className={`${INPUT} mt-1 block w-44`} />
                  </label>
                  <Button
                    tamano="sm"
                    disabled={!!ocupado || !fechaAut}
                    onClick={() =>
                      accionFila(
                        'reportable',
                        () => migracionService.pasarAReportable(det.id, { motivo: 'autorizacion_arrendatario', fecha: fechaAut }),
                        'El contrato quedó REPORTABLE',
                      )
                    }
                  >
                    {ocupado === 'reportable' ? 'Guardando…' : 'Registrar autorización'}
                  </Button>
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-semibold text-ink-900">Auditorías</p>
              {det.auditorias.length === 0 ? (
                <p className="text-xs text-ink-500">Sin auditorías.</p>
              ) : (
                <ul className="space-y-2">
                  {det.auditorias.map((au) => (
                    <li key={au.id} className="rounded-lg border border-ink-200 p-3 text-xs text-ink-700">
                      <div className="flex flex-wrap items-center gap-2">
                        {au.resultado ? (
                          <Chip tone={RESULTADO_AUDITORIA[au.resultado].tone}>{RESULTADO_AUDITORIA[au.resultado].label}</Chip>
                        ) : (
                          <Chip tone="yellow">{au.respuesta_en ? 'Respondida' : 'Pendiente de respuesta'}</Chip>
                        )}
                        <span>
                          Requerida {fechaCorta(au.requerido_en)} · plazo {fechaCorta(au.vence_en)}
                          {au.respuesta_en && ` · respondida ${fechaCorta(au.respuesta_en)}`}
                          {au.soportes.length > 0 && ` · ${au.soportes.length} soporte(s)`}
                          {au.decidido_en && ` · decidida ${fechaCorta(au.decidido_en)}`}
                        </span>
                      </div>
                      {au.notas && <p className="mt-1 whitespace-pre-line">{au.notas}</p>}
                      {!au.resultado && (
                        <div className="mt-3 space-y-2">
                          <textarea
                            rows={2}
                            maxLength={2000}
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            placeholder="Notas (opcional)"
                            aria-label="Notas de la auditoría"
                            className={INPUT}
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <label
                              htmlFor={`soporte-${au.id}`}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              <IconUpload size={14} /> {soporte ? soporte.name : 'Adjuntar soporte PDF'}
                            </label>
                            <input
                              id={`soporte-${au.id}`}
                              type="file"
                              accept="application/pdf,.pdf"
                              className="sr-only"
                              onChange={(e) => {
                                const f = e.target.files?.[0]
                                e.target.value = ''
                                if (!f) return
                                const invalido = errorPdf(f)
                                if (invalido) return toast.error(invalido)
                                setSoporte(f)
                              }}
                            />
                            <Button
                              variante="secondary"
                              tamano="sm"
                              disabled={!!ocupado || (!soporte && !notas.trim())}
                              onClick={() =>
                                accionFila(
                                  'respuesta',
                                  () => migracionService.responderAuditoria(au.id, soporte, notas.trim() || null),
                                  'Respuesta registrada',
                                )
                              }
                            >
                              {ocupado === 'respuesta' ? 'Guardando…' : 'Registrar respuesta'}
                            </Button>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">Resultado:</span>
                            {/* «No entregado» solo procede vencido el plazo y sin respuesta (misma regla que la API). */}
                            {(Object.keys(RESULTADO_AUDITORIA) as ResultadoAuditoria[])
                              .filter((r) => r !== 'no_entregado' || (!au.respuesta_en && Date.now() > Date.parse(au.vence_en)))
                              .map((r) => (
                              <Button
                                key={r}
                                variante={r === 'conforme' ? 'secondary' : 'danger'}
                                tamano="sm"
                                disabled={!!ocupado}
                                onClick={() => setDialogo({ tipo: 'decision', auditoriaId: au.id, resultado: r })}
                              >
                                {RESULTADO_AUDITORIA[r].label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Diálogos: van después del detalle para quedar encima de él. */}
      <MotivoDialog
        isOpen={dialogo?.tipo === 'revision'}
        onClose={() => setDialogo(null)}
        title="Marcar en revisión"
        descripcion="El contrato queda marcado para verificación posterior. La cobertura no se suspende."
        isLoading={ocupado === 'revision'}
        onConfirm={async (motivo) => {
          if (!det) return false
          const ok = await accionFila('revision', () => migracionService.marcarRevision(det.id, true, motivo), 'Contrato marcado en revisión')
          if (ok) setDialogo(null)
          return ok
        }}
      />
      <MotivoDialog
        isOpen={dialogo?.tipo === 'auditoria'}
        onClose={() => setDialogo(null)}
        title="Requerir auditoría"
        descripcion="Se piden a la inmobiliaria los soportes de recaudo de los seis meses anteriores a la migración. Tiene cinco días hábiles para entregarlos; si no los entrega, el contrato se puede excluir."
        label="Notas (opcional)"
        minLength={0}
        confirmLabel="Requerir"
        isLoading={ocupado === 'auditoria'}
        onConfirm={async (n) => {
          if (!det) return false
          const ok = await accionFila('auditoria', () => migracionService.requerirAuditoria(det.id, n || null), 'Auditoría requerida')
          if (ok) setDialogo(null)
          return ok
        }}
      />
      <MotivoDialog
        isOpen={dialogo?.tipo === 'excluirNota'}
        onClose={() => setDialogo(null)}
        title="Excluir por declaración falsa"
        descripcion="Describa qué se verificó. En el siguiente paso confirma la exclusión."
        label="Motivo"
        variant="danger"
        confirmLabel="Continuar"
        onConfirm={(nota) => setDialogo({ tipo: 'excluir', nota })}
      />
      <ConfirmDialog
        isOpen={dialogo?.tipo === 'excluir'}
        onClose={() => setDialogo(null)}
        title="Confirmar exclusión"
        variant="danger"
        confirmLabel="Excluir contrato"
        message="El contrato queda excluido de la cobertura desde el origen, se cancela y se suspenden las nuevas migraciones de la inmobiliaria hasta decisión de la Gerencia General. Esta acción no se puede deshacer."
        onConfirm={async () => {
          if (det && dialogo?.tipo === 'excluir')
            await accionFila('excluir', () => migracionService.excluir(det.id, dialogo.nota), 'Contrato excluido de la cobertura')
        }}
      />
      <ConfirmDialog
        isOpen={dialogo?.tipo === 'quitarRevision'}
        onClose={() => setDialogo(null)}
        title="Quitar de revisión"
        message="El contrato vuelve a fianza activa por migración."
        confirmLabel="Quitar"
        onConfirm={async () => {
          if (det) await accionFila('revision', () => migracionService.marcarRevision(det.id, false), 'El contrato salió de revisión')
        }}
      />
      <ConfirmDialog
        isOpen={dialogo?.tipo === 'verificacion'}
        onClose={() => setDialogo(null)}
        title="Registrar verificación individual"
        message="Confirme que un analista revisó este contrato firmado sobre un formato anterior y que autoriza el reporte a centrales al acreedor o subrogatario. El contrato pasa a REPORTABLE y la tarifa baja a la base desde el mes siguiente."
        confirmLabel="Registrar"
        onConfirm={async () => {
          if (det)
            await accionFila(
              'verificacion',
              () => migracionService.pasarAReportable(det.id, { motivo: 'verificacion_individual' }),
              'El contrato quedó REPORTABLE',
            )
        }}
      />
      <ConfirmDialog
        isOpen={dialogo?.tipo === 'decision'}
        onClose={() => setDialogo(null)}
        title={dialogo?.tipo === 'decision' ? `Resultado: ${RESULTADO_AUDITORIA[dialogo.resultado].label}` : ''}
        variant={dialogo?.tipo === 'decision' && dialogo.resultado !== 'conforme' ? 'danger' : 'default'}
        confirmLabel="Registrar resultado"
        message={
          dialogo?.tipo === 'decision' && dialogo.resultado === 'conforme'
            ? 'Los soportes confirman la declaración. La auditoría se cierra sin cambios en la cobertura.'
            : dialogo?.tipo === 'decision' && dialogo.resultado === 'declaracion_falsa'
              ? 'El contrato queda excluido de la cobertura desde el origen y se suspenden las nuevas migraciones de la inmobiliaria. No se puede deshacer.'
              : 'Solo procede vencido el plazo y sin respuesta. El contrato queda excluido de la cobertura desde el origen. No se puede deshacer.'
        }
        onConfirm={async () => {
          if (dialogo?.tipo === 'decision')
            await accionFila(
              'decision',
              () => migracionService.decidirAuditoria(dialogo.auditoriaId, dialogo.resultado, notas.trim() || null),
              'Resultado registrado',
            )
        }}
      />
      <ConfirmDialog
        isOpen={dialogo?.tipo === 'cancelarLote'}
        onClose={() => setDialogo(null)}
        title="Cancelar lote"
        variant="danger"
        confirmLabel="Cancelar lote"
        cancelLabel="Volver"
        message="Se anula el acta en Auco y los contratos en borrador no se activan. Los inmuebles quedan libres para cargarlos en un lote nuevo. No se puede deshacer."
        onConfirm={() => accionActa('cancelar', () => migracionService.cancelarLote(id), 'Lote cancelado')}
      />
    </div>
  )
}
