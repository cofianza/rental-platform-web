/**
 * Página de gestión de usuarios
 * HP-57: Listado con badges de rol coloreados
 */

'use client'

import { PageHeader, DataTable, Avatar } from '@/components/ui'
import type { Column } from '@/components/ui/DataTable'
import { MOCK_USUARIOS, type MockUsuario } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

// Colores de badge por rol
const ROL_COLORS: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'bg-purple-100', text: 'text-purple-700' },
  analista: { bg: 'bg-blue-100', text: 'text-blue-700' },
  gerencia: { bg: 'bg-amber-100', text: 'text-amber-700' },
  operador: { bg: 'bg-teal-100', text: 'text-teal-700' },
  propietario: { bg: 'bg-green-100', text: 'text-green-700' },
  inmobiliaria: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
}

// Badge de rol con color
function RolBadge({ rol, label }: { rol: string; label: string }) {
  const colors = ROL_COLORS[rol] || { bg: 'bg-gray-100', text: 'text-gray-700' }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colors.bg,
        colors.text
      )}
    >
      {label}
    </span>
  )
}

// Badge de estado
function EstadoBadge({ activo }: { activo: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        activo
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-700'
      )}
    >
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  )
}

export default function UsuariosPage() {
  // Definición de columnas
  const columns: Column<MockUsuario>[] = [
    {
      key: 'nombres',
      label: 'Usuario',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${row.nombres} ${row.apellidos}`} size="md" />
          <div>
            <p className="font-medium text-gray-900">
              {row.nombres} {row.apellidos}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (row) => (
        <span className="text-gray-600">{row.email}</span>
      ),
    },
    {
      key: 'rol',
      label: 'Rol',
      sortable: true,
      render: (row) => <RolBadge rol={row.rol} label={row.rol_label} />,
    },
    {
      key: 'activo',
      label: 'Estado',
      render: (row) => <EstadoBadge activo={row.activo} />,
    },
    {
      key: 'ultimo_acceso',
      label: 'Último acceso',
      sortable: true,
      render: (row) => (
        <span className="text-gray-500 text-sm">{row.ultimo_acceso}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Usuarios"
        subtitle={`${MOCK_USUARIOS.length} usuarios registrados`}
        actions={
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
            + Nuevo Usuario
          </button>
        }
      />

      {/* Tabla */}
      <DataTable
        columns={columns}
        data={MOCK_USUARIOS}
        pageSize={10}
        emptyMessage="No hay usuarios registrados"
      />
    </div>
  )
}
