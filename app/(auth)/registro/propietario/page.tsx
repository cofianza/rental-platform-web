'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  IconEye, IconEyeOff, IconArrowRight, IconLoader, IconAlertTriangle,
} from '@/components/icons'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { isValidEmail } from '@/lib/utils'
import { authService } from '@/services/authService'
import { ApiClientError } from '@/lib/api'
import { AUTH_ROUTES } from '@/lib/constants'
import {
  RegistroTipoTabs, PasswordHelp,
  regInputCls, regSelectCls, scrollToFirstError, ariaError,
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
  tipo_documento: 'cc',
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
      // El campo con error suele quedar arriba, fuera de pantalla: se lleva a la
      // persona hasta él y se le avisa, para que el clic nunca parezca no hacer nada.
      toast.error('Faltan datos o hay campos con error. Revise los marcados en rojo.')
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
      // El aviso queda arriba, fuera de pantalla (el botón de envío está al fondo):
      // siempre sale el emergente, marque o no un campo el API.
      toast.error(mensaje)
      if (marcados.length) {
        setErrors(Object.fromEntries(marcados.map((d) => [d.field, d.message])))
        scrollToFirstError(formRef.current)
      }
      // Solo aquí, no en un finally: tras el éxito el botón sigue deshabilitado
      // hasta que cambia la página (antes se reactivaba unas décimas de segundo
      // y un segundo clic mandaba otro registro).
      setIsLoading(false)
    }
  }

  const inputCls = (hasError?: boolean) => regInputCls({ error: hasError })

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


      {serverError && (
        <div role="alert" className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{serverError}</p>
        </div>
      )}

      {hayErrores && !serverError && (
        <div role="alert" className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
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
        className="space-y-4"
      >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="propietario-nombre" className="block text-[13px] font-semibold text-slate-900 mb-1.5">Nombre<span className="text-coral-700"> *</span></label>
              <div className="relative">
                <input id="propietario-nombre"
                  type="text" value={formData.nombre}
                  onChange={(e) => updateField('nombre', e.target.value)}
                  className={inputCls(!!errors.nombre)}
                  placeholder="Roberto"
                  autoComplete="given-name"
                  {...ariaError(errors, 'nombre')}
                />
              </div>
              {errors.nombre && <p id="error-nombre" className="mt-1.5 text-sm text-red-600">{errors.nombre}</p>}
            </div>
            <div>
              <label htmlFor="propietario-apellido" className="block text-[13px] font-semibold text-slate-900 mb-1.5">Apellido<span className="text-coral-700"> *</span></label>
              <div className="relative">
                <input id="propietario-apellido"
                  type="text" value={formData.apellido}
                  onChange={(e) => updateField('apellido', e.target.value)}
                  className={inputCls(!!errors.apellido)}
                  placeholder="Henao"
                  autoComplete="family-name"
                  {...ariaError(errors, 'apellido')}
                />
              </div>
              {errors.apellido && <p id="error-apellido" className="mt-1.5 text-sm text-red-600">{errors.apellido}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
            <div>
              <label htmlFor="propietario-tipo-de-documento" className="block text-[13px] font-semibold text-slate-900 mb-1.5">Tipo doc.<span className="text-coral-700"> *</span></label>
              <div className="relative">
                <select id="propietario-tipo-de-documento"
                  value={formData.tipo_documento}
                  onChange={(e) => updateField('tipo_documento', e.target.value)}
                  className={regSelectCls({ error: !!errors.tipo_documento })}
                  {...ariaError(errors, 'tipo_documento')}
                >
                  <option value="cc">Cédula</option>
                  <option value="ce">C. extranjería</option>
                  <option value="pasaporte">Pasaporte</option>
                </select>
              </div>
              {errors.tipo_documento && <p id="error-tipo_documento" className="mt-1.5 text-sm text-red-600">{errors.tipo_documento}</p>}
            </div>
            <div>
              <label htmlFor="propietario-numero-de-documento" className="block text-[13px] font-semibold text-slate-900 mb-1.5">Número de documento<span className="text-coral-700"> *</span></label>
              <div className="relative">
                <input id="propietario-numero-de-documento"
                  type="text" value={formData.numero_documento}
                  onChange={(e) => updateField('numero_documento', e.target.value)}
                  className={inputCls(!!errors.numero_documento)}
                  placeholder="1.040.567.890"
                  inputMode={formData.tipo_documento === 'pasaporte' ? 'text' : 'numeric'}
                  {...ariaError(errors, 'numero_documento')}
                />
              </div>
              {errors.numero_documento && <p id="error-numero_documento" className="mt-1.5 text-sm text-red-600">{errors.numero_documento}</p>}
            </div>
          </div>


          <div>
            <label htmlFor="propietario-email" className="block text-[13px] font-semibold text-slate-900 mb-1.5">Correo electrónico<span className="text-coral-700"> *</span></label>
            <div className="relative">
              <input id="propietario-email"
                type="email" value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={inputCls(!!errors.email)}
                placeholder="nombre@correo.com"
                autoComplete="email"
                inputMode="email"
                {...ariaError(errors, 'email')}
              />
            </div>
            {errors.email && <p id="error-email" className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
          </div>

          <PhoneInput
            variant="auth"
            label="Celular (WhatsApp)"
            value={formData.telefono}
            onChange={(v) => updateField('telefono', v)}
            error={errors.telefono}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="propietario-contrasena" className="block text-[13px] font-semibold text-slate-900 mb-1.5">Contraseña<span className="text-coral-700"> *</span></label>
              <div className="relative">
                <input id="propietario-contrasena"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className={regInputCls({ error: !!errors.password, rightIcon: true })}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  {...ariaError(errors, 'password')}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-600">
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
              {errors.password && <p id="error-password" className="mt-1.5 text-sm text-red-600">{errors.password}</p>}
              <PasswordHelp />
            </div>

            <div>
              <label htmlFor="propietario-confirmar-contrasena" className="block text-[13px] font-semibold text-slate-900 mb-1.5">Confirmar contraseña<span className="text-coral-700"> *</span></label>
              <div className="relative">
                <input id="propietario-confirmar-contrasena"
                  type={showConfirm ? 'text' : 'password'}
                  value={formData.confirm_password}
                  onChange={(e) => updateField('confirm_password', e.target.value)}
                  className={regInputCls({ error: !!errors.confirm_password, rightIcon: true })}
                  placeholder="Repita su contraseña"
                  autoComplete="new-password"
                  {...ariaError(errors, 'confirm_password')}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-600">
                  {showConfirm ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
              {errors.confirm_password && <p id="error-confirm_password" className="mt-1.5 text-sm text-red-600">{errors.confirm_password}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="propietario-origen" className="block text-[13px] font-semibold text-slate-900 mb-1.5">
              ¿Cómo nos conoció? <span className="text-[11px] font-normal text-slate-500">opcional</span>
            </label>
            <select id="propietario-origen"
              value={formData.origen}
              onChange={(e) => updateField('origen', e.target.value)}
              className={regSelectCls({ error: !!errors.origen })}
              {...ariaError(errors, 'origen')}
            >
              <option value="">Seleccione</option>
              <option value="inmobiliaria">Una inmobiliaria</option>
              <option value="redes">Redes sociales</option>
              <option value="recomendacion">Recomendación</option>
              <option value="google">Google / internet</option>
              <option value="otro">Otro</option>
            </select>
            {errors.origen && <p id="error-origen" className="mt-1.5 text-sm text-red-600">{errors.origen}</p>}
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.accept_terms}
              onChange={(e) => updateField('accept_terms', e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary-600"
            />
            <div>
              <span className="text-[13px] leading-[1.5] text-slate-500">
                Acepto los{' '}
                <Link href="/terminos" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary-600 font-semibold hover:underline">
                  términos y condiciones
                </Link>{' '}
                del servicio
              </span>
              {errors.accept_terms && <p className="mt-1 text-xs text-red-600">{errors.accept_terms}</p>}
            </div>
          </label>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.accept_data_treatment}
              onChange={(e) => updateField('accept_data_treatment', e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary-600"
            />
            <div>
              <span className="text-[13px] leading-[1.5] text-slate-500">
                Autorizo el{' '}
                <Link href="/privacidad" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary-600 font-semibold hover:underline">
                  tratamiento de mis datos personales
                </Link>{' '}
                conforme a la Ley 1581 de 2012
              </span>
              {errors.accept_data_treatment && <p className="mt-1 text-xs text-red-600">{errors.accept_data_treatment}</p>}
            </div>
          </label>


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

      <p className="mt-1 text-[13px] text-slate-500 text-center leading-[1.6]">
        ¿Ya tiene cuenta?{' '}
        <Link href={AUTH_ROUTES.LOGIN} className="text-primary-600 font-semibold hover:underline">
          Inicie sesión
        </Link>
      </p>
    </div>
  )
}
