/**
 * Falla al pintar una pantalla de acceso (login, registro, recuperar o
 * restablecer contraseña, verificar correo). Queda dentro del layout de auth
 * (panel promocional y logo siguen) con Reintentar y salida a la página de
 * inicio, en vez de subir al error genérico.
 */

'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { IconAlertTriangle } from '@/components/icons'

export default function AuthError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()
  const [reintentando, startTransition] = useTransition()

  return (
    <div role="alert" className="text-center py-10">
      <IconAlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">No pudimos mostrar esta pantalla</h1>
      <p className="text-gray-600 mb-6">Puede ser una falla pasajera. Intente de nuevo en un momento.</p>
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
          href="/"
          className="px-6 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  )
}
