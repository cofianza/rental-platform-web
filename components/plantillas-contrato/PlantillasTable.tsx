'use client'

import Link from 'next/link'
import { IconChevronLeft, IconChevronRight, IconEdit, IconEye, IconPower } from '@/components/icons'
import { formatDateTime } from '@/lib/constants'
import type { IPlantillaContrato, IPlantillaContratoMeta } from '@/types/plantilla-contrato'

interface PlantillasTableProps {
  plantillas: IPlantillaContrato[]
  meta: IPlantillaContratoMeta | null
  sortBy: string
  sortDir: 'asc' | 'desc'
  canEdit: boolean
  canDelete: boolean
  onSort: (field: 'created_at' | 'nombre' | 'version') => void
  onPageChange: (page: number) => void
  onEdit: (plantilla: IPlantillaContrato) => void
  onDeactivate: (plantilla: IPlantillaContrato) => void
}

export function PlantillasTable({
  plantillas,
  meta,
  sortBy,
  sortDir,
  canEdit,
  canDelete,
  onSort,
  onPageChange,
  onEdit,
  onDeactivate,
}: PlantillasTableProps) {
  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <span className="text-gray-300 ml-1">&#8597;</span>
    return <span className="ml-1">{sortDir === 'asc' ? '&#9650;' : '&#9660;'}</span>
  }

  if (plantillas.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium">No se encontraron plantillas</p>
        <p className="text-sm mt-1">Ajusta los filtros o crea una nueva plantilla</p>
      </div>
    )
  }

  return (
    <div>
      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort('nombre')}
              >
                <span className="flex items-center">
                  Nombre <SortIcon field="nombre" />
                </span>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort('version')}
              >
                <span className="flex items-center">
                  Version <SortIcon field="version" />
                </span>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Variables
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort('created_at')}
              >
                <span className="flex items-center">
                  Fecha <SortIcon field="created_at" />
                </span>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {plantillas.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <Link
                      href={`/plantillas-contrato/${p.id}`}
                      className="text-sm font-medium text-primary-700 hover:text-primary-900 hover:underline"
                    >
                      {p.nombre}
                    </Link>
                    {p.descripcion && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
                        {p.descripcion}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    v{p.version}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">
                    {p.variables?.length || 0}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      p.activa
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {p.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatDateTime(p.created_at)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/plantillas-contrato/${p.id}`}
                      className="p-1.5 text-gray-400 hover:text-primary-600 rounded-md hover:bg-gray-100"
                      title="Ver detalle"
                    >
                      <IconEye size={16} />
                    </Link>
                    {canEdit && (
                      <button
                        onClick={() => onEdit(p)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 rounded-md hover:bg-gray-100"
                        title="Editar"
                      >
                        <IconEdit size={16} />
                      </button>
                    )}
                    {canDelete && p.activa && (
                      <button
                        onClick={() => onDeactivate(p)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100"
                        title="Desactivar"
                      >
                        <IconPower size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginacion */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Mostrando {plantillas.length} de {meta.total} plantillas
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(meta.page - 1)}
              disabled={meta.page <= 1}
              className="p-1.5 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <IconChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-600">
              {meta.page} / {meta.totalPages}
            </span>
            <button
              onClick={() => onPageChange(meta.page + 1)}
              disabled={meta.page >= meta.totalPages}
              className="p-1.5 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <IconChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
