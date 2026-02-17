/**
 * Página de listado de expedientes
 * HP-57: Listado con tabs por estado, búsqueda y tabla
 */

'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader, SearchInput, DataTable, Badge, Tabs, Avatar } from '@/components/ui'
import type { Column } from '@/components/ui/DataTable'
import type { Tab } from '@/components/ui/Tabs'
import { MOCK_EXPEDIENTES, calcularDiasEnProceso, type MockExpediente } from '@/lib/mock-data'
import { formatDate } from '@/lib/constants'

export default function ExpedientesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')

  // Contar expedientes por estado
  const counts = useMemo(() => {
    const c = {
      todos: MOCK_EXPEDIENTES.length,
      en_revision: 0,
      informacion_incompleta: 0,
      aprobado: 0,
      rechazado: 0,
      cerrado: 0,
    }
    MOCK_EXPEDIENTES.forEach((exp) => {
      if (exp.estado in c) {
        c[exp.estado as keyof typeof c]++
      }
    })
    return c
  }, [])

  // Tabs configurados
  const tabs: Tab[] = [
    { id: 'todos', label: 'Todos', count: counts.todos },
    { id: 'en_revision', label: 'En revisión', count: counts.en_revision },
    { id: 'informacion_incompleta', label: 'Incompletos', count: counts.informacion_incompleta },
    { id: 'aprobado', label: 'Aprobados', count: counts.aprobado },
    { id: 'rechazado', label: 'Rechazados', count: counts.rechazado },
    { id: 'cerrado', label: 'Cerrados', count: counts.cerrado },
  ]

  // Filtrar expedientes por tab y búsqueda
  const filteredExpedientes = useMemo(() => {
    let result = MOCK_EXPEDIENTES

    // Filtrar por tab
    if (activeTab !== 'todos') {
      result = result.filter((exp) => exp.estado === activeTab)
    }

    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (exp) =>
          exp.numero_expediente.toLowerCase().includes(term) ||
          exp.inmueble_titulo.toLowerCase().includes(term) ||
          exp.solicitante_nombre.toLowerCase().includes(term) ||
          exp.analista_nombre.toLowerCase().includes(term)
      )
    }

    return result
  }, [activeTab, searchTerm])

  // Definición de columnas
  const columns: Column<MockExpediente>[] = [
    {
      key: 'numero_expediente',
      label: 'Número',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.numero_expediente}</span>
      ),
    },
    {
      key: 'inmueble_titulo',
      label: 'Inmueble',
      sortable: true,
      render: (row) => (
        <div className="max-w-xs">
          <p className="text-gray-900 truncate">{row.inmueble_titulo}</p>
          <p className="text-xs text-gray-500 truncate">{row.inmueble_direccion}</p>
        </div>
      ),
    },
    {
      key: 'solicitante_nombre',
      label: 'Solicitante',
      sortable: true,
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (row) => <Badge estado={row.estado} />,
    },
    {
      key: 'analista_nombre',
      label: 'Analista',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.analista_nombre} size="sm" />
          <span className="text-sm">{row.analista_nombre}</span>
        </div>
      ),
    },
    {
      key: 'fecha_creacion',
      label: 'Fecha',
      sortable: true,
      render: (row) => formatDate(row.fecha_creacion),
    },
    {
      key: 'dias',
      label: 'Días',
      render: (row) => {
        const dias = calcularDiasEnProceso(row.fecha_creacion)
        return (
          <span
            className={
              dias > 10
                ? 'text-red-600 font-medium'
                : dias > 5
                ? 'text-amber-600'
                : 'text-gray-600'
            }
          >
            {dias}
          </span>
        )
      },
    },
  ]

  // Manejar click en fila
  const handleRowClick = (expediente: MockExpediente) => {
    router.push(`/expedientes/${expediente.id}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Expedientes"
        subtitle={`${filteredExpedientes.length} expedientes`}
        actions={
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
            + Nuevo Expediente
          </button>
        }
      />

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 max-w-md">
          <SearchInput
            placeholder="Buscar por número, inmueble, solicitante..."
            onSearch={setSearchTerm}
          />
        </div>
      </div>

      {/* Tabla con click en fila */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpedientes.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No se encontraron expedientes
                  </td>
                </tr>
              ) : (
                filteredExpedientes.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => handleRowClick(row)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    {columns.map((column) => (
                      <td
                        key={String(column.key)}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      >
                        {column.render
                          ? column.render(row)
                          : String(row[column.key as keyof MockExpediente] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación simplificada */}
        {filteredExpedientes.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-700">
              Mostrando <span className="font-medium">{filteredExpedientes.length}</span> expedientes
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
