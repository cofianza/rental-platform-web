/**
 * Página de Dashboard
 * HP-57: Pantalla principal con KPIs y expedientes recientes
 */

'use client'

import Link from 'next/link'
import { PageHeader, KPICard, Badge } from '@/components/ui'
import { IconFolderOpen, IconBuilding2, IconBarChart3, IconChevronRight } from '@/components/icons'
import { MOCK_EXPEDIENTES, MOCK_DASHBOARD_KPIS } from '@/lib/mock-data'
import { formatDate } from '@/lib/constants'

export default function DashboardPage() {
  // Obtener los últimos 5 expedientes
  const expedientesRecientes = MOCK_EXPEDIENTES.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        subtitle="Bienvenido de vuelta"
      />

      {/* Grid de KPIs - 1 col mobile, 2 tablet, 4 desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={MOCK_DASHBOARD_KPIS[0].label}
          value={MOCK_DASHBOARD_KPIS[0].value}
          change={MOCK_DASHBOARD_KPIS[0].change}
          trend={MOCK_DASHBOARD_KPIS[0].trend}
          icon={IconFolderOpen}
          accentColor="bg-primary-600"
        />
        <KPICard
          title={MOCK_DASHBOARD_KPIS[1].label}
          value={MOCK_DASHBOARD_KPIS[1].value}
          change={MOCK_DASHBOARD_KPIS[1].change}
          trend={MOCK_DASHBOARD_KPIS[1].trend}
          icon={IconFolderOpen}
          accentColor="bg-green-600"
        />
        <KPICard
          title={MOCK_DASHBOARD_KPIS[2].label}
          value={MOCK_DASHBOARD_KPIS[2].value}
          change={MOCK_DASHBOARD_KPIS[2].change}
          trend={MOCK_DASHBOARD_KPIS[2].trend}
          icon={IconFolderOpen}
          accentColor="bg-amber-600"
        />
        <KPICard
          title={MOCK_DASHBOARD_KPIS[3].label}
          value={MOCK_DASHBOARD_KPIS[3].value}
          change={MOCK_DASHBOARD_KPIS[3].change}
          trend={MOCK_DASHBOARD_KPIS[3].trend}
          icon={IconFolderOpen}
          accentColor="bg-blue-600"
        />
      </div>

      {/* Sección de contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expedientes recientes - 2 columnas */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Expedientes recientes</h2>
            <Link
              href="/expedientes"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {expedientesRecientes.map((expediente) => (
              <Link
                key={expediente.id}
                href={`/expedientes/${expediente.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {expediente.numero_expediente}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {expediente.inmueble_titulo}
                  </p>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <Badge estado={expediente.estado} />
                  <span className="text-sm text-gray-500 hidden sm:inline">
                    {formatDate(expediente.fecha_creacion)}
                  </span>
                  <IconChevronRight size={16} className="text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Acciones rápidas - 1 columna */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Acciones rápidas</h2>
          </div>
          <div className="p-6 space-y-3">
            <Link
              href="/expedientes"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-primary-300 transition-colors group"
            >
              <div className="p-2 bg-primary-100 rounded-lg group-hover:bg-primary-200 transition-colors">
                <IconFolderOpen size={20} className="text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Nuevo expediente</p>
                <p className="text-xs text-gray-500">Crear un nuevo caso</p>
              </div>
            </Link>

            <Link
              href="/inmuebles"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-primary-300 transition-colors group"
            >
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <IconBuilding2 size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Nuevo inmueble</p>
                <p className="text-xs text-gray-500">Agregar propiedad</p>
              </div>
            </Link>

            <Link
              href="/reportes"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-primary-300 transition-colors group"
            >
              <div className="p-2 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
                <IconBarChart3 size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Ver reportes</p>
                <p className="text-xs text-gray-500">Estadísticas y métricas</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Placeholders para gráficos futuros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expedientes por mes</h3>
          <div className="h-64 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <IconBarChart3 size={48} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Gráfico de expedientes por mes</p>
              <p className="text-xs text-gray-400">Se implementará con librería de gráficos</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos mensuales</h3>
          <div className="h-64 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <IconBarChart3 size={48} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Gráfico de ingresos mensuales</p>
              <p className="text-xs text-gray-400">Se implementará con librería de gráficos</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
