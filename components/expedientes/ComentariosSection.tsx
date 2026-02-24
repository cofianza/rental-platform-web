/**
 * ComentariosSection - HP-263
 * Sección de comentarios internos del expediente
 * CRUD completo: crear, editar inline, eliminar con confirmación
 * Actualización optimista, fechas relativas, menú de acciones
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/Avatar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconLoader, IconRefresh, IconMoreVertical, IconEdit, IconTrash, IconX, IconCheck } from '@/components/icons'
import { expedienteService } from '@/services/expedienteService'
import { useAuthStore } from '@/stores/auth.store'
import type { IComentarioExpediente } from '@/types/expediente'

// ============================================
// Helpers
// ============================================

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'hace un momento'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days}d`

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

function wasEdited(createdAt: string, updatedAt: string): boolean {
  // Compare truncated to seconds to avoid precision issues
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 1000
}

// ============================================
// ActionMenu sub-component
// ============================================

interface ActionMenuProps {
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
  canDelete: boolean
}

function ActionMenu({ onEdit, onDelete, canEdit, canDelete }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (!canEdit && !canDelete) return null

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1 rounded hover:bg-gray-200 transition-colors"
      >
        <IconMoreVertical size={16} className="text-gray-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
          {canEdit && (
            <button
              onClick={() => { onEdit(); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <IconEdit size={14} /> Editar
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => { onDelete(); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <IconTrash size={14} /> Eliminar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// Main component
// ============================================

export interface ComentariosSectionProps {
  expedienteId: string
}

export function ComentariosSection({ expedienteId }: ComentariosSectionProps) {
  const user = useAuthStore((s) => s.user)

  const [comentarios, setComentarios] = useState<IComentarioExpediente[]>([])
  const [nuevoComentario, setNuevoComentario] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<IComentarioExpediente | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Permissions
  const isAdmin = user?.rol === 'administrador'
  const currentUserId = user?.id

  // ============================================
  // Fetch
  // ============================================

  const fetchComentarios = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await expedienteService.getComentarios(expedienteId)
      setComentarios(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar comentarios'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [expedienteId])

  useEffect(() => {
    fetchComentarios()
  }, [fetchComentarios])

  // ============================================
  // Create (optimistic)
  // ============================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoComentario.trim() || isSending || !user) return

    const contenido = nuevoComentario.trim()
    setIsSending(true)
    setNuevoComentario('')

    // Optimistic: prepend with temp data
    const tempId = `temp-${Date.now()}`
    // Split nombre_completo for optimistic display
    const parts = (user.nombre_completo || '').split(' ')
    const nombre = parts[0] || ''
    const apellido = parts.slice(1).join(' ')

    const optimistic: IComentarioExpediente = {
      id: tempId,
      expediente_id: expedienteId,
      usuario_id: user.id,
      usuario: { id: user.id, nombre, apellido },
      contenido,
      is_internal: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setComentarios((prev) => [optimistic, ...prev])

    try {
      const created = await expedienteService.crearComentario(expedienteId, { contenido })
      // Replace temp with real
      setComentarios((prev) => prev.map((c) => (c.id === tempId ? created : c)))
      toast.success('Comentario agregado')
    } catch (err) {
      // Revert
      setComentarios((prev) => prev.filter((c) => c.id !== tempId))
      setNuevoComentario(contenido)
      const message = err instanceof Error ? err.message : 'Error al agregar comentario'
      toast.error(message)
    } finally {
      setIsSending(false)
    }
  }

  // ============================================
  // Edit (optimistic)
  // ============================================

  const handleStartEdit = (comentario: IComentarioExpediente) => {
    setEditingId(comentario.id)
    setEditText(comentario.contenido)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim() || isSavingEdit) return

    const newText = editText.trim()
    const original = comentarios.find((c) => c.id === editingId)
    if (!original || original.contenido === newText) {
      handleCancelEdit()
      return
    }

    setIsSavingEdit(true)

    // Optimistic update
    setComentarios((prev) =>
      prev.map((c) =>
        c.id === editingId
          ? { ...c, contenido: newText, updated_at: new Date().toISOString() }
          : c
      )
    )
    setEditingId(null)
    setEditText('')

    try {
      const updated = await expedienteService.editarComentario(expedienteId, editingId, {
        contenido: newText,
      })
      setComentarios((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      toast.success('Comentario editado')
    } catch (err) {
      // Revert
      if (original) {
        setComentarios((prev) => prev.map((c) => (c.id === original.id ? original : c)))
      }
      const message = err instanceof Error ? err.message : 'Error al editar comentario'
      toast.error(message)
    } finally {
      setIsSavingEdit(false)
    }
  }

  // ============================================
  // Delete (optimistic with confirmation)
  // ============================================

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || isDeleting) return

    setIsDeleting(true)
    const toDelete = deleteTarget
    setDeleteTarget(null)

    // Optimistic remove
    setComentarios((prev) => prev.filter((c) => c.id !== toDelete.id))

    try {
      await expedienteService.eliminarComentario(expedienteId, toDelete.id)
      toast.success('Comentario eliminado')
    } catch (err) {
      // Revert
      setComentarios((prev) => {
        const restored = [...prev, toDelete]
        restored.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        return restored
      })
      const message = err instanceof Error ? err.message : 'Error al eliminar comentario'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  // ============================================
  // Render
  // ============================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <IconLoader size={24} className="text-gray-400 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchComentarios}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <IconRefresh size={16} />
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Formulario para nuevo comentario */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={nuevoComentario}
          onChange={(e) => setNuevoComentario(e.target.value)}
          placeholder="Escribe un comentario interno..."
          rows={3}
          disabled={isSending}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:bg-gray-100"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!nuevoComentario.trim() || isSending}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSending && <IconLoader size={16} className="animate-spin" />}
            Agregar comentario
          </button>
        </div>
      </form>

      {/* Lista de comentarios */}
      {comentarios.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No hay comentarios aun</p>
          <p className="text-xs mt-1">Se el primero en agregar un comentario interno</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comentarios.map((comentario) => {
            const nombreCompleto =
              `${comentario.usuario.nombre} ${comentario.usuario.apellido}`.trim()
            const isOwn = comentario.usuario_id === currentUserId
            const canEdit = isOwn
            const canDelete = isOwn || isAdmin
            const isEditing = editingId === comentario.id
            const edited = wasEdited(comentario.created_at, comentario.updated_at)

            return (
              <div
                key={comentario.id}
                className="flex gap-3 p-4 bg-gray-50 rounded-lg group"
              >
                <Avatar name={nombreCompleto} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {nombreCompleto}
                    </span>
                    <span className="text-xs text-gray-500">
                      {timeAgo(comentario.created_at)}
                    </span>
                    {edited && (
                      <span className="text-xs text-gray-400 italic">(editado)</span>
                    )}
                    {/* Action menu - visible on hover or when menu is open */}
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <ActionMenu
                        canEdit={canEdit}
                        canDelete={canDelete}
                        onEdit={() => handleStartEdit(comentario)}
                        onDelete={() => setDeleteTarget(comentario)}
                      />
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={2}
                        autoFocus
                        disabled={isSavingEdit}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:bg-gray-100"
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') handleCancelEdit()
                          if (e.key === 'Enter' && e.metaKey) handleSaveEdit()
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={!editText.trim() || isSavingEdit}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50"
                        >
                          {isSavingEdit ? (
                            <IconLoader size={12} className="animate-spin" />
                          ) : (
                            <IconCheck size={12} />
                          )}
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSavingEdit}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          <IconX size={12} />
                          Cancelar
                        </button>
                        <span className="text-xs text-gray-400 ml-auto">
                          Cmd+Enter para guardar
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {comentario.contenido}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Diálogo de confirmación de eliminación */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar comentario"
        message="Esta accion no se puede deshacer. ¿Estas seguro de que deseas eliminar este comentario?"
        confirmLabel="Eliminar"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
