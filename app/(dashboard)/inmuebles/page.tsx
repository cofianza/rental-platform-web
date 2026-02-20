'use client'

/**
 * Página de gestión de inmuebles - HP-174
 * Listado con filtros, paginación y ordenamiento
 */

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/ui'
import { IconLoader, IconHome, IconChevronRight } from '@/components/icons'
import {
  InmueblesFilters,
  InmueblesTable,
  InmueblesSkeleton,
} from '@/components/inmuebles'
import { ConfirmDialog } from '@/components/users'
import { useInmuebles } from '@/hooks/useInmuebles'
import { useAuth } from '@/hooks/useAuth'
import type { IInmueble } from '@/types/inmueble'

/**
 * Breadcrumbs component
 */
function Breadcrumbs() {
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
      <Link href="/" className="hover:text-primary-600 flex items-center gap-1">
        <IconHome size={16} />
        Inicio
      </Link>
      <IconChevronRight size={14} />
      <span className="text-gray-900 font-medium">Inmuebles</span>
    </nav>
  )
}

function InmueblesContent() {
  const router = useRouter()
  const { user } = useAuth()
  const {
    inmuebles,
    meta,
    filters,
    filterOptions,
    isLoading,
    error,
    setFilters,
    clearFilters,
    handleSort,
    deleteInmueble,
    fetchInmuebles,
  } = useInmuebles()

  // Estado local para diálogo de confirmación de eliminación
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    inmueble: IInmueble | null
  }>({
    isOpen: false,
    inmueble: null,
  })
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)

  // Permisos según rol
  const isAdmin = user?.rol === 'administrador'
  const isOperador = user?.rol === 'operador_analista'

  // Permisos de CRUD
  const canCreate = isAdmin || isOperador
  const canEdit = isAdmin || isOperador
  const canDelete = isAdmin // Solo admin puede eliminar

  // Handlers
  const handleCreateClick = () => {
    router.push('/inmuebles/nuevo')
  }

  const handleView = (inmueble: IInmueble) => {
    router.push(`/inmuebles/${inmueble.id}`)
  }

  const handleEdit = (inmueble: IInmueble) => {
    router.push(`/inmuebles/${inmueble.id}/editar`)
  }

  const handleDeleteClick = (inmueble: IInmueble) => {
    setDeleteDialog({ isOpen: true, inmueble })
  }

  const closeDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, inmueble: null })
  }

  const handleConfirmDelete = async () => {
    if (!deleteDialog.inmueble) return

    setIsDeleteLoading(true)
    const success = await deleteInmueble(deleteDialog.inmueble)
    setIsDeleteLoading(false)

    if (success) {
      closeDeleteDialog()
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Header */}
      <PageHeader
        title="Inmuebles"
        subtitle={meta ? `${meta.total} inmuebles registrados` : 'Cargando...'}
      />

      {/* Error global */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filtros */}
      <InmueblesFilters
        filters={filters}
        filterOptions={filterOptions}
        onFilterChange={setFilters}
        onClearFilters={clearFilters}
        onCreateClick={handleCreateClick}
        isLoading={isLoading}
        canCreate={canCreate}
      />

      {/* Tabla o Skeleton */}
      {isLoading && inmuebles.length === 0 ? (
        <InmueblesSkeleton rows={filters.limit} />
      ) : (
        <InmueblesTable
          inmuebles={inmuebles}
          meta={meta}
          filters={filters}
          onFilterChange={setFilters}
          onSort={handleSort}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          isLoading={isLoading}
          canEdit={canEdit}
          canDelete={canDelete}
          canCreate={canCreate}
          error={error}
          onRetry={fetchInmuebles}
          onCreateNew={handleCreateClick}
        />
      )}

      {/* Diálogo de confirmación de eliminación */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleConfirmDelete}
        title="Eliminar Inmueble"
        message={`¿Estás seguro de que deseas eliminar el inmueble ${deleteDialog.inmueble?.codigo}? Esta acción marcará el inmueble como inactivo.`}
        confirmText="Eliminar"
        variant="danger"
        isLoading={isDeleteLoading}
      />
    </div>
  )
}

// Loading fallback
function LoadingFallback() {
  return (
    <div className="space-y-6">
      <PageHeader title="Inmuebles" subtitle="Cargando..." />
      <div className="flex items-center justify-center h-64">
        <IconLoader size={32} className="text-primary-600 animate-spin" />
      </div>
    </div>
  )
}

export default function InmueblesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <InmueblesContent />
    </Suspense>
  )
}
