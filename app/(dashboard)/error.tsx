/**
 * Falla al pintar una pantalla del panel (p. ej. un dato inesperado de la API).
 * Queda dentro del shell (menú y cabecera siguen) con Reintentar y salida al
 * inicio; antes caía en la pantalla en blanco de Next, en inglés.
 */

'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { IconAlertTriangle } from '@/components/icons'

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()
  const [reintentando, startTransition] = useTransition()

  return (
    <div role="alert" className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <IconAlertTriangle size={48} className="text-amber-500 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">No pudimos mostrar esta pantalla</h1>
      <p className="text-gray-600 mb-6 max-w-md">
        Puede ser una falla pasajera. Intente de nuevo; si sigue pasando, vuelva al inicio.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          disabled={reintentando}
          onClick={() =>
            startTransition(() => {
              router.refresh()
              reset()
            })
          }
          className="px-6 py-2.5 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors font-medium disabled:opacity-60"
        >
          {reintentando ? 'Reintentando…' : 'Reintentar'}
        </button>
        <Link
          href="/dashboard"
          className="px-6 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
