/**
 * Registro rapido de solicitante — HP-368
 * Flujo "Me interesa" → Registro → Confirmar el correo → Iniciar sesión →
 * volver al inmueble (o a la invitación). Desde la auditoría de la vitrina la
 * cuenta no queda activa al registrarse: hay que abrir el enlace del correo.
 */

'use client'

import { mensajeParaProspecto } from '@/lib/errorMessages'
import { useState, useEffect, useId, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { IconLoader, IconHome, IconCheck, IconEye, IconEyeOff, IconMail } from '@/components/icons'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { getPublicPropertyById, type PublicProperty } from '@/services/publicPropertiesService'
import { formatCurrency, API_BASE_URL } from '@/lib/constants'
import { authService } from '@/services/authService'
import { isValidEmail } from '@/lib/utils'
import { guardarDestinoTrasVerificar, olvidarDestinoTrasVerificar } from '@/lib/destinoTrasVerificar'

// Registro liviano (H43, 2026-09-28): solo nombre, correo, celular y
// contraseña. El documento se pide antes de la autorización del estudio
// (la API no deja enviarla sin él) o en «Mi cuenta».

const TIPO_LABELS: Record<string, string> = {
  apartamento: 'Apartamento', casa: 'Casa', oficina: 'Oficina', local: 'Local', bodega: 'Bodega',
  apartaestudio: 'Apartaestudio', casa_finca: 'Casa Finca', finca: 'Finca', lote: 'Lote', parqueadero: 'Parqueadero',
}

interface FormErrors {
  nombre?: string
  apellido?: string
  email?: string
  telefono?: string
  password?: string
  accept_terms?: string
  accept_data_treatment?: string
  general?: string
}

export default function RegistroSolicitantePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><IconLoader size={24} className="animate-spin text-primary-600" /></div>}>
      <RegistroSolicitanteContent />
    </Suspense>
  )
}

function RegistroSolicitanteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const propertyId = searchParams.get('property_id') || ''

  const [property, setProperty] = useState<PublicProperty | null>(null)
  const [loadingProperty, setLoadingProperty] = useState(!!propertyId)

  // Form state
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptData, setAcceptData] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  // H44: el invitado a un estudio puede crear la cuenta sin contraseña y
  // entrar con un enlace a su correo.
  const [vieneDeInvitacion, setVieneDeInvitacion] = useState(false)
  const [sinContrasena, setSinContrasena] = useState(searchParams.get('enlace') === '1')
  const [enlaceEnviado, setEnlaceEnviado] = useState(false)
  // Registro con contraseña hecho: falta confirmar el correo.
  const [correoPorConfirmar, setCorreoPorConfirmar] = useState<string | null>(null)
  const [reenviando, setReenviando] = useState(false)
  useEffect(() => {
    try {
      setVieneDeInvitacion(!!sessionStorage.getItem('invitacion_token'))
    } catch {
      // sin sessionStorage: solo el registro con contraseña
    }
  }, [])
  const modoEnlace = sinContrasena && vieneDeInvitacion

  // Fetch property for context card
  useEffect(() => {
    if (!propertyId) { setLoadingProperty(false); return }
    getPublicPropertyById(propertyId)
      .then(setProperty)
      .catch(() => {})
      .finally(() => setLoadingProperty(false))
  }, [propertyId])

  // Validation
  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!nombre.trim()) e.nombre = 'Requerido'
    if (!apellido.trim()) e.apellido = 'Requerido'
    if (!isValidEmail(email)) e.email = 'Email inválido'
    if (!telefono.trim()) {
      e.telefono = 'Celular requerido'
    } else {
      // PhoneInput emite el formato "+<dial> <local>". El numero local debe
      // tener exactamente 10 digitos sin espacios.
      const localDigits = telefono.replace(/^\+[\d-]+\s*/, '').replace(/\D/g, '')
      if (localDigits.length !== 10) e.telefono = 'El celular debe tener 10 dígitos'
    }
    // Sin contraseña (enlace mágico, H44) no hay nada que validar en ella.
    if (!modoEnlace) {
      if (password.length < 8) e.password = 'Mínimo 8 caracteres'
      else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) e.password = 'Debe tener al menos una mayúscula, una minúscula y un número'
    }
    if (!acceptTerms) e.accept_terms = 'Debe aceptar los términos'
    if (!acceptData) e.accept_data_treatment = 'Debe autorizar el tratamiento de datos'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setErrors({})

    if (modoEnlace) {
      try {
        await authService.solicitarEnlaceMagico(email.trim(), {
          nombre, apellido, telefono,
          accept_terms: true, accept_data_treatment: true,
        })
        setEnlaceEnviado(true)
      } catch (err) {
        const msg = mensajeParaProspecto(err, 'No pudimos enviar el enlace. Inténtelo de nuevo en un momento.')
        setErrors({ general: msg })
        toast.error(msg)
      } finally {
        setSubmitting(false)
      }
      return
    }

    // Si el usuario viene del flujo de invitación externa, preservamos el token
    // para: (a) marcar el origen en el backend y (b) volver a la invitación
    // después de confirmar el correo e iniciar sesión.
    const invitacionToken =
      typeof window !== 'undefined' ? sessionStorage.getItem('invitacion_token') : null

    try {
      const res = await fetch(`${API_BASE_URL}/vitrina/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre, apellido, email, telefono,
          // Sin campo de confirmación (el ojo deja revisarla); la API la sigue pidiendo.
          password, confirm_password: password,
          accept_terms: true, accept_data_treatment: true,
          property_interest_id: propertyId || undefined,
          from_invitation: invitacionToken ? true : undefined,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        const msg = json.message || 'Error al registrarse'
        setErrors({ general: msg })
        toast.error(msg)
        return
      }

      // Compatibilidad durante el despliegue: si la API todavía devuelve
      // sesión (versión anterior a la verificación de correo), se entra como
      // antes. Cuando la API nueva esté publicada este camino no se usa.
      if (json.data?.session && json.data?.user) {
        authService.adoptarSesion(json.data.user, json.data.session)
        toast.success('Registro exitoso')
        if (invitacionToken) {
          window.location.href = `/invitacion/${invitacionToken}`
          return
        }
        if (propertyId) {
          localStorage.removeItem('cofianza_interested_property')
          router.push(`/inmueble/${propertyId}?agendar=1`)
          return
        }
        router.push('/dashboard')
        return
      }

      // Sin sesión: la cuenta se activa con el enlace que le llegó al correo.
      // Lo que estaba haciendo se guarda para retomarlo al confirmar (el
      // enlace se abre en otra pestaña). La invitación además sigue en
      // sessionStorage de esta pestaña, que el login ya usa.
      if (invitacionToken) {
        guardarDestinoTrasVerificar(`/invitacion/${invitacionToken}`)
      } else if (propertyId) {
        localStorage.removeItem('cofianza_interested_property')
        guardarDestinoTrasVerificar(`/inmueble/${propertyId}?agendar=1`)
      } else {
        olvidarDestinoTrasVerificar()
      }
      setCorreoPorConfirmar(json.data?.email || email.trim())
    } catch (err) {
      // Mismo traductor que los flujos publicos: sin conexion, demasiados
      // intentos y caidas del servidor dejan de llegar como texto crudo.
      const msg = mensajeParaProspecto(err, 'No pudimos crear su cuenta. Inténtelo de nuevo en un momento.')
      setErrors({ general: msg })
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const reenviarVerificacion = async () => {
    if (!correoPorConfirmar || reenviando) return
    setReenviando(true)
    try {
      await authService.resendVerification(correoPorConfirmar)
      toast.success('Le enviamos un nuevo correo de confirmación. Use el enlace de este último correo.')
    } catch (err) {
      // Con el tope de reenvíos (3 por hora) la API dice cuánto esperar.
      toast.error(mensajeParaProspecto(err, 'No pudimos reenviar el correo. Inténtelo de nuevo más tarde.'))
    } finally {
      setReenviando(false)
    }
  }

  if (correoPorConfirmar) {
    // Con el inmueble en la URL, el login lo retoma aunque se haya perdido lo
    // guardado; la invitación la retoma el login desde sessionStorage.
    const loginHref = propertyId
      ? `/login?intent=interest&property_id=${encodeURIComponent(propertyId)}`
      : '/login'
    return (
      <div className="bg-white rounded-xl shadow-lg p-5 sm:p-8 w-full text-center">
        <div className="mx-auto w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-6">
          <IconMail size={32} className="text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Le enviamos un correo para confirmar su cuenta</h1>
        <p className="text-gray-600 mb-4 break-words">
          Abra el enlace que enviamos a <strong>{correoPorConfirmar}</strong> para activar su cuenta. Después
          inicie sesión con su correo y su contraseña
          {vieneDeInvitacion ? ' para continuar con su invitación.' : property ? ' para continuar con su solicitud.' : '.'}
        </p>
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 text-left space-y-2 mb-6">
          <p>Revise también la carpeta de spam. El enlace vence en 24 horas y sirve una sola vez; si pide otro correo, use el del más reciente.</p>
          <p>Si lo abre en este mismo navegador, lo traemos de vuelta a donde iba. Si no, después de iniciar sesión busque de nuevo el inmueble en la vitrina.</p>
        </div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={reenviarVerificacion}
            disabled={reenviando}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {reenviando ? (<><IconLoader size={16} className="animate-spin" /> Reenviando...</>) : 'Reenviar correo'}
          </button>
          <Link
            href={loginHref}
            className="inline-flex min-h-11 w-full items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Ya confirmé mi correo: iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  if (enlaceEnviado) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-5 sm:p-8 w-full text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <IconCheck size={32} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Revise su correo</h1>
        <p className="text-gray-500 mb-4">
          Si <strong>{email.trim()}</strong> es el correo al que llegó su invitación, le enviamos un enlace para
          entrar. Vence en una hora y sirve una sola vez.
        </p>
        <p className="text-sm text-gray-500">
          Revise también su carpeta de spam. Si ya tenía cuenta de arrendatario con ese correo, el enlace lo lleva a ella.
        </p>
      </div>
    )
  }

  return (
    // Sin cabecera ni fondo propios: el layout de (auth) ya pone el logo y el
    // contenedor. Con los suyos salía el logo dos veces y una caja gris más
    // alta que la pantalla.
    <div className="w-full">
      <main>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Crear cuenta</h1>
        <p className="text-sm text-gray-500 mb-6">
          {property ? 'Regístrese para continuar con su estudio' : 'Regístrese como solicitante'}
        </p>

        {/* Property context card */}
        {loadingProperty && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 animate-pulse">
            <div className="h-4 w-48 bg-gray-200 rounded" />
          </div>
        )}
        {property && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6 flex items-center gap-4">
            <div className="w-16 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
              {property.foto_fachada_url ? (
                <img src={property.foto_fachada_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <IconHome size={20} className="text-gray-300" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary-800">
                {formatCurrency(property.valor_arriendo)}/mes
              </p>
              <p className="text-xs text-primary-600 truncate">
                {TIPO_LABELS[property.tipo] || property.tipo} en {property.barrio ? `${property.barrio}, ` : ''}{property.ciudad}
              </p>
            </div>
            <IconCheck size={20} className="text-primary-600 shrink-0" />
          </div>
        )}

        {/* Error general */}
        {errors.general && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {errors.general}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Nombre" autoComplete="given-name" value={nombre} onChange={setNombre} error={errors.nombre} />
            <FormField label="Apellido" autoComplete="family-name" value={apellido} onChange={setApellido} error={errors.apellido} />
          </div>

          <FormField label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={setEmail} error={errors.email} />
          <PhoneInput
            label="Celular"
            value={telefono}
            onChange={setTelefono}
            error={errors.telefono}
          />

          {vieneDeInvitacion && (
            <label className="flex items-start gap-2 cursor-pointer bg-primary-50 border border-primary-200 rounded-lg p-3">
              <input type="checkbox" checked={sinContrasena} onChange={(e) => setSinContrasena(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-primary-900">
                Prefiero no crear contraseña: envíenme un enlace a mi correo para entrar.
                <span className="block text-xs text-primary-700 mt-0.5">Use el correo al que le llegó la invitación.</span>
              </span>
            </label>
          )}

          {!modoEnlace && (
            <FormField label="Contraseña" type="password" autoComplete="new-password" value={password} onChange={setPassword} error={errors.password} placeholder="Mínimo 8 caracteres, con mayúscula, minúscula y número" />
          )}

          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <span className="text-xs text-gray-600">
                Acepto los{' '}
                <Link
                  href="/terminos"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary-600 underline hover:text-primary-700"
                >
                  términos y condiciones
                </Link>{' '}
                del servicio
              </span>
            </label>
            {errors.accept_terms && <p className="text-xs text-red-500 ml-6">{errors.accept_terms}</p>}

            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={acceptData} onChange={(e) => setAcceptData(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <span className="text-xs text-gray-600">
                Autorizo el{' '}
                <Link
                  href="/privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary-600 underline hover:text-primary-700"
                >
                  tratamiento de mis datos personales
                </Link>{' '}
                conforme a la Ley 1581 de 2012
              </span>
            </label>
            {errors.accept_data_treatment && <p className="text-xs text-red-500 ml-6">{errors.accept_data_treatment}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-coral-500 text-ink-900 font-bold rounded-xl hover:bg-coral-400 hover:-translate-y-px transition-all shadow-[0_2px_16px_rgba(249,115,22,0.3)] hover:shadow-[0_4px_24px_rgba(249,115,22,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><IconLoader size={18} className="animate-spin" /> {modoEnlace ? 'Enviando...' : 'Registrando...'}</>
            ) : (
              <>{modoEnlace ? 'Enviarme el enlace' : 'Crear mi cuenta y continuar'}</>
            )}
          </button>
        </form>

        {/* Login link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tiene cuenta?{' '}
          <Link
            href={`/login${propertyId ? `?property_id=${propertyId}&intent=interest` : ''}`}
            className="text-primary-600 font-medium hover:text-primary-700"
          >
            Inicie sesión
          </Link>
        </p>
      </main>
    </div>
  )
}

// ── Form Field ──────────────────────────────

function FormField({
  autoComplete,
  inputMode,
  label, value, onChange, error, type = 'text', placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; error?: string
  type?: string; placeholder?: string; autoComplete?: string; inputMode?: 'numeric' | 'tel' | 'email' | 'text'
}) {
  // Toggle local solo cuando es type="password" — no afecta al resto.
  const [showPassword, setShowPassword] = useState(false)
  const id = useId()
  const isPassword = type === 'password'
  const effectiveType = isPassword && showPassword ? 'text' : type

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={effectiveType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full px-3 py-2.5 ${isPassword ? 'pr-11' : ''} border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-gray-500 hover:text-gray-600 transition-colors"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
          </button>
        )}
      </div>
      {error && <p id={`${id}-error`} className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
