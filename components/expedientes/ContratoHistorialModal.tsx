'use client'

import { useState, useEffect, useCallback } from 'react'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { IconArrowRight, IconAlertTriangle, IconRefresh } from '@/components/icons'
import { ESTADOS_CONTRATO, type EstadoContratoKey } from '@/lib/constants'
import { formatDateTime } from '@/lib/constants'
import { contratoService } from '@/services/contratoService'
import type { IContratoHistorialEntry } from '@/types/contrato'
import { SkeletonText } from '@/components/ui/Skeleton'

export interface ContratoHistorialModalProps {
  isOpen: boolean
  onClose: () => void
  contratoId: string
  /** Se abre sobre otro diálogo (p. ej. el detalle del contrato). */
  encima?: boolean
}

export function ContratoHistorialModal({
  isOpen,
  onClose,
  contratoId,
  encima = false,
}: ContratoHistorialModalProps) {
  const [historial, setHistorial] = useState<IContratoHistorialEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchHistorial = useCallback(async () => {
    setIsLoading(true)
    setError(false)
    try {
      const data = await contratoService.getHistorialTransiciones(contratoId)
      setHistorial(data.historial)
    } catch {
      // Antes fallaba en silencio y mostraba «sin cambios»: ahora se dice y se ofrece reintentar.
      setError(true)
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
      title="Historial de estados"
      description="Cada cambio de estado del contrato, quién lo hizo y por qué."
      size="lg"
      closeOnBackdrop
      encima={encima}
      footer={
        <ModalAcciones>
          <button type="button" onClick={onClose} className={botonModal('secondary')}>
            Cerrar
          </button>
        </ModalAcciones>
      }
    >
      {isLoading ? (
        <div role="status" className="space-y-4 py-2">
          <span className="sr-only">Cargando historial…</span>
          {[0, 1, 2].map((i) => (
            <SkeletonText key={i} lineas={2} />
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
          <IconAlertTriangle size={24} className="text-red-600" aria-hidden="true" />
          <p className="text-sm text-gray-700">No se pudo cargar el historial de estados.</p>
          <button type="button" onClick={() => void fetchHistorial()} className={botonModal('secondary')}>
            <IconRefresh size={16} aria-hidden="true" />
            Reintentar
          </button>
        </div>
      ) : historial.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm font-medium text-gray-700">Sin cambios de estado</p>
          <p className="mt-1 text-sm text-gray-500">El contrato no ha cambiado de estado desde que se generó.</p>
        </div>
      ) : (
        <ol className="space-y-3">
          {historial.map((entry) => {
            const configAnterior = entry.estado_anterior
              ? ESTADOS_CONTRATO[entry.estado_anterior as EstadoContratoKey]
              : null
            const configNuevo = entry.estado_nuevo
              ? ESTADOS_CONTRATO[entry.estado_nuevo as EstadoContratoKey]
              : null

            return (
              <li
                key={entry.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                {/* Transition badges */}
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {configAnterior && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${configAnterior.bgColor} ${configAnterior.textColor}`}>
                      {configAnterior.label}
                    </span>
                  )}
                  <IconArrowRight size={14} className="text-gray-500" aria-hidden="true" />
                  <span className="sr-only">pasó a</span>
                  {configNuevo && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${configNuevo.bgColor} ${configNuevo.textColor}`}>
                      {configNuevo.label}
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                  <span>{formatDateTime(entry.created_at)}</span>
                  {/* Sin usuario = acción del sistema (vencimiento automático, post-firma). */}
                  <span>
                    {entry.usuario
                      ? `por ${entry.usuario.nombre} ${entry.usuario.apellido}`
                      : 'por el sistema (automático)'}
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
              </li>
            )
          })}
        </ol>
      )}
    </Modal>
  )
}
