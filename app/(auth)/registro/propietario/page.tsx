'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  IconUser, IconMail, IconLock, IconId,
  IconEye, IconEyeOff, IconArrowRight, IconLoader, IconShield,
  IconAlertTriangle,
} from '@/components/icons'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { cn, isValidEmail } from '@/lib/utils'
import { authService } from '@/services/authService'
import { ApiClientError } from '@/lib/api'
import { AUTH_ROUTES } from '@/lib/constants'
import {
  RegistroStepper, RegistroTipoTabs, FormSection, PasswordRequirements,
  regInputCls, regSelectCls, ValidCheck, scrollToFirstError,
} from '@/components/auth/registro-ui'

interface FormData {
  nombre: string
  apellido: string
  tipo_documento: string
  numero_documento: string
  telefono: string
  email: string
  password: string
  confirm_password: string
  origen: string
  accept_terms: boolean
  accept_data_treatment: boolean
}

const initialFormData: FormData = {
  nombre: '',
  apellido: '',
  tipo_documento: '',
  numero_documento: '',
  telefono: '',
  email: '',
  password: '',
  confirm_password: '',
  origen: '',
  accept_terms: false,
  accept_data_treatment: false,
}

export default function RegisterPropietarioPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

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
    if (!formData.tipo_documento) newErrors.tipo_documento = 'Seleccione un tipo de documento'
    if (!formData.numero_documento.trim()) newErrors.numero_documento = 'Número de documento requerido'
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'Celular requerido'
    } else {
      const localDigits = formData.telefono.replace(/^\+[\d-]+\s*/, '').replace(/\D/g, '')
      if (localDigits.length !== 10) newErrors.telefono = 'El celular debe tener 10 dígitos'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Correo requerido'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Correo inválido'
    }
    if (!formData.password) {
      newErrors.password = 'Contraseña requerida'
    } else if (formData.password.length < 8 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'La contraseña no cumple los requisitos'
    }
    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Confirme su contraseña'
    } else if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Las contraseñas no coinciden'
    }

    if (!formData.accept_terms) newErrors.accept_terms = 'Debe aceptar los términos y condiciones'
    if (!formData.accept_data_treatment) newErrors.accept_data_treatment = 'Debe autorizar el tratamiento de datos'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateAll()) {
      scrollToFirstError(formRef.current)
      return
    }

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
        password: formData.password,
        confirm_password: formData.confirm_password,
        ...(formData.origen ? { origen: formData.origen } : {}),
        accept_terms: true,
        accept_data_treatment: true,
      })
      router.push(`${AUTH_ROUTES.REGISTER_SUCCESS}?email=${encodeURIComponent(formData.email)}`)
    } catch (error) {
      const mensaje = !(error instanceof ApiClientError)
        ? 'Error en el servidor. Intente de nuevo más tarde.'
        : error.code === 'EMAIL_ALREADY_EXISTS'
          ? 'Ya existe una cuenta con este correo.'
          : error.message
      setServerError(mensaje)
      // 400 de validación: el API dice qué campo falló; se marca en el formulario
      // (solo los campos que existen aquí, para no anunciar errores que no se ven).
      const marcados = (error instanceof ApiClientError ? error.details ?? [] : [])
        .filter((d) => d.field in formData)
      if (marcados.length) {
        setErrors(Object.fromEntries(marcados.map((d) => [d.field, d.message])))
        window.setTimeout(() => scrollToFirstError(formRef.current), 0)
      } else {
        // El aviso queda arriba, fuera de pantalla: el botón de envío está al fondo.
        toast.error(mensaje)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const inputCls = (hasError?: boolean, valid?: boolean, rightIcon?: boolean) =>
    regInputCls({ error: hasError, valid, rightIcon })

  // Validez en vivo (check verde + stepper de progreso).
  const emailValido = !!formData.email.trim() && isValidEmail(formData.email)
  const telValido = formData.telefono.replace(/^\+[\d-]+\s*/, '').replace(/\D/g, '').length === 10
  const passwordValida =
    formData.password.length >= 8 &&
    /[A-Z]/.test(formData.password) &&
    /[a-z]/.test(formData.password) &&
    /\d/.test(formData.password)

  const pasos = [
    {
      label: 'Datos personales',
      done:
        !!formData.nombre.trim() && !!formData.apellido.trim() && !!formData.tipo_documento &&
        !!formData.numero_documento.trim() && telValido,
    },
    {
      label: 'Acceso',
      done: emailValido && passwordValida && formData.password === formData.confirm_password && !!formData.confirm_password,
    },
    {
      label: 'Términos',
      done: formData.accept_terms && formData.accept_data_treatment,
    },
  ]
  const hayErrores = Object.keys(errors).length > 0

  return (
    <div className="w-full">
      <p className="text-xs font-bold tracking-[3px] uppercase text-primary-600 mb-2">
        Nuevo usuario
      </p>
      <h1 className="text-[28px] sm:text-[32px] font-black tracking-[-1.5px] leading-[1.1] text-slate-900 mb-2">
        Registre su cuenta
      </h1>
      <p className="text-[15px] text-slate-500 leading-[1.6] mb-8">
        Como propietario, podrá conectar su inmueble con Cofianza como su fiador.
      </p>

      <RegistroTipoTabs activo="propietario" />

      <RegistroStepper steps={pasos} />

      {serverError && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{serverError}</p>
        </div>
      )}

      {hayErrores && !serverError && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <IconAlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">
            Faltan datos o hay campos con error. Revise los marcados en rojo abajo.
          </p>
        </div>
      )}

      <form
        ref={formRef}
        noValidate
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
              <label htmlFor="propietario-nombre" className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <div className="relative">
                <IconUser size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input id="propietario-nombre"
                  type="text" value={formData.nombre}
                  onChange={(e) => updateField('nombre', e.target.value)}
                  className={inputCls(!!errors.nombre)}
                  placeholder="Roberto"
                  autoComplete="given-name"
                  aria-invalid={!!errors.nombre}
                />
              </div>
              {errors.nombre && <p className="mt-1.5 text-sm text-red-600">{errors.nombre}</p>}
            </div>
            <div>
              <label htmlFor="propietario-apellido" className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
              <div className="relative">
                <IconUser size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input id="propietario-apellido"
                  type="text" value={formData.apellido}
                  onChange={(e) => updateField('apellido', e.target.value)}
                  className={inputCls(!!errors.apellido)}
                  placeholder="Henao"
                  autoComplete="family-name"
                  aria-invalid={!!errors.apellido}
                />
              </div>
              {errors.apellido && <p className="mt-1.5 text-sm text-red-600">{errors.apellido}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="propietario-tipo-de-documento" className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento</label>
              <div className="relative">
                <IconId size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <select id="propietario-tipo-de-documento"
                  value={formData.tipo_documento}
                  onChange={(e) => updateField('tipo_documento', e.target.value)}
                  className={regSelectCls({ error: !!errors.tipo_documento, icon: true })}
                  aria-invalid={!!errors.tipo_documento}
                >
                  <option value="">Seleccione</option>
                  <option value="cc">Cédula de Ciudadanía</option>
                  <option value="ce">Cédula de Extranjería</option>
                  <option value="pasaporte">Pasaporte</option>
                </select>
              </div>
              {errors.tipo_documento && <p className="mt-1.5 text-sm text-red-600">{errors.tipo_documento}</p>}
            </div>
            <div>
              <label htmlFor="propietario-numero-de-documento" className="block text-sm font-medium text-gray-700 mb-1">Número de documento</label>
              <div className="relative">
                <IconId size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input id="propietario-numero-de-documento"
                  type="text" value={formData.numero_documento}
                  onChange={(e) => updateField('numero_documento', e.target.value)}
                  className={inputCls(!!errors.numero_documento)}
                  placeholder="1.040.567.890"
                  inputMode="numeric"
                  aria-invalid={!!errors.numero_documento}
                />
              </div>
              {errors.numero_documento && <p className="mt-1.5 text-sm text-red-600">{errors.numero_documento}</p>}
            </div>
          </div>

          <PhoneInput
            label="Celular (WhatsApp)"
            value={formData.telefono}
            onChange={(v) => updateField('telefono', v)}
            error={errors.telefono}
          />
        </FormSection>

        {/* 2. Acceso a la plataforma */}
        <FormSection num={2} title="Acceso a la plataforma">
          <div>
            <label htmlFor="propietario-email" className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <div className="relative">
              <IconMail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input id="propietario-email"
                type="email" value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={inputCls(!!errors.email, emailValido && !errors.email, emailValido && !errors.email)}
                placeholder="nombre@correo.com"
                autoComplete="email"
                inputMode="email"
                aria-invalid={!!errors.email}
              />
              <ValidCheck show={emailValido && !errors.email} />
            </div>
            {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="propietario-contrasena" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <IconLock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input id="propietario-contrasena"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className={cn('w-full pl-10 pr-12 py-2.5 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500', errors.password ? 'border-red-500' : passwordValida ? 'border-green-400' : 'border-gray-300')}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600">
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-sm text-red-600">{errors.password}</p>}
              <PasswordRequirements password={formData.password} />
            </div>

            <div>
              <label htmlFor="propietario-confirmar-contrasena" className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
              <div className="relative">
                <IconLock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input id="propietario-confirmar-contrasena"
                  type={showConfirm ? 'text' : 'password'}
                  value={formData.confirm_password}
                  onChange={(e) => updateField('confirm_password', e.target.value)}
                  className={cn('w-full pl-10 pr-12 py-2.5 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500', errors.confirm_password ? 'border-red-500' : formData.confirm_password && formData.confirm_password === formData.password ? 'border-green-400' : 'border-gray-300')}
                  placeholder="Repita su contraseña"
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirm_password}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600">
                  {showConfirm ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
              {errors.confirm_password && <p className="mt-1.5 text-sm text-red-600">{errors.confirm_password}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="propietario-origen" className="block text-sm font-medium text-gray-700 mb-1">
              ¿Cómo nos conoció? <span className="text-gray-500 font-normal">(opcional)</span>
            </label>
            <select id="propietario-origen"
              value={formData.origen}
              onChange={(e) => updateField('origen', e.target.value)}
              className={regSelectCls({ error: !!errors.origen })}
              aria-invalid={!!errors.origen}
            >
              <option value="">Seleccione</option>
              <option value="inmobiliaria">Una inmobiliaria</option>
              <option value="redes">Redes sociales</option>
              <option value="recomendacion">Recomendación</option>
              <option value="google">Google / internet</option>
              <option value="otro">Otro</option>
            </select>
            {errors.origen && <p className="mt-1.5 text-sm text-red-600">{errors.origen}</p>}
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
            <span>Sus datos están protegidos conforme a la legislación colombiana de protección de datos personales.</span>
          </div>
        </FormSection>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 px-6 py-3.5 bg-coral-500 text-ink-900 text-[15px] font-bold rounded-xl hover:bg-coral-400 hover:-translate-y-px transition-all shadow-[0_2px_16px_rgba(249,115,22,0.3)] hover:shadow-[0_4px_24px_rgba(249,115,22,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
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
      </form>

      <p className="mt-3.5 text-xs text-slate-500 text-center leading-[1.5]">
        Después del registro podrá acceder a su oficina virtual, registrar sus inmuebles y publicarlos
        en la vitrina Cofianza.
      </p>

      <p className="mt-6 text-[13px] text-slate-500 text-center leading-[1.6]">
        ¿Ya tiene cuenta?{' '}
        <Link href={AUTH_ROUTES.LOGIN} className="text-primary-600 font-semibold hover:underline">
          Inicie sesión
        </Link>
      </p>
    </div>
  )
}
