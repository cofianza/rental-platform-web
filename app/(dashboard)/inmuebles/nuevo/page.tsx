'use client'

/**
 * Página de Nuevo Inmueble - HP-174
 *
 * Antes de mostrar el formulario, verifica que el propietario/inmobiliaria
 * tenga su perfil de arrendador completo. Si no, muestra un banner y
 * bloquea la creación — sin esos datos los contratos generados despues
 * saldrian con campos vacios.
 */

import { Suspense } from 'react'
import { InmuebleForm, PerfilIncompletoBanner } from '@/components/inmuebles'
import { PageHeader } from '@/components/ui'
import { IconLoader } from '@/components/icons'
import { useAuth } from '@/hooks/useAuth'
import { usePerfilCompletitud } from '@/hooks/usePerfilCompletitud'

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

function NuevoInmuebleContenido() {
  const { user } = useAuth()
  const { completitud, loading } = usePerfilCompletitud()

  const aplica = user?.rol === 'propietario' || user?.rol === 'inmobiliaria'
  const incompleto = aplica && completitud !== null && !completitud.completo

  if (loading) return <LoadingFallback />

  if (incompleto) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Nuevo Inmueble"
          subtitle="Antes de continuar, completá tus datos para contrato"
        />
        <PerfilIncompletoBanner completitud={completitud} />
      </div>
    )
  }

  return <InmuebleForm mode="create" />
}

export default function NuevoInmueblePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NuevoInmuebleContenido />
    </Suspense>
  )
}
