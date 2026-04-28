'use client'

/**
 * Página de gestión de inmuebles - HP-174
 * Listado con filtros, paginación y ordenamiento
 */

import { useState, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { PageHeader, ExportButton } from '@/components/ui'
import { IconLoader, IconHome, IconChevronRight } from '@/components/icons'
import {
  InmueblesFilters,
  InmueblesTable,
  InmueblesSkeleton,
} from '@/components/inmuebles'
import { ConfirmDialog } from '@/components/users'
import { useInmuebles } from '@/hooks/useInmuebles'
import { useAuth } from '@/hooks/useAuth'
import { usePerfilCompletitud } from '@/hooks/usePerfilCompletitud'
import { PerfilIncompletoBanner } from '@/components/inmuebles'
import { inmuebleService } from '@/services/inmuebleService'
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
    updateInmuebleInList,
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
  const isPropietario = user?.rol === 'propietario'
  const isInmobiliaria = user?.rol === 'inmobiliaria'

  // Completitud del perfil de arrendador (bloquea crear inmueble si falta).
  // Admin/operador siempre pueden crear (no requiere perfil propio).
  const { completitud } = usePerfilCompletitud()
  const perfilIncompleto =
    (isPropietario || isInmobiliaria) && completitud !== null && !completitud.completo

  // Permisos de CRUD
  const canCreateRol = isAdmin || isOperador || isPropietario || isInmobiliaria
  const canCreate = canCreateRol && !perfilIncompleto
  const canEdit = isAdmin || isOperador || isPropietario || isInmobiliaria
  const canDelete = isAdmin // Solo admin puede eliminar

  // Handlers
  const handleCreateClick = () => {
    if (perfilIncompleto) {
      // returnTo=/inmuebles/nuevo asi al terminar de completar el perfil
      // el usuario aterriza en el form de nuevo inmueble.
      router.push('/configuracion/datos-contrato?returnTo=' + encodeURIComponent('/inmuebles/nuevo'))
      return
    }
    router.push('/inmuebles/nuevo')
  }

  const handleView = (inmueble: IInmueble) => {
    router.push(`/inmuebles/${inmueble.id}`)
  }

  const handleEdit = (inmueble: IInmueble) => {
    router.push(`/inmuebles/${inmueble.id}/editar`)
  }

  /**
   * Toggle visibilidad en vitrina - HP-369
   * Optimistic update: actualiza UI inmediatamente, revierte si falla
   */
  const handleToggleVitrina = useCallback(
    async (id: string, value: boolean) => {
      const inmueble = inmuebles.find((i) => i.id === id)
      if (!inmueble) return

      // Optimistic update
      updateInmuebleInList({ ...inmueble, visible_vitrina: value })

      try {
        await inmuebleService.toggleVisibleVitrina(id, value)
        toast.success(
          value
            ? 'Inmueble publicado en la vitrina'
            : 'Inmueble retirado de la vitrina'
        )
      } catch {
        // Revert on failure
        updateInmuebleInList({ ...inmueble, visible_vitrina: !value })
        toast.error('Error al actualizar la visibilidad en vitrina')
      }
    },
    [inmuebles, updateInmuebleInList]
  )

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
        actions={
          <ExportButton
            endpoint="/export/inmuebles"
            params={{
              ...(filters.search ? { search: filters.search } : {}),
              ...(filters.tipo ? { tipo: filters.tipo } : {}),
              ...(filters.ciudad ? { ciudad: filters.ciudad } : {}),
              ...(filters.estado ? { estado: filters.estado } : {}),
              ...(filters.estrato ? { estrato: String(filters.estrato) } : {}),
            }}
            entityName="Inmuebles"
          />
        }
      />

      {/* Error global */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Banner: perfil de arrendador incompleto */}
      {perfilIncompleto && <PerfilIncompletoBanner completitud={completitud} />}

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
          isAdmin={isAdmin}
          onToggleVitrina={isAdmin ? handleToggleVitrina : undefined}
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
