/**
 * /vitrina — Catalogo publico de inmuebles disponibles.
 *
 * Reutiliza PropertyGrid (busqueda + filtros + grid + paginacion sincronizada
 * a la URL) que tambien aparece en la landing. Aqui es el contenido principal.
 */

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PropertyGrid } from '@/components/vitrina/PropertyGrid'
import { PublicNavbar } from '@/components/vitrina/PublicNavbar'
import { PublicFooter } from '@/components/vitrina/PublicFooter'

export const metadata: Metadata = {
  title: 'Vitrina de inmuebles — Cofianza',
  description:
    'Explora apartamentos, casas y oficinas disponibles para arrendar con respaldo de Cofianza — sin codeudor, 100% digital.',
}

export default function VitrinaPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicNavbar />

      {/* Hero compacto */}
      <section className="bg-gradient-to-br from-gray-950 via-gray-900 to-primary-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-medium text-white/70 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Inmuebles disponibles en toda Colombia
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">
              Encuentra tu próximo hogar.
            </h1>
            <p className="text-lg text-white/60 leading-relaxed">
              Apartamentos, casas y oficinas con respaldo de Cofianza. Cuando encuentres
              uno que te guste, agenda la visita y nosotros firmamos como tu fiador — sin
              codeudor, sin filas, sin papeleo.
            </p>
          </div>
        </div>
      </section>

      {/* Grid de propiedades */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <PropertyGrid />
          </Suspense>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
