'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  IconUser, IconMail, IconLock, IconPhone, IconMapPin, IconId,
  IconEye, IconEyeOff, IconArrowLeft, IconArrowRight, IconCheck, IconLoader, IconShield, IconBuilding2,
} from '@/components/icons'
import { cn, isValidEmail } from '@/lib/utils'
import { authService } from '@/services/authService'
import { ApiClientError } from '@/lib/api'
import { AUTH_ROUTES } from '@/lib/constants'

interface FormData {
  razon_social: string
  nit: string
  direccion_comercial: string
  ciudad: string
  nombre_representante_nombre: string
  nombre_representante_apellido: string
  telefono: string
  email: string
  password: string
  confirm_password: string
  accept_terms: boolean
  accept_data_treatment: boolean
}

const initialFormData: FormData = {
  razon_social: '',
  nit: '',
  direccion_comercial: '',
  ciudad: '',
  nombre_representante_nombre: '',
  nombre_representante_apellido: '',
  telefono: '',
  email: '',
  password: '',
  confirm_password: '',
  accept_terms: false,
  accept_data_treatment: false,
}

const STEP_LABELS = ['Datos Empresa', 'Representante', 'Terminos']

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

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1
        const isCompleted = stepNum < currentStep
        const isCurrent = stepNum === currentStep
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <div className={cn('w-8 h-0.5', isCompleted ? 'bg-green-500' : 'bg-gray-200')} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  isCompleted && 'bg-green-500 text-white',
                  isCurrent && 'bg-primary-600 text-white',
                  !isCompleted && !isCurrent && 'bg-gray-200 text-gray-500'
                )}
              >
                {isCompleted ? <IconCheck size={16} /> : stepNum}
              </div>
              <span className={cn('text-xs', isCurrent ? 'text-primary-600 font-medium' : 'text-gray-400')}>
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PasswordRequirements({ password }: { password: string }) {
  const checks = [
    { label: 'Al menos 8 caracteres', met: password.length >= 8 },
    { label: 'Una letra mayuscula', met: /[A-Z]/.test(password) },
    { label: 'Una letra minuscula', met: /[a-z]/.test(password) },
    { label: 'Un numero', met: /\d/.test(password) },
  ]

  return (
    <div className="mt-2 space-y-1">
      {checks.map((check) => (
        <div key={check.label} className="flex items-center gap-2">
          <IconCheck
            size={14}
            className={check.met ? 'text-green-500' : 'text-gray-300'}
          />
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
  const [step, setStep] = useState(1)
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

  const validateStep = (stepNum: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (stepNum === 1) {
      if (!formData.razon_social.trim()) newErrors.razon_social = 'Razon social requerida'
      if (!formData.nit.trim()) {
        newErrors.nit = 'NIT requerido'
      } else if (!/^\d{1,15}-\d$/.test(formData.nit)) {
        newErrors.nit = 'Formato invalido. Ejemplo: 900123456-9'
      } else if (!validateNitModulo11(formData.nit)) {
        newErrors.nit = 'Digito de verificacion del NIT invalido'
      }
      if (!formData.direccion_comercial.trim()) newErrors.direccion_comercial = 'Direccion comercial requerida'
      if (!formData.ciudad.trim()) newErrors.ciudad = 'Ciudad requerida'
    }

    if (stepNum === 2) {
      if (!formData.nombre_representante_nombre.trim()) newErrors.nombre_representante_nombre = 'Nombre del representante requerido'
      if (!formData.nombre_representante_apellido.trim()) newErrors.nombre_representante_apellido = 'Apellido del representante requerido'
      if (!formData.telefono.trim()) {
        newErrors.telefono = 'Telefono requerido'
      } else if (!/^\+57\s?3\d{9}$/.test(formData.telefono)) {
        newErrors.telefono = 'Formato: +57 3XXXXXXXXX'
      }
      if (!formData.email.trim()) {
        newErrors.email = 'Email requerido'
      } else if (!isValidEmail(formData.email)) {
        newErrors.email = 'Email invalido'
      }
      if (!formData.password) {
        newErrors.password = 'Contrasena requerida'
      } else if (formData.password.length < 8 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        newErrors.password = 'La contrasena no cumple los requisitos'
      }
      if (!formData.confirm_password) {
        newErrors.confirm_password = 'Confirma tu contrasena'
      } else if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Las contrasenas no coinciden'
      }
    }

    if (stepNum === 3) {
      if (!formData.accept_terms) newErrors.accept_terms = 'Debes aceptar los terminos y condiciones'
      if (!formData.accept_data_treatment) newErrors.accept_data_treatment = 'Debes autorizar el tratamiento de datos'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) setStep(step + 1)
  }

  const handleSubmit = async () => {
    if (!validateStep(3)) return

    setIsLoading(true)
    setServerError(null)

    try {
      await authService.registerInmobiliaria({
        razon_social: formData.razon_social,
        nit: formData.nit,
        direccion_comercial: formData.direccion_comercial,
        ciudad: formData.ciudad,
        nombre_representante_nombre: formData.nombre_representante_nombre,
        nombre_representante_apellido: formData.nombre_representante_apellido,
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

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full">
      {/* Logo mobile */}
      <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary-700 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">HP</span>
        </div>
        <span className="text-xl font-semibold text-primary-700">Habitar Propiedades</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">
        Registro Inmobiliaria
      </h1>
      <p className="text-gray-500 text-center text-sm mb-6">Persona juridica</p>

      <StepIndicator currentStep={step} />

      {serverError && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{serverError}</p>
        </div>
      )}

      {/* Step 1: Datos Empresa */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Razon social</label>
            <div className="relative">
              <IconBuilding2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" value={formData.razon_social}
                onChange={(e) => updateField('razon_social', e.target.value)}
                className={cn('w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500', errors.razon_social ? 'border-red-500' : 'border-gray-300')}
                placeholder="Nombre de la empresa"
              />
            </div>
            {errors.razon_social && <p className="mt-1.5 text-sm text-red-600">{errors.razon_social}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
            <div className="relative">
              <IconId size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" value={formData.nit}
                onChange={(e) => updateField('nit', e.target.value)}
                className={cn('w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500', errors.nit ? 'border-red-500' : 'border-gray-300')}
                placeholder="XXXXXXXXX-D"
              />
            </div>
            {errors.nit && <p className="mt-1.5 text-sm text-red-600">{errors.nit}</p>}
            <p className="mt-1 text-xs text-gray-400">Ejemplo: 900123456-9 (9 digitos, guion, digito de verificacion)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Direccion comercial</label>
            <div className="relative">
              <IconMapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" value={formData.direccion_comercial}
                onChange={(e) => updateField('direccion_comercial', e.target.value)}
                className={cn('w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500', errors.direccion_comercial ? 'border-red-500' : 'border-gray-300')}
                placeholder="Direccion de la sede principal"
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
                className={cn('w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500', errors.ciudad ? 'border-red-500' : 'border-gray-300')}
                placeholder="Ciudad"
              />
            </div>
            {errors.ciudad && <p className="mt-1.5 text-sm text-red-600">{errors.ciudad}</p>}
          </div>
        </div>
      )}

      {/* Step 2: Representante y Credenciales */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del representante</label>
              <div className="relative">
                <IconUser size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" value={formData.nombre_representante_nombre}
                  onChange={(e) => updateField('nombre_representante_nombre', e.target.value)}
                  className={cn('w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500', errors.nombre_representante_nombre ? 'border-red-500' : 'border-gray-300')}
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
                  className={cn('w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500', errors.nombre_representante_apellido ? 'border-red-500' : 'border-gray-300')}
                  placeholder="Apellido"
                />
              </div>
              {errors.nombre_representante_apellido && <p className="mt-1.5 text-sm text-red-600">{errors.nombre_representante_apellido}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefono de contacto</label>
            <div className="relative">
              <IconPhone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel" value={formData.telefono}
                onChange={(e) => updateField('telefono', e.target.value)}
                className={cn('w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500', errors.telefono ? 'border-red-500' : 'border-gray-300')}
                placeholder="+57 3XXXXXXXXX"
              />
            </div>
            {errors.telefono && <p className="mt-1.5 text-sm text-red-600">{errors.telefono}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email corporativo</label>
            <div className="relative">
              <IconMail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email" value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={cn('w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500', errors.email ? 'border-red-500' : 'border-gray-300')}
                placeholder="contacto@empresa.com"
              />
            </div>
            {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
            <div className="relative">
              <IconLock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
                className={cn('w-full pl-10 pr-12 py-2.5 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500', errors.password ? 'border-red-500' : 'border-gray-300')}
                placeholder="Minimo 8 caracteres"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-sm text-red-600">{errors.password}</p>}
            <PasswordRequirements password={formData.password} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contrasena</label>
            <div className="relative">
              <IconLock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={formData.confirm_password}
                onChange={(e) => updateField('confirm_password', e.target.value)}
                className={cn('w-full pl-10 pr-12 py-2.5 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500', errors.confirm_password ? 'border-red-500' : 'border-gray-300')}
                placeholder="Repite tu contrasena"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
            {errors.confirm_password && <p className="mt-1.5 text-sm text-red-600">{errors.confirm_password}</p>}
          </div>
        </div>
      )}

      {/* Step 3: Terminos */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-600">
            <p className="font-medium text-gray-900">Resumen de tu registro:</p>
            <p><span className="font-medium">Empresa:</span> {formData.razon_social}</p>
            <p><span className="font-medium">NIT:</span> {formData.nit}</p>
            <p><span className="font-medium">Direccion:</span> {formData.direccion_comercial}, {formData.ciudad}</p>
            <p><span className="font-medium">Representante:</span> {formData.nombre_representante_nombre} {formData.nombre_representante_apellido}</p>
            <p><span className="font-medium">Email:</span> {formData.email}</p>
            <p><span className="font-medium">Telefono:</span> {formData.telefono}</p>
          </div>

          <div className="space-y-4">
            <label className={cn('flex items-start gap-3 cursor-pointer p-3 border rounded-lg transition-colors', errors.accept_terms ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:bg-gray-50')}>
              <input
                type="checkbox"
                checked={formData.accept_terms}
                onChange={(e) => updateField('accept_terms', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <span className="text-sm text-gray-700">
                  Acepto los <span className="text-primary-600 font-medium">terminos y condiciones</span> del servicio
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
                  Autorizo el <span className="text-primary-600 font-medium">tratamiento de mis datos personales</span> conforme a la Ley 1581 de 2012
                </span>
                {errors.accept_data_treatment && <p className="mt-1 text-xs text-red-600">{errors.accept_data_treatment}</p>}
              </div>
            </label>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
            <IconShield size={16} className="text-blue-500 shrink-0" />
            <span>Tus datos estan protegidos conforme a la legislacion colombiana de proteccion de datos personales.</span>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between mt-8">
        {step > 1 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <IconArrowLeft size={16} /> Anterior
          </button>
        ) : (
          <Link
            href={AUTH_ROUTES.REGISTER}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <IconArrowLeft size={16} /> Volver
          </Link>
        )}

        {step < 3 ? (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Siguiente <IconArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <IconLoader size={16} className="animate-spin" /> Registrando...
              </>
            ) : (
              'Registrarme'
            )}
          </button>
        )}
      </div>
    </div>
  )
}
