/**
 * DataTable - Tabla de datos con paginación y ordenamiento
 * Client Component - requiere interactividad
 */

'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { IconChevronDown, IconChevronRight } from '@/components/icons'

export interface Column<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  pageSize?: number
  emptyMessage?: string
  className?: string
}

type SortDirection = 'asc' | 'desc' | null

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  pageSize = 10,
  emptyMessage = 'No hay datos para mostrar',
  className,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortKey, setSortKey] = useState<keyof T | string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // Ordenamiento
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data

    return [...data].sort((a, b) => {
      const aValue = a[sortKey]
      const bValue = b[sortKey]

      if (aValue === bValue) return 0

      const comparison = aValue > bValue ? 1 : -1
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [data, sortKey, sortDirection])

  // Paginación
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedData = sortedData.slice(startIndex, endIndex)

  // Manejar click en columna ordenable
  const handleSort = (key: keyof T | string) => {
    if (sortKey === key) {
      // Alternar dirección
      if (sortDirection === 'asc') setSortDirection('desc')
      else if (sortDirection === 'desc') {
        setSortKey(null)
        setSortDirection(null)
      }
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  // Navegar páginas
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn('bg-white rounded-lg shadow-sm border border-gray-200', className)}>
      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    column.sortable && 'cursor-pointer hover:bg-gray-100 select-none'
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && sortKey === column.key && (
                      <span className="text-primary-600">
                        {sortDirection === 'asc' ? (
                          <IconChevronDown size={16} className="rotate-180" />
                        ) : (
                          <IconChevronDown size={16} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render ? column.render(row) : String(row[column.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
          <span className="font-medium">{Math.min(endIndex, sortedData.length)}</span> de{' '}
          <span className="font-medium">{sortedData.length}</span> resultados
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={cn(
              'px-3 py-1 rounded-md text-sm font-medium transition-colors',
              currentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            )}
          >
            Anterior
          </button>

          <span className="text-sm text-gray-700">
            Página {currentPage} de {totalPages}
          </span>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={cn(
              'px-3 py-1 rounded-md text-sm font-medium transition-colors',
              currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            )}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}
