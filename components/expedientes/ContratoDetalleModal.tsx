'use client'

import { useState } from 'react'
import { IconX, IconHistory } from '@/components/icons'
import { formatDateTime } from '@/lib/constants'
import { VersionHistorialSection } from './VersionHistorialSection'
import { CompararVersionesModal } from './CompararVersionesModal'
import { ContratoHistorialModal } from './ContratoHistorialModal'
import type { IContrato } from '@/types/contrato'

const ESTADO_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  en_revision: 'En Revision',
  aprobado: 'Aprobado',
  pendiente_firma: 'Enviado a Firma',
  firmado: 'Firmado',
  vigente: 'Vigente',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}

interface ContratoDetalleModalProps {
  contrato: IContrato | null
  onClose: () => void
}

export function ContratoDetalleModal({ contrato, onClose }: ContratoDetalleModalProps) {
  const [compareVersions, setCompareVersions] = useState<{ v1: number; v2: number } | null>(null)
  const [historialOpen, setHistorialOpen] = useState(false)

  if (!contrato) return null

  const variables = contrato.datos_variables || {}
  const variableEntries = Object.entries(variables)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Detalle del Contrato</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info general */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Archivo</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {contrato.nombre_archivo || 'contrato.pdf'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Estado</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {ESTADO_LABELS[contrato.estado] || contrato.estado}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Version</dt>
              <dd className="font-medium text-gray-900 mt-0.5">v{contrato.version}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Version Plantilla</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                v{contrato.plantilla_version || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Fecha Inicio</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {contrato.fecha_inicio || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Duracion</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {contrato.duracion_meses ? `${contrato.duracion_meses} meses` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Fecha Generacion</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {contrato.fecha_generacion
                  ? formatDateTime(contrato.fecha_generacion)
                  : formatDateTime(contrato.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Valor Arriendo</dt>
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
                <dt className="text-gray-500">Fecha Firma</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {formatDateTime(contrato.fecha_firma)}
                </dd>
              </div>
            )}
            {contrato.fecha_terminacion && (
              <div>
                <dt className="text-gray-500">Fecha Terminacion</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {formatDateTime(contrato.fecha_terminacion)}
                </dd>
              </div>
            )}
          </div>

          {/* Motivo cancelacion */}
          {contrato.motivo_cancelacion && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-medium text-red-700 mb-1">Motivo de cancelacion</p>
              <p className="text-sm text-red-600">{contrato.motivo_cancelacion}</p>
            </div>
          )}

          {/* Historial de estados */}
          <button
            onClick={() => setHistorialOpen(true)}
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            <IconHistory size={16} />
            Ver historial de estados
          </button>

          {/* Variables snapshot */}
          {variableEntries.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Variables Utilizadas ({variableEntries.length})
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <dl className="grid grid-cols-1 gap-2 text-sm">
                  {variableEntries.map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3">
                      <dt className="font-mono text-xs px-2 py-0.5 rounded bg-teal-100 text-teal-800 shrink-0">
                        {`{{${key}}}`}
                      </dt>
                      <dd className="text-gray-700">{value || '(vacio)'}</dd>
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

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>

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
      />
    </div>
  )
}
