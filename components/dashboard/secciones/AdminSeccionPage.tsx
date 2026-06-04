/**
 * Wrapper de página para las secciones del Centro de Control que ahora viven
 * como rutas del sidebar (solo administrador). Aplica:
 *  - guard de rol (redirige a /dashboard si no es admin)
 *  - breadcrumbs
 * y renderiza la sección (que ya trae su propio encabezado/KPIs/tabla).
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Breadcrumbs } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

interface Props {
  label: string
  children: React.ReactNode
}

export function AdminSeccionPage({ label, children }: Props) {
  const router = useRouter()
  const { user } = useAuth()
  const isAdmin = user?.rol === 'administrador'

  useEffect(() => {
    if (user && !isAdmin) router.replace('/dashboard')
  }, [user, isAdmin, router])

  if (!isAdmin) return null

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label }]} />
      {children}
    </div>
  )
}
