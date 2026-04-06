/**
 * Página de inicio de sesión (HP-95)
 * Login con email/contraseña + Google Sign In
 */

'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { IconEye, IconEyeOff, IconMail, IconLock, IconGoogle, IconLoader } from '@/components/icons'
import { cn, isValidEmail } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { AUTH_ROUTES } from '@/lib/constants'

interface FormErrors {
  email?: string
  password?: string
}

/**
 * Componente interno del formulario de login
 * Separado para poder usar useSearchParams con Suspense
 */
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, signInWithGoogle, isAuthenticated, isLoading, error, clearError } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  // Redirigir si ya está autenticado (ej: navega a /login estando logueado)
  useEffect(() => {
    if (isAuthenticated) {
      const intent = searchParams.get('intent')
      const propertyId = searchParams.get('property_id')
      if (intent === 'interest' && propertyId) {
        router.replace(`/vitrina/interest?property_id=${propertyId}`)
      } else {
        const redirect = searchParams.get('redirect') || AUTH_ROUTES.DASHBOARD
        router.replace(redirect)
      }
    }
  }, [isAuthenticated, router, searchParams])

  // Limpiar error de auth cuando cambian los inputs
  useEffect(() => {
    if (error) {
      clearError()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!email.trim()) {
      newErrors.email = 'El correo electrónico es requerido'
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Ingresa un correo electrónico válido'
    }

    if (!password.trim()) {
      newErrors.password = 'La contraseña es requerida'
    } else if (password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLogin = async () => {
    if (!validateForm()) {
      return
    }

    await login({ email, password })
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full">
      {/* Logo (solo visible en mobile) */}
      <div className="text-center mb-8 lg:hidden">
        <div className="mx-auto w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl mb-4">
          HP
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Cofianza</h1>
      </div>

      {/* Título */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Bienvenido</h2>
        <p className="text-gray-500 mt-1">Ingresa a tu cuenta para continuar</p>
      </div>

      {/* Error global del servidor */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error.message}</p>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={(e) => { e.preventDefault(); handleLogin() }} className="space-y-5">
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
              }}
              placeholder="correo@ejemplo.com"
              disabled={isLoading}
              autoComplete="email"
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

        {/* Campo Contraseña */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Contraseña
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
              }}
              placeholder="••••••••"
              disabled={isLoading}
              autoComplete="current-password"
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
        </div>

        {/* Link de recuperación */}
        <div className="flex justify-end">
          <Link
            href={AUTH_ROUTES.FORGOT_PASSWORD}
            className="text-sm text-primary-600 hover:text-primary-700 hover:underline transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </Link>
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
              Iniciando sesión...
            </>
          ) : (
            'Iniciar sesión'
          )}
        </button>
      </form>

      {/* Separador */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500">O continúa con</span>
        </div>
      </div>

      {/* Google Sign In */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading || isGoogleLoading}
        className={cn(
          'w-full py-2.5 px-4 rounded-lg font-medium text-sm',
          'bg-white border border-gray-300 text-gray-700',
          'hover:bg-gray-50 hover:border-gray-400',
          'focus:outline-hidden focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
          'transition-colors flex items-center justify-center gap-3',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isGoogleLoading ? (
          <>
            <IconLoader size={18} className="animate-spin" />
            Conectando...
          </>
        ) : (
          <>
            <IconGoogle size={18} />
            Continuar con Google
          </>
        )}
      </button>

      {/* Link de registro */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          ¿No tienes una cuenta?{' '}
          <Link
            href={AUTH_ROUTES.REGISTER}
            className="text-primary-600 hover:text-primary-700 font-medium hover:underline transition-colors"
          >
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}

/**
 * Fallback durante la carga de searchParams
 */
function LoginFallback() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full">
      <div className="flex items-center justify-center py-12">
        <IconLoader size={32} className="animate-spin text-primary-600" />
      </div>
    </div>
  )
}

/**
 * Página de Login con Suspense para useSearchParams
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}
