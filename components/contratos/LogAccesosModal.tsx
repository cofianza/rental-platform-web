'use client'

import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { useState, useEffect } from 'react'
import { IconAlertTriangle, IconRefresh } from '@/components/icons'
import { SkeletonText } from '@/components/ui/Skeleton'
import { contratoService } from '@/services/contratoService'
import { formatDateTime } from '@/lib/constants'
import type { IContratoAccesoFirmado } from '@/types/contrato'

interface LogAccesosModalProps {
  isOpen: boolean
  onClose: () => void
  contratoId: string
}

const TIPO_LABELS: Record<string, string> = {
  descarga: 'Descarga',
  visualizacion: 'Visualización',
  verificacion: 'Verificación',
  subida: 'Subida',
}

const TIPO_COLORS: Record<string, string> = {
  descarga: 'bg-blue-100 text-blue-700',
  visualizacion: 'bg-gray-100 text-gray-700',
  verificacion: 'bg-purple-100 text-purple-700',
  subida: 'bg-green-100 text-green-700',
}

export function LogAccesosModal({ isOpen, onClose, contratoId }: LogAccesosModalProps) {
  const [accesos, setAccesos] = useState<IContratoAccesoFirmado[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (!isOpen) return
    setIsLoading(true)
    setError(null)
    contratoService
      .getLogAccesos(contratoId)
      .then(setAccesos)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el registro de accesos.')
      })
      .finally(() => setIsLoading(false))
  }, [isOpen, contratoId, intento])

  if (!isOpen) return null

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Registro de accesos al contrato firmado"
      description="Quién vio, descargó o verificó el documento firmado, y cuándo."
      size="lg"
      closeOnBackdrop
      footer={
        <ModalAcciones>
          <button type="button" onClick={onClose} className={botonModal('secondary')}>
            Cerrar
          </button>
        </ModalAcciones>
      }
    >
      <div>
        {isLoading ? (
          <div role="status" aria-live="polite">
            <span className="sr-only">Cargando registro de accesos…</span>
            <SkeletonText lineas={6} />
          </div>
        ) : error ? (
          <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
            <IconAlertTriangle size={24} className="text-red-600" aria-hidden="true" />
            <p className="text-sm text-gray-700">{error}</p>
            <button type="button" onClick={() => setIntento((n) => n + 1)} className={botonModal('secondary')}>
              <IconRefresh size={16} aria-hidden="true" />
              Reintentar
            </button>
          </div>
        ) : accesos.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-gray-700">Aún no hay accesos</p>
            <p className="mt-1 text-sm text-gray-500">Cuando alguien abra o descargue el contrato firmado, aparecerá aquí.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Fecha</th>
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Usuario</th>
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Acción</th>
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accesos.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2.5 px-3 text-gray-700 whitespace-nowrap">
                      {formatDateTime(a.created_at)}
                    </td>
                    <td className="py-2.5 px-3 text-gray-700">
                      {a.usuario
                        ? `${a.usuario.nombre} ${a.usuario.apellido}`
                        : 'Sistema (automático)'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLORS[a.tipo_accion] || 'bg-gray-100 text-gray-700'}`}>
                        {TIPO_LABELS[a.tipo_accion] || a.tipo_accion}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 tabular-nums text-xs">
                      {a.ip || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  )
}
