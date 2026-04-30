'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { IconMail, IconLoader, IconArrowLeft, IconCheck } from '@/components/icons'
import { cn, isValidEmail } from '@/lib/utils'
import { authService } from '@/services/authService'
import { AUTH_ROUTES } from '@/lib/constants'

interface FormErrors {
  email?: string
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!email.trim()) {
      newErrors.email = 'El correo electrónico es requerido'
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Ingresa un correo electrónico válido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setServerError(null)

    try {
      await authService.forgotPassword(email)
      setIsSubmitted(true)
    } catch {
      setServerError('Ocurrió un error. Por favor, intenta de nuevo más tarde.')
    } finally {
      setIsLoading(false)
    }
  }

  // Pantalla de confirmación post-envío
  if (isSubmitted) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 w-full">

        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <IconCheck size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Revisa tu correo</h2>
          <p className="text-gray-500 mb-6">
            Si el email existe en nuestro sistema, recibirás un enlace de recuperación en los próximos minutos.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Revisa también tu carpeta de spam si no ves el correo en tu bandeja de entrada.
          </p>
          <Link
            href={AUTH_ROUTES.LOGIN}
            className={cn(
              'inline-flex items-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm',
              'text-primary-600 hover:text-primary-700 hover:bg-primary-50',
              'transition-colors'
            )}
          >
            <IconArrowLeft size={18} />
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full">

      {/* Título */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Recuperar contraseña</h2>
        <p className="text-gray-500 mt-1">
          Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
        </p>
      </div>

      {/* Error del servidor */}
      {serverError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{serverError}</p>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Campo Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Correo electrónico
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IconMail size={18} className="text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors({ ...errors, email: undefined })
                if (serverError) setServerError(null)
              }}
              placeholder="correo@ejemplo.com"
              disabled={isLoading}
              autoComplete="email"
              autoFocus
              className={cn(
                'block w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm',
                'focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                errors.email
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300 bg-white'
              )}
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>
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
              Enviando...
            </>
          ) : (
            'Enviar enlace de recuperación'
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
