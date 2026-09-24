/**
 * Inmueble retirado, arrendado o enlace inválido: en vez del 404 genérico de
 * Next (en inglés y sin salida), se ofrece volver a la vitrina.
 */

import Link from 'next/link'
import { PublicNavbar } from '@/components/vitrina/PublicNavbar'
import { PublicFooter } from '@/components/vitrina/PublicFooter'
import { IconHome } from '@/components/icons'

export default function InmuebleNoDisponible() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicNavbar />
      <main className="flex-1 max-w-2xl mx-auto px-4 py-16 text-center">
        <IconHome size={48} className="mx-auto text-gray-500 mb-4" />
        <h1 className="font-display text-2xl font-semibold text-gray-900 mb-2">
          Este inmueble ya no está disponible
        </h1>
        <p className="text-gray-600 mb-6">
          Puede que ya se haya arrendado o que el anunciante lo haya retirado de la vitrina.
        </p>
        <Link
          href="/vitrina"
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-primary-700 text-white font-medium hover:bg-primary-800"
        >
          Ver otros inmuebles
        </Link>
      </main>
      <PublicFooter />
    </div>
  )
}
