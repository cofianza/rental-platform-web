/**
 * Página de reportes
 * HP-57: Grid de tarjetas de reportes disponibles
 */

import { PageHeader } from '@/components/ui'
import { IconBarChart3, IconUsers, IconDollarSign, IconClock } from '@/components/icons'

// Configuración de reportes
const REPORTES = [
  {
    id: 'expedientes-estado',
    titulo: 'Expedientes por estado',
    descripcion: 'Distribución de expedientes según su estado actual en el flujo de trabajo.',
    icon: IconBarChart3,
    color: 'bg-primary-100 text-primary-600',
  },
  {
    id: 'expedientes-analista',
    titulo: 'Expedientes por analista',
    descripcion: 'Carga de trabajo y rendimiento de cada analista del equipo.',
    icon: IconUsers,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'ingresos-mensuales',
    titulo: 'Ingresos mensuales',
    descripcion: 'Evolución de ingresos por comisiones y servicios durante el año.',
    icon: IconDollarSign,
    color: 'bg-green-100 text-green-600',
  },
  {
    id: 'tiempo-proceso',
    titulo: 'Tiempo promedio de proceso',
    descripcion: 'Análisis del tiempo que toma cada expediente desde su creación hasta el cierre.',
    icon: IconClock,
    color: 'bg-amber-100 text-amber-600',
  },
]

export default function ReportesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Reportes"
        subtitle="Estadísticas y métricas del sistema"
      />

      {/* Grid de reportes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {REPORTES.map((reporte) => {
          const Icon = reporte.icon
          return (
            <div
              key={reporte.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${reporte.color}`}>
                  <Icon size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {reporte.titulo}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {reporte.descripcion}
                  </p>
                  <button className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
                    Ver reporte →
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Sección de exportación (placeholder) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Exportar datos</h3>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Exportar a CSV
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Exportar a Excel
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Generar PDF
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Funcionalidad de exportación disponible próximamente
        </p>
      </div>
    </div>
  )
}
