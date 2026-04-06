/**
 * Landing / Vitrina Publica — HP-366
 * Busqueda, filtros dinamicos, grid de inmuebles, paginacion
 * Referencia visual: Metrocuadrado.com
 */

import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { PropertyGrid } from '@/components/vitrina/PropertyGrid'
import { PublicNavbar } from '@/components/vitrina/PublicNavbar'
import { PublicFooter } from '@/components/vitrina/PublicFooter'

export const metadata: Metadata = {
  title: 'Cofianza - Encuentra tu hogar ideal',
  description: 'Plataforma de arrendamiento de inmuebles en Colombia. Encuentra apartamentos, casas y locales disponibles.',
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* Hero */}
      <section className="bg-gray-900 relative overflow-hidden">
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-600/10 border border-primary-600/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
              <span className="text-sm text-primary-400 font-medium">Inmuebles verificados en Colombia</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-5 leading-tight">
              Encuentra el lugar<br />
              <span className="text-primary-400">perfecto para ti</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-xl mb-8">
              Arrienda de forma segura con respaldo crediticio. Sin intermediarios complicados, con procesos 100% digitales.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="#vitrina"
                className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
              >
                Explorar inmuebles
              </Link>
              <Link
                href="/registro"
                className="px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors border border-white/20"
              >
                Crear cuenta gratis
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-16 max-w-lg">
            <div>
              <p className="text-3xl font-bold text-white">100%</p>
              <p className="text-xs text-gray-500 mt-1">Digital</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">24h</p>
              <p className="text-xs text-gray-500 mt-1">Respuesta</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">0</p>
              <p className="text-xs text-gray-500 mt-1">Costos ocultos</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Datos protegidos
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-500"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Inmuebles verificados
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-500"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              Pagos seguros con Stripe
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-500"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
              Firma electronica legal
            </span>
          </div>
        </div>
      </section>

      {/* Property Grid */}
      <main id="vitrina" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Inmuebles disponibles</h2>
          <p className="text-gray-500">Encuentra tu proximo hogar entre nuestra seleccion de propiedades verificadas</p>
        </div>
        <Suspense fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-5 w-32 bg-gray-200 rounded" />
                  <div className="h-4 w-48 bg-gray-200 rounded" />
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        }>
          <PropertyGrid />
        </Suspense>
      </main>

      {/* Como funciona */}
      <section className="bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-primary-600 tracking-wider uppercase">Proceso simple</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">
              Como funciona Cofianza
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <StepCard
              number="1"
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-600"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              }
              title="Busca tu inmueble"
              description="Explora nuestra vitrina con filtros inteligentes. Encuentra por ciudad, tipo, precio y mas."
            />
            <StepCard
              number="2"
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-600"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              }
              title="Estudio crediticio"
              description="Realizamos tu estudio de riesgo de forma rapida y segura. Resultados en menos de 24 horas."
            />
            <StepCard
              number="3"
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-600"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              }
              title="Firma tu contrato"
              description="Firma electronica legal desde cualquier dispositivo. Tu contrato listo en minutos, no semanas."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Listo para encontrar tu proximo hogar?
            </h2>
            <p className="text-gray-400 mb-8">
              Unete a Cofianza y accede a inmuebles verificados con procesos 100% digitales. Sin filas, sin papeleos.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/registro"
                className="px-8 py-3.5 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
              >
                Crear cuenta gratis
              </Link>
              <Link
                href="#vitrina"
                className="px-8 py-3.5 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors border border-white/20"
              >
                Ver inmuebles
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}

// ── Step Card ───────────────────────────────

function StepCard({ number, icon, title, description }: {
  number: string; icon: React.ReactNode; title: string; description: string
}) {
  return (
    <div className="relative">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <span className="text-5xl font-bold text-gray-100 select-none">{number}</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  )
}
