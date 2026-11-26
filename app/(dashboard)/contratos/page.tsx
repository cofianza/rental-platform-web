'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { IconSettings } from '@/components/icons'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuthStore } from '@/stores/auth.store'
import { ContratosPageSkeleton } from '@/components/contratos'
import { ContratosInmobiliariaView, SECCIONES_CONTRATOS } from '@/components/contratos/ContratosInmobiliariaView'
import { contratoService, type IContratosStats } from '@/services/contratoService'
import { useConteosOficina } from '@/hooks/useConteosOficina'
import { notaContratosCerrados } from '@/lib/contratosCancelados'
import { RUTA_DATOS_INMOBILIARIA, tituloDatosArrendador } from '@/lib/datosArrendador'

/** «4 contratos desde el inicio · 0 activos (4 cancelados)» (reporte de la Oficina Virtual, puntos 1 y 7). Pura. */
function subtituloContratos(c: { total: number; activos: number; cancelados?: number | null; finalizados?: number | null }): string {
  const total = `${c.total.toLocaleString('es-CO')} contrato${c.total !== 1 ? 's' : ''} desde el inicio`
  const nota = notaContratosCerrados(c)
  return nota ? `${total} · ${c.activos.toLocaleString('es-CO')} activo${c.activos !== 1 ? 's' : ''} ${nota}` : total
}

function ContratosContent() {
  const user = useAuthStore((s) => s.user)
  // Propietario e inmobiliaria editan en /configuracion/datos-inmobiliaria los
  // datos que salen en sus contratos generados (domicilio, cuenta de recaudo,
  // logo, etc.). Atajo desde la pantalla donde naturalmente miran sus contratos.
  const canEditDatosContrato = user?.rol === 'propietario' || user?.rol === 'inmobiliaria'

  // Total de contratos para el subtítulo: los mismos conteos que la vista (una sola petición). Con una API anterior,
  // /contratos/stats como antes.
  const ov = useConteosOficina(SECCIONES_CONTRATOS)
  const sinConteos = ov.disponible === false
  const [stats, setStats] = useState<IContratosStats | null>(null)
  const [statsError, setStatsError] = useState(false)
  useEffect(() => {
    if (!sinConteos) return
    contratoService
      .getStats()
      .then(setStats)
      .catch(() => {
        setStats(null)
        setStatsError(true)
      })
  }, [sinConteos])
  const cifras = ov.data?.contratos ?? stats
  const sinCifras = sinConteos ? statsError : !ov.isLoading && !ov.data?.contratos

  const datosContratoAction = canEditDatosContrato ? (
    <Link
      href={RUTA_DATOS_INMOBILIARIA}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
    >
      <IconSettings size={16} />
      {tituloDatosArrendador(user?.rol)}
    </Link>
  ) : undefined

  // Una sola vista para todos los roles (el listado ya viene filtrado por rol
  // desde el backend): stat-cards, paneles por etapa, búsqueda, paginación y
  // los terminados y cancelados. Cofianza antes veía 100 contratos sin buscador.
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos"
        subtitle={cifras ? subtituloContratos(cifras) : sinCifras ? 'No se pudieron cargar los indicadores' : 'Cargando…'}
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
