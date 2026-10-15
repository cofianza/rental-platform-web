/**
 * Último recurso: falla en el layout raíz. Reemplaza al <html> completo, por
 * eso trae su propio html/body y la hoja de estilos.
 */

'use client'

import './globals.css'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es-CO">
      <body className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Algo salió mal</h1>
        <p className="text-gray-600 mb-6">Puede ser una falla pasajera. Intente de nuevo en un momento.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="px-6 py-2.5 bg-primary-700 text-white rounded-lg hover:bg-primary-800 font-medium"
          >
            Reintentar
          </button>
          {/* Recarga completa y no <Link>: el router puede ser justo lo que falló. */}
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="px-6 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50"
          >
            Ir al inicio
          </button>
        </div>
      </body>
    </html>
  )
}
