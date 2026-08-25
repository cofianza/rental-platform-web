/**
 * EstudioDetailModal
 * Modal de detalle de un estudio de riesgo crediticio
 * Con tabs: Información | Documentos | Timeline
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { IconFileText, IconLoader, IconCheck } from '@/components/icons'
import { estudioService } from '@/services/estudioService'
import { ScoreGauge } from '@/components/estudios/ScoreGauge'
import { TransUnionReportDetail } from '@/components/estudios/TransUnionReportDetail'
import { DataCreditoReportDetail } from '@/components/estudios/DataCreditoReportDetail'
import { ReporteBuroErrorBoundary } from '@/components/estudios/ReporteBuroErrorBoundary'
import { ReEvaluacionSection } from './ReEvaluacionSection'
import type { IEstudio, IEstudioHistorial } from '@/types/estudio'
import type { TransUnionResponse } from '@/types/transunion'
import type { DataCreditoResponse } from '@/types/datacredito'

interface EstudioDetailModalProps {
  isOpen: boolean
  onClose: () => void
  estudio: IEstudio | null
  /**
   * Si true, esconde acciones de gestion (regenerar certificado,
   * re-evaluacion). El propietario/inmobiliaria pueden ver el reporte
   * completo y descargar el certificado pero no operar sobre el estudio.
   */
  readOnly?: boolean
  /** Solicitante (persona evaluada) — viene del expediente padre. Se muestra
   *  en la seccion de informacion como nombre + tipo + numero de documento. */
  solicitante?: {
    nombre: string
    apellido: string
    tipo_documento?: string | null
    numero_documento?: string | null
  } | null
}

const PROVEEDOR_LABELS: Record<string, string> = {
  transunion: 'TransUnion',
  sifin: 'SIFIN',
  datacredito: 'DataCrédito',
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

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

// ============================================
// Main modal
// ============================================

export function EstudioDetailModal({ isOpen, onClose, estudio: initialEstudio, readOnly = false, solicitante }: EstudioDetailModalProps) {
  const [loadingCert, setLoadingCert] = useState(false)
  const [generatingCert, setGeneratingCert] = useState(false)
  const [estudio, setEstudio] = useState<IEstudio | null>(initialEstudio)
  const [historial, setHistorial] = useState<IEstudioHistorial | null>(null)

  // Sync con cambios del prop. Ademas, al abrir el modal recargamos el
  // estudio por id para traer `datos_formulario` (no viene en el listado;
  // sin esto el reporte TransUnion saldria vacio para propietarios).
  useEffect(() => {
    setEstudio(initialEstudio)
    if (initialEstudio?.id && isOpen) {
      estudioService
        .getEstudioById(initialEstudio.id)
        .then((full) => setEstudio(full))
        .catch(() => {
          // Sin reload silencioso: si falla, queda el snapshot del listado.
        })
    }
  }, [initialEstudio, isOpen])

  // Historial sigue siendo necesario internamente para ReEvaluacionSection
  // (lo recibe como prop). Lo cargamos solo cuando aplica re-evaluacion.
  const fetchHistorial = useCallback(async (estudioId: string) => {
    try {
      const data = await estudioService.getHistorial(estudioId)
      setHistorial(data)
    } catch {
      // silent fail — la seccion de re-evaluacion se adapta sin historial.
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
  const isDataCredito = estudio.proveedor === 'datacredito'
  const isDataCreditoCompleted = isDataCredito && estudio.estado === 'completado'
  // Ambos burós comparten el resumen (gauge + observaciones) y ahora ambos
  // tienen vista de reporte detallado propia.
  const isBuroCompleted = isTransUnionCompleted || isDataCreditoCompleted
  // El detalle del buró se persiste en `respuesta_proveedor` (JSON crudo del
  // proveedor). Antes leíamos de `datos_formulario`, que en realidad solo
  // contiene los inputs del form — por eso el modal aparecía vacío para los
  // estudios completados antes del fix.
  const transunionData = isTransUnionCompleted
    ? (estudio.respuesta_proveedor as TransUnionResponse | null)
    : null
  // DataCrédito sí envuelve su reporte: la raíz persistida es
  // { ReportHDCplus: {...} }, porque el provider guarda la respuesta completa
  // y no `response.ReportHDCplus`. TransUnion no tiene esa envoltura.
  const datacreditoData = isDataCreditoCompleted
    ? (estudio.respuesta_proveedor as DataCreditoResponse | null)
    : null

  // Un estudio "completado" no garantiza que haya reporte con contenido
  // financiero: DataCrédito responde código 14 (consulta efectiva SIN historia
  // crediticia) y además la persistencia de `respuesta_proveedor` es
  // best-effort en la API. En esos casos los datos del formulario (ingresos
  // declarados, ocupación, empresa) son lo único que le queda al gestor, así
  // que la sección no debe suprimirse por el simple hecho de que el buró
  // respondió.
  const dcReport = datacreditoData?.ReportHDCplus
  const dcConHistoria = Boolean(
    dcReport?.liabilities?.length ||
      dcReport?.creditCard?.length ||
      dcReport?.agregatedInfo?.overview ||
      dcReport?.AgregatedInfo?.overview
  )
  const hayReporteFinanciero = Boolean(transunionData) || dcConHistoria

  const isReevaluable =
    estudio.estado === 'completado' &&
    (estudio.resultado === 'rechazado' || estudio.resultado === 'condicionado')

  const isCertificable =
    estudio.estado === 'completado' &&
    (estudio.resultado === 'aprobado' || estudio.resultado === 'condicionado')

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle del Estudio" size="lg">
      <div className="space-y-4">
        {/* Estado y resultado */}
        {isBuroCompleted ? (
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

        {/* Información del estudio */}
        <div className="space-y-4">
            {/* Persona evaluada — primero por relevancia */}
            {solicitante && (
              <div className="bg-gray-50 rounded-lg p-4">
                <DetailRow
                  label="Persona evaluada"
                  value={`${solicitante.nombre} ${solicitante.apellido}`.trim() || '—'}
                />
                {solicitante.numero_documento && (
                  <DetailRow
                    label="Documento"
                    value={`${solicitante.tipo_documento || ''} ${solicitante.numero_documento}`.trim()}
                  />
                )}
              </div>
            )}

            {/* Info principal */}
            <div className="bg-gray-50 rounded-lg p-4">
              <DetailRow label="Tipo" value={TIPO_LABELS[estudio.tipo] || estudio.tipo} />
              <DetailRow label="Proveedor" value={PROVEEDOR_LABELS[estudio.proveedor] || estudio.proveedor} />
              {estudio.duracion_contrato_meses != null && estudio.duracion_contrato_meses > 0 && (
                <DetailRow label="Duracion contrato" value={`${estudio.duracion_contrato_meses} meses`} />
              )}
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
                    {!readOnly && (
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
                    )}
                  </div>
                ) : readOnly ? (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    El certificado aún no ha sido generado por el equipo de Cofianza.
                  </p>
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
            {isTransUnionCompleted && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Reporte TransUnion</h4>
                {transunionData ? (
                  <ReporteBuroErrorBoundary>
                    <TransUnionReportDetail data={transunionData} />
                  </ReporteBuroErrorBoundary>
                ) : (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    El reporte detallado del buró no se persistió para este estudio.
                    Las consultas más recientes incluyen el detalle completo;
                    para este caso, las observaciones del estudio resumen el resultado.
                  </p>
                )}
              </div>
            )}

            {/* DataCredito Report Detail */}
            {isDataCreditoCompleted && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Reporte DataCrédito</h4>
                {datacreditoData?.ReportHDCplus ? (
                  <ReporteBuroErrorBoundary>
                    <DataCreditoReportDetail data={datacreditoData} />
                  </ReporteBuroErrorBoundary>
                ) : (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    El reporte detallado del buró no se persistió para este estudio.
                    Las consultas más recientes incluyen el detalle completo;
                    para este caso, las observaciones del estudio resumen el resultado.
                  </p>
                )}
              </div>
            )}

            {/* Datos formulario — fallback cuando no hay reporte de buró con
                contenido financiero (manual, SIFIN, no completados, código 14
                de DataCrédito o `respuesta_proveedor` no persistida). No debe
                suplantar al reporte, pero tampoco desaparecer cuando el reporte
                no trae historia crediticia: es el único insumo que queda. */}
            {estudio.datos_formulario && !hayReporteFinanciero && (
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

            {/* Re-evaluacion section — solo gestores (admin/operador) */}
            {isReevaluable && !readOnly && (
              <ReEvaluacionSection
                estudio={estudio}
                historial={historial}
                onReEvaluacionCreated={handleReEvaluacionCreated}
                onDocumentoAdded={handleDocumentoAdded}
              />
            )}
        </div>

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
