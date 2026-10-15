'use client'

import Link from 'next/link'
import { Modal } from '@/components/ui/Modal'
import { IconExternalLink } from '@/components/icons'
import { ActionBadge } from './ActionBadge'
import { ENTITY_LABELS } from './constants'
import type { IAuditLog } from '@/types/bitacora'

/** Entidades que tienen pantalla propia a la que saltar desde la bitácora. */
const ENTITY_ROUTES: Record<string, string> = {
  expediente: '/expedientes',
  contrato: '/contratos',
  user: '/usuarios',
  inmueble: '/inmuebles',
  migracion_lote: '/admin/migracion/lotes',
}

const LINK_CLASS = 'inline-flex items-center gap-1 font-mono text-xs text-primary-600 hover:underline'

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

// El detalle es JSON libre de la API: se muestra clave → valor en palabras.
function etiquetaClave(k: string) {
  const t = k.replace(/_/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function valorLegible(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-500 sm:w-32 shrink-0">{label}</span>
      <div className="text-sm text-gray-900 flex-1">{children}</div>
    </div>
  )
}

export function BitacoraDetailModal({ log, onClose }: BitacoraDetailModalProps) {
  if (!log) return null

  // El UUID se mostraba pelado: para ver de qué caso hablaba el registro había
  // que copiarlo y buscarlo a mano. Cuando la entidad no tiene pantalla propia
  // (pago, documento, autorización…) saltamos al estudio que la contiene.
  const rutaEntidad = ENTITY_ROUTES[log.entidad]
  const expedienteRelacionado =
    !rutaEntidad && typeof log.detalle?.expediente_id === 'string' ? log.detalle.expediente_id : null

  return (
    <Modal isOpen={!!log} onClose={onClose} title="Detalle de registro" size="lg" closeOnBackdrop>
      <div className="space-y-1">
        <DetailRow label="Fecha/Hora">{formatDateTime(log.created_at)}</DetailRow>
        <DetailRow label="Usuario">
          {log.usuario_nombre || <span className="text-gray-500">Sistema</span>}
        </DetailRow>
        <DetailRow label="Acción">
          <ActionBadge action={log.accion} />
        </DetailRow>
        <DetailRow label="Entidad">{ENTITY_LABELS[log.entidad] || log.entidad}</DetailRow>
        {log.entidad_id && (
          <DetailRow label="ID Entidad">
            {rutaEntidad ? (
              <Link href={`${rutaEntidad}/${log.entidad_id}`} className={LINK_CLASS}>
                {log.entidad_id}
                <IconExternalLink size={14} />
              </Link>
            ) : expedienteRelacionado ? (
              <>
                <span className="font-mono text-xs">{log.entidad_id}</span>
                <Link href={`/expedientes/${expedienteRelacionado}`} className={`${LINK_CLASS} ml-2`}>
                  Ver estudio
                  <IconExternalLink size={14} />
                </Link>
              </>
            ) : (
              <span className="font-mono text-xs">{log.entidad_id}</span>
            )}
          </DetailRow>
        )}
        <DetailRow label="Dirección IP">
          <span className="font-mono">{log.ip || '-'}</span>
        </DetailRow>

        {log.detalle && Object.keys(log.detalle).length > 0 && (
          <div className="pt-3">
            <h4 className="text-sm font-medium text-gray-500 mb-2">Detalles</h4>
            <dl className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 max-h-64 overflow-y-auto">
              {Object.entries(log.detalle).map(([k, v]) => (
                <div key={k} className="flex flex-col sm:flex-row gap-0.5 sm:gap-4 py-1.5 border-b border-gray-100 last:border-0">
                  <dt className="text-xs font-medium text-gray-500 sm:w-40 shrink-0">{etiquetaClave(k)}</dt>
                  <dd className="text-xs text-gray-800 break-words min-w-0">{valorLegible(v)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </Modal>
  )
}
