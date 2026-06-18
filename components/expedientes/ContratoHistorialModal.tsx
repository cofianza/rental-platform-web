'use client'

import { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { IconLoader, IconArrowRight } from '@/components/icons'
import { ESTADOS_CONTRATO, type EstadoContratoKey } from '@/lib/constants'
import { formatDateTime } from '@/lib/constants'
import { contratoService } from '@/services/contratoService'
import type { IContratoHistorialEntry } from '@/types/contrato'

export interface ContratoHistorialModalProps {
  isOpen: boolean
  onClose: () => void
  contratoId: string
}

export function ContratoHistorialModal({
  isOpen,
  onClose,
  contratoId,
}: ContratoHistorialModalProps) {
  const [historial, setHistorial] = useState<IContratoHistorialEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchHistorial = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await contratoService.getHistorialTransiciones(contratoId)
      setHistorial(data.historial)
    } catch {
      // Silent fail — modal can be retried
    } finally {
      setIsLoading(false)
    }
  }, [contratoId])

  useEffect(() => {
    if (isOpen) {
      fetchHistorial()
    }
  }, [isOpen, fetchHistorial])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Historial de Estados"
      size="lg"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <IconLoader size={24} className="animate-spin text-primary-600" />
        </div>
      ) : historial.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Sin cambios de estado registrados</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {historial.map((entry) => {
            const configAnterior = entry.estado_anterior
              ? ESTADOS_CONTRATO[entry.estado_anterior as EstadoContratoKey]
              : null
            const configNuevo = entry.estado_nuevo
              ? ESTADOS_CONTRATO[entry.estado_nuevo as EstadoContratoKey]
              : null

            return (
              <div
                key={entry.id}
                className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
              >
                {/* Transition badges */}
                <div className="flex items-center gap-2 mb-2">
                  {configAnterior && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${configAnterior.bgColor} ${configAnterior.textColor}`}>
                      {configAnterior.label}
                    </span>
                  )}
                  <IconArrowRight size={14} className="text-gray-400" />
                  {configNuevo && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${configNuevo.bgColor} ${configNuevo.textColor}`}>
                      {configNuevo.label}
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-1">
                  <span>{formatDateTime(entry.created_at)}</span>
                  {/* Sin usuario = acción del sistema (vencimiento automático, post-firma). */}
                  <span>
                    {entry.usuario
                      ? `por ${entry.usuario.nombre} ${entry.usuario.apellido}`
                      : 'por el Sistema (automático)'}
                  </span>
                </div>

                {/* Comentario */}
                {entry.comentario && (
                  <p className="text-sm text-gray-700 mt-1">{entry.comentario}</p>
                )}

                {/* Motivo */}
                {entry.motivo && (
                  <p className="text-sm text-gray-500 mt-1 italic">
                    Motivo: {entry.motivo}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
