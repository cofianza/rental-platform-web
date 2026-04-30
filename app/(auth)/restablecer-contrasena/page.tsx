'use client'

import { Suspense, useState, useEffect, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { IconLock, IconLoader, IconEye, IconEyeOff, IconCheck, IconArrowLeft, IconX } from '@/components/icons'
import { cn } from '@/lib/utils'
import { authService } from '@/services/authService'
import { AUTH_ROUTES } from '@/lib/constants'

interface FormErrors {
  password?: string
  confirmPassword?: string
}

interface PasswordRequirement {
  label: string
  met: boolean
}

function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { label: 'Al menos 8 caracteres', met: password.length >= 8 },
    { label: 'Al menos 1 letra mayúscula', met: /[A-Z]/.test(password) },
    { label: 'Al menos 1 letra minúscula', met: /[a-z]/.test(password) },
    { label: 'Al menos 1 número', met: /\d/.test(password) },
  ]
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [isValidating, setIsValidating] = useState(true)
  const [isTokenValid, setIsTokenValid] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const requirements = getPasswordRequirements(password)
  const allRequirementsMet = requirements.every((r) => r.met)

  // Validar token al montar
  useEffect(() => {
    if (!token) {
      setIsValidating(false)
      setIsTokenValid(false)
      return
    }

    authService
      .validateResetToken(token)
      .then(() => {
        setIsTokenValid(true)
      })
      .catch(() => {
        setIsTokenValid(false)
      })
      .finally(() => {
        setIsValidating(false)
      })
  }, [token])

  // Redirigir a login tras éxito
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        router.push(AUTH_ROUTES.LOGIN)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isSuccess, router])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!password.trim()) {
      newErrors.password = 'La contraseña es requerida'
    } else if (!allRequirementsMet) {
      newErrors.password = 'La contraseña no cumple con los requisitos'
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Confirma tu contraseña'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !token) {
      return
    }

    setIsLoading(true)
    setServerError(null)

    try {
      await authService.resetPassword(token, password)
      setIsSuccess(true)
    } catch {
      setServerError('Ocurrió un error al restablecer la contraseña. El enlace puede haber expirado.')
    } finally {
      setIsLoading(false)
    }
  }

  // Estado de carga: validando token
  if (isValidating) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 w-full">
        <div className="flex flex-col items-center justify-center py-12">
          <IconLoader size={32} className="animate-spin text-primary-600 mb-4" />
          <p className="text-gray-500 text-sm">Verificando enlace...</p>
        </div>
      </div>
    )
  }

  // Token inválido o expirado
  if (!isTokenValid) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 w-full">

        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <IconX size={32} className="text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Enlace inválido</h2>
          <p className="text-gray-500 mb-8">
            El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo para restablecer tu contraseña.
          </p>
          <Link
            href={AUTH_ROUTES.FORGOT_PASSWORD}
            className={cn(
              'inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg font-medium text-sm',
              'bg-primary-600 hover:bg-primary-700 text-white',
              'focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'transition-colors'
            )}
          >
            Solicitar nuevo enlace
          </Link>
          <div className="mt-4">
            <Link
              href={AUTH_ROUTES.LOGIN}
              className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline transition-colors"
            >
              <IconArrowLeft size={16} />
              Volver a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Éxito: contraseña restablecida
  if (isSuccess) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 w-full">

        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <IconCheck size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Contraseña restablecida</h2>
          <p className="text-gray-500 mb-2">
            Tu contraseña ha sido actualizada exitosamente.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Serás redirigido al inicio de sesión en unos segundos...
          </p>
          <Link
            href={AUTH_ROUTES.LOGIN}
            className={cn(
              'inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg font-medium text-sm',
              'bg-primary-600 hover:bg-primary-700 text-white',
              'focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'transition-colors'
            )}
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  // Formulario de nueva contraseña
  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full">

      {/* Título */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Nueva contraseña</h2>
        <p className="text-gray-500 mt-1">Ingresa tu nueva contraseña</p>
      </div>

      {/* Error del servidor */}
      {serverError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{serverError}</p>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Campo Contraseña */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Nueva contraseña
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IconLock size={18} className="text-gray-400" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) setErrors({ ...errors, password: undefined })
                if (serverError) setServerError(null)
              }}
              placeholder="••••••••"
              disabled={isLoading}
              autoComplete="new-password"
              autoFocus
              className={cn(
                'block w-full pl-10 pr-12 py-2.5 border rounded-lg text-sm',
                'focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                errors.password
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300 bg-white'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-sm text-red-600">{errors.password}</p>
          )}

          {/* Indicador de requisitos */}
          {password.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {requirements.map((req) => (
                <li
                  key={req.label}
                  className={cn(
                    'flex items-center gap-2 text-xs',
                    req.met ? 'text-green-600' : 'text-gray-400'
                  )}
                >
                  {req.met ? (
                    <IconCheck size={14} className="text-green-600" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />
                  )}
                  {req.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Campo Confirmar Contraseña */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Confirmar contraseña
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IconLock size={18} className="text-gray-400" />
            </div>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined })
              }}
              placeholder="••••••••"
              disabled={isLoading}
              autoComplete="new-password"
              className={cn(
                'block w-full pl-10 pr-12 py-2.5 border rounded-lg text-sm',
                'focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                errors.confirmPassword
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300 bg-white'
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1.5 text-sm text-red-600">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            'w-full py-2.5 px-4 rounded-lg text-white font-medium text-sm',
            'bg-primary-600 hover:bg-primary-700',
            'focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            'transition-colors flex items-center justify-center gap-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <>
              <IconLoader size={18} className="animate-spin" />
              Restableciendo...
            </>
          ) : (
            'Restablecer contraseña'
          )}
        </button>
      </form>

      {/* Link volver a login */}
      <div className="mt-6 text-center">
        <Link
          href={AUTH_ROUTES.LOGIN}
          className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline transition-colors"
        >
          <IconArrowLeft size={16} />
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  )
}

function ResetPasswordFallback() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full">
      <div className="flex items-center justify-center py-12">
        <IconLoader size={32} className="animate-spin text-primary-600" />
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
