/**
 * Página landing / Vitrina pública
 * Placeholder - se completará en historia posterior
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Habitar Propiedades - Encuentra tu hogar ideal',
  description: 'Plataforma de arrendamiento de inmuebles en Colombia',
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header público */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-600">
            Habitar Propiedades
          </h1>
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Iniciar Sesión
          </Link>
        </div>
      </header>

      {/* Hero section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Encuentra tu hogar ideal
          </h2>
          <p className="text-xl text-gray-600">
            Inmuebles disponibles en las mejores zonas de Colombia
          </p>
        </div>

        {/* Placeholder vitrina */}
        <div className="bg-white rounded-lg shadow-md p-12 text-center border-2 border-dashed border-gray-300">
          <p className="text-lg text-gray-500 mb-2">
            Vitrina pública de inmuebles
          </p>
          <p className="text-sm text-gray-400">
            Placeholder - se completará en historia posterior
          </p>
        </div>

        {/* Quick access to dashboard */}
        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Ir al Dashboard
          </Link>
        </div>
      </main>
    </div>
  )
}
