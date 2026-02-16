/**
 * Página principal del dashboard
 * Placeholder - se completará en historia posterior
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard - Habitar Propiedades',
  description: 'Panel de control y KPIs',
}

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow p-6 border-2 border-dashed border-gray-200"
          >
            <p className="text-sm text-gray-500">KPI Card #{i}</p>
            <p className="text-xs text-gray-400 mt-1">Placeholder</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6 border-2 border-dashed border-gray-200">
        <p className="text-gray-500">Gráficos y estadísticas</p>
        <p className="text-sm text-gray-400 mt-2">
          Placeholder - se completará en historia posterior
        </p>
      </div>
    </div>
  )
}
