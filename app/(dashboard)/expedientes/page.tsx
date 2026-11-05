/**
 * Página de listado de expedientes - HP-229 + Bandejas Operativas
 * Listado con bandejas por estado, filtros, ordenamiento y paginación del servidor
 */

'use client'

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
// Imports directos, no del barrel: '@/components/expedientes' arrastra todo el
// código del detalle (modales, firma, pagos) a la lista.
import { ExpedientesListado } from '@/components/expedientes/ExpedientesListado'
import { ExpedientesSkeleton } from '@/components/expedientes/ExpedientesSkeleton'
import { EstudiosExpedientesFusion } from '@/components/estudios/EstudiosExpedientesFusion'

function ExpedientesPageContent() {
  const rol = useAuthStore((s) => s.user?.rol)
  // La inmobiliaria y el propietario gestionan sus estudios: ven la vista
  // fusionada (expedientes + estudio embebido). La bandeja de abajo es la de
  // Cofianza: al propietario le dejaba vacías «En revisión» e «Incompletos» y
  // todos sus estudios en curso en «Borradores».
  if (rol === 'inmobiliaria' || rol === 'propietario') return <EstudiosExpedientesFusion />
  // La bandeja operativa no es para el arrendatario: sus solicitudes están en
  // el inicio (llegaba aquí por el botón atrás, las migas o un enlace viejo).
  if (rol === 'solicitante') redirect('/dashboard')
  return <ExpedientesListado />
}

export default function ExpedientesPage() {
  return (
    <Suspense fallback={<ExpedientesPageSkeleton />}>
      <ExpedientesPageContent />
    </Suspense>
  )
}

/**
 * Skeleton de página completa
 */
function ExpedientesPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-40 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Bandejas */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 w-28 shrink-0 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>

      {/* Barra de filtros + lista, en una sola superficie */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex flex-col gap-2 border-b border-gray-100 p-4 md:flex-row">
          <div className="h-10 flex-1 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-10 md:w-52 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-10 md:w-80 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="p-4">
          <ExpedientesSkeleton count={10} />
        </div>
      </div>
    </div>
  )
}
