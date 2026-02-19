/**
 * Sección de Expedientes Asociados - HP-180
 * Lista los expedientes/estudios vinculados al inmueble
 */

'use client'

import Link from 'next/link'
import { IconFolderOpen, IconPlus, IconExternalLink, IconLoader } from '@/components/icons'
import { Badge } from '@/components/ui'
import { formatDate } from '@/lib/constants'

// Tipo temporal para expedientes (se moverá a types/expediente.ts cuando se implemente HP-57)
export interface IExpedienteResumen {
  id: string
  numero_expediente: string
  solicitante_nombre: string
  estado: string
  fecha_creacion: string
}

interface ExpedientesSectionProps {
  expedientes: IExpedienteResumen[]
  inmuebleId: string
  isLoading?: boolean
  canCreate?: boolean
}

export function ExpedientesSection({
  expedientes,
  inmuebleId,
  isLoading = false,
  canCreate = true,
}: ExpedientesSectionProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <IconLoader size={24} className="text-primary-600 animate-spin" />
      </div>
    )
  }

  if (expedientes.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <IconFolderOpen size={24} className="text-gray-400" />
        </div>
        <p className="text-gray-600 mb-4">No hay expedientes asociados a este inmueble</p>
        {canCreate && (
          <Link
            href={`/expedientes/nuevo?inmueble_id=${inmuebleId}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <IconPlus size={16} />
            Crear Expediente
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">
          {expedientes.length} expediente{expedientes.length !== 1 ? 's' : ''} encontrado{expedientes.length !== 1 ? 's' : ''}
        </span>
        {canCreate && (
          <Link
            href={`/expedientes/nuevo?inmueble_id=${inmuebleId}`}
            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
          >
            <IconPlus size={14} />
            Nuevo
          </Link>
        )}
      </div>

      <div className="divide-y divide-gray-100">
        {expedientes.map((expediente) => (
          <Link
            key={expediente.id}
            href={`/expedientes/${expediente.id}`}
            className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors group"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-primary-600 group-hover:text-primary-700">
                  {expediente.numero_expediente}
                </span>
                <Badge estado={expediente.estado} />
              </div>
              <p className="text-sm text-gray-500 truncate mt-0.5">
                {expediente.solicitante_nombre}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span>{formatDate(expediente.fecha_creacion)}</span>
              <IconExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
