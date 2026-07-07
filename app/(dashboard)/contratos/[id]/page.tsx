'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import {
  IconArrowLeft,
  IconDownload,
  IconRefresh,
  IconLoader,
  IconAlertTriangle,
  IconChevronRight,
  IconHistory,
  IconArrowRight,
  IconRotateCw,
} from '@/components/icons'
import { ESTADOS_CONTRATO, type EstadoContratoKey, formatDateTime } from '@/lib/constants'
import { contratoService } from '@/services/contratoService'
import { useAuth } from '@/hooks/useAuth'
import { VersionHistorialSection } from '@/components/expedientes/VersionHistorialSection'
import { CompararVersionesModal } from '@/components/expedientes/CompararVersionesModal'
import { ContratoTransicionModal } from '@/components/expedientes/ContratoTransicionModal'
import { ContratoHistorialModal } from '@/components/expedientes/ContratoHistorialModal'
import { ContratoFirmadoSection } from '@/components/contratos/ContratoFirmadoSection'
import { ContratoArchivosSection } from '@/components/contratos/ContratoArchivosSection'
import { ContratoVerificacionView } from '@/components/contratos/ContratoVerificacionView'
import { RegenerarContratoModal } from '@/components/contratos/RegenerarContratoModal'
import { FirmantesContratoSection } from '@/components/expedientes/FirmantesContratoSection'
import type { IContrato, EstadoContrato } from '@/types/contrato'

const PdfViewer = dynamic(
  () => import('@/components/ui/PdfViewer').then((m) => ({ default: m.PdfViewer })),
  { ssr: false }
)

const TERMINAL_STATES: EstadoContrato[] = ['finalizado', 'cancelado']
const FIRMADO_VISIBLE_STATES: EstadoContrato[] = ['firmado', 'vigente', 'finalizado', 'cancelado']

export default function ContratoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const [contrato, setContrato] = useState<IContrato | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  // true = el preview muestra el documento FIRMADO (con firmas + acuses); false
  // = el PDF generado de la plantilla.
  const [previewFirmado, setPreviewFirmado] = useState(false)
  // 4.1d: alterna entre el PDF y la "vista de verificación" (contrato con los
  // datos insertados resaltados) para confirmar que se generó bien.
  const [vista, setVista] = useState<'pdf' | 'verificacion'>('pdf')
  const [transiciones, setTransiciones] = useState<Array<{ estado: EstadoContrato; label: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  // Action states
  const [downloadLoading, setDownloadLoading] = useState(false)
  // 4.1e: el editor controlado (fecha/plazo/canon con tope/servicios)
  // reemplaza la regeneracion "ciega" de un click.
  const [regenerarOpen, setRegenerarOpen] = useState(false)
  const [transicionOpen, setTransicionOpen] = useState(false)
  const [transicionLoading, setTransicionLoading] = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)
  const [compareVersions, setCompareVersions] = useState<{ v1: number; v2: number } | null>(null)
  const [renewLoading, setRenewLoading] = useState(false)

  const canManage = user?.rol === 'administrador' || user?.rol === 'operador_analista'
  // Regenerar/editar (4.1e) tambien lo permite la API a inmobiliaria y
  // propietario (contratos:update) — no solo a los roles internos.
  const canRegenerate =
    canManage || user?.rol === 'inmobiliaria' || user?.rol === 'propietario'

  // opts.silent = refresco EN SITIO (p. ej. cuando FirmantesContratoSection
  // avisa vía onAllSigned que ya firmaron todos). En modo silencioso NO tocamos
  // isLoading: si mostráramos el skeleton de página completa desmontaríamos los
  // hijos, y al re-montarse FirmantesContratoSection su guard allSignedFiredRef
  // se resetea y vuelve a llamar onAllSigned → bucle infinito de recargas.
  // Tampoco re-pedimos el PDF: su contenido no cambió y descargarContratoFirmado
  // devuelve una URL firmada NUEVA cada vez, lo que recargaría el visor en vano.
  const fetchContrato = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false
    if (!silent) {
      setIsLoading(true)
      setError(null)
      setNotFound(false)
    }
    try {
      const data = await contratoService.getContratoById(id)
      setContrato(data)

      if (!silent) {
        // Preview del PDF. Si el contrato ya está FIRMADO, mostramos el DOCUMENTO
        // FIRMADO (con las firmas + los acuses de Auco) — el mismo que se le envía
        // al cliente. Si aún no está disponible o falla su generación, caemos al
        // PDF generado (plantilla). Para contratos no firmados, el generado.
        // inline=true para que el viewer lo muestre en vez de descargarlo.
        let urlPreview: string | null = null
        let esFirmado = false
        if (FIRMADO_VISIBLE_STATES.includes(data.estado)) {
          try {
            const firmado = await contratoService.descargarContratoFirmado(id)
            urlPreview = firmado.url
            esFirmado = true
          } catch {
            // Documento firmado aún no disponible (p. ej. cancelado pre-firma o
            // generación pendiente) — caemos al generado.
          }
        }
        if (!urlPreview && data.storage_key) {
          try {
            const dl = await contratoService.descargarContrato(id, { inline: true })
            urlPreview = dl.url
          } catch {
            // Non-critical — PDF preview won't load
          }
        }
        setPreviewUrl(urlPreview)
        setPreviewFirmado(esFirmado)
      }

      // Fetch available transitions (non-critical) — también en silent: es
      // barato y es justo lo que cambia cuando el contrato avanza de estado.
      if (data.estado && !TERMINAL_STATES.includes(data.estado)) {
        try {
          const t = await contratoService.getTransicionesDisponibles(id)
          setTransiciones(t.transiciones_disponibles ?? [])
        } catch {
          // Silent
        }
      }
    } catch (err: unknown) {
      // Un refresco silencioso que falla NO debe tumbar la página ya cargada.
      if (!silent) {
        const message = err instanceof Error ? err.message : 'Error al cargar el contrato'
        if (message.includes('no encontrado') || message.includes('404')) {
          setNotFound(true)
        } else {
          setError(message)
        }
      }
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [id])

  // Refresco tras completar todas las firmas: EN SITIO (no full-page skeleton),
  // para no desmontar/re-montar FirmantesContratoSection y evitar el bucle.
  const handleAllSigned = useCallback(() => {
    fetchContrato({ silent: true })
  }, [fetchContrato])

  useEffect(() => {
    fetchContrato()
  }, [fetchContrato])

  async function handleDownload() {
    setDownloadLoading(true)
    try {
      const result = await contratoService.descargarContrato(id)
      const a = document.createElement('a')
      a.href = result.url
      a.download = result.nombre_archivo || 'contrato.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      toast.error('Error al descargar el contrato')
    } finally {
      setDownloadLoading(false)
    }
  }


  async function handleConfirmarTransicion(estadoDestino: EstadoContrato, comentario: string, motivo?: string) {
    setTransicionLoading(true)
    try {
      await contratoService.transicionar(id, {
        nuevo_estado: estadoDestino,
        comentario,
        motivo,
      })
      toast.success('Estado del contrato actualizado')
      setTransicionOpen(false)
      fetchContrato()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cambiar estado'
      toast.error(message)
    } finally {
      setTransicionLoading(false)
    }
  }

  async function handleRenovar() {
    setRenewLoading(true)
    try {
      const nuevoContrato = await contratoService.renovarContrato(id)
      toast.success('Contrato de renovacion creado correctamente')
      router.push(`/contratos/${nuevoContrato.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al renovar el contrato'
      toast.error(message)
    } finally {
      setRenewLoading(false)
    }
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-gray-200 animate-pulse rounded" />
          <div className="h-4 w-48 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-64 bg-gray-200 animate-pulse rounded" />
            <div className="flex gap-2 mt-2">
              <div className="h-6 w-24 bg-gray-200 animate-pulse rounded-full" />
              <div className="h-6 w-16 bg-gray-200 animate-pulse rounded-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-32 bg-gray-200 animate-pulse rounded-lg" />
            <div className="h-9 w-32 bg-gray-200 animate-pulse rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[500px] bg-gray-200 animate-pulse rounded-xl" />
          <div className="h-[500px] bg-gray-200 animate-pulse rounded-xl" />
        </div>
      </div>
    )
  }

  // Not found
  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <IconAlertTriangle size={48} className="text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">Contrato no encontrado</p>
        <p className="text-sm text-gray-500 mb-4">El contrato solicitado no existe o fue eliminado</p>
        <button
          onClick={() => router.push('/contratos')}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
        >
          Volver a Contratos
        </button>
      </div>
    )
  }

  // Error
  if (error || !contrato) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <IconAlertTriangle size={48} className="text-red-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">Error al cargar el contrato</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button
          onClick={() => fetchContrato()}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
        >
          Reintentar
        </button>
      </div>
    )
  }

  const estadoConfig = ESTADOS_CONTRATO[contrato.estado as EstadoContratoKey]

  return (
    <div className="space-y-6">
      {/* Back + Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => router.push('/contratos')}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
        >
          <IconArrowLeft size={18} />
        </button>
        <button
          onClick={() => router.push('/contratos')}
          className="text-gray-500 hover:text-gray-700"
        >
          Contratos
        </button>
        <IconChevronRight size={14} className="text-gray-400" />
        <span className="text-gray-900 font-medium">{contrato.nombre_archivo || 'contrato.pdf'}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {contrato.nombre_archivo || 'contrato.pdf'}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${estadoConfig?.bgColor || 'bg-gray-100'} ${estadoConfig?.textColor || 'text-gray-700'}`}>
              {estadoConfig?.label || contrato.estado}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              v{contrato.version}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={downloadLoading || !contrato.storage_key}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {downloadLoading ? <IconLoader size={16} className="animate-spin" /> : <IconDownload size={16} />}
            Descargar PDF
          </button>
          {canRegenerate && contrato.estado === 'borrador' && (
            <button
              onClick={() => setRegenerarOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50"
            >
              <IconRefresh size={16} />
              Editar y regenerar
            </button>
          )}
          {canManage && transiciones.length > 0 && transiciones.map((t) => (
            <button
              key={t.estado}
              onClick={() => setTransicionOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              <IconArrowRight size={16} />
              {t.label}
            </button>
          ))}
          {canManage && contrato.estado === 'vigente' && (
            <button
              onClick={handleRenovar}
              disabled={renewLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 disabled:opacity-50"
            >
              {renewLoading ? <IconLoader size={16} className="animate-spin" /> : <IconRotateCw size={16} />}
              Renovar Contrato
            </button>
          )}
        </div>
      </div>

      {/* Main content: PDF + Info panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PDF Preview */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          {previewFirmado && vista === 'pdf' && previewUrl && (
            <div className="px-3 py-2 bg-green-50 border-b border-green-200 text-xs font-medium text-green-700">
              Documento firmado (con firmas y acuses de Auco) — el mismo que recibe el cliente.
            </div>
          )}
          {/* 4.1d: alternar entre el PDF y la vista de verificación (datos
              resaltados) para confirmar que el contrato se generó bien. La vista
              de verificación es independiente del PDF (usa su propio endpoint),
              así que el toggle se muestra aunque el PDF no esté disponible. */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 bg-gray-50">
            <button
              onClick={() => setVista('pdf')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                vista === 'pdf'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              PDF
            </button>
            <button
              onClick={() => setVista('verificacion')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                vista === 'verificacion'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Vista de verificación
            </button>
          </div>
          {/* 4.1c: el contrato supera las 11 páginas; damos casi toda la
              altura de la ventana para leerlo cómodo (el visor scrollea). */}
          <div className="h-[85vh] min-h-150">
            {vista === 'verificacion' ? (
              <ContratoVerificacionView contratoId={id} />
            ) : previewUrl ? (
              <PdfViewer url={previewUrl} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p className="text-sm">PDF no disponible</p>
              </div>
            )}
          </div>
        </div>

        {/* Info panel */}
        <div className="space-y-6">
          {/* Contract info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Información del Contrato</h3>
            <dl className="space-y-3 text-sm">
              <InfoRow label="Fecha Inicio" value={contrato.fecha_inicio || '—'} />
              <InfoRow
                label="Duracion"
                value={contrato.duracion_meses ? `${contrato.duracion_meses} meses` : '—'}
              />
              <InfoRow
                label="Valor Arriendo"
                value={
                  contrato.valor_arriendo
                    ? new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                      }).format(Number(contrato.valor_arriendo))
                    : '—'
                }
              />
              <InfoRow
                label="Plantilla Version"
                value={contrato.plantilla_version ? `v${contrato.plantilla_version}` : '—'}
              />
              <InfoRow
                label="Fecha Generacion"
                value={
                  contrato.fecha_generacion
                    ? formatDateTime(contrato.fecha_generacion)
                    : formatDateTime(contrato.created_at)
                }
              />
              {contrato.fecha_firma && (
                <InfoRow label="Fecha Firma" value={formatDateTime(contrato.fecha_firma)} />
              )}
              {contrato.fecha_terminacion && (
                <InfoRow label="Fecha Terminacion" value={formatDateTime(contrato.fecha_terminacion)} />
              )}
            </dl>

            {/* Motivo cancelacion */}
            {contrato.motivo_cancelacion && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-medium text-red-700 mb-1">Motivo de cancelacion</p>
                <p className="text-sm text-red-600">{contrato.motivo_cancelacion}</p>
              </div>
            )}
          </div>

          {/* Firmantes del contrato: quiénes firmaron, sus datos y la fecha de
              firma. Se auto-oculta si el contrato no usa firma multi-parte. */}
          <FirmantesContratoSection contratoId={id} canManage={canManage} onAllSigned={handleAllSigned} />

          {/* Expediente link */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Expediente</h3>
            <button
              onClick={() => router.push(`/expedientes/${contrato.expediente_id}`)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline"
            >
              Ver expediente
            </button>
          </div>

          {/* Historial button */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <button
              onClick={() => setHistorialOpen(true)}
              className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <IconHistory size={16} />
              Ver historial de estados
            </button>
          </div>

          {/* Documento firmado section */}
          {FIRMADO_VISIBLE_STATES.includes(contrato.estado) && (
            <ContratoFirmadoSection
              contrato={contrato}
              onContratoUpdated={fetchContrato}
            />
          )}

          {/* Archivos asociados section */}
          {FIRMADO_VISIBLE_STATES.includes(contrato.estado) && (
            <ContratoArchivosSection contrato={contrato} />
          )}
        </div>
      </div>

      {/* Variables section eliminada — eran info interna del template
          (placeholders {{...}}) que no aporta al usuario final que ve el
          contrato renderizado en el PDF. */}

      {/* Version history section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <VersionHistorialSection
          contratoId={contrato.id}
          currentVersion={contrato.version}
          onCompare={(v1, v2) => setCompareVersions({ v1, v2 })}
        />
      </div>

      {/* Modals */}
      {/* Editor controlado + regeneracion (4.1e) */}
      <RegenerarContratoModal
        isOpen={regenerarOpen}
        onClose={() => setRegenerarOpen(false)}
        contrato={{
          id: contrato.id,
          fecha_inicio: contrato.fecha_inicio,
          duracion_meses: contrato.duracion_meses,
          valor_arriendo: contrato.valor_arriendo,
        }}
        onRegenerated={() => { setRegenerarOpen(false); fetchContrato() }}
      />

      {transicionOpen && (
        <ContratoTransicionModal
          isOpen={true}
          onClose={() => setTransicionOpen(false)}
          estadoActual={contrato.estado}
          transicionesDisponibles={transiciones}
          onConfirmar={handleConfirmarTransicion}
          isLoading={transicionLoading}
        />
      )}

      <ContratoHistorialModal
        isOpen={historialOpen}
        onClose={() => setHistorialOpen(false)}
        contratoId={contrato.id}
      />

      {compareVersions && (
        <CompararVersionesModal
          contratoId={contrato.id}
          v1={compareVersions.v1}
          v2={compareVersions.v2}
          isOpen={true}
          onClose={() => setCompareVersions(null)}
        />
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900 text-right">{value}</dd>
    </div>
  )
}

