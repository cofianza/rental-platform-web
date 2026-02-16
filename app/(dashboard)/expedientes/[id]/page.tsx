/**
 * Página de detalle de expediente
 * Placeholder - se completará en historia posterior
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Detalle de Expediente - Habitar Propiedades',
  description: 'Vista detallada del expediente',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function ExpedienteDetallePage({ params }: Props) {
  const { id } = await params

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Expediente #{id}</h1>
        <p className="text-gray-600 mt-2">Vista detallada con tabs</p>
      </div>

      <div className="bg-white rounded-lg shadow border-2 border-dashed border-gray-200 p-8 text-center">
        <p className="text-gray-500">Detalle del expediente con tabs</p>
        <p className="text-sm text-gray-400 mt-2">
          (Información general, Documentos, Estudio, Contrato, Timeline)
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Placeholder - se completará en historia posterior
        </p>
      </div>
    </div>
  )
}
