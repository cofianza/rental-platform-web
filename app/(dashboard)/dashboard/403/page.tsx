/**
 * Página 403 - Acceso denegado
 */

'use client'

import Link from 'next/link'
import { useAuthStore } from '@/stores/auth.store'
import { ROLE_LABELS } from '@/components/users/constants'
import { IconLock } from '@/components/icons'

export default function ForbiddenPage() {
  const user = useAuthStore((state) => state.user)
  // Mismo nombre del rol que la cabecera (al inquilino se le dice «Arrendatario»).
  const rolDisplay = user?.rol === 'solicitante' ? 'Arrendatario' : user?.rol ? ROLE_LABELS[user.rol] : null

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <IconLock size={40} className="text-red-500" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Acceso denegado
      </h1>

      <p className="text-gray-600 mb-6 max-w-md">
        {rolDisplay ? `Su rol actual (${rolDisplay}) no tiene permiso` : 'Su cuenta no tiene permiso'} para
        entrar a esta sección. Si necesita acceso, pídaselo al administrador de su cuenta.
      </p>

      <Link
        href="/dashboard"
        className="px-6 py-2.5 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors font-medium"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
