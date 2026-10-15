'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { IconSettings } from '@/components/icons'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuthStore } from '@/stores/auth.store'
import { ContratosPageSkeleton } from '@/components/contratos'
import { ContratosInmobiliariaView } from '@/components/contratos/ContratosInmobiliariaView'
import { contratoService, type IContratosStats } from '@/services/contratoService'

function ContratosContent() {
  const user = useAuthStore((s) => s.user)
  // Propietario e inmobiliaria editan en /configuracion/datos-contrato los
  // datos que salen en sus contratos generados (domicilio, cuenta de recaudo,
  // logo, etc.). Atajo desde la pantalla donde naturalmente miran sus contratos.
  const canEditDatosContrato = user?.rol === 'propietario' || user?.rol === 'inmobiliaria'

  // Total de contratos para el subtítulo.
  const [stats, setStats] = useState<IContratosStats | null>(null)
  const [statsError, setStatsError] = useState(false)
  useEffect(() => {
    contratoService
      .getStats()
      .then(setStats)
      .catch(() => {
        setStats(null)
        setStatsError(true)
      })
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

  // Una sola vista para todos los roles (el listado ya viene filtrado por rol
  // desde el backend): stat-cards, paneles por etapa, búsqueda, paginación y
  // los terminados y cancelados. Cofianza antes veía 100 contratos sin buscador.
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos"
        subtitle={stats ? `${stats.total} contrato${stats.total !== 1 ? 's' : ''}` : statsError ? 'No se pudieron cargar los indicadores' : 'Cargando…'}
        actions={datosContratoAction}
      />
      <ContratosInmobiliariaView />
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
