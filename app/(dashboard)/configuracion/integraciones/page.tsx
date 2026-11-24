/**
 * Integraciones de la inmobiliaria: conexión con nuby (solo lectura), el
 * software donde algunas inmobiliarias llevan su inventario. Cofianza copia
 * los inmuebles en arriendo. La conecta y la gestiona solo el titular; la API
 * lo valida (403 SOLO_TITULAR al resto del equipo).
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { NubyCargando, NubySoloTitular } from '@/components/integraciones/AvisosNuby'
import { PanelIntegracionNuby } from '@/components/integraciones/PanelIntegracionNuby'
import type { ModoIntegracionNuby } from '@/types/integracionNuby'

const MODO_TITULAR: ModoIntegracionNuby = { tipo: 'titular' }

export default function IntegracionesPage() {
  const router = useRouter()
  const { user, isInitialized, isAuthenticated } = useAuth()
  const rol = user?.rol

  // Guard de rol: la sección es de inmobiliarias (misma pauta que /disponibilidad).
  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return
    if (rol && rol !== 'inmobiliaria') router.replace('/dashboard/403')
  }, [isInitialized, isAuthenticated, rol, router])

  // rol_miembro llega con /auth/me: si aún no está, se deja que la API decida.
  const noEsTitular = !!user?.rol_miembro && user.rol_miembro !== 'owner'

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Integraciones"
        subtitle="Conecte nuby para traer a Cofianza los inmuebles que tiene en arriendo y mantenerlos al día."
      />
      {rol !== 'inmobiliaria' ? <NubyCargando /> : noEsTitular ? <NubySoloTitular /> : <PanelIntegracionNuby modo={MODO_TITULAR} />}
    </div>
  )
}
