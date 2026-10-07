'use client'

// Guardia de rol de todo /admin/migracion: los mismos roles que admite la API.
// Va en el layout para no disparar las cargas de cada página sin permiso.
import { PageHeader } from '@/components/ui/PageHeader'
import { IconLock } from '@/components/icons'
import { useAuth } from '@/hooks/useAuth'

export default function MigracionLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return null
  if (user.rol === 'administrador' || user.rol === 'operador_analista') return children
  return (
    <div className="space-y-6">
      <PageHeader title="Migración de cartera" />
      <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-6">
        <IconLock className="text-red-600" size={20} />
        <p className="text-sm text-red-800">Solo el equipo de Cofianza (administrador o analista) puede acceder a esta sección.</p>
      </div>
    </div>
  )
}
