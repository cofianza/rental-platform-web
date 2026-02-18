'use client'

/**
 * Página de Nuevo Inmueble - HP-174
 * Formulario para crear un nuevo inmueble
 */

import { Suspense } from 'react'
import { InmuebleForm } from '@/components/inmuebles'
import { PageHeader } from '@/components/ui'
import { IconLoader } from '@/components/icons'

function LoadingFallback() {
  return (
    <div className="space-y-6">
      <PageHeader title="Nuevo Inmueble" subtitle="Cargando..." />
      <div className="flex items-center justify-center h-64">
        <IconLoader size={32} className="text-primary-600 animate-spin" />
      </div>
    </div>
  )
}

export default function NuevoInmueblePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <InmuebleForm mode="create" />
    </Suspense>
  )
}
