/**
 * EstudioDetailModal
 * Modal de detalle de un estudio de riesgo crediticio
 * Con tabs: Información | Documentos | Timeline
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { PdfViewer } from '@/components/ui/PdfViewer'
import { IconFileText, IconLoader, IconCheck, IconEye } from '@/components/icons'
import { estudioService } from '@/services/estudioService'
import { documentoService } from '@/services/documentoService'
import { ScoreGauge } from '@/components/estudios/ScoreGauge'
import { TransUnionReportDetail } from '@/components/estudios/TransUnionReportDetail'
import { ReEvaluacionSection } from './ReEvaluacionSection'
import { EstudioHistorialSection } from './EstudioHistorialSection'
import type { IEstudio, IEstudioHistorial, IEstudioDocumento } from '@/types/estudio'
import type { TransUnionResponse } from '@/types/transunion'
import type { Tab as TabType } from '@/components/ui/Tabs'

interface EstudioDetailModalProps {
  isOpen: boolean
  onClose: () => void
  estudio: IEstudio | null
}

const PROVEEDOR_LABELS: Record<string, string> = {
  transunion: 'TransUnion',
  sifin: 'SIFIN',
  datacredito: 'DataCredito',
}

const TIPO_LABELS: Record<string, string> = {
  individual: 'Individual',
  con_coarrendatario: 'Con coarrendatario',
}

const PAGO_LABELS: Record<string, string> = {
  inmobiliaria: 'Inmobiliaria',
  arrendatario: 'Arrendatario',
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

// ============================================
// Document preview sub-component
// ============================================

function DocumentoPreviewItem({ doc }: { doc: IEstudioDocumento }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const isPdf = doc.tipo_mime === 'application/pdf'

  const handlePreview = async () => {
    if (previewUrl) {
      setShowPreview(!showPreview)
      return
    }
    setLoadingPreview(true)
    try {
      const res = await documentoService.getViewUrl(doc.id)
      setPreviewUrl(res.url)
      setShowPreview(true)
    } catch {
      toast.error('Error al cargar la vista previa del documento')
    } finally {
      setLoadingPreview(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-50">
        <div className="flex items-center gap-3 min-w-0">
          <IconFileText size={20} className="text-gray-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{doc.nombre_original}</p>
            <p className="text-xs text-gray-500">
              {doc.tipo.replace(/_/g, ' ')} · {formatBytes(doc.tamano_bytes)} · {formatDate(doc.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge estado={doc.estado} />
          {isPdf && (
            <button
              onClick={handlePreview}
              disabled={loadingPreview}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded hover:bg-primary-100 disabled:opacity-50"
            >
              {loadingPreview ? (
                <IconLoader size={14} className="animate-spin" />
              ) : (
                <IconEye size={14} />
              )}
              {showPreview ? 'Ocultar' : 'Ver PDF'}
            </button>
          )}
        </div>
      </div>
      {showPreview && previewUrl && isPdf && (
        <div className="h-125 bg-gray-900">
          <PdfViewer url={previewUrl} />
        </div>
      )}
    </div>
  )
}

// ============================================
// Main modal
// ============================================

export function EstudioDetailModal({ isOpen, onClose, estudio: initialEstudio }: EstudioDetailModalProps) {
  const [loadingCert, setLoadingCert] = useState(false)
  const [generatingCert, setGeneratingCert] = useState(false)
  const [estudio, setEstudio] = useState<IEstudio | null>(initialEstudio)
  const [historial, setHistorial] = useState<IEstudioHistorial | null>(null)
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [activeTab, setActiveTab] = useState('informacion')

  // Sync with prop changes
  useEffect(() => {
    setEstudio(initialEstudio)
    setActiveTab('informacion')
  }, [initialEstudio])

  // Fetch historial when modal opens
  const fetchHistorial = useCallback(async (estudioId: string) => {
    setLoadingHistorial(true)
    try {
      const data = await estudioService.getHistorial(estudioId)
      setHistorial(data)
    } catch {
      // silent fail
    } finally {
      setLoadingHistorial(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && estudio?.id) {
      fetchHistorial(estudio.id)
    } else {
      setHistorial(null)
    }
  }, [isOpen, estudio?.id, fetchHistorial])

  if (!estudio) return null

  const isTransUnion = estudio.proveedor === 'transunion'
  const isTransUnionCompleted = isTransUnion && estudio.estado === 'completado'
  const transunionData = isTransUnionCompleted
    ? (estudio.datos_formulario as TransUnionResponse | null)
    : null

  const isReevaluable =
    estudio.estado === 'completado' &&
    (estudio.resultado === 'rechazado' || estudio.resultado === 'condicionado')

  const isCertificable =
    estudio.estado === 'completado' &&
    (estudio.resultado === 'aprobado' || estudio.resultado === 'condicionado')

  const documentos = estudio.documentos || []

  const tabs: TabType[] = [
    { id: 'informacion', label: 'Información' },
    { id: 'documentos', label: 'Documentos', count: documentos.length > 0 ? documentos.length : undefined },
    { id: 'timeline', label: 'Timeline' },
  ]

  const handleGenerarCertificado = async () => {
    setGeneratingCert(true)
    try {
      const result = await estudioService.generarCertificado(estudio.id)
      toast.success(`Certificado ${result.codigo} generado correctamente`)
      setEstudio((prev) => prev ? { ...prev, certificado_url: result.pdf_storage_key } : prev)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al generar certificado'
      toast.error(msg)
    } finally {
      setGeneratingCert(false)
    }
  }

  const handleDescargarCertificado = async () => {
    setLoadingCert(true)
    try {
      const res = await estudioService.descargarCertificado(estudio.id)
      window.open(res.url, '_blank')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al descargar certificado'
      toast.error(msg)
    } finally {
      setLoadingCert(false)
    }
  }

  const handleReEvaluacionCreated = (nuevoEstudio: IEstudio) => {
    setEstudio(nuevoEstudio)
    fetchHistorial(nuevoEstudio.id)
  }

  const handleDocumentoAdded = () => {
    if (estudio?.id) fetchHistorial(estudio.id)
  }

  const handleEstudioSelect = async (estudioId: string) => {
    try {
      const detail = await estudioService.getEstudioById(estudioId)
      setEstudio(detail)
    } catch {
      toast.error('Error al cargar estudio')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle del Estudio" size="lg">
      <div className="space-y-4">
        {/* Estado y resultado */}
        {isTransUnionCompleted ? (
          <div className="flex flex-col items-center py-2">
            <ScoreGauge score={estudio.score} resultado={estudio.resultado} size="md" />
            <div className="flex items-center gap-2 mt-3">
              <Badge estado={estudio.estado} />
              <Badge estado={estudio.resultado} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Badge estado={estudio.estado} />
            <Badge estado={estudio.resultado} />
            {estudio.score != null && (
              <span className="text-sm font-semibold text-gray-700">
                Score: {estudio.score}
              </span>
            )}
          </div>
        )}

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab: Información */}
        {activeTab === 'informacion' && (
          <div className="space-y-4">
            {/* Info principal */}
            <div className="bg-gray-50 rounded-lg p-4">
              <DetailRow label="Tipo" value={TIPO_LABELS[estudio.tipo] || estudio.tipo} />
              <DetailRow label="Proveedor" value={PROVEEDOR_LABELS[estudio.proveedor] || estudio.proveedor} />
              <DetailRow label="Duracion contrato" value={`${estudio.duracion_contrato_meses} meses`} />
              <DetailRow label="Pago por" value={PAGO_LABELS[estudio.pago_por] || estudio.pago_por} />
              {estudio.referencia_proveedor && (
                <DetailRow label="Referencia proveedor" value={estudio.referencia_proveedor} />
              )}
            </div>

            {/* Fechas */}
            <div className="bg-gray-50 rounded-lg p-4">
              <DetailRow label="Fecha solicitud" value={formatDate(estudio.fecha_solicitud)} />
              <DetailRow label="Fecha completado" value={formatDate(estudio.fecha_completado)} />
              <DetailRow label="Creado" value={formatDate(estudio.created_at)} />
            </div>

            {/* Solicitado por */}
            {estudio.solicitado_por && (
              <div className="bg-gray-50 rounded-lg p-4">
                <DetailRow
                  label="Solicitado por"
                  value={`${estudio.solicitado_por.nombre} ${estudio.solicitado_por.apellido}`}
                />
              </div>
            )}

            {/* Observaciones */}
            {estudio.observaciones && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Observaciones</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                  {estudio.observaciones}
                </p>
              </div>
            )}

            {/* Motivo de rechazo */}
            {estudio.resultado === 'rechazado' && estudio.motivo_rechazo && (
              <div>
                <h4 className="text-sm font-medium text-red-700 mb-1">Motivo de rechazo</h4>
                <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 whitespace-pre-wrap">
                  {estudio.motivo_rechazo}
                </p>
              </div>
            )}

            {/* Condiciones */}
            {estudio.resultado === 'condicionado' && estudio.condiciones && (
              <div>
                <h4 className="text-sm font-medium text-yellow-700 mb-1">Condiciones</h4>
                <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg border border-yellow-200 whitespace-pre-wrap">
                  {estudio.condiciones}
                </p>
              </div>
            )}

            {/* Certificado */}
            {isCertificable && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Certificado</h4>
                {estudio.certificado_url ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDescargarCertificado}
                      disabled={loadingCert}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 disabled:opacity-50"
                    >
                      {loadingCert ? (
                        <IconLoader size={16} className="animate-spin" />
                      ) : (
                        <IconFileText size={16} />
                      )}
                      Descargar Certificado
                    </button>
                    <button
                      onClick={handleGenerarCertificado}
                      disabled={generatingCert}
                      className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                    >
                      {generatingCert ? (
                        <IconLoader size={14} className="animate-spin" />
                      ) : (
                        <IconCheck size={14} />
                      )}
                      Regenerar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerarCertificado}
                    disabled={generatingCert}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {generatingCert ? (
                      <>
                        <IconLoader size={16} className="animate-spin" />
                        Generando certificado...
                      </>
                    ) : (
                      <>
                        <IconFileText size={16} />
                        Generar Certificado
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* TransUnion Report Detail */}
            {transunionData && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Reporte TransUnion</h4>
                <TransUnionReportDetail data={transunionData} />
              </div>
            )}

            {/* Datos formulario (non-TransUnion providers) */}
            {estudio.datos_formulario && !isTransUnionCompleted && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Datos del formulario</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {Object.entries(estudio.datos_formulario).map(([key, value]) => (
                    <DetailRow
                      key={key}
                      label={key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      value={String(value)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Re-evaluacion section */}
            {isReevaluable && (
              <ReEvaluacionSection
                estudio={estudio}
                historial={historial}
                onReEvaluacionCreated={handleReEvaluacionCreated}
                onDocumentoAdded={handleDocumentoAdded}
              />
            )}
          </div>
        )}

        {/* Tab: Documentos */}
        {activeTab === 'documentos' && (
          <div className="space-y-3">
            {documentos.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <IconFileText size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No hay documentos vinculados a este estudio.</p>
              </div>
            ) : (
              documentos.map((doc) => (
                <DocumentoPreviewItem key={doc.id} doc={doc} />
              ))
            )}
          </div>
        )}

        {/* Tab: Timeline */}
        {activeTab === 'timeline' && (
          <EstudioHistorialSection
            estudioId={estudio.id}
            historial={historial}
            isLoading={loadingHistorial}
            onEstudioSelect={handleEstudioSelect}
          />
        )}

        {/* Boton cerrar */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  )
}
