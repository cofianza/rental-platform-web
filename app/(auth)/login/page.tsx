/**
 * Página de inicio de sesión
 * Placeholder - se completará en historia posterior
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Iniciar Sesión - Habitar Propiedades',
  description: 'Inicia sesión en tu cuenta de Habitar Propiedades',
}

export default function LoginPage() {
  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Habitar Propiedades</h1>
        <p className="text-gray-600 mt-2">Iniciar Sesión</p>
      </div>

      <div className="space-y-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <p className="text-gray-500">
            Formulario de login
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Placeholder - se completará en historia posterior
          </p>
        </div>
      </div>
    </div>
  )
}
