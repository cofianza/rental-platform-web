/**
 * Registro rapido de solicitante — HP-368
 * Flujo "Me interesa" → Registro → Auto-login → Expediente+Estudio
 */

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { IconLoader, IconHome, IconCheck, IconEye, IconEyeOff } from '@/components/icons'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { CofianzaLogo } from '@/components/ui/CofianzaLogo'
import { getPublicPropertyById, type PublicProperty } from '@/services/publicPropertiesService'
import { formatCurrency, API_BASE_URL } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth.store'

const TIPO_DOC_OPTIONS = [
  { value: 'cc', label: 'Cedula de Ciudadania' },
  { value: 'ce', label: 'Cedula de Extranjeria' },
  { value: 'ti', label: 'Tarjeta de Identidad' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'nit', label: 'NIT' },
]

const TIPO_LABELS: Record<string, string> = {
  apartamento: 'Apartamento', casa: 'Casa', oficina: 'Oficina', local: 'Local', bodega: 'Bodega',
}

interface FormErrors {
  nombre?: string
  apellido?: string
  email?: string
  telefono?: string
  numero_documento?: string
  password?: string
  confirm_password?: string
  accept_terms?: string
  accept_data_treatment?: string
  general?: string
}

export default function RegistroSolicitantePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><IconLoader size={24} className="animate-spin text-primary-600" /></div>}>
      <RegistroSolicitanteContent />
    </Suspense>
  )
}

function RegistroSolicitanteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const propertyId = searchParams.get('property_id') || ''
  const intent = searchParams.get('intent') || ''

  const [property, setProperty] = useState<PublicProperty | null>(null)
  const [loadingProperty, setLoadingProperty] = useState(!!propertyId)

  // Form state
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [tipoDocumento, setTipoDocumento] = useState('cc')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptData, setAcceptData] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

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
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email invalido'
    if (!telefono.trim() || !/^\+\d{1,4}[\s-]?\d{7,15}$/.test(telefono.replace(/[\s-]+/g, ' ').trim())) e.telefono = 'Telefono invalido'
    if (!numeroDocumento.trim()) e.numero_documento = 'Requerido'
    if (password.length < 8) e.password = 'Minimo 8 caracteres'
    if (password !== confirmPassword) e.confirm_password = 'No coinciden'
    if (!acceptTerms) e.accept_terms = 'Debe aceptar los terminos'
    if (!acceptData) e.accept_data_treatment = 'Debe autorizar el tratamiento de datos'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setErrors({})

    // Si el usuario viene del flujo de invitación externa, preservamos el token
    // para: (a) marcar registration_source='invitacion_externa' en backend y
    // (b) redirigir al canje post-auto-login.
    const invitacionToken =
      typeof window !== 'undefined' ? sessionStorage.getItem('invitacion_token') : null

    try {
      const res = await fetch(`${API_BASE_URL}/vitrina/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre, apellido, email, telefono,
          tipo_documento: tipoDocumento,
          numero_documento: numeroDocumento,
          password, confirm_password: confirmPassword,
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

      // Auto-login: store tokens
      const { user, session } = json.data
      useAuthStore.getState().login(user, session.access_token)
      localStorage.setItem('cofianza_refresh_token', session.refresh_token)

      toast.success('Registro exitoso')

      // Flujo invitación externa tiene prioridad sobre property_interest.
      if (invitacionToken) {
        window.location.href = `/invitacion/${invitacionToken}`
        return
      }

      // Flujo unificado: en vez de crear expediente SIN cita aquí, mandamos
      // al usuario al detalle del inmueble ya autenticado. router.push (no
      // window.location) preserva el auth state en memoria — con full reload
      // se perdía la sesión durante la rehidratación del AuthProvider.
      // El flag ?agendar=1 le dice a <MeInteresaCTA> que auto-abra el modal.
      if (propertyId) {
        localStorage.removeItem('cofianza_interested_property')
        router.push(`/inmueble/${propertyId}?agendar=1`)
        return
      }

      router.push('/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de conexion'
      setErrors({ general: msg })
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <CofianzaLogo size={32} withText textClassName="text-lg" />
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto px-4 py-8 w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Crear cuenta</h1>
        <p className="text-sm text-gray-500 mb-6">
          {property ? 'Registrate para continuar con tu solicitud' : 'Registrate como solicitante'}
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
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {errors.general}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nombre" value={nombre} onChange={setNombre} error={errors.nombre} />
            <FormField label="Apellido" value={apellido} onChange={setApellido} error={errors.apellido} />
          </div>

          <FormField label="Email" type="email" value={email} onChange={setEmail} error={errors.email} />
          <PhoneInput
            label="Telefono"
            value={telefono}
            onChange={setTelefono}
            error={errors.telefono}
          />

          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo doc.</label>
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {TIPO_DOC_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <FormField label="Numero documento" value={numeroDocumento} onChange={setNumeroDocumento} error={errors.numero_documento} />
            </div>
          </div>

          <FormField label="Contrasena" type="password" value={password} onChange={setPassword} error={errors.password} placeholder="Minimo 8 caracteres" />
          <FormField label="Confirmar contrasena" type="password" value={confirmPassword} onChange={setConfirmPassword} error={errors.confirm_password} />

          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
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
              <input type="checkbox" checked={acceptData} onChange={(e) => setAcceptData(e.target.checked)} className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
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
            className="w-full py-3.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 hover:-translate-y-px transition-all shadow-[0_2px_16px_rgba(249,115,22,0.3)] hover:shadow-[0_4px_24px_rgba(249,115,22,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><IconLoader size={18} className="animate-spin" /> Registrando...</>
            ) : (
              <>Crear mi cuenta y continuar</>
            )}
          </button>
        </form>

        {/* Login link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Ya tienes cuenta?{' '}
          <Link
            href={`/login${propertyId ? `?property_id=${propertyId}&intent=interest` : ''}`}
            className="text-primary-600 font-medium hover:text-primary-700"
          >
            Inicia sesion
          </Link>
        </p>
      </main>
    </div>
  )
}

// ── Form Field ──────────────────────────────

function FormField({
  label, value, onChange, error, type = 'text', placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; error?: string
  type?: string; placeholder?: string
}) {
  // Toggle local solo cuando es type="password" — no afecta al resto.
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const effectiveType = isPassword && showPassword ? 'text' : type

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={effectiveType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2.5 ${isPassword ? 'pr-11' : ''} border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
