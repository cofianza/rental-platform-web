'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  IconUser, IconMail, IconLock, IconMapPin, IconId,
  IconEye, IconEyeOff, IconArrowLeft, IconArrowRight, IconCheck, IconLoader, IconShield, IconBuilding2,
} from '@/components/icons'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { cn, isValidEmail } from '@/lib/utils'
import { authService } from '@/services/authService'
import { ApiClientError } from '@/lib/api'
import { AUTH_ROUTES } from '@/lib/constants'

interface FormData {
  razon_social: string
  // NIT separado en dos campos (mockup nueva propuesta UI, Mario 12-may-2026)
  // — al enviar se concatenan como "XXXXXXXXX-D" para mantener contrato API.
  nit_numero: string
  nit_dv: string
  direccion_comercial: string
  ciudad: string
  nombre_representante_nombre: string
  nombre_representante_apellido: string
  cargo_representante: string
  telefono: string
  email: string
  password: string
  confirm_password: string
  accept_terms: boolean
  accept_data_treatment: boolean
}

const initialFormData: FormData = {
  razon_social: '',
  nit_numero: '',
  nit_dv: '',
  direccion_comercial: '',
  ciudad: '',
  nombre_representante_nombre: '',
  nombre_representante_apellido: '',
  cargo_representante: '',
  telefono: '',
  email: '',
  password: '',
  confirm_password: '',
  accept_terms: false,
  accept_data_treatment: false,
}

/**
 * Valida el digito de verificacion del NIT colombiano con algoritmo modulo-11.
 */
function validateNitModulo11(nit: string): boolean {
  const match = nit.match(/^(\d{1,15})-(\d)$/)
  if (!match) return false

  const digits = match[1]
  const expectedCheck = parseInt(match[2], 10)

  const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]

  let sum = 0
  const reversed = digits.split('').reverse()
  for (let i = 0; i < reversed.length; i++) {
    sum += parseInt(reversed[i], 10) * weights[i]
  }

  const remainder = sum % 11
  const checkDigit = remainder >= 2 ? 11 - remainder : remainder

  return checkDigit === expectedCheck
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

export default function RegisterInmobiliariaPage() {
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

    // Datos de la inmobiliaria
    if (!formData.razon_social.trim()) newErrors.razon_social = 'Razón social requerida'
    const numero = formData.nit_numero.trim()
    const dv = formData.nit_dv.trim()
    if (!numero) {
      newErrors.nit_numero = 'Número de NIT requerido'
    } else if (!/^\d{1,15}$/.test(numero)) {
      newErrors.nit_numero = 'Sólo dígitos (máx 15)'
    }
    if (!dv) {
      newErrors.nit_dv = 'DV'
    } else if (!/^\d$/.test(dv)) {
      newErrors.nit_dv = 'Un dígito'
    } else if (numero && /^\d{1,15}$/.test(numero) && !validateNitModulo11(`${numero}-${dv}`)) {
      newErrors.nit_dv = 'DV inválido'
    }
    if (!formData.direccion_comercial.trim()) newErrors.direccion_comercial = 'Dirección comercial requerida'
    if (!formData.ciudad.trim()) newErrors.ciudad = 'Ciudad requerida'

    // Representante legal
    if (!formData.nombre_representante_nombre.trim()) newErrors.nombre_representante_nombre = 'Nombre del representante requerido'
    if (!formData.nombre_representante_apellido.trim()) newErrors.nombre_representante_apellido = 'Apellido del representante requerido'
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'Teléfono requerido'
    } else {
      const localDigits = formData.telefono.replace(/^\+[\d-]+\s*/, '').replace(/\D/g, '')
      if (localDigits.length !== 10) newErrors.telefono = 'El teléfono debe tener 10 dígitos'
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email requerido'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Email inválido'
    }

    // Acceso
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
      await authService.registerInmobiliaria({
        razon_social: formData.razon_social,
        nit: `${formData.nit_numero.trim()}-${formData.nit_dv.trim()}`,
        direccion_comercial: formData.direccion_comercial,
        ciudad: formData.ciudad,
        nombre_representante_nombre: formData.nombre_representante_nombre,
        nombre_representante_apellido: formData.nombre_representante_apellido,
        ...(formData.cargo_representante.trim()
          ? { cargo_representante: formData.cargo_representante.trim() }
          : {}),
        email: formData.email,
        telefono: formData.telefono,
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
        } else if (error.code === 'NIT_ALREADY_EXISTS') {
          setServerError('Ya existe una cuenta con este NIT.')
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
        Registro · Inmobiliaria
      </p>
      <h1 className="text-[28px] sm:text-[32px] font-black tracking-[-1.5px] leading-[1.1] text-slate-900 mb-2">
        Crea tu cuenta como Inmobiliaria
      </h1>
      <p className="text-[15px] text-slate-500 leading-[1.6] mb-6">
        Empresa o agencia que administra propiedades.{' '}
        <a href="/registro" className="text-primary-600 font-semibold hover:underline">
          ¿Otro tipo?
        </a>
      </p>

      {/* Banner: contrato marco con Cofianza (primer paso tras el registro). */}
      <div className="flex items-start gap-2.5 text-xs text-primary-800 bg-primary-50 border border-primary-200 p-3 rounded-lg mb-7">
        <IconShield size={16} className="text-primary-600 shrink-0 mt-0.5" />
        <span>
          <strong className="font-semibold">Registro empresarial:</strong> una vez creada tu cuenta, te
          contactaremos para firmar el <strong>contrato marco</strong> de vinculación y activar el panel
          de gestión. Hasta entonces tu cuenta queda pre-activa.
        </span>
      </div>

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
        {/* 1. Datos de la inmobiliaria */}
        <FormSection num={1} title="Datos de la inmobiliaria">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Razón social</label>
            <div className="relative">
              <IconBuilding2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" value={formData.razon_social}
                onChange={(e) => updateField('razon_social', e.target.value)}
                className={inputCls(!!errors.razon_social)}
                placeholder="Nombre de la empresa"
              />
            </div>
            {errors.razon_social && <p className="mt-1.5 text-sm text-red-600">{errors.razon_social}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
            <div className="flex items-stretch gap-2">
              <div className="relative flex-1">
                <IconId size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.nit_numero}
                  onChange={(e) => updateField('nit_numero', e.target.value.replace(/\D/g, '').slice(0, 15))}
                  className={inputCls(!!errors.nit_numero)}
                  placeholder="900123456"
                />
              </div>
              <span className="self-center text-gray-400 font-bold">−</span>
              <div className="w-20">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.nit_dv}
                  onChange={(e) => updateField('nit_dv', e.target.value.replace(/\D/g, '').slice(0, 1))}
                  className={cn(
                    'w-full px-3 py-2.5 border rounded-lg text-sm font-bold text-center focus:outline-hidden focus:ring-2 focus:ring-primary-500',
                    errors.nit_dv ? 'border-red-500' : 'border-gray-300',
                  )}
                  placeholder="DV"
                  maxLength={1}
                  aria-label="Dígito de verificación"
                />
              </div>
            </div>
            {(errors.nit_numero || errors.nit_dv) && (
              <p className="mt-1.5 text-sm text-red-600">{errors.nit_numero || errors.nit_dv}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              Número (sin puntos) y dígito de verificación. Ejemplo: 900123456 - 9
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección comercial</label>
            <div className="relative">
              <IconMapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" value={formData.direccion_comercial}
                onChange={(e) => updateField('direccion_comercial', e.target.value)}
                className={inputCls(!!errors.direccion_comercial)}
                placeholder="Dirección de la sede principal"
              />
            </div>
            {errors.direccion_comercial && <p className="mt-1.5 text-sm text-red-600">{errors.direccion_comercial}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
            <div className="relative">
              <IconMapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" value={formData.ciudad}
                onChange={(e) => updateField('ciudad', e.target.value)}
                className={inputCls(!!errors.ciudad)}
                placeholder="Ciudad"
              />
            </div>
            {errors.ciudad && <p className="mt-1.5 text-sm text-red-600">{errors.ciudad}</p>}
          </div>
        </FormSection>

        {/* 2. Datos del representante legal */}
        <FormSection num={2} title="Datos del representante legal">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del representante</label>
              <div className="relative">
                <IconUser size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" value={formData.nombre_representante_nombre}
                  onChange={(e) => updateField('nombre_representante_nombre', e.target.value)}
                  className={inputCls(!!errors.nombre_representante_nombre)}
                  placeholder="Nombre"
                />
              </div>
              {errors.nombre_representante_nombre && <p className="mt-1.5 text-sm text-red-600">{errors.nombre_representante_nombre}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido del representante</label>
              <div className="relative">
                <IconUser size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" value={formData.nombre_representante_apellido}
                  onChange={(e) => updateField('nombre_representante_apellido', e.target.value)}
                  className={inputCls(!!errors.nombre_representante_apellido)}
                  placeholder="Apellido"
                />
              </div>
              {errors.nombre_representante_apellido && <p className="mt-1.5 text-sm text-red-600">{errors.nombre_representante_apellido}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cargo del representante <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <div className="relative">
              <IconShield size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={formData.cargo_representante}
                onChange={(e) => updateField('cargo_representante', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                placeholder="Ej: Representante Legal, Gerente, Director Comercial"
                maxLength={100}
              />
            </div>
          </div>

          <PhoneInput
            label="Teléfono de contacto"
            value={formData.telefono}
            onChange={(v) => updateField('telefono', v)}
            error={errors.telefono}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email corporativo</label>
            <div className="relative">
              <IconMail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email" value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={inputCls(!!errors.email)}
                placeholder="contacto@empresa.com"
              />
            </div>
            {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
          </div>
        </FormSection>

        {/* 3. Acceso a la plataforma */}
        <FormSection num={3} title="Acceso a la plataforma">
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

          <label className={cn('flex items-start gap-3 cursor-pointer p-3 border rounded-lg transition-colors', errors.accept_terms ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:bg-gray-50')}>
            <input
              type="checkbox"
              checked={formData.accept_terms}
              onChange={(e) => updateField('accept_terms', e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <span className="text-sm text-gray-700">
                Como representante legal, acepto los{' '}
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
                  tratamiento de los datos personales
                </Link>{' '}
                conforme a la Ley 1581 de 2012, y declaro que la información suministrada es veraz
              </span>
              {errors.accept_data_treatment && <p className="mt-1 text-xs text-red-600">{errors.accept_data_treatment}</p>}
            </div>
          </label>
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
                Crear cuenta empresarial
                <IconArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
