'use client'

import { Modal } from '@/components/ui/Modal'
import { ActionBadge } from './ActionBadge'
import { ENTITY_LABELS } from './constants'
import type { IAuditLog } from '@/types/bitacora'

interface BitacoraDetailModalProps {
  log: IAuditLog | null
  onClose: () => void
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-500 sm:w-32 flex-shrink-0">{label}</span>
      <div className="text-sm text-gray-900 flex-1">{children}</div>
    </div>
  )
}

export function BitacoraDetailModal({ log, onClose }: BitacoraDetailModalProps) {
  if (!log) return null

  return (
    <Modal isOpen={!!log} onClose={onClose} title="Detalle de registro" size="lg">
      <div className="space-y-1">
        <DetailRow label="Fecha/Hora">{formatDateTime(log.created_at)}</DetailRow>
        <DetailRow label="Usuario">
          {log.usuario_nombre || <span className="text-gray-400">Sistema</span>}
        </DetailRow>
        <DetailRow label="Accion">
          <ActionBadge action={log.accion} />
        </DetailRow>
        <DetailRow label="Entidad">{ENTITY_LABELS[log.entidad] || log.entidad}</DetailRow>
        {log.entidad_id && <DetailRow label="ID Entidad">
          <span className="font-mono text-xs">{log.entidad_id}</span>
        </DetailRow>}
        <DetailRow label="Direccion IP">
          <span className="font-mono">{log.ip || '-'}</span>
        </DetailRow>

        {log.detalle && Object.keys(log.detalle).length > 0 && (
          <div className="pt-3">
            <h4 className="text-sm font-medium text-gray-500 mb-2">Detalles</h4>
            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-800 overflow-x-auto max-h-64 overflow-y-auto">
              {JSON.stringify(log.detalle, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  )
}
