/**
 * Esqueleto del detalle público. Sin él, al tocar una tarjeta de la vitrina la
 * pantalla se quedaba quieta mientras el servidor pedía el inmueble y luego
 * los similares; con este límite, el prefetch del <Link> ya trae algo que
 * pintar al instante.
 */

import { PublicNavbar } from '@/components/vitrina/PublicNavbar'

export default function CargandoInmueble() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0">
      <PublicNavbar />
      <main
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-pulse"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Cargando inmueble…</span>
        <div className="h-4 w-64 bg-gray-200 rounded mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="aspect-[16/9] bg-gray-200" />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
              <div className="h-5 w-1/3 bg-gray-200 rounded" />
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-4 w-5/6 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 h-fit">
            <div className="h-5 w-24 bg-gray-200 rounded-full" />
            <div className="h-8 w-40 bg-gray-200 rounded" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-11 w-full bg-gray-200 rounded-lg" />
          </div>
        </div>
      </main>
    </div>
  )
}
