/**
 * Página de listado de expedientes
 * Placeholder - se completará en historia posterior
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Expedientes - Habitar Propiedades',
  description: 'Gestión de expedientes de arrendamiento',
}

export default function ExpedientesPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Expedientes</h1>
        <div className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">
          + Nuevo Expediente
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border-2 border-dashed border-gray-200 p-8 text-center">
        <p className="text-gray-500">Listado de expedientes con bandejas</p>
        <p className="text-sm text-gray-400 mt-2">
          Placeholder - se completará en historia posterior
        </p>
      </div>
    </div>
  )
}
