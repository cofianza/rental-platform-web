/**
 * AsignacionResponsableModal - HP-285
 * Modal para asignar o reasignar el responsable del expediente
 */

'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { IconLoader, IconUser, IconCheck } from '@/components/icons'
import { expedienteService } from '@/services/expedienteService'
import type { IAnalistaOption, IExpedienteAnalista } from '@/types/expediente'
import { cn } from '@/lib/utils'

export interface AsignacionResponsableModalProps {
  isOpen: boolean
  onClose: () => void
  expedienteId: string
  analistaActual: IExpedienteAnalista | null
  onAsignar: (analistaId: string) => Promise<void>
  isLoading?: boolean
}

export function AsignacionResponsableModal({
  isOpen,
  onClose,
  expedienteId,
  analistaActual,
  onAsignar,
  isLoading = false,
}: AsignacionResponsableModalProps) {
  const [analistas, setAnalistas] = useState<IAnalistaOption[]>([])
  const [analistaSeleccionado, setAnalistaSeleccionado] = useState<string | null>(null)
  const [isLoadingAnalistas, setIsLoadingAnalistas] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadAnalistas()
      setAnalistaSeleccionado(analistaActual?.id || null)
    }
  }, [isOpen, analistaActual])

  const loadAnalistas = async () => {
    setIsLoadingAnalistas(true)
    setError(null)
    try {
      const data = await expedienteService.getAnalistas()
      setAnalistas(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar analistas'
      setError(message)
    } finally {
      setIsLoadingAnalistas(false)
    }
  }

  const handleClose = () => {
    if (isLoading) return
    setAnalistaSeleccionado(analistaActual?.id || null)
    setError(null)
    onClose()
  }

  const handleConfirmar = async () => {
    if (!analistaSeleccionado) {
      setError('Selecciona un responsable')
      return
    }

    // No hacer nada si es el mismo
    if (analistaSeleccionado === analistaActual?.id) {
      handleClose()
      return
    }

    setError(null)
    await onAsignar(analistaSeleccionado)
    handleClose()
  }

  const nombreActual = analistaActual
    ? `${analistaActual.nombre} ${analistaActual.apellido}`.trim()
    : null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Asignar Responsable"
      size="md"
    >
      <div className="space-y-6">
        {/* Responsable actual */}
        {analistaActual && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Responsable actual
            </label>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Avatar name={nombreActual!} size="sm" />
              <span className="text-sm font-medium text-gray-900">{nombreActual}</span>
            </div>
          </div>
        )}

        {/* Lista de analistas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {analistaActual ? 'Nuevo responsable' : 'Seleccionar responsable'}
          </label>

          {isLoadingAnalistas ? (
            <div className="flex items-center justify-center py-8">
              <IconLoader size={24} className="text-gray-400 animate-spin" />
            </div>
          ) : analistas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <IconUser size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm">No hay analistas disponibles</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {analistas.map((analista) => {
                const isSelected = analistaSeleccionado === analista.id
                const isActual = analistaActual?.id === analista.id

                return (
                  <button
                    key={analista.id}
                    type="button"
                    onClick={() => setAnalistaSeleccionado(analista.id)}
                    disabled={isLoading}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all',
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={analista.nombre} size="sm" />
                      <div className="text-left">
                        <span
                          className={cn(
                            'text-sm font-medium',
                            isSelected ? 'text-primary-700' : 'text-gray-900'
                          )}
                        >
                          {analista.nombre}
                        </span>
                        {isActual && (
                          <span className="ml-2 text-xs text-gray-500">(actual)</span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <IconCheck size={20} className="text-primary-600" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={isLoading || !analistaSeleccionado || isLoadingAnalistas}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && <IconLoader size={16} className="animate-spin" />}
            {analistaActual ? 'Reasignar' : 'Asignar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
