/**
 * Página de reportes
 * Placeholder - se completará en historia posterior
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reportes - Habitar Propiedades',
  description: 'Reportes y estadísticas del sistema',
}

export default function ReportesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Reportes</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {['Expedientes por estado', 'Inmuebles por ciudad', 'Ingresos mensuales', 'Tasa de aprobación'].map((title) => (
          <div
            key={title}
            className="bg-white rounded-lg shadow p-6 border-2 border-dashed border-gray-200"
          >
            <p className="text-sm font-medium text-gray-700">{title}</p>
            <p className="text-xs text-gray-400 mt-2">Placeholder</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6 border-2 border-dashed border-gray-200">
        <p className="text-gray-500">Exportar reportes (CSV/Excel)</p>
        <p className="text-sm text-gray-400 mt-2">
          Placeholder - se completará en historia posterior
        </p>
      </div>
    </div>
  )
}
