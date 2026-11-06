/**
 * ComentariosSection - HP-263
 * Sección de comentarios internos del expediente
 * CRUD completo: crear, editar inline, eliminar con confirmación
 * Actualización optimista, fechas relativas con la fecha exacta en <time>,
 * Editar / Eliminar visibles en cada comentario (antes, un menú que solo
 * aparecía al pasar el mouse: en el celular y con teclado no se veía)
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/Avatar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconLoader, IconRefresh, IconEdit, IconTrash, IconX, IconCheck, IconAlertTriangle, IconLock } from '@/components/icons'
import { formatDateTime } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { expedienteService } from '@/services/expedienteService'
import { useUsuarioVista } from '@/components/expedientes/VerComo'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import type { IComentarioExpediente } from '@/types/expediente'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'

// ============================================
// Helpers
// ============================================

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (Number.isNaN(seconds)) return ''
  if (seconds < 60) return 'hace un momento'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

function wasEdited(createdAt: string, updatedAt: string): boolean {
  // Compare truncated to seconds to avoid precision issues
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 1000
}

// El mismo botón de fila que Documentos, Contratos y Pagos: 40 px de alto, con texto.
const BOTON_FILA =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50'
const BOTON_SECUNDARIO = 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
const BOTON_PRINCIPAL = 'bg-primary-700 text-white hover:bg-primary-800'
const BOTON_FANTASMA = 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'

// ============================================
// Main component
// ============================================

export interface ComentariosSectionProps {
  expedienteId: string
}

export function ComentariosSection({ expedienteId }: ComentariosSectionProps) {
  const user = useUsuarioVista()

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
  // Gerencia lee los comentarios pero no escribe (el API le niega el POST).
  const puedeComentar = usePuedeEditar()

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

  const encabezado = (
    <div>
      <h3 className="text-lg font-semibold text-gray-900">Comentarios del estudio</h3>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
        {!isLoading && !error && (
          <span>{comentarios.length} {comentarios.length === 1 ? 'comentario' : 'comentarios'}</span>
        )}
        <span className="inline-flex items-center gap-1">
          <span aria-hidden="true" className="text-gray-500"><IconLock size={14} /></span>
          Notas internas del equipo de Cofianza
        </span>
      </p>
    </div>
  )

  // Solo la primera carga: al refrescar se sigue viendo lo que ya estaba.
  if (isLoading && comentarios.length === 0) {
    return (
      <div className="space-y-5">
        {encabezado}
        <div role="status" className="space-y-4">
          <span className="sr-only">Cargando comentarios…</span>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <SkeletonText lineas={2} className="flex-1" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-5">
        {encabezado}
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-red-700"><IconAlertTriangle size={18} /></span>
            <div>
              <p className="text-sm font-medium text-red-900">No pudimos cargar los comentarios de este estudio.</p>
              <p className="mt-0.5 text-sm text-red-800">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchComentarios}
            disabled={isLoading}
            className={cn(BOTON_FILA, 'shrink-0 border border-red-300 bg-white text-red-800 hover:bg-red-100')}
          >
            {isLoading ? <IconLoader size={16} className="animate-spin" /> : <IconRefresh size={16} />}
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {encabezado}

      {/* Formulario para nuevo comentario */}
      {puedeComentar && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <label htmlFor="nuevo-comentario" className="text-sm font-medium text-gray-800">
            Nuevo comentario
          </label>
          <textarea
            id="nuevo-comentario"
            value={nuevoComentario}
            onChange={(e) => setNuevoComentario(e.target.value)}
            placeholder="Escriba una nota para el equipo…"
            rows={3}
            disabled={isSending}
            className="block w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!nuevoComentario.trim() || isSending}
              className={cn(BOTON_FILA, BOTON_PRINCIPAL, 'w-full sm:w-auto')}
            >
              {isSending && <IconLoader size={16} className="animate-spin" />}
              {isSending ? 'Agregando…' : 'Agregar comentario'}
            </button>
          </div>
        </form>
      )}

      {/* Lista de comentarios */}
      {comentarios.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <IconEdit size={20} />
          </span>
          <p className="mt-3 text-sm font-semibold text-gray-900">Sin comentarios</p>
          <p className="mt-1 max-w-md text-sm text-gray-600">
            {puedeComentar
              ? 'Deje aquí lo que el resto del equipo debe saber de este estudio: llamadas, acuerdos o pendientes.'
              : 'Nadie del equipo ha dejado notas en este estudio.'}
          </p>
        </div>
      ) : (
        <ol aria-label="Comentarios, del más reciente al más antiguo" className="divide-y divide-gray-100 border-t border-gray-100">
          {comentarios.map((comentario) => {
            const nombreCompleto =
              `${comentario.usuario.nombre} ${comentario.usuario.apellido}`.trim() || 'Usuario'
            const isOwn = comentario.usuario_id === currentUserId
            // Un comentario recién enviado aún no existe en la API: no se edita ni borra.
            const pendiente = comentario.id.startsWith('temp-')
            const canEdit = isOwn && !pendiente
            const canDelete = (isOwn || isAdmin) && !pendiente
            const isEditing = editingId === comentario.id
            const edited = wasEdited(comentario.created_at, comentario.updated_at)

            return (
              <li key={comentario.id} className={cn('flex gap-3 py-4', pendiente && 'opacity-70')}>
                <Avatar name={nombreCompleto} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-sm">
                    <span className="font-medium text-gray-900">{nombreCompleto}</span>
                    {isOwn && <span className="text-gray-600">(usted)</span>}
                    <span aria-hidden="true" className="text-gray-400">·</span>
                    {pendiente ? (
                      <span className="text-gray-600">Enviando…</span>
                    ) : (
                      <time
                        dateTime={comentario.created_at}
                        title={formatDateTime(comentario.created_at)}
                        className="text-gray-600"
                      >
                        {timeAgo(comentario.created_at)}
                      </time>
                    )}
                    {edited && !pendiente && (
                      <span className="text-gray-600" title={`Editado el ${formatDateTime(comentario.updated_at)}`}>
                        (editado)
                      </span>
                    )}
                  </p>

                  {isEditing ? (
                    <div className="mt-2 space-y-2">
                      <label htmlFor={`editar-${comentario.id}`} className="sr-only">
                        Editar comentario
                      </label>
                      <textarea
                        id={`editar-${comentario.id}`}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        autoFocus
                        disabled={isSavingEdit}
                        className="block w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') handleCancelEdit()
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveEdit()
                        }}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={!editText.trim() || isSavingEdit}
                          className={cn(BOTON_FILA, BOTON_PRINCIPAL)}
                        >
                          {isSavingEdit ? <IconLoader size={16} className="animate-spin" /> : <IconCheck size={16} />}
                          Guardar cambios
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSavingEdit}
                          className={cn(BOTON_FILA, BOTON_SECUNDARIO)}
                        >
                          <IconX size={16} />
                          Cancelar
                        </button>
                        <span className="ml-auto hidden text-xs text-gray-600 sm:inline">
                          Ctrl o Cmd + Enter para guardar · Esc para cancelar
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 max-w-prose whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800">
                      {comentario.contenido}
                    </p>
                  )}

                  {!isEditing && (canEdit || canDelete) && (
                    <div className="-ml-2.5 mt-1 flex items-center gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(comentario)}
                          disabled={isSavingEdit}
                          className={cn(BOTON_FILA, BOTON_FANTASMA, 'px-2.5')}
                        >
                          <IconEdit size={16} />
                          Editar
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(comentario)}
                          disabled={isDeleting}
                          className={cn(BOTON_FILA, 'px-2.5 text-red-700 hover:bg-red-50')}
                        >
                          <IconTrash size={16} />
                          Eliminar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {/* Diálogo de confirmación de eliminación */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar comentario"
        message="Esta acción no se puede deshacer. ¿Está seguro de que desea eliminar este comentario?"
        confirmLabel="Eliminar"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
