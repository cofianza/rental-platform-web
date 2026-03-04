'use client'

import { useState, useEffect } from 'react'
import { IconX, IconLoader } from '@/components/icons'
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
  visualizacion: 'Visualizacion',
  verificacion: 'Verificacion',
}

const TIPO_COLORS: Record<string, string> = {
  descarga: 'bg-blue-100 text-blue-700',
  visualizacion: 'bg-gray-100 text-gray-700',
  verificacion: 'bg-purple-100 text-purple-700',
}

export function LogAccesosModal({ isOpen, onClose, contratoId }: LogAccesosModalProps) {
  const [accesos, setAccesos] = useState<IContratoAccesoFirmado[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setIsLoading(true)
    setError(null)
    contratoService
      .getLogAccesos(contratoId)
      .then(setAccesos)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Error al cargar log de accesos')
      })
      .finally(() => setIsLoading(false))
  }, [isOpen, contratoId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Log de Accesos al Documento Firmado</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <IconX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <IconLoader size={24} className="animate-spin text-primary-600" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-600 text-center py-8">{error}</p>
          ) : accesos.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No hay registros de acceso</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Fecha</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Usuario</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Accion</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">IP</th>
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
                          : 'Sistema'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLORS[a.tipo_accion] || 'bg-gray-100 text-gray-700'}`}>
                          {TIPO_LABELS[a.tipo_accion] || a.tipo_accion}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 font-mono text-xs">
                        {a.ip || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
