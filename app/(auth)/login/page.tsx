/**
 * Página de inicio de sesión
 * HP-57: Pantalla base de Login
 */

'use client'

import { useState, FormEvent } from 'react'
import { IconEye, IconEyeOff, IconMail, IconLock } from '@/components/icons'
import { cn } from '@/lib/utils'

interface FormErrors {
  email?: string
  password?: string
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!email.trim()) {
      newErrors.email = 'El correo electrónico es requerido'
    }

    if (!password.trim()) {
      newErrors.password = 'La contraseña es requerida'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    // Simular delay de autenticación (UI only)
    await new Promise(resolve => setTimeout(resolve, 1000))

    // En una implementación real, aquí iría la lógica de autenticación
    console.log('Login attempt:', { email, password })

    setIsSubmitting(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
      {/* Logo y título */}
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl mb-4">
          HP
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Habitar Propiedades</h1>
        <p className="text-gray-500 mt-1">Ingresa a tu cuenta</p>
      </div>

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
              }}
              placeholder="correo@ejemplo.com"
              className={cn(
                'block w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                'transition-colors',
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
              className={cn(
                'block w-full pl-10 pr-12 py-2.5 border rounded-lg text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                'transition-colors',
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
              {showPassword ? (
                <IconEyeOff size={18} />
              ) : (
                <IconEye size={18} />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'w-full py-2.5 px-4 rounded-lg text-white font-medium text-sm',
            'bg-primary-600 hover:bg-primary-700',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            'transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
      </form>

      {/* Link de recuperación */}
      <div className="mt-6 text-center">
        <a
          href="#"
          className="text-sm text-primary-600 hover:text-primary-700 hover:underline transition-colors"
        >
          ¿Olvidaste tu contraseña?
        </a>
      </div>
    </div>
  )
}
