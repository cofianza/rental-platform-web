'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
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
  IconFileText,
  IconFileCheck,
  IconCalendar,
  IconClock,
  IconScrollText,
  IconFolderOpen,
  IconMail,
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
import { EnviarFirmaPreviewModal } from '@/components/expedientes/EnviarFirmaPreviewModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { IContrato, EstadoContrato } from '@/types/contrato'
import type { IFirmantesPreview } from '@/types/firma'

const PdfViewer = dynamic(
  () => import('@/components/ui/PdfViewer').then((m) => ({ default: m.PdfViewer })),
  { ssr: false }
)

const TERMINAL_STATES: EstadoContrato[] = ['finalizado', 'cancelado']
const FIRMADO_VISIBLE_STATES: EstadoContrato[] = ['firmado', 'vigente', 'finalizado', 'cancelado']
// Estados desde los que se puede llevar el contrato a firma (el endpoint
// dedicado /enviar-firma salta directo a pendiente_firma). Espejo de
// ESTADOS_PRE_FIRMA en ContratosSection.
const ESTADOS_PRE_FIRMA: EstadoContrato[] = ['borrador', 'en_revision', 'aprobado']

// Color del punto del badge de estado. Clases estáticas (Tailwind no detecta
// `bg-${color}-500` interpolado) mapeadas desde estadoConfig.color.
const ESTADO_DOT: Record<string, string> = {
  gray: 'bg-gray-500',
  amber: 'bg-amber-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  teal: 'bg-teal-500',
  blue: 'bg-blue-500',
  slate: 'bg-slate-500',
  red: 'bg-red-500',
}

export default function ContratoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const [contrato, setContrato] = useState<IContrato | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  // true = el preview muestra el documento FIRMADO (con firmas + acuses); false
  // = el PDF generado de la plantilla.
  const [previewFirmado, setPreviewFirmado] = useState(false)
  const [previewFuente, setPreviewFuente] = useState<'manual' | 'auco' | 'combinado' | 'original' | null>(null)
  // 4.1d: alterna entre el PDF y la "vista de verificación" (contrato con los
  // datos insertados resaltados) para confirmar que se generó bien.
  const [vista, setVista] = useState<'pdf' | 'verificacion'>('pdf')
  const [transiciones, setTransiciones] = useState<Array<{ estado: EstadoContrato; label: string }>>([])
  const [morasActivas, setMorasActivas] = useState(0)
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
  // Enviar a firma (con confirmación). Igual patrón que ContratosSection: un
  // pre-chequeo server-driven decide si mostramos el preview multi-parte
  // (firma multi-parte ON) o un ConfirmDialog simple (flujo de un firmante,
  // el caso en prod con FIRMA_MULTIPARTE_ENABLED=OFF). Sin el ConfirmDialog el
  // envío de un firmante iría directo, sin la confirmación que se pidió.
  const [enviandoFirma, setEnviandoFirma] = useState(false)
  const [firmaPreview, setFirmaPreview] = useState<IFirmantesPreview | null>(null)
  const [confirmFirmaOpen, setConfirmFirmaOpen] = useState(false)
  const [confirmandoFirma, setConfirmandoFirma] = useState(false)

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
            // fuente: 'auco'/'manual' = PDF con firmas reales; 'combinado' =
            // original + acuses; 'original' = SIN firmas (no pintar el banner
            // "documento firmado" sobre un PDF que no las tiene). Backends
            // viejos no mandan fuente → asumimos firmado (comportamiento previo).
            const fuente = firmado.fuente ?? 'manual'
            esFirmado = fuente !== 'original'
            setPreviewFuente(fuente)
          } catch {
            // Documento firmado aún no disponible (p. ej. cancelado pre-firma o
            // generación pendiente) — caemos al generado.
            setPreviewFuente(null)
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
          setMorasActivas(t.moras_activas ?? 0)
        } catch {
          // Silent
        }
      } else {
        // Estado terminal (finalizado/cancelado): limpiar las transiciones
        // viejas — sin esto, los botones de transición seguían pintados tras
        // finalizar y un click daba error.
        setTransiciones([])
        setMorasActivas(0)
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


  // Abrir el modal de transición: refetch de transiciones + moras activas para
  // que la advertencia de moras del modal no muestre un conteo desactualizado
  // (p. ej. si se saldó/reportó una mora tras cargar la página).
  async function handleAbrirTransicion() {
    try {
      const t = await contratoService.getTransicionesDisponibles(id)
      setTransiciones(t.transiciones_disponibles ?? [])
      setMorasActivas(t.moras_activas ?? 0)
    } catch {
      // Si falla el refetch, abrimos igual con lo que ya teníamos.
    }
    setTransicionOpen(true)
  }

  async function handleConfirmarTransicion(estadoDestino: EstadoContrato, comentario: string, motivo?: string): Promise<boolean> {
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
      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cambiar estado'
      toast.error(message)
      return false
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

  // Enviar a firma: primero un pre-chequeo (previewFirmantes). Si aplica la
  // firma multi-parte y hay firmantes, abrimos el preview (muestra a qué
  // WhatsApp llega el OTP de cada uno y bloquea si hay teléfono repetido).
  // Si no aplica (flujo de un solo firmante), abrimos un ConfirmDialog para
  // que SIEMPRE haya confirmación explícita antes de enviar.
  async function handleEnviarAFirma() {
    setEnviandoFirma(true)
    try {
      const preview = await contratoService.previewFirmantes(id)
      if (preview.aplica && preview.firmantes.length > 0) {
        setFirmaPreview(preview)
      } else {
        setConfirmFirmaOpen(true)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo preparar el envío a firma'
      toast.error(message)
    } finally {
      setEnviandoFirma(false)
    }
  }

  // onConfirm de ambos modales (preview multi-parte y ConfirmDialog). Envía y
  // refresca EN SITIO (fetchContrato) — el estado pasa a pendiente_firma y
  // aparece el progreso de firmantes.
  async function handleConfirmarFirma() {
    setConfirmandoFirma(true)
    try {
      const res = await contratoService.enviarAFirma(id)
      toast.success(res.message || 'Contrato enviado a firma')
      setFirmaPreview(null)
      setConfirmFirmaOpen(false)
      // Refresco (no await) — igual que handleConfirmarTransicion: el estado
      // pasa a pendiente_firma y aparece el progreso de firmantes.
      fetchContrato()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo enviar a firma'
      toast.error(message)
    } finally {
      setConfirmandoFirma(false)
    }
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-52 bg-gray-200 animate-pulse rounded" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-11 w-11 bg-gray-200 animate-pulse rounded-xl" />
            <div>
              <div className="h-7 w-64 bg-gray-200 animate-pulse rounded" />
              <div className="flex gap-2 mt-2.5">
                <div className="h-6 w-24 bg-gray-200 animate-pulse rounded-full" />
                <div className="h-6 w-12 bg-gray-200 animate-pulse rounded-full" />
              </div>
            </div>
          </div>
          <div className="hidden sm:flex gap-2">
            <div className="h-9 w-32 bg-gray-200 animate-pulse rounded-lg" />
            <div className="h-9 w-32 bg-gray-200 animate-pulse rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-125 bg-gray-200 animate-pulse rounded-xl" />
          <div className="space-y-6">
            <div className="h-64 bg-gray-200 animate-pulse rounded-xl" />
            <div className="h-40 bg-gray-200 animate-pulse rounded-xl" />
          </div>
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
  const dotClass = ESTADO_DOT[estadoConfig?.color ?? 'gray'] || 'bg-gray-400'
  const valorArriendoFmt = contrato.valor_arriendo
    ? new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      }).format(Number(contrato.valor_arriendo))
    : '—'

  return (
    <div className="space-y-6">
      {/* Back + Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => router.push('/contratos')}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
          aria-label="Volver a Contratos"
        >
          <IconArrowLeft size={18} />
        </button>
        <button
          onClick={() => router.push('/contratos')}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          Contratos
        </button>
        <IconChevronRight size={14} className="text-gray-400" />
        <span className="text-gray-900 font-medium truncate">{contrato.nombre_archivo || 'contrato.pdf'}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 ring-1 ring-primary-100">
            <IconFileText size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight wrap-break-word">
              {contrato.nombre_archivo || 'contrato.pdf'}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${estadoConfig?.bgColor || 'bg-gray-100'} ${estadoConfig?.textColor || 'text-gray-700'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                {estadoConfig?.label || contrato.estado}
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 tabular-nums">
                v{contrato.version}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleDownload}
            disabled={downloadLoading || !contrato.storage_key}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
          >
            {downloadLoading ? <IconLoader size={16} className="animate-spin" /> : <IconDownload size={16} />}
            Descargar PDF
          </button>
          {canRegenerate && contrato.estado === 'borrador' && (
            <button
              onClick={() => setRegenerarOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
            >
              <IconRefresh size={16} />
              Editar y regenerar
            </button>
          )}
          {canRegenerate && ESTADOS_PRE_FIRMA.includes(contrato.estado) && (
            <button
              onClick={handleEnviarAFirma}
              disabled={enviandoFirma || !contrato.storage_key}
              title={!contrato.storage_key ? 'Genera el PDF antes de enviar a firma' : 'Llevar a firma y notificar al arrendatario por WhatsApp'}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-coral-500 rounded-lg hover:bg-coral-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40"
            >
              {enviandoFirma ? <IconLoader size={16} className="animate-spin" /> : <IconMail size={16} />}
              {enviandoFirma ? 'Preparando…' : 'Enviar a firma'}
            </button>
          )}
          {canManage && transiciones.length > 0 && transiciones.map((t) => (
            <button
              key={t.estado}
              onClick={handleAbrirTransicion}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
            >
              <IconArrowRight size={16} />
              {t.label}
            </button>
          ))}
          {canManage && contrato.estado === 'vigente' && (
            <button
              onClick={handleRenovar}
              disabled={renewLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
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
          {/* 4.1d: alternar entre el PDF y la vista de verificación (datos
              resaltados) para confirmar que el contrato se generó bien. La vista
              de verificación es independiente del PDF (usa su propio endpoint),
              así que el toggle se muestra aunque el PDF no esté disponible. */}
          <div className="flex items-center px-4 py-2.5 border-b border-gray-200 bg-gray-50/70">
            <div className="inline-flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5">
              <button
                onClick={() => setVista('pdf')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 ${
                  vista === 'pdf'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <IconFileText size={14} />
                PDF
              </button>
              <button
                onClick={() => setVista('verificacion')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 ${
                  vista === 'verificacion'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <IconFileCheck size={14} />
                Vista de verificación
              </button>
            </div>
          </div>
          {previewFirmado && vista === 'pdf' && previewUrl && (
            previewFuente === 'combinado' ? (
              <div className="flex items-start gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-xs font-medium text-amber-700">
                <IconAlertTriangle size={15} className="shrink-0 mt-px" />
                <span>
                  Contrato con acuses de firma electrónica adjuntos. El documento con las firmas
                  estampadas de Auco aún no está disponible — se intentará traer de nuevo al recargar.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border-b border-green-200 text-xs font-medium text-green-700">
                <IconFileCheck size={15} className="shrink-0" />
                <span>Documento firmado (con firmas y acuses de Auco) — el mismo que recibe el cliente.</span>
              </div>
            )
          )}
          {/* 4.1c: el contrato supera las 11 páginas; damos casi toda la
              altura de la ventana para leerlo cómodo (el visor scrollea). */}
          <div className="h-[85vh] min-h-150">
            {vista === 'verificacion' ? (
              <ContratoVerificacionView contratoId={id} />
            ) : previewUrl ? (
              <PdfViewer url={previewUrl} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <IconFileText size={26} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">PDF no disponible</p>
                  <p className="text-xs text-gray-400 mt-0.5">El documento aún no se ha generado o no pudo cargarse.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info panel */}
        <div className="space-y-6">
          {/* Contract info */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Canon mensual — la cifra clave del contrato, destacada. */}
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Canon mensual</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{valorArriendoFmt}</p>
            </div>
            <div className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Información del contrato</h3>
              <dl className="space-y-3.5 text-sm">
                <InfoRow icon={<IconCalendar size={15} />} label="Fecha de inicio" value={contrato.fecha_inicio || '—'} />
                <InfoRow
                  icon={<IconClock size={15} />}
                  label="Duración"
                  value={contrato.duracion_meses ? `${contrato.duracion_meses} meses` : '—'}
                />
                <InfoRow
                  icon={<IconScrollText size={15} />}
                  label="Plantilla"
                  value={contrato.plantilla_version ? `v${contrato.plantilla_version}` : '—'}
                />
                <InfoRow
                  icon={<IconCalendar size={15} />}
                  label="Fecha de generación"
                  value={
                    contrato.fecha_generacion
                      ? formatDateTime(contrato.fecha_generacion)
                      : formatDateTime(contrato.created_at)
                  }
                />
                {contrato.fecha_firma && (
                  <InfoRow icon={<IconFileCheck size={15} />} label="Fecha de firma" value={formatDateTime(contrato.fecha_firma)} />
                )}
                {contrato.fecha_terminacion && (
                  <InfoRow icon={<IconClock size={15} />} label="Fecha de terminación" value={formatDateTime(contrato.fecha_terminacion)} />
                )}
              </dl>

              {/* Motivo cancelacion */}
              {contrato.motivo_cancelacion && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-red-700 mb-1">
                    <IconAlertTriangle size={13} />
                    Motivo de cancelación
                  </p>
                  <p className="text-sm text-red-600">{contrato.motivo_cancelacion}</p>
                </div>
              )}
            </div>
          </div>

          {/* Firmantes del contrato: quiénes firmaron, sus datos y la fecha de
              firma. Se auto-oculta si el contrato no usa firma multi-parte. */}
          <FirmantesContratoSection contratoId={id} canManage={canManage} onAllSigned={handleAllSigned} />

          {/* Accesos: expediente + historial de estados, agrupados en una sola
              tarjeta de lista en vez de dos tarjetas sueltas. */}
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            <LinkRow
              icon={<IconFolderOpen size={16} />}
              iconClass="bg-primary-50 text-primary-600"
              label="Ver expediente"
              onClick={() => router.push(`/expedientes/${contrato.expediente_id}`)}
            />
            <LinkRow
              icon={<IconHistory size={16} />}
              iconClass="bg-gray-100 text-gray-500"
              label="Ver historial de estados"
              onClick={() => setHistorialOpen(true)}
            />
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
          morasActivas={morasActivas}
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

      {/* Enviar a firma — preview multi-parte (flag ON) o confirmación simple. */}
      <EnviarFirmaPreviewModal
        isOpen={!!firmaPreview}
        firmantes={firmaPreview?.firmantes ?? []}
        puedeEnviar={firmaPreview?.puede_enviar ?? false}
        submitting={confirmandoFirma}
        onConfirm={handleConfirmarFirma}
        onClose={() => {
          if (!confirmandoFirma) setFirmaPreview(null)
        }}
      />

      <ConfirmDialog
        isOpen={confirmFirmaOpen}
        onClose={() => setConfirmFirmaOpen(false)}
        onConfirm={handleConfirmarFirma}
        title="Enviar contrato a firma"
        message="Se llevará el contrato a “Enviado a firma” y se notificará al arrendatario por WhatsApp para que firme. ¿Continuar?"
        confirmLabel="Enviar a firma"
        isLoading={confirmandoFirma}
      />
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-gray-500">
        {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
        {label}
      </dt>
      <dd className="font-medium text-gray-900 text-right tabular-nums">{value}</dd>
    </div>
  )
}

function LinkRow({
  icon,
  iconClass,
  label,
  onClick,
}: {
  icon: ReactNode
  iconClass: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/40"
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
        {icon}
      </span>
      <span className="flex-1 text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
      <IconChevronRight size={16} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
    </button>
  )
}

