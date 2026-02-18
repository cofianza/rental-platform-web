'use client'

/**
 * Página de gestión de usuarios - HP-117
 * CRUD completo con filtros, paginación y modales
 */

import { useState, Suspense } from 'react'
import { PageHeader } from '@/components/ui'
import { IconLoader } from '@/components/icons'
import {
  UserFilters,
  UsersTable,
  UserForm,
  ConfirmDialog,
  USER_MESSAGES,
} from '@/components/users'
import { useUsers } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import type { IUserProfile, IUserFormData } from '@/types/user'

function UsuariosContent() {
  const { user } = useAuth()
  const {
    users,
    meta,
    filters,
    isLoading,
    error,
    selectedUser,
    modalMode,
    setFilters,
    clearFilters,
    openCreateModal,
    openEditModal,
    closeModal,
    createUser,
    updateUser,
    activateUser,
    deactivateUser,
  } = useUsers()

  // Estado local para diálogo de confirmación
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    user: IUserProfile | null
    action: 'activate' | 'deactivate'
  }>({
    isOpen: false,
    user: null,
    action: 'deactivate',
  })
  const [isConfirmLoading, setIsConfirmLoading] = useState(false)

  // Verificar si es administrador
  const isAdmin = user?.rol === 'administrador'

  // Abrir diálogo de confirmación
  const handleToggleStatus = (userToToggle: IUserProfile) => {
    setConfirmDialog({
      isOpen: true,
      user: userToToggle,
      action: userToToggle.estado === 'activo' ? 'deactivate' : 'activate',
    })
  }

  // Cerrar diálogo de confirmación
  const closeConfirmDialog = () => {
    setConfirmDialog({ isOpen: false, user: null, action: 'deactivate' })
  }

  // Confirmar activar/desactivar
  const handleConfirmToggle = async () => {
    if (!confirmDialog.user) return

    setIsConfirmLoading(true)
    const success =
      confirmDialog.action === 'activate'
        ? await activateUser(confirmDialog.user)
        : await deactivateUser(confirmDialog.user)

    setIsConfirmLoading(false)

    if (success) {
      closeConfirmDialog()
    }
  }

  // Manejar submit del formulario
  const handleFormSubmit = async (data: IUserFormData): Promise<boolean> => {
    if (modalMode === 'create') {
      return createUser(data)
    } else if (modalMode === 'edit' && selectedUser) {
      return updateUser(selectedUser.id, data)
    }
    return false
  }

  // Si no es admin, mostrar mensaje de acceso denegado
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Usuarios"
          subtitle="Gestión de usuarios del sistema"
        />
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-red-600 mb-2">Acceso Denegado</div>
          <p className="text-gray-500">
            Solo los administradores pueden acceder a esta sección.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Usuarios"
        subtitle={meta ? `${meta.total} usuarios registrados` : 'Cargando...'}
      />

      {/* Error global */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filtros */}
      <UserFilters
        filters={filters}
        onFilterChange={setFilters}
        onClearFilters={clearFilters}
        onCreateClick={openCreateModal}
        isLoading={isLoading}
      />

      {/* Tabla */}
      <div className="relative">
        <UsersTable
          users={users}
          meta={meta}
          filters={filters}
          onFilterChange={setFilters}
          onEdit={openEditModal}
          onToggleStatus={handleToggleStatus}
          isLoading={isLoading}
        />
      </div>

      {/* Modal de formulario */}
      <UserForm
        isOpen={modalMode !== null}
        onClose={closeModal}
        onSubmit={handleFormSubmit}
        mode={modalMode}
        user={selectedUser}
        isLoading={isLoading}
        error={error}
      />

      {/* Diálogo de confirmación */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirmDialog}
        onConfirm={handleConfirmToggle}
        title={
          confirmDialog.action === 'deactivate'
            ? 'Desactivar Usuario'
            : 'Activar Usuario'
        }
        message={
          confirmDialog.action === 'deactivate'
            ? USER_MESSAGES.CONFIRM_DEACTIVATE
            : USER_MESSAGES.CONFIRM_ACTIVATE
        }
        confirmText={confirmDialog.action === 'deactivate' ? 'Desactivar' : 'Activar'}
        variant={confirmDialog.action === 'deactivate' ? 'danger' : 'default'}
        isLoading={isConfirmLoading}
      />
    </div>
  )
}

// Loading fallback
function LoadingFallback() {
  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios" subtitle="Cargando..." />
      <div className="flex items-center justify-center h-64">
        <IconLoader size={32} className="text-primary-600 animate-spin" />
      </div>
    </div>
  )
}

export default function UsuariosPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UsuariosContent />
    </Suspense>
  )
}
