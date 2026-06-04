/**
 * Página de reportes
 * HP-57: Grid de tarjetas de reportes disponibles
 * HP-360: Agregado reporte de volumen de expedientes
 * HP-361: Agregado reporte de tasa de aprobacion
 * HP-362: Agregado reporte de ingresos por pagos
 * HP-363: Agregado reporte de tiempos por etapa
 */

'use client'

import Link from 'next/link'
import { PageHeader } from '@/components/ui'
import { IconBarChart3, IconUsers, IconDollarSign, IconClock, IconCheckCircle } from '@/components/icons'
import { CarteraAnaliticaSection } from '@/components/dashboard/CarteraAnaliticaSection'
import { RentabilidadPropietarioSection } from '@/components/dashboard/RentabilidadPropietarioSection'
import { useAuthStore } from '@/stores/auth.store'

// Configuración de reportes
const REPORTES = [
  {
    id: 'volumen-expedientes',
    titulo: 'Volumen de Expedientes',
    descripcion: 'Expedientes creados vs cerrados por periodo con gráfico comparativo.',
    icon: IconBarChart3,
    color: 'bg-primary-100 text-primary-600',
    href: '/reportes/volumen',
  },
  {
    id: 'aprobacion-expedientes',
    titulo: 'Aprobados vs Rechazados',
    descripcion: 'Tasa de aprobacion de expedientes por periodo con desglose de condicionados.',
    icon: IconCheckCircle,
    color: 'bg-green-100 text-green-600',
    href: '/reportes/aprobacion',
  },
  {
    id: 'expedientes-estado',
    titulo: 'Expedientes por estado',
    descripcion: 'Distribución de expedientes según su estado actual en el flujo de trabajo.',
    icon: IconBarChart3,
    color: 'bg-primary-100 text-primary-600',
    href: undefined as string | undefined,
  },
  {
    id: 'expedientes-analista',
    titulo: 'Expedientes por analista',
    descripcion: 'Carga de trabajo y rendimiento de cada analista del equipo.',
    icon: IconUsers,
    color: 'bg-blue-100 text-blue-600',
    href: undefined as string | undefined,
  },
  {
    id: 'ingresos-pagos',
    titulo: 'Ingresos por Pagos',
    descripcion: 'Ingresos totales por periodo y concepto con desglose de pagos.',
    icon: IconDollarSign,
    color: 'bg-green-100 text-green-600',
    href: '/reportes/ingresos',
  },
  {
    id: 'tiempo-proceso',
    titulo: 'Tiempos por Etapa',
    descripcion: 'Análisis del tiempo promedio en cada etapa del flujo, identificando cuellos de botella.',
    icon: IconClock,
    color: 'bg-amber-100 text-amber-600',
    href: '/reportes/tiempos',
  },
]

export default function ReportesPage() {
  const rol = useAuthStore((s) => s.user?.rol)

  // Propietario: "Mi rentabilidad" (mockup 14) — calculadora con canon real +
  // gastos locales. No ve el grid de reportes operativos del sistema.
  if (rol === 'propietario') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mi rentabilidad"
          subtitle="Analiza el rendimiento de cada inmueble. Edita gastos para ver el impacto en tu rentabilidad."
        />
        <RentabilidadPropietarioSection />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Reportes"
        subtitle="Estadísticas y métricas del sistema"
      />

      {/* Analítica de cartera — solo inmobiliaria (mockup 13_v2). El componente
          se auto-restringe por rol; para otros roles no renderiza nada. */}
      <CarteraAnaliticaSection />

      {/* Grid de reportes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {REPORTES.map((reporte) => {
          const Icon = reporte.icon
          const content = (
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
                <span className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
                  Ver reporte →
                </span>
              </div>
            </div>
          )

          if (reporte.href) {
            return (
              <Link
                key={reporte.id}
                href={reporte.href}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow block"
              >
                {content}
              </Link>
            )
          }

          return (
            <div
              key={reporte.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow opacity-60"
            >
              {content}
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
