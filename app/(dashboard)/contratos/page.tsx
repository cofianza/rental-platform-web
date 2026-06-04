'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { IconSettings } from '@/components/icons'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuthStore } from '@/stores/auth.store'
import { ContratosPageSkeleton } from '@/components/contratos'
import { ContratosAgrupados } from '@/components/contratos/ContratosAgrupados'
import { ContratosInmobiliariaView } from '@/components/contratos/ContratosInmobiliariaView'
import { contratoService, type IContratosStats } from '@/services/contratoService'

function ContratosContent() {
  const user = useAuthStore((s) => s.user)
  // Propietario e inmobiliaria editan en /configuracion/datos-contrato los
  // datos que salen en sus contratos generados (domicilio, cuenta de recaudo,
  // logo, etc.). Atajo desde la pantalla donde naturalmente miran sus contratos.
  const canEditDatosContrato = user?.rol === 'propietario' || user?.rol === 'inmobiliaria'

  // KPI cards (Pendientes de generar / En proceso de firma / Activos).
  const [stats, setStats] = useState<IContratosStats | null>(null)
  useEffect(() => {
    contratoService
      .getStats()
      .then(setStats)
      .catch(() => setStats(null))
  }, [])

  const datosContratoAction = canEditDatosContrato ? (
    <Link
      href="/configuracion/datos-contrato"
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
    >
      <IconSettings size={16} />
      Datos para contrato
    </Link>
  ) : undefined

  // Inmobiliaria y propietario: vista re-skin (mockups 13/14) con stat-cards +
  // paneles por etapa. El listado ya viene filtrado por rol desde el backend.
  // Admin/operador conservan la vista operativa (KPIMini + tabla).
  if (user?.rol === 'inmobiliaria' || user?.rol === 'propietario') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Contratos"
          subtitle={stats ? `${stats.total} contrato${stats.total !== 1 ? 's' : ''}` : 'Cargando…'}
          actions={datosContratoAction}
        />
        <ContratosInmobiliariaView />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos"
        subtitle={stats ? `${stats.total} contrato${stats.total !== 1 ? 's' : ''}` : 'Cargando…'}
        actions={datosContratoAction}
      />

      {/* KPI cards (Mario 12-may-2026): Pendientes de generar (coral) /
          En proceso de firma (azul) / Activos (verde). */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPIMini label="Pendientes de generar" value={stats?.pendientes_generar ?? 0} color="bg-coral-500" />
        <KPIMini label="En proceso de firma" value={stats?.en_proceso_firma ?? 0} color="bg-blue-500" />
        <KPIMini label="Activos" value={stats?.activos ?? 0} color="bg-primary-600" />
      </div>

      {/* Contratos agrupados por etapa (mockup 13_v2): Pendientes de generar /
          En proceso de firma / Contratos activos. */}
      <ContratosAgrupados />
    </div>
  )
}

export default function ContratosPage() {
  return (
    <Suspense fallback={<ContratosPageSkeleton />}>
      <ContratosContent />
    </Suspense>
  )
}

// KPI card pequeno reutilizado para los stats arriba del listado.
function KPIMini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 relative overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${color}`} />
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
