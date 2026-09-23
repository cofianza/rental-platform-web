/**
 * Falla al cargar el detalle (API caída, redespliegue, límite de peticiones):
 * no es «no existe», así que se ofrece reintentar o volver a la vitrina.
 */

'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PublicNavbar } from '@/components/vitrina/PublicNavbar'
import { PublicFooter } from '@/components/vitrina/PublicFooter'
import { IconAlertTriangle } from '@/components/icons'

export default function InmuebleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()
  const [reintentando, startTransition] = useTransition()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicNavbar />
      <main className="flex-1 max-w-2xl mx-auto px-4 py-16 text-center">
        <IconAlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
        <h1 className="font-display text-2xl font-semibold text-gray-900 mb-2">
          No pudimos cargar el inmueble
        </h1>
        <p className="text-gray-600 mb-6">Puede ser una falla pasajera. Intenta de nuevo en un momento.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            disabled={reintentando}
            onClick={() =>
              startTransition(() => {
                // El error vino del servidor: hay que volver a pedir la página, no solo repintar.
                router.refresh()
                reset()
              })
            }
            className="inline-flex items-center px-5 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-60"
          >
            {reintentando ? 'Reintentando…' : 'Reintentar'}
          </button>
          <Link
            href="/vitrina"
            className="inline-flex items-center px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50"
          >
            Ver otros inmuebles
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
