'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  IconUser, IconMail, IconLock, IconMapPin, IconId,
  IconEye, IconEyeOff, IconArrowLeft, IconArrowRight, IconCheck, IconLoader, IconShield,
} from '@/components/icons'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { cn, isValidEmail } from '@/lib/utils'
import { authService } from '@/services/authService'
import { ApiClientError } from '@/lib/api'
import { AUTH_ROUTES } from '@/lib/constants'

interface FormData {
  nombre: string
  apellido: string
  tipo_documento: string
  numero_documento: string
  telefono: string
  direccion: string
  email: string
  password: string
  confirm_password: string
  accept_terms: boolean
  accept_data_treatment: boolean
}

const initialFormData: FormData = {
  nombre: '',
  apellido: '',
  tipo_documento: '',
  numero_documento: '',
  telefono: '',
  direccion: '',
  email: '',
  password: '',
  confirm_password: '',
  accept_terms: false,
  accept_data_treatment: false,
}

// Encabezado de sección numerado (estilo mockup htmls/02_*).
function FormSection({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-[11px] font-bold text-white">
          {num}
        </span>
        <span className="text-[13px] font-bold uppercase tracking-[2px] text-primary-700">{title}</span>
      </div>
      {children}
    </div>
  )
}

function PasswordRequirements({ password }: { password: string }) {
  const checks = [
    { label: 'Al menos 8 caracteres', met: password.length >= 8 },
    { label: 'Una letra mayúscula', met: /[A-Z]/.test(password) },
    { label: 'Una letra minúscula', met: /[a-z]/.test(password) },
    { label: 'Un número', met: /\d/.test(password) },
  ]

  return (
    <div className="mt-2 space-y-1">
      {checks.map((check) => (
        <div key={check.label} className="flex items-center gap-2">
          <IconCheck size={14} className={check.met ? 'text-green-500' : 'text-gray-300'} />
          <span className={cn('text-xs', check.met ? 'text-green-600' : 'text-gray-400')}>
            {check.label}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function RegisterPropietarioPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
    setServerError(null)
  }

  // Valida TODOS los campos de una vez (sin pasos).
  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.nombre.trim()) newErrors.nombre = 'Nombre requerido'
    if (!formData.apellido.trim()) newErrors.apellido = 'Apellido requerido'
    if (!formData.tipo_documento) newErrors.tipo_documento = 'Selecciona un tipo de documento'
    if (!formData.numero_documento.trim()) newErrors.numero_documento = 'Número de documento requerido'
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'Teléfono requerido'
    } else {
      const localDigits = formData.telefono.replace(/^\+[\d-]+\s*/, '').replace(/\D/g, '')
      if (localDigits.length !== 10) newErrors.telefono = 'El teléfono debe tener 10 dígitos'
    }
    if (!formData.direccion.trim()) newErrors.direccion = 'Dirección requerida'

    if (!formData.email.trim()) {
      newErrors.email = 'Email requerido'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Email inválido'
    }
    if (!formData.password) {
      newErrors.password = 'Contraseña requerida'
    } else if (formData.password.length < 8 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'La contraseña no cumple los requisitos'
    }
    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Confirma tu contraseña'
    } else if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Las contraseñas no coinciden'
    }

    if (!formData.accept_terms) newErrors.accept_terms = 'Debes aceptar los términos y condiciones'
    if (!formData.accept_data_treatment) newErrors.accept_data_treatment = 'Debes autorizar el tratamiento de datos'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateAll()) return

    setIsLoading(true)
    setServerError(null)

    try {
      await authService.registerPropietario({
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        telefono: formData.telefono,
        tipo_documento: formData.tipo_documento,
        numero_documento: formData.numero_documento,
        direccion: formData.direccion,
        password: formData.password,
        confirm_password: formData.confirm_password,
        accept_terms: true,
        accept_data_treatment: true,
      })
      router.push(`${AUTH_ROUTES.REGISTER_SUCCESS}?email=${encodeURIComponent(formData.email)}`)
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.code === 'EMAIL_ALREADY_EXISTS') {
          setServerError('Ya existe una cuenta con este email.')
        } else {
          setServerError(error.message)
        }
      } else {
        setServerError('Error en el servidor. Intenta de nuevo mas tarde.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const inputCls = (hasError?: boolean) =>
    cn(
      'w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500',
      hasError ? 'border-red-500' : 'border-gray-300',
    )

  return (
    <div className="w-full">
      <p className="text-xs font-bold tracking-[3px] uppercase text-primary-600 mb-2">
        Registro · Propietario
      </p>
      <h1 className="text-[28px] sm:text-[32px] font-black tracking-[-1.5px] leading-[1.1] text-slate-900 mb-2">
        Crea tu cuenta como Propietario
      </h1>
      <p className="text-[15px] text-slate-500 leading-[1.6] mb-8">
        Persona natural que administra sus propiedades.{' '}
        <a href="/registro" className="text-primary-600 font-semibold hover:underline">
          ¿Otro tipo?
        </a>
      </p>

      {serverError && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{serverError}</p>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
        className="space-y-7"
      >
        {/* 1. Datos personales */}
        <FormSection num={1} title="Datos personales">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <div className="relative">
                <IconUser size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" value={formData.nombre}
                  onChange={(e) => updateField('nombre', e.target.value)}
                  className={inputCls(!!errors.nombre)}
                  placeholder="Tu nombre"
                />
              </div>
              {errors.nombre && <p className="mt-1.5 text-sm text-red-600">{errors.nombre}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
              <div className="relative">
                <IconUser size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" value={formData.apellido}
                  onChange={(e) => updateField('apellido', e.target.value)}
                  className={inputCls(!!errors.apellido)}
                  placeholder="Tu apellido"
                />
              </div>
              {errors.apellido && <p className="mt-1.5 text-sm text-red-600">{errors.apellido}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento</label>
              <div className="relative">
                <IconId size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={formData.tipo_documento}
                  onChange={(e) => updateField('tipo_documento', e.target.value)}
                  className={cn('w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 bg-white', errors.tipo_documento ? 'border-red-500' : 'border-gray-300')}
                >
                  <option value="">Seleccionar...</option>
                  <option value="cc">Cédula de Ciudadanía</option>
                  <option value="ce">Cédula de Extranjería</option>
                  <option value="pasaporte">Pasaporte</option>
                </select>
              </div>
              {errors.tipo_documento && <p className="mt-1.5 text-sm text-red-600">{errors.tipo_documento}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de documento</label>
              <div className="relative">
                <IconId size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" value={formData.numero_documento}
                  onChange={(e) => updateField('numero_documento', e.target.value)}
                  className={inputCls(!!errors.numero_documento)}
                  placeholder="Número de documento"
                />
              </div>
              {errors.numero_documento && <p className="mt-1.5 text-sm text-red-600">{errors.numero_documento}</p>}
            </div>
          </div>

          <PhoneInput
            label="Teléfono celular"
            value={formData.telefono}
            onChange={(v) => updateField('telefono', v)}
            error={errors.telefono}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de residencia</label>
            <div className="relative">
              <IconMapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" value={formData.direccion}
                onChange={(e) => updateField('direccion', e.target.value)}
                className={inputCls(!!errors.direccion)}
                placeholder="Tu dirección"
              />
            </div>
            {errors.direccion && <p className="mt-1.5 text-sm text-red-600">{errors.direccion}</p>}
          </div>
        </FormSection>

        {/* 2. Acceso a la plataforma */}
        <FormSection num={2} title="Acceso a la plataforma">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <IconMail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email" value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={inputCls(!!errors.email)}
                placeholder="tu@email.com"
              />
            </div>
            {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <IconLock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
                className={cn('w-full pl-10 pr-12 py-2.5 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500', errors.password ? 'border-red-500' : 'border-gray-300')}
                placeholder="Mínimo 8 caracteres"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-sm text-red-600">{errors.password}</p>}
            <PasswordRequirements password={formData.password} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
            <div className="relative">
              <IconLock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={formData.confirm_password}
                onChange={(e) => updateField('confirm_password', e.target.value)}
                className={cn('w-full pl-10 pr-12 py-2.5 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500', errors.confirm_password ? 'border-red-500' : 'border-gray-300')}
                placeholder="Repite tu contraseña"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
            {errors.confirm_password && <p className="mt-1.5 text-sm text-red-600">{errors.confirm_password}</p>}
          </div>
        </FormSection>

        {/* 3. Términos */}
        <FormSection num={3} title="Términos">
          <label className={cn('flex items-start gap-3 cursor-pointer p-3 border rounded-lg transition-colors', errors.accept_terms ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:bg-gray-50')}>
            <input
              type="checkbox"
              checked={formData.accept_terms}
              onChange={(e) => updateField('accept_terms', e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <span className="text-sm text-gray-700">
                Acepto los{' '}
                <Link href="/terminos" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary-600 font-medium underline hover:text-primary-700">
                  términos y condiciones
                </Link>{' '}
                del servicio
              </span>
              {errors.accept_terms && <p className="mt-1 text-xs text-red-600">{errors.accept_terms}</p>}
            </div>
          </label>

          <label className={cn('flex items-start gap-3 cursor-pointer p-3 border rounded-lg transition-colors', errors.accept_data_treatment ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:bg-gray-50')}>
            <input
              type="checkbox"
              checked={formData.accept_data_treatment}
              onChange={(e) => updateField('accept_data_treatment', e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <span className="text-sm text-gray-700">
                Autorizo el{' '}
                <Link href="/privacidad" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary-600 font-medium underline hover:text-primary-700">
                  tratamiento de mis datos personales
                </Link>{' '}
                conforme a la Ley 1581 de 2012
              </span>
              {errors.accept_data_treatment && <p className="mt-1 text-xs text-red-600">{errors.accept_data_treatment}</p>}
            </div>
          </label>

          <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
            <IconShield size={16} className="text-blue-500 shrink-0" />
            <span>Tus datos estan protegidos conforme a la legislacion colombiana de proteccion de datos personales.</span>
          </div>
        </FormSection>

        {/* Acciones */}
        <div className="flex items-center justify-between pt-1">
          <Link
            href={AUTH_ROUTES.REGISTER}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <IconArrowLeft size={16} /> Volver
          </Link>

          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-coral-500 text-white text-sm font-bold rounded-xl hover:bg-coral-600 hover:-translate-y-px transition-all shadow-[0_2px_16px_rgba(249,115,22,0.3)] hover:shadow-[0_4px_24px_rgba(249,115,22,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isLoading ? (
              <>
                <IconLoader size={16} className="animate-spin" /> Registrando...
              </>
            ) : (
              <>
                Crear mi cuenta
                <IconArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
