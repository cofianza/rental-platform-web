/**
 * Página de configuración del sistema
 * Placeholder - se completará en historia posterior
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Configuración - Habitar Propiedades',
  description: 'Configuración del sistema',
}

export default function ConfiguracionPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Configuración</h1>

      <div className="space-y-6">
        {[
          'Plantillas de contrato',
          'Tipos de documento',
          'Configuración de emails',
          'Integraciones (Stripe, Resend)',
          'Parámetros del sistema',
        ].map((section) => (
          <div
            key={section}
            className="bg-white rounded-lg shadow p-6 border-2 border-dashed border-gray-200"
          >
            <p className="text-sm font-medium text-gray-700">{section}</p>
            <p className="text-xs text-gray-400 mt-2">Placeholder</p>
          </div>
        ))}
      </div>
    </div>
  )
}
