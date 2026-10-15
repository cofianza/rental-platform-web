/**
 * Falla al pintar un flujo público por enlace (autorizar, pago, estudio,
 * coarrendatario…). Quien lo abre no tiene panel: Reintentar y el contacto de
 * Cofianza, en vez de la pantalla en blanco de Next, en inglés.
 */

'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { IconAlertTriangle } from '@/components/icons'
import { ContactoCofianza } from '@/components/public/ContactoCofianza'

export default function PublicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()
  const [reintentando, startTransition] = useTransition()

  return (
    <div role="alert" className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 text-center">
      <IconAlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
      <h1 className="text-xl font-semibold text-gray-900 mb-2">No pudimos mostrar esta página</h1>
      <p className="text-gray-600 mb-6">
        Puede ser una falla pasajera. Intente de nuevo en un momento.
      </p>
      <button
        type="button"
        disabled={reintentando}
        onClick={() =>
          startTransition(() => {
            router.refresh()
            reset()
          })
        }
        className="inline-flex min-h-11 items-center px-6 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors font-medium disabled:opacity-60"
      >
        {reintentando ? 'Reintentando…' : 'Reintentar'}
      </button>
      <ContactoCofianza />
    </div>
  )
}
