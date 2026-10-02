'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  IconUser, IconMail, IconLock, IconMapPin, IconId, IconHome, IconGlobe,
  IconEye, IconEyeOff, IconArrowRight, IconCheck, IconLoader, IconShield, IconBuilding2,
  IconAlertTriangle,
} from '@/components/icons'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { cn, isValidEmail } from '@/lib/utils'
import { authService } from '@/services/authService'
import { ApiClientError } from '@/lib/api'
import { AUTH_ROUTES } from '@/lib/constants'
import { validateNitModulo11, problemaNit } from '@/lib/nit'
import {
  RegistroStepper, RegistroTipoTabs, FormSection, PasswordRequirements,
  regInputCls, regSelectCls, ValidCheck, scrollToFirstError, ariaError,
} from '@/components/auth/registro-ui'

// Municipios del Valle de Aburrá. Se envía el nombre legible (lo que ya guardan
// las cuentas existentes); con «Otra ciudad» se envía lo que escriba la persona.
const CIUDADES = [
  'Medellín', 'Envigado', 'Itagüí', 'Sabaneta', 'Bello',
  'Caldas', 'La Estrella', 'Copacabana', 'Girardota', 'Barbosa',
]
const OTRA_CIUDAD = 'otra'

// Se envía la etiqueta: la columna del cargo ya guarda texto libre.
const CARGOS = [
  'Representante legal', 'Gerente general', 'Director comercial', 'Director de operaciones', 'Otro',
]

/** «www.empresa.com» → «https://www.empresa.com»; null si no es una dirección web. */
function normalizarSitioWeb(valor: string): string | null {
  const texto = valor.trim()
  const conEsquema = /^https?:\/\//i.test(texto) ? texto : `https://${texto}`
  try {
    return new URL(conEsquema).hostname.includes('.') && conEsquema.length <= 300 ? conEsquema : null
  } catch {
    return null
  }
}

/** Documento del representante sin puntos, espacios ni guiones (así lo guarda el API). */
const limpiarDocumento = (valor: string) => valor.replace(/[.\s-]/g, '')

interface FormData {
  razon_social: string
  // NIT separado en dos campos (mockup nueva propuesta UI, Mario 12-may-2026)
  // — al enviar se concatenan como "XXXXXXXXX-D" para mantener contrato API.
  nit_numero: string
  nit_dv: string
  direccion_comercial: string
  // Valor del select; con OTRA_CIUDAD el nombre va en ciudad_otra.
  ciudad: string
  ciudad_otra: string
  inmuebles_gestionados: string
  sitio_web: string
  nombre_representante_nombre: string
  nombre_representante_apellido: string
  representante_tipo_documento: string
  representante_documento: string
  cargo_representante: string
  // ¿Qué afianzadora/aseguradora usan hoy? (opcional, tarea 1.6)
  afianzadora_tipo: '' | 'afianzadora' | 'aseguradora' | 'ninguna'
  afianzadora_actual: string
  telefono: string
  email: string
  password: string
  confirm_password: string
  origen: string
  accept_terms: boolean
  accept_data_treatment: boolean
}

const initialFormData: FormData = {
  razon_social: '',
  nit_numero: '',
  nit_dv: '',
  direccion_comercial: '',
  ciudad: '',
  ciudad_otra: '',
  inmuebles_gestionados: '',
  sitio_web: '',
  nombre_representante_nombre: '',
  nombre_representante_apellido: '',
  representante_tipo_documento: 'cc',
  representante_documento: '',
  cargo_representante: '',
  afianzadora_tipo: '',
  afianzadora_actual: '',
  telefono: '',
  email: '',
  password: '',
  confirm_password: '',
  origen: '',
  accept_terms: false,
  accept_data_treatment: false,
}

export default function RegisterInmobiliariaPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const dvRef = useRef<HTMLInputElement>(null)

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      // El NIT son dos campos con un solo mensaje: al tocar uno se limpia el del otro.
      if (field === 'nit_numero' || field === 'nit_dv') {
        delete next.nit_numero
        delete next.nit_dv
      }
      return next
    })
    setServerError(null)
  }

  // Valida TODOS los campos de una vez (sin pasos).
  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Datos de la inmobiliaria
    if (!formData.razon_social.trim()) newErrors.razon_social = 'Nombre de la inmobiliaria requerido'
    const numero = formData.nit_numero.trim()
    const dv = formData.nit_dv.trim()
    if (!numero) {
      newErrors.nit_numero = 'Número de NIT requerido'
    } else if (!/^\d{1,15}$/.test(numero)) {
      newErrors.nit_numero = 'Sólo dígitos (máx 15)'
    }
    if (/^\d{1,15}$/.test(numero)) {
      // DV obligatorio. Si falta o no corresponde, el mensaje ya sugiere el dígito.
      const problema = problemaNit(dv ? `${numero}-${dv}` : numero)
      if (problema) newErrors.nit_dv = problema
    } else if (!dv) {
      newErrors.nit_dv = 'Dígito de verificación requerido'
    }
    if (!formData.ciudad) {
      newErrors.ciudad = 'Seleccione la ciudad'
    } else if (formData.ciudad === OTRA_CIUDAD && !formData.ciudad_otra.trim()) {
      newErrors.ciudad_otra = 'Escriba la ciudad'
    }
    if (!formData.inmuebles_gestionados) newErrors.inmuebles_gestionados = 'Seleccione una opción'
    if (!formData.direccion_comercial.trim()) newErrors.direccion_comercial = 'Dirección comercial requerida'
    if (formData.sitio_web.trim() && !normalizarSitioWeb(formData.sitio_web)) {
      newErrors.sitio_web = 'Página web inválida (ej. https://www.suinmobiliaria.com)'
    }

    // Representante legal
    if (!formData.nombre_representante_nombre.trim()) newErrors.nombre_representante_nombre = 'Nombre requerido'
    if (!formData.nombre_representante_apellido.trim()) newErrors.nombre_representante_apellido = 'Apellido requerido'
    if (!formData.representante_tipo_documento) newErrors.representante_tipo_documento = 'Seleccione un tipo de documento'
    if (!formData.representante_documento.trim()) {
      newErrors.representante_documento = 'Número de documento requerido'
    } else if (!/^[A-Za-z0-9]{3,30}$/.test(limpiarDocumento(formData.representante_documento))) {
      newErrors.representante_documento = 'Número de documento inválido'
    }
    if (!formData.cargo_representante) newErrors.cargo_representante = 'Seleccione el cargo'
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

    // Acceso
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
      const sitioWeb = formData.sitio_web.trim() ? normalizarSitioWeb(formData.sitio_web) : null
      // Los opcionales vacíos se omiten: nunca se manda "".
      await authService.registerInmobiliaria({
        razon_social: formData.razon_social.trim(),
        nit: `${formData.nit_numero.trim()}-${formData.nit_dv.trim()}`,
        direccion_comercial: formData.direccion_comercial.trim(),
        ciudad: formData.ciudad === OTRA_CIUDAD ? formData.ciudad_otra.trim() : formData.ciudad,
        inmuebles_gestionados: formData.inmuebles_gestionados,
        ...(sitioWeb ? { sitio_web: sitioWeb } : {}),
        ...(formData.afianzadora_tipo ? { afianzadora_tipo: formData.afianzadora_tipo } : {}),
        // Solo enviamos el nombre cuando el tipo es afianzadora/aseguradora. Si
        // el usuario eligio 'ninguna' (o vacio) NO mandamos un nombre que quedo
        // escrito antes de cambiar el select — evita el dato contradictorio
        // tipo='ninguna' + afianzadora_actual='<nombre>'.
        ...((formData.afianzadora_tipo === 'afianzadora' || formData.afianzadora_tipo === 'aseguradora') &&
        formData.afianzadora_actual.trim()
          ? { afianzadora_actual: formData.afianzadora_actual.trim() }
          : {}),
        nombre_representante_nombre: formData.nombre_representante_nombre.trim(),
        nombre_representante_apellido: formData.nombre_representante_apellido.trim(),
        representante_tipo_documento: formData.representante_tipo_documento,
        representante_documento: limpiarDocumento(formData.representante_documento),
        cargo_representante: formData.cargo_representante,
        email: formData.email,
        telefono: formData.telefono,
        password: formData.password,
        confirm_password: formData.confirm_password,
        ...(formData.origen ? { origen: formData.origen } : {}),
        accept_terms: true,
        accept_data_treatment: true,
      })
      // tipo=inmobiliaria: la pantalla de éxito repite la promesa del contrato marco.
      router.push(`${AUTH_ROUTES.REGISTER_SUCCESS}?email=${encodeURIComponent(formData.email)}&tipo=inmobiliaria`)
    } catch (error) {
      // NIT_ALREADY_EXISTS usa el mensaje del API: ya dice qué hacer (pedir invitación al titular).
      const mensaje = !(error instanceof ApiClientError)
        ? 'Error en el servidor. Intente de nuevo más tarde.'
        : error.code === 'EMAIL_ALREADY_EXISTS'
          ? 'Ya existe una cuenta con este correo.'
          : error.message
      setServerError(mensaje)
      // 400 de validación: el API dice qué campo falló; se marca en el formulario
      // (solo los campos que existen aquí, para no anunciar errores que no se ven).
      const campo = (field: string) =>
        field === 'nit' ? 'nit_numero'
        : field === 'ciudad' && formData.ciudad === OTRA_CIUDAD ? 'ciudad_otra'
        : field
      const marcados = (error instanceof ApiClientError ? error.details ?? [] : [])
        .map((d) => [campo(d.field), d.message] as const)
        .filter(([f]) => f in formData)
      // El aviso queda arriba, fuera de pantalla (el botón de envío está al fondo):
      // siempre sale el emergente, marque o no un campo el API.
      toast.error(mensaje)
      if (marcados.length) {
        setErrors(Object.fromEntries(marcados))
        scrollToFirstError(formRef.current)
      }
      // Solo aquí, no en un finally: tras el éxito el botón sigue deshabilitado
      // hasta que cambia la página (antes se reactivaba unas décimas de segundo
      // y un segundo clic mandaba otro registro).
      setIsLoading(false)
    }
  }

  const inputCls = (hasError?: boolean, valid?: boolean, rightIcon?: boolean) =>
    regInputCls({ error: hasError, valid, rightIcon })

  // Validez en vivo para feedback (check verde) y para el stepper de progreso.
  const nitValido =
    /^\d{1,15}$/.test(formData.nit_numero) &&
    /^\d$/.test(formData.nit_dv) &&
    validateNitModulo11(`${formData.nit_numero}-${formData.nit_dv}`)
  const ciudadValida =
    !!formData.ciudad && (formData.ciudad !== OTRA_CIUDAD || !!formData.ciudad_otra.trim())
  const documentoValido = /^[A-Za-z0-9]{3,30}$/.test(limpiarDocumento(formData.representante_documento))
  const emailValido = !!formData.email.trim() && isValidEmail(formData.email)
  const telValido = formData.telefono.replace(/^\+[\d-]+\s*/, '').replace(/\D/g, '').length === 10
  const passwordValida =
    formData.password.length >= 8 &&
    /[A-Z]/.test(formData.password) &&
    /[a-z]/.test(formData.password) &&
    /\d/.test(formData.password)

  const pasos = [
    {
      label: 'Inmobiliaria',
      done:
        !!formData.razon_social.trim() && nitValido &&
        !!formData.direccion_comercial.trim() && ciudadValida && !!formData.inmuebles_gestionados,
    },
    {
      label: 'Representante',
      done:
        !!formData.nombre_representante_nombre.trim() &&
        !!formData.nombre_representante_apellido.trim() &&
        !!formData.representante_tipo_documento && documentoValido &&
        !!formData.cargo_representante && telValido && emailValido,
    },
    {
      label: 'Acceso',
      done:
        passwordValida && formData.password === formData.confirm_password &&
        !!formData.confirm_password && formData.accept_terms && formData.accept_data_treatment,
    },
  ]
  const hayErrores = Object.keys(errors).length > 0

  return (
    <div className="w-full">
      <p className="text-xs font-bold tracking-[3px] uppercase text-primary-600 mb-2">
        Nuevo usuario
      </p>
      <h1 className="text-[28px] sm:text-[32px] font-black tracking-[-1.5px] leading-[1.1] text-slate-900 mb-2">
        Registre su inmobiliaria
      </h1>
      <p className="text-[15px] text-slate-500 leading-[1.6] mb-6">
        Conecte su cartera con Cofianza y ofrezca a sus arrendatarios un fiador profesional.
      </p>

      <RegistroTipoTabs activo="inmobiliaria" />

      {/* Banner: contrato marco con Cofianza (primer paso tras el registro). */}
      <div className="flex items-start gap-2.5 text-xs text-primary-800 bg-primary-50 border border-primary-200 p-3 rounded-lg mb-7">
        <IconShield size={16} className="text-primary-600 shrink-0 mt-0.5" />
        <span>
          <strong className="block font-bold">Registro empresarial</strong>
          Una vez creada su cuenta, nos pondremos en contacto con usted para firmar el contrato marco de
          vinculación y activar el panel de gestión.
        </span>
      </div>

      <RegistroStepper steps={pasos} />

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
        className="space-y-7"
      >
        {/* 1. Datos de la inmobiliaria */}
        <FormSection num={1} title="Datos de la inmobiliaria">
          <div>
            <label htmlFor="inmobiliaria-razon-social" className="block text-sm font-medium text-gray-700 mb-1">Nombre de la inmobiliaria<span className="text-coral-700"> *</span></label>
            <div className="relative">
              <IconBuilding2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input id="inmobiliaria-razon-social"
                type="text" value={formData.razon_social}
                onChange={(e) => updateField('razon_social', e.target.value)}
                className={inputCls(!!errors.razon_social)}
                placeholder="Habitar Propiedades S.A.S."
                autoComplete="organization"
                {...ariaError(errors, 'razon_social')}
              />
            </div>
            {errors.razon_social && <p id="error-razon_social" className="mt-1.5 text-sm text-red-600">{errors.razon_social}</p>}
          </div>

          <div>
            <label htmlFor="inmobiliaria-nit" className="block text-sm font-medium text-gray-700 mb-1">NIT<span className="text-coral-700"> *</span></label>
            <div className="flex items-stretch gap-2">
              <div className="relative flex-1">
                <IconId size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input id="inmobiliaria-nit"
                  type="text"
                  inputMode="numeric"
                  value={formData.nit_numero}
                  onChange={(e) => {
                    // «900.555.123-4», como sale en el RUT: lo anterior al guion es
                    // el número y el dígito siguiente el DV. Antes el guion se
                    // borraba, el DV se colaba en el número y el formulario
                    // terminaba dando por válido un NIT que no era.
                    const valor = e.target.value
                    // Vale el guion del teclado y los que llegan al pegar desde Word,
                    // WhatsApp o un PDF (‐ ‑ ‒ – — ―, U+2010 a U+2015) y el signo menos
                    // (−, U+2212): con cualquiera de esos el DV se volvía a colar.
                    const guion = valor.search(/[-\u2010-\u2015\u2212][^-\u2010-\u2015\u2212]*$/)
                    updateField('nit_numero', (guion < 0 ? valor : valor.slice(0, guion)).replace(/\D/g, '').slice(0, 15))
                    if (guion < 0) return
                    const dv = valor.slice(guion + 1).replace(/\D/g, '').slice(0, 1)
                    if (dv) updateField('nit_dv', dv)
                    // El guion (tecleado o pegado) pasa al campo del DV; seleccionado,
                    // para que un dígito nuevo reemplace al que hubiera.
                    dvRef.current?.focus()
                    dvRef.current?.select()
                  }}
                  className={inputCls(!!errors.nit_numero, nitValido)}
                  placeholder="900819665"
                  aria-invalid={!!errors.nit_numero}
                  aria-describedby={errors.nit_numero || errors.nit_dv ? 'error-nit' : undefined}
                />
              </div>
              <span className="self-center text-gray-500 font-bold">−</span>
              <div className="w-20">
                <input
                  ref={dvRef}
                  type="text"
                  inputMode="numeric"
                  value={formData.nit_dv}
                  onChange={(e) => updateField('nit_dv', e.target.value.replace(/\D/g, '').slice(0, 1))}
                  className={cn(
                    'w-full px-3 py-2.5 border rounded-lg text-sm font-bold text-center focus:outline-hidden focus:ring-2 focus:ring-primary-500',
                    errors.nit_dv ? 'border-red-500' : nitValido ? 'border-green-400' : 'border-gray-300',
                  )}
                  placeholder="DV"
                  maxLength={1}
                  aria-label="Dígito de verificación"
                  aria-invalid={!!errors.nit_dv}
                  aria-describedby={errors.nit_numero || errors.nit_dv ? 'error-nit' : undefined}
                />
              </div>
            </div>
            {(errors.nit_numero || errors.nit_dv) && (
              <p id="error-nit" className="mt-1.5 text-sm text-red-600">{errors.nit_numero || errors.nit_dv}</p>
            )}
            {nitValido ? (
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-green-600">
                <IconCheck size={13} /> NIT válido
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                Número (sin puntos) y dígito de verificación (DV), tal como aparecen en el RUT.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="inmobiliaria-ciudad" className="block text-sm font-medium text-gray-700 mb-1">Ciudad<span className="text-coral-700"> *</span></label>
              <div className="relative">
                <IconMapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <select id="inmobiliaria-ciudad"
                  value={formData.ciudad}
                  onChange={(e) => updateField('ciudad', e.target.value)}
                  className={regSelectCls({ error: !!errors.ciudad, icon: true })}
                  {...ariaError(errors, 'ciudad')}
                >
                  <option value="">Seleccione</option>
                  {CIUDADES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value={OTRA_CIUDAD}>Otra ciudad</option>
                </select>
              </div>
              {errors.ciudad && <p id="error-ciudad" className="mt-1.5 text-sm text-red-600">{errors.ciudad}</p>}
              {/* Dentro de la celda de «Ciudad»: así queda justo después en el celular
                  y en el orden de tabulación (antes iba tras «Inmuebles gestionados»). */}
              {formData.ciudad === OTRA_CIUDAD && (
                <div className="mt-4">
                  <label htmlFor="inmobiliaria-ciudad-otra" className="block text-sm font-medium text-gray-700 mb-1">¿Cuál ciudad?<span className="text-coral-700"> *</span></label>
                  <div className="relative">
                    <IconMapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input id="inmobiliaria-ciudad-otra"
                      type="text" value={formData.ciudad_otra}
                      onChange={(e) => updateField('ciudad_otra', e.target.value)}
                      className={inputCls(!!errors.ciudad_otra)}
                      placeholder="Nombre de la ciudad"
                      autoComplete="address-level2"
                      maxLength={100}
                      {...ariaError(errors, 'ciudad_otra')}
                    />
                  </div>
                  {errors.ciudad_otra && <p id="error-ciudad_otra" className="mt-1.5 text-sm text-red-600">{errors.ciudad_otra}</p>}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="inmobiliaria-inmuebles-gestionados" className="block text-sm font-medium text-gray-700 mb-1">Inmuebles gestionados<span className="text-coral-700"> *</span></label>
              <div className="relative">
                <IconHome size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <select id="inmobiliaria-inmuebles-gestionados"
                  value={formData.inmuebles_gestionados}
                  onChange={(e) => updateField('inmuebles_gestionados', e.target.value)}
                  className={regSelectCls({ error: !!errors.inmuebles_gestionados, icon: true })}
                  {...ariaError(errors, 'inmuebles_gestionados')}
                >
                  <option value="">Seleccione</option>
                  <option value="1-20">1 a 20</option>
                  <option value="21-50">21 a 50</option>
                  <option value="51-100">51 a 100</option>
                  <option value="101-300">101 a 300</option>
                  <option value="300+">Más de 300</option>
                </select>
              </div>
              {errors.inmuebles_gestionados && <p id="error-inmuebles_gestionados" className="mt-1.5 text-sm text-red-600">{errors.inmuebles_gestionados}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="inmobiliaria-direccion-comercial" className="block text-sm font-medium text-gray-700 mb-1">Dirección comercial<span className="text-coral-700"> *</span></label>
            <div className="relative">
              <IconMapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input id="inmobiliaria-direccion-comercial"
                type="text" value={formData.direccion_comercial}
                onChange={(e) => updateField('direccion_comercial', e.target.value)}
                className={inputCls(!!errors.direccion_comercial)}
                placeholder="Calle 129 Sur 50 33 Of. 301"
                autoComplete="street-address"
                {...ariaError(errors, 'direccion_comercial')}
              />
            </div>
            {errors.direccion_comercial && <p id="error-direccion_comercial" className="mt-1.5 text-sm text-red-600">{errors.direccion_comercial}</p>}
          </div>

          <div>
            <label htmlFor="inmobiliaria-sitio-web" className="block text-sm font-medium text-gray-700 mb-1">
              Página web <span className="text-gray-500 font-normal">(opcional)</span>
            </label>
            <div className="relative">
              <IconGlobe size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input id="inmobiliaria-sitio-web"
                type="url" value={formData.sitio_web}
                onChange={(e) => updateField('sitio_web', e.target.value)}
                className={inputCls(!!errors.sitio_web)}
                placeholder="https://www.suinmobiliaria.com"
                autoComplete="url"
                inputMode="url"
                maxLength={300}
                {...ariaError(errors, 'sitio_web')}
              />
            </div>
            {errors.sitio_web && <p id="error-sitio_web" className="mt-1.5 text-sm text-red-600">{errors.sitio_web}</p>}
          </div>

          {/* ¿Qué afianzadora/aseguradora usan hoy? (opcional, tarea 1.6) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className={formData.afianzadora_tipo === '' || formData.afianzadora_tipo === 'ninguna' ? 'sm:col-span-2' : undefined}>
              <label htmlFor="inmobiliaria-que-usan-hoy-para-respaldar-sus-arriendo" className="block text-sm font-medium text-gray-700 mb-1">
                ¿Qué usan hoy para respaldar sus arriendos?{' '}
                <span className="text-gray-500 font-normal">(opcional)</span>
              </label>
              <select id="inmobiliaria-que-usan-hoy-para-respaldar-sus-arriendo"
                value={formData.afianzadora_tipo}
                onChange={(e) => updateField('afianzadora_tipo', e.target.value)}
                className={regSelectCls()}
              >
                <option value="">Seleccione</option>
                <option value="afianzadora">Afianzadora</option>
                <option value="aseguradora">Aseguradora</option>
                <option value="ninguna">Ninguna</option>
              </select>
            </div>
            {formData.afianzadora_tipo !== '' && formData.afianzadora_tipo !== 'ninguna' && (
              <div>
                <label htmlFor="inmobiliaria-cual-opcional" className="block text-sm font-medium text-gray-700 mb-1">
                  ¿Cuál? <span className="text-gray-500 font-normal">(opcional)</span>
                </label>
                <input id="inmobiliaria-cual-opcional"
                  type="text"
                  value={formData.afianzadora_actual}
                  onChange={(e) => updateField('afianzadora_actual', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                  placeholder="Nombre de la afianzadora / aseguradora"
                  maxLength={200}
                />
              </div>
            )}
          </div>
        </FormSection>

        {/* 2. Datos del representante legal */}
        <FormSection num={2} title="Datos del representante legal">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="inmobiliaria-nombre-del-representante" className="block text-sm font-medium text-gray-700 mb-1">Nombre<span className="text-coral-700"> *</span></label>
              <div className="relative">
                <IconUser size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input id="inmobiliaria-nombre-del-representante"
                  type="text" value={formData.nombre_representante_nombre}
                  onChange={(e) => updateField('nombre_representante_nombre', e.target.value)}
                  className={inputCls(!!errors.nombre_representante_nombre)}
                  placeholder="Carlos Mario"
                  autoComplete="given-name"
                  {...ariaError(errors, 'nombre_representante_nombre')}
                />
              </div>
              {errors.nombre_representante_nombre && <p id="error-nombre_representante_nombre" className="mt-1.5 text-sm text-red-600">{errors.nombre_representante_nombre}</p>}
            </div>
            <div>
              <label htmlFor="inmobiliaria-apellido-del-representante" className="block text-sm font-medium text-gray-700 mb-1">Apellido<span className="text-coral-700"> *</span></label>
              <div className="relative">
                <IconUser size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input id="inmobiliaria-apellido-del-representante"
                  type="text" value={formData.nombre_representante_apellido}
                  onChange={(e) => updateField('nombre_representante_apellido', e.target.value)}
                  className={inputCls(!!errors.nombre_representante_apellido)}
                  placeholder="Vélez Cifuentes"
                  autoComplete="family-name"
                  {...ariaError(errors, 'nombre_representante_apellido')}
                />
              </div>
              {errors.nombre_representante_apellido && <p id="error-nombre_representante_apellido" className="mt-1.5 text-sm text-red-600">{errors.nombre_representante_apellido}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="inmobiliaria-representante-tipo-documento" className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento<span className="text-coral-700"> *</span></label>
              <div className="relative">
                <IconId size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <select id="inmobiliaria-representante-tipo-documento"
                  value={formData.representante_tipo_documento}
                  onChange={(e) => updateField('representante_tipo_documento', e.target.value)}
                  className={regSelectCls({ error: !!errors.representante_tipo_documento, icon: true })}
                  {...ariaError(errors, 'representante_tipo_documento')}
                >
                  <option value="cc">Cédula</option>
                  <option value="ce">C. extranjería</option>
                  <option value="pasaporte">Pasaporte</option>
                </select>
              </div>
              {errors.representante_tipo_documento && <p id="error-representante_tipo_documento" className="mt-1.5 text-sm text-red-600">{errors.representante_tipo_documento}</p>}
            </div>
            <div>
              <label htmlFor="inmobiliaria-representante-documento" className="block text-sm font-medium text-gray-700 mb-1">Número de documento<span className="text-coral-700"> *</span></label>
              <div className="relative">
                <IconId size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input id="inmobiliaria-representante-documento"
                  type="text" value={formData.representante_documento}
                  onChange={(e) => updateField('representante_documento', e.target.value)}
                  className={inputCls(!!errors.representante_documento)}
                  placeholder="71.234.567"
                  maxLength={40}
                  {...ariaError(errors, 'representante_documento')}
                />
              </div>
              {errors.representante_documento && <p id="error-representante_documento" className="mt-1.5 text-sm text-red-600">{errors.representante_documento}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="inmobiliaria-cargo" className="block text-sm font-medium text-gray-700 mb-1">Cargo<span className="text-coral-700"> *</span></label>
            <div className="relative">
              <IconShield size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <select id="inmobiliaria-cargo"
                value={formData.cargo_representante}
                onChange={(e) => updateField('cargo_representante', e.target.value)}
                className={regSelectCls({ error: !!errors.cargo_representante, icon: true })}
                autoComplete="organization-title"
                {...ariaError(errors, 'cargo_representante')}
              >
                <option value="">Seleccione</option>
                {CARGOS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {errors.cargo_representante && <p id="error-cargo_representante" className="mt-1.5 text-sm text-red-600">{errors.cargo_representante}</p>}
          </div>

          <div>
            <label htmlFor="inmobiliaria-email-corporativo" className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico<span className="text-coral-700"> *</span></label>
            <div className="relative">
              <IconMail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input id="inmobiliaria-email-corporativo"
                type="email" value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={inputCls(!!errors.email, emailValido && !errors.email, emailValido && !errors.email)}
                placeholder="rl@suinmobiliaria.com"
                autoComplete="email"
                inputMode="email"
                {...ariaError(errors, 'email')}
              />
              <ValidCheck show={emailValido && !errors.email} />
            </div>
            {errors.email && <p id="error-email" className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
          </div>

          <PhoneInput
            label="Celular (WhatsApp)"
            value={formData.telefono}
            onChange={(v) => updateField('telefono', v)}
            error={errors.telefono}
            required
          />
        </FormSection>

        {/* 3. Acceso a la plataforma */}
        <FormSection num={3} title="Acceso a la plataforma">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="inmobiliaria-contrasena" className="block text-sm font-medium text-gray-700 mb-1">Contraseña<span className="text-coral-700"> *</span></label>
              <div className="relative">
                <IconLock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input id="inmobiliaria-contrasena"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className={cn('w-full pl-10 pr-12 py-2.5 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500', errors.password ? 'border-red-500' : passwordValida ? 'border-green-400' : 'border-gray-300')}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  {...ariaError(errors, 'password')}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-600">
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
              {errors.password && <p id="error-password" className="mt-1.5 text-sm text-red-600">{errors.password}</p>}
              <PasswordRequirements password={formData.password} />
            </div>

            <div>
              <label htmlFor="inmobiliaria-confirmar-contrasena" className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña<span className="text-coral-700"> *</span></label>
              <div className="relative">
                <IconLock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input id="inmobiliaria-confirmar-contrasena"
                  type={showConfirm ? 'text' : 'password'}
                  value={formData.confirm_password}
                  onChange={(e) => updateField('confirm_password', e.target.value)}
                  className={cn('w-full pl-10 pr-12 py-2.5 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500', errors.confirm_password ? 'border-red-500' : formData.confirm_password && formData.confirm_password === formData.password ? 'border-green-400' : 'border-gray-300')}
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
            <label htmlFor="inmobiliaria-origen" className="block text-sm font-medium text-gray-700 mb-1">
              ¿Cómo nos conoció? <span className="text-gray-500 font-normal">(opcional)</span>
            </label>
            <select id="inmobiliaria-origen"
              value={formData.origen}
              onChange={(e) => updateField('origen', e.target.value)}
              className={regSelectCls({ error: !!errors.origen })}
              {...ariaError(errors, 'origen')}
            >
              <option value="">Seleccione</option>
              <option value="redes">Redes sociales</option>
              <option value="recomendacion">Recomendación</option>
              <option value="google">Google / internet</option>
              <option value="evento">Evento o feria</option>
              <option value="otro">Otro</option>
            </select>
            {errors.origen && <p id="error-origen" className="mt-1.5 text-sm text-red-600">{errors.origen}</p>}
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
              Crear cuenta empresarial
              <IconArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <p className="mt-3.5 text-xs text-slate-500 text-center leading-[1.5]">
        Después del registro, nos pondremos en contacto con usted en menos de 24 horas para firmar el
        contrato marco y activar su panel.
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
