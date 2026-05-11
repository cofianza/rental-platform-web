/**
 * ResetPasswordDialog — el admin establece directamente una contrasena
 * nueva para otro usuario (sin pasar por el flow de "olvide mi contrasena").
 *
 * Valida en cliente:
 *  - 8+ caracteres
 *  - al menos 1 mayuscula, 1 minuscula y 1 numero
 *  - password y confirmacion coinciden
 *
 * El backend re-valida la fuerza con el mismo regex, asi que las dos
 * comprobaciones tienen que coincidir.
 */

'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { IconX, IconLock, IconLoader, IconEye, IconEyeOff } from '@/components/icons'
import { userService } from '@/services/userService'
import type { IUserProfile } from '@/types/user'

interface ResetPasswordDialogProps {
  isOpen: boolean
  user: IUserProfile | null
  onClose: () => void
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

function validatePassword(pwd: string): string | null {
  if (pwd.length < 8) return 'Mínimo 8 caracteres'
  if (!/[A-Z]/.test(pwd)) return 'Debe incluir al menos 1 mayúscula'
  if (!/[a-z]/.test(pwd)) return 'Debe incluir al menos 1 minúscula'
  if (!/\d/.test(pwd)) return 'Debe incluir al menos 1 número'
  if (!PASSWORD_REGEX.test(pwd)) return 'Contraseña inválida'
  return null
}

export function ResetPasswordDialog({ isOpen, user, onClose }: ResetPasswordDialogProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      setPassword('')
      setConfirm('')
      setShowPwd(false)
      setError(null)
    }
  }, [isOpen])

  if (!isOpen || !user) return null

  const pwdError = password ? validatePassword(password) : null
  const matchError = confirm && password !== confirm ? 'Las contraseñas no coinciden' : null
  const canSubmit = !pwdError && !matchError && password.length > 0 && confirm.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setError(null)
    try {
      await userService.resetPassword(user.id, password)
      toast.success(`Contraseña actualizada para ${user.email}`)
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al restablecer la contraseña'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const fullName = `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() || user.email

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-md">
              <IconLock size={18} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Restablecer contraseña</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-40"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            <p className="text-sm text-gray-700">
              Vas a establecer una nueva contraseña para{' '}
              <strong className="text-gray-900">{fullName}</strong> (
              <span className="text-gray-600">{user.email}</span>).
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <p className="text-xs text-amber-800 leading-relaxed">
                El usuario podrá ingresar con esta contraseña en su próximo inicio de sesión. Compártesela
                por un canal seguro y pídele que la cambie cuando ingrese.
              </p>
            </div>

            {/* Nueva contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nueva contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoFocus
                  disabled={loading}
                  className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:ring-1 focus:outline-none ${
                    pwdError
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPwd ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
              {pwdError ? (
                <p className="text-xs text-red-600 mt-1">{pwdError}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  8+ caracteres, 1 mayúscula, 1 minúscula, 1 número.
                </p>
              )}
            </div>

            {/* Confirmar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar contraseña <span className="text-red-500">*</span>
              </label>
              <input
                type={showPwd ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                disabled={loading}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none ${
                  matchError
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
              />
              {matchError && <p className="text-xs text-red-600 mt-1">{matchError}</p>}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? <IconLoader size={14} className="animate-spin" /> : <IconLock size={14} />}
              {loading ? 'Guardando…' : 'Restablecer contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
