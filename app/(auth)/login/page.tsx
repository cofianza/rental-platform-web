/**
 * Página de inicio de sesión (HP-95)
 * Login con email/contraseña + Google Sign In
 */

'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { IconEye, IconEyeOff, IconGoogle, IconLoader } from '@/components/icons'
import { cn, isValidEmail } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/authService'
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
  const [isResending, setIsResending] = useState(false)

  const handleResendVerification = async () => {
    if (!email || isResending) return
    setIsResending(true)
    try {
      await authService.resendVerification(email)
      toast.success('Enviamos un nuevo correo de verificación. Revisa tu bandeja.')
      clearError()
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'No pudimos reenviar el correo. Intenta en un momento.'
      toast.error(msg)
    } finally {
      setIsResending(false)
    }
  }

  /**
   * Calcula el destino post-login segun el contexto del usuario.
   * Prioridad: invitacion externa pendiente > intent vitrina > redirect query > dashboard.
   *
   * Importante: tanto el useEffect (caso "ya estaba autenticado") como el
   * handleLogin (caso "acaba de loguearse") usan este mismo destino — antes
   * habia divergencia y `useAuth.login()` hacia hard redirect a /dashboard
   * antes de que el useEffect pudiera correr.
   */
  const computePostLoginRedirect = (): string => {
    if (typeof window !== 'undefined') {
      const invitacionToken = sessionStorage.getItem('invitacion_token')
      if (invitacionToken) {
        sessionStorage.removeItem('invitacion_token')
        return `/invitacion/${invitacionToken}`
      }
    }
    const intent = searchParams.get('intent')
    const propertyId = searchParams.get('property_id')
    if (intent === 'interest' && propertyId) {
      // Mismo destino que el flujo registro+auto-login: vuelve al detalle del
      // inmueble con ?agendar=1 para que MeInteresaCTA abra el modal que crea
      // expediente + cita en un solo paso.
      return `/inmueble/${propertyId}?agendar=1`
    }
    return searchParams.get('redirect') || AUTH_ROUTES.DASHBOARD
  }

  // Redirigir si ya está autenticado (ej: navega a /login estando logueado)
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(computePostLoginRedirect())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    await login({ email, password }, computePostLoginRedirect())
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
    } finally {
      setIsGoogleLoading(false)
    }
  }

  // Si veniamos del flujo "Me interesa" (vitrina), preservamos query params
  // al apuntar a /registro para que el solicitante no pierda el inmueble.
  const registroHref = (() => {
    const intent = searchParams.get('intent')
    const propertyId = searchParams.get('property_id')
    if (intent === 'interest' && propertyId) {
      return `/registro/solicitante?intent=${encodeURIComponent(intent)}&property_id=${encodeURIComponent(propertyId)}`
    }
    return AUTH_ROUTES.REGISTER
  })()

  return (
    <div className="w-full">
      <p className="text-xs font-bold tracking-[3px] uppercase text-primary-600 mb-2">
        Bienvenido
      </p>
      <h2 className="text-[32px] font-black tracking-[-1.5px] leading-[1.1] text-slate-900 mb-2">
        Inicia sesión
      </h2>
      <p className="text-[15px] text-slate-500 leading-[1.6] mb-8">
        Accede a tu oficina virtual.
      </p>

      {/* Tabs Iniciar sesión / Crear cuenta. El segundo es un Link a /registro
          (mantenemos el flujo existente con selector + paginas dedicadas). */}
      <div className="grid grid-cols-2 bg-slate-50 rounded-xl p-1 mb-7">
        <button
          type="button"
          className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-900 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          aria-current="page"
        >
          Iniciar sesión
        </button>
        <Link
          href={registroHref}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold text-center text-slate-500 hover:text-slate-700 transition-colors"
        >
          Crear cuenta
        </Link>
      </div>

      {/* Error global. EMAIL_NOT_CONFIRMED tiene CTA de reenvio. */}
      {error && error.code === 'EMAIL_NOT_CONFIRMED' ? (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-300 rounded-xl">
          <p className="text-sm text-amber-900 mb-3">{error.message}</p>
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={!email || isResending}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending && <IconLoader size={14} className="animate-spin" />}
            {isResending ? 'Reenviando...' : 'Reenviar correo de verificación'}
          </button>
        </div>
      ) : error ? (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-600">{error.message}</p>
        </div>
      ) : null}

      <form onSubmit={(e) => { e.preventDefault(); handleLogin() }}>
        {/* Email */}
        <div className="mb-4">
          <label htmlFor="email" className="block text-[13px] font-semibold text-slate-900 mb-1.5">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (errors.email) setErrors({ ...errors, email: undefined })
            }}
            placeholder="tu@correo.com"
            disabled={isLoading}
            autoComplete="email"
            className={cn(
              'w-full px-3.5 py-3 border-[1.5px] rounded-[10px] text-[15px] text-slate-900 bg-white transition-all',
              'placeholder:text-slate-400',
              'focus:outline-none focus:border-primary-600 focus:ring-[3px] focus:ring-primary-600/10',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              errors.email ? 'border-red-500 bg-red-50' : 'border-slate-200',
            )}
          />
          {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
        </div>

        {/* Password */}
        <div className="mb-4">
          <label htmlFor="password" className="block text-[13px] font-semibold text-slate-900 mb-1.5">
            Contraseña
          </label>
          <div className="relative">
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
                'w-full pl-3.5 pr-11 py-3 border-[1.5px] rounded-[10px] text-[15px] text-slate-900 bg-white transition-all',
                'placeholder:text-slate-400',
                'focus:outline-none focus:border-primary-600 focus:ring-[3px] focus:ring-primary-600/10',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                errors.password ? 'border-red-500 bg-red-50' : 'border-slate-200',
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
          </div>
          {errors.password && <p className="mt-1.5 text-sm text-red-600">{errors.password}</p>}
        </div>

        {/* Recuérdame + olvidé contraseña */}
        <div className="flex justify-between items-center text-[13px] mb-5">
          <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-primary-600" />
            Recordarme
          </label>
          <Link
            href={AUTH_ROUTES.FORGOT_PASSWORD}
            className="text-primary-600 font-semibold hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {/* CTA primario coral */}
        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            'w-full py-3.5 rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2',
            'bg-coral-500 hover:bg-coral-600 hover:-translate-y-px transition-all',
            'shadow-[0_2px_16px_rgba(249,115,22,0.3)] hover:shadow-[0_4px_24px_rgba(249,115,22,0.4)]',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
          )}
        >
          {isLoading ? (
            <>
              <IconLoader size={18} className="animate-spin" />
              Iniciando sesión…
            </>
          ) : (
            <>
              Iniciar sesión
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3.5 my-6 text-[13px] text-slate-500">
        <div className="flex-1 h-px bg-slate-200" />
        o continúa con
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading || isGoogleLoading}
        className={cn(
          'w-full py-2.5 rounded-[10px] border-[1.5px] border-slate-200 bg-white',
          'text-sm font-semibold text-slate-900 flex items-center justify-center gap-2.5',
          'hover:border-slate-400 hover:bg-slate-50 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        {isGoogleLoading ? (
          <>
            <IconLoader size={18} className="animate-spin" />
            Conectando…
          </>
        ) : (
          <>
            <IconGoogle size={18} />
            Continuar con Google
          </>
        )}
      </button>

      {/* Footer */}
      <p className="text-[13px] text-slate-500 text-center leading-[1.6] mt-6">
        ¿No tienes cuenta?{' '}
        <Link href={registroHref} className="text-primary-600 font-semibold hover:underline">
          Crea una en segundos
        </Link>
      </p>
    </div>
  )
}

/**
 * Fallback durante la carga de searchParams
 */
function LoginFallback() {
  return (
    <div className="w-full flex items-center justify-center py-12">
      <IconLoader size={32} className="animate-spin text-primary-600" />
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
