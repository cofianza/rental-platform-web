'use client'

import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { useEffect, useState } from 'react'
import { IconHistory, IconAlertTriangle, IconRefresh } from '@/components/icons'
import { etiquetaContrato, formatDateTime } from '@/lib/constants'
import { contratoService } from '@/services/contratoService'
import { VersionHistorialSection } from './VersionHistorialSection'
import { CompararVersionesModal } from './CompararVersionesModal'
import { ContratoHistorialModal } from './ContratoHistorialModal'
import type { IContrato } from '@/types/contrato'
import { Skeleton } from '@/components/ui/Skeleton'

interface ContratoDetalleModalProps {
  contrato: IContrato | null
  onClose: () => void
}

export function ContratoDetalleModal({ contrato, onClose }: ContratoDetalleModalProps) {
  const [compareVersions, setCompareVersions] = useState<{ v1: number; v2: number } | null>(null)
  const [historialOpen, setHistorialOpen] = useState(false)

  // Preview del PDF embebido. Si el contrato todavia no tiene storage_key,
  // saltamos la carga (caso de un registro recien creado por el orchestrator
  // antes de que el PDF se genere o tras un fallo).
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  // Reintento de la vista previa sin cerrar el diálogo.
  const [intentoPdf, setIntentoPdf] = useState(0)

  useEffect(() => {
    if (!contrato?.id) return
    if (!contrato.storage_key) {
      setPdfUrl(null)
      setPdfError(null)
      return
    }
    setPdfLoading(true)
    setPdfError(null)
    setPdfUrl(null)
    contratoService
      .descargarContrato(contrato.id, { inline: true })
      .then((res) => setPdfUrl(res.url))
      .catch((err) => setPdfError(err instanceof Error ? err.message : 'No se pudo cargar el PDF'))
      .finally(() => setPdfLoading(false))
  }, [contrato?.id, contrato?.storage_key, intentoPdf])

  if (!contrato) return null

  // Aplanamos shape anidado V2 (arrendador.razon_social, canon.valor_letras, etc)
  // para listarlo. React #31 si renderizamos un objeto directo.
  const variableEntries = flattenVariables(contrato.datos_variables || {})

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title="Detalle del contrato"
        description={`${contrato.nombre_archivo || 'contrato.pdf'} · versión ${contrato.version} · ${etiquetaContrato(contrato.estado, !!contrato.destinacion)}`}
        size="2xl"
        closeOnBackdrop
        footer={
          <ModalAcciones>
            <button type="button" onClick={onClose} className={botonModal('secondary')}>
              Cerrar
            </button>
          </ModalAcciones>
        }
      >
        <div className="space-y-6">
          {/* Preview del PDF */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Vista previa</h3>
            {!contrato.storage_key ? (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <IconAlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    El PDF aún no ha sido generado.
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Cierre esta ventana y pulse <strong>Regenerar</strong> en la fila del
                    contrato para producir el PDF con la plantilla activa.
                  </p>
                </div>
              </div>
            ) : pdfLoading ? (
              <div role="status">
                <span className="sr-only">Cargando el documento…</span>
                <Skeleton className="h-64 w-full rounded-lg" />
              </div>
            ) : pdfError ? (
              <div role="alert" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-start">
                <IconAlertTriangle size={18} className="text-red-600 mt-0.5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-red-900">No se pudo cargar la vista previa del contrato.</p>
                  <p className="mt-0.5 text-xs text-red-800">{pdfError}</p>
                </div>
                <button type="button" onClick={() => setIntentoPdf((n) => n + 1)} className={botonModal('secondary', 'shrink-0')}>
                  <IconRefresh size={16} aria-hidden="true" />
                  Reintentar
                </button>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                title="Vista previa del contrato"
                className="w-full border border-gray-200 rounded-lg bg-white"
                style={{ height: '70dvh' }}
              />
            ) : null}
          </div>

          {/* Info general */}
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Archivo</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {contrato.nombre_archivo || 'contrato.pdf'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Estado</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {etiquetaContrato(contrato.estado, !!contrato.destinacion)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Versión</dt>
              <dd className="font-medium text-gray-900 mt-0.5">v{contrato.version}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Versión de la plantilla</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                v{contrato.plantilla_version || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Fecha de inicio</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {contrato.fecha_inicio || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Duración</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {contrato.duracion_meses ? `${contrato.duracion_meses} meses` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Fecha de generación</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {contrato.fecha_generacion
                  ? formatDateTime(contrato.fecha_generacion)
                  : formatDateTime(contrato.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Canon de arrendamiento</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {contrato.valor_arriendo
                  ? new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                      minimumFractionDigits: 0,
                    }).format(Number(contrato.valor_arriendo))
                  : '—'}
              </dd>
            </div>
            {contrato.fecha_firma && (
              <div>
                <dt className="text-gray-500">Fecha de firma</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {formatDateTime(contrato.fecha_firma)}
                </dd>
              </div>
            )}
            {contrato.fecha_terminacion && (
              <div>
                <dt className="text-gray-500">Fecha de terminación</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {formatDateTime(contrato.fecha_terminacion)}
                </dd>
              </div>
            )}
          </dl>

          {/* Motivo cancelacion */}
          {contrato.motivo_cancelacion && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-medium text-red-700 mb-1">Motivo de cancelación</p>
              <p className="text-sm text-red-600">{contrato.motivo_cancelacion}</p>
            </div>
          )}

          {/* Historial de estados */}
          <button
            type="button"
            onClick={() => setHistorialOpen(true)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-primary-700 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <IconHistory size={16} aria-hidden="true" />
            Ver historial de estados
          </button>

          {/* Variables snapshot */}
          {variableEntries.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Variables utilizadas ({variableEntries.length})
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <dl className="grid grid-cols-1 gap-2 text-sm">
                  {variableEntries.map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3">
                      <dt className="font-mono text-xs px-2 py-0.5 rounded bg-teal-100 text-teal-800 shrink-0">
                        {`{{${key}}}`}
                      </dt>
                      <dd className="text-gray-700">{value || '(vacío)'}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}

          {/* Version history */}
          <VersionHistorialSection
            contratoId={contrato.id}
            currentVersion={contrato.version}
            onCompare={(v1, v2) => setCompareVersions({ v1, v2 })}
          />
        </div>
      </Modal>

      {/* Compare versions modal */}
      {compareVersions && (
        <CompararVersionesModal
          contratoId={contrato.id}
          v1={compareVersions.v1}
          v2={compareVersions.v2}
          isOpen={true}
          onClose={() => setCompareVersions(null)}
        />
      )}

      {/* Historial de estados modal */}
      <ContratoHistorialModal
        isOpen={historialOpen}
        onClose={() => setHistorialOpen(false)}
        contratoId={contrato.id}
        encima
      />
    </>
  )
}

function flattenVariables(
  obj: Record<string, unknown>,
  prefix = '',
): [string, string][] {
  const out: [string, string][] = []
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v === null || v === undefined) {
      out.push([key, ''])
    } else if (typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flattenVariables(v as Record<string, unknown>, key))
    } else {
      out.push([key, String(v)])
    }
  }
  return out
}
