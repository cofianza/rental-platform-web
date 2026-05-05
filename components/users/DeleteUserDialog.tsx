'use client'

/**
 * DeleteUserDialog — borrado completo de un usuario (super-admin).
 *
 * Flujo:
 *   1. Confirmación inicial (sin force).
 *   2. Si el backend responde con relaciones bloqueantes, mostramos la lista
 *      y un botón "Eliminar de todos modos" que reintenta con force=true.
 *      Si el RDBMS sigue rechazando, el error se muestra y el dialog queda
 *      abierto para que el admin decida (cancelar / reintentar).
 */

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { IconAlertTriangle, IconLoader, IconTrash } from '@/components/icons'
import type { IUserProfile } from '@/types/user'

interface DeleteUserDialogProps {
  isOpen: boolean
  user: IUserProfile | null
  /** Devuelve { ok, blockers?, message? } — el caller hace toast si ok=true. */
  onDelete: (
    user: IUserProfile,
    options: { force?: boolean },
  ) => Promise<{ ok: boolean; blockers?: Record<string, number>; message?: string }>
  onClose: () => void
}

export function DeleteUserDialog({ isOpen, user, onDelete, onClose }: DeleteUserDialogProps) {
  const [loading, setLoading] = useState(false)
  const [blockers, setBlockers] = useState<Record<string, number> | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!user) return null

  const reset = () => {
    setBlockers(null)
    setErrorMsg(null)
  }

  const handleClose = () => {
    if (loading) return
    reset()
    onClose()
  }

  const handleDelete = async (force: boolean) => {
    setLoading(true)
    setErrorMsg(null)
    const result = await onDelete(user, { force })
    setLoading(false)

    if (result.ok) {
      reset()
      onClose()
      return
    }
    if (result.blockers) {
      setBlockers(result.blockers)
      return
    }
    setErrorMsg(result.message || 'Error al eliminar el usuario')
  }

  const tieneBlockers = blockers && Object.keys(blockers).length > 0
  const userName = `${user.nombre} ${user.apellido}`.trim() || user.email

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm">
      <div className="flex flex-col items-start text-left">
        <div className="self-center p-3 rounded-full bg-red-100 text-red-600 mb-4">
          <IconAlertTriangle size={24} />
        </div>

        <h3 className="self-center text-lg font-semibold text-gray-900 mb-1">Eliminar usuario</h3>
        <p className="self-center text-sm text-gray-600 text-center mb-4">
          {tieneBlockers ? (
            <>
              <strong>{userName}</strong> tiene datos asociados. Si eliminas de todos modos, las
              tablas con cascade limpiarán; las que tienen restricción rechazarán el borrado.
            </>
          ) : (
            <>
              ¿Eliminar a <strong>{userName}</strong> ({user.email})? Esta acción es irreversible —
              también se borra de auth.users.
            </>
          )}
        </p>

        {tieneBlockers && (
          <div className="w-full mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-900 mb-1">Datos vinculados:</p>
            <ul className="space-y-0.5 text-xs text-amber-800">
              {Object.entries(blockers!).map(([tabla, n]) => (
                <li key={tabla}>
                  · {tabla}: <strong>{n}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}

        {errorMsg && (
          <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
            {errorMsg}
          </div>
        )}

        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => handleDelete(tieneBlockers ? true : false)}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
          >
            {loading ? <IconLoader size={16} className="animate-spin" /> : <IconTrash size={16} />}
            {tieneBlockers ? 'Eliminar de todos modos' : 'Eliminar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
