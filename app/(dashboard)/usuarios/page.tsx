/**
 * Página de gestión de usuarios
 * Placeholder - se completará en historia posterior
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Usuarios - Habitar Propiedades',
  description: 'Gestión de usuarios del sistema',
}

export default function UsuariosPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
        <button className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
          + Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border-2 border-dashed border-gray-200 p-8 text-center">
        <p className="text-gray-500">Listado de usuarios con roles</p>
        <p className="text-sm text-gray-400 mt-2">
          Placeholder - se completará en historia posterior
        </p>
      </div>
    </div>
  )
}
