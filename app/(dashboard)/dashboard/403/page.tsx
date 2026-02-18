/**
 * Pagina 403 - Acceso Denegado
 */

'use client'

import Link from 'next/link'
import { useAuthStore } from '@/stores/auth.store'

const ROLE_DISPLAY: Record<string, string> = {
  administrador: 'Administrador',
  operador_analista: 'Operador/Analista',
  gerencia_consulta: 'Gerencia/Consulta',
}

export default function ForbiddenPage() {
  const user = useAuthStore((state) => state.user)
  const rolDisplay = user?.rol ? ROLE_DISPLAY[user.rol] ?? user.rol : 'desconocido'

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <svg
          className="w-10 h-10 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Acceso Denegado
      </h1>

      <p className="text-gray-600 mb-6 max-w-md">
        Tu rol actual ({rolDisplay}) no tiene permisos para acceder a esta
        seccion. Contacta al administrador si necesitas acceso.
      </p>

      <Link
        href="/dashboard"
        className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
      >
        Volver al Dashboard
      </Link>
    </div>
  )
}
