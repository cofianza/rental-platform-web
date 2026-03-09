'use client'

import { IconX } from '@/components/icons'

interface PlantillaPreviewModalProps {
  isOpen: boolean
  nombre: string
  html: string
  variables: string[]
  onClose: () => void
}

export function PlantillaPreviewModal({
  isOpen,
  nombre,
  html,
  variables,
  onClose,
}: PlantillaPreviewModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Vista Previa: {nombre}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Compilado con datos de ejemplo
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Variables usadas */}
        {variables.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 shrink-0">
            <p className="text-xs font-medium text-gray-600 mb-1.5">
              Variables utilizadas ({variables.length}):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {variables.map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800"
                >
                  {v}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* HTML preview */}
        <div className="flex-1 overflow-y-auto p-6">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 shrink-0">
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
