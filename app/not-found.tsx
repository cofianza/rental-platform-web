/**
 * 404 de toda la app en español (antes caía en el de Next, en inglés y sin salida).
 * Con sesión (cookie marcador hp-session) la salida es el panel, no la landing.
 */

import Link from 'next/link'
import { cookies } from 'next/headers'

export default async function PaginaNoEncontrada() {
  const conSesion = (await cookies()).has('hp-session')

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold text-primary-600 mb-2">404</p>
      <h1 className="font-display text-2xl font-semibold text-gray-900 mb-2">No encontramos esta página</h1>
      <p className="text-gray-600 mb-6">El enlace puede estar mal escrito o la página ya no existe.</p>
      <div className="flex flex-wrap justify-center gap-3">
        {conSesion ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center px-5 py-2.5 rounded-lg bg-primary-700 text-white font-medium hover:bg-primary-800"
          >
            Volver al panel
          </Link>
        ) : (
          <>
            <Link
              href="/vitrina"
              className="inline-flex items-center px-5 py-2.5 rounded-lg bg-primary-700 text-white font-medium hover:bg-primary-800"
            >
              Ver inmuebles
            </Link>
            <Link
              href="/"
              className="inline-flex items-center px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50"
            >
              Ir al inicio
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
