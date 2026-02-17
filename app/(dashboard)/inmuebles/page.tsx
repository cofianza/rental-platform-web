/**
 * Página de listado de inmuebles
 * HP-57: Listado con búsqueda y tabla
 */

'use client'

import { useState, useMemo } from 'react'
import { PageHeader, SearchInput, DataTable, Badge } from '@/components/ui'
import type { Column } from '@/components/ui/DataTable'
import { MOCK_INMUEBLES, type MockInmueble } from '@/lib/mock-data'
import { formatCurrency } from '@/lib/constants'

export default function InmueblesPage() {
  const [searchTerm, setSearchTerm] = useState('')

  // Filtrar inmuebles según búsqueda
  const filteredInmuebles = useMemo(() => {
    if (!searchTerm.trim()) return MOCK_INMUEBLES

    const term = searchTerm.toLowerCase()
    return MOCK_INMUEBLES.filter(
      (inmueble) =>
        inmueble.codigo.toLowerCase().includes(term) ||
        inmueble.direccion.toLowerCase().includes(term) ||
        inmueble.ciudad.toLowerCase().includes(term) ||
        inmueble.barrio.toLowerCase().includes(term) ||
        inmueble.tipo.toLowerCase().includes(term)
    )
  }, [searchTerm])

  // Definición de columnas
  const columns: Column<MockInmueble>[] = [
    {
      key: 'codigo',
      label: 'Código',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-gray-900">{row.codigo}</span>
      ),
    },
    {
      key: 'direccion',
      label: 'Dirección',
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-gray-900">{row.direccion}</p>
          <p className="text-xs text-gray-500">{row.barrio}</p>
        </div>
      ),
    },
    {
      key: 'ciudad',
      label: 'Ciudad',
      sortable: true,
    },
    {
      key: 'tipo',
      label: 'Tipo',
      sortable: true,
    },
    {
      key: 'estrato',
      label: 'Estrato',
      sortable: true,
      render: (row) => (
        <span className="text-center">{row.estrato}</span>
      ),
    },
    {
      key: 'valor_arriendo',
      label: 'Canon',
      sortable: true,
      render: (row) => (
        <span className="font-medium">{formatCurrency(row.valor_arriendo)}</span>
      ),
    },
    {
      key: 'propietario_nombre',
      label: 'Propietario',
      sortable: true,
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (row) => <Badge estado={row.estado} />,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Inmuebles"
        subtitle={`${filteredInmuebles.length} propiedades`}
        actions={
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
            + Nuevo Inmueble
          </button>
        }
      />

      {/* Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 max-w-md">
          <SearchInput
            placeholder="Buscar por dirección, código, ciudad..."
            onSearch={setSearchTerm}
          />
        </div>
      </div>

      {/* Tabla */}
      <DataTable
        columns={columns}
        data={filteredInmuebles}
        pageSize={10}
        emptyMessage="No se encontraron inmuebles"
      />
    </div>
  )
}
