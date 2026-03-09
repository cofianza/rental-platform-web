'use client'

import { useState, useEffect } from 'react'
import { IconX, IconLoader } from '@/components/icons'
import { contratoService } from '@/services/contratoService'
import type { IVersionComparison, IVersionDiferencia } from '@/types/contrato'

const CAMBIO_STYLES: Record<IVersionDiferencia['cambio'], { label: string; bg: string; text: string }> = {
  agregada: { label: 'Agregada', bg: 'bg-green-100', text: 'text-green-700' },
  eliminada: { label: 'Eliminada', bg: 'bg-red-100', text: 'text-red-700' },
  modificada: { label: 'Modificada', bg: 'bg-amber-100', text: 'text-amber-700' },
  sin_cambio: { label: 'Sin cambio', bg: 'bg-gray-100', text: 'text-gray-500' },
}

interface CompararVersionesModalProps {
  contratoId: string
  v1: number
  v2: number
  isOpen: boolean
  onClose: () => void
}

export function CompararVersionesModal({
  contratoId,
  v1,
  v2,
  isOpen,
  onClose,
}: CompararVersionesModalProps) {
  const [comparison, setComparison] = useState<IVersionComparison | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUnchanged, setShowUnchanged] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    setIsLoading(true)
    setError(null)
    setComparison(null)

    contratoService
      .compararVersiones(contratoId, v1, v2)
      .then(setComparison)
      .catch(() => setError('Error al cargar la comparacion'))
      .finally(() => setIsLoading(false))
  }, [isOpen, contratoId, v1, v2])

  if (!isOpen) return null

  const filteredDiffs = comparison?.diferencias.filter(
    (d) => showUnchanged || d.cambio !== 'sin_cambio'
  ) ?? []

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Comparar Version v{v1} vs v{v2}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="p-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <IconLoader size={24} className="animate-spin text-primary-600" />
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {comparison && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{comparison.total_cambios}</span> cambio(s) encontrado(s)
                </p>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={showUnchanged}
                    onChange={(e) => setShowUnchanged(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Mostrar sin cambios
                </label>
              </div>

              {/* Version info */}
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <span className="font-medium text-gray-700">v{comparison.v1.version}</span>
                  {comparison.v1.fecha_generacion && (
                    <span className="ml-2">
                      {new Date(comparison.v1.fecha_generacion).toLocaleDateString('es-CO')}
                    </span>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <span className="font-medium text-gray-700">v{comparison.v2.version}</span>
                  {comparison.v2.fecha_generacion && (
                    <span className="ml-2">
                      {new Date(comparison.v2.fecha_generacion).toLocaleDateString('es-CO')}
                    </span>
                  )}
                </div>
              </div>

              {/* Diff table */}
              {filteredDiffs.length === 0 ? (
                <p className="text-center py-6 text-sm text-gray-500">
                  No hay diferencias entre las versiones
                </p>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                          Variable
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                          v{v1}
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                          v{v2}
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredDiffs.map((d) => {
                        const style = CAMBIO_STYLES[d.cambio]
                        return (
                          <tr key={d.variable} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5">
                              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                                {`{{${d.variable}}}`}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-gray-700 max-w-[200px] truncate">
                              {d.valor_v1 || <span className="text-gray-400">(vacio)</span>}
                            </td>
                            <td className="px-4 py-2.5 text-gray-700 max-w-[200px] truncate">
                              {d.valor_v2 || <span className="text-gray-400">(vacio)</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                                {style.label}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
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
    </div>
  )
}
