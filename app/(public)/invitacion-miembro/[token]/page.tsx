/**
 * Aceptación de invitación de miembro a una inmobiliaria (multi-tenant Fase 2).
 * El invitado llega con el enlace del email. Según su estado:
 *  - sin cuenta  -> formulario de registro (/registrar crea cuenta + lo une).
 *  - con cuenta, no autenticado -> iniciar sesión y volver.
 *  - autenticado y coincide el email -> botón aceptar.
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { IconLoader, IconHome, IconX, IconCheck, IconShield } from '@/components/icons'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { useAuthStore } from '@/stores/auth.store'
import { useAuth } from '@/hooks/useAuth'
import {
  getInvitacionMiembro,
  aceptarInvitacionMiembro,
  registrarMiembro,
  type InvitacionMiembroInfo,
} from '@/services/miembrosService'

type Status = 'loading' | 'error' | 'ready' | 'registrado'

export default function InvitacionMiembroPage() {
  const params = useParams()
  const router = useRouter()
  const token = (params?.token as string) || ''

  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const { logout } = useAuth()

  const [status, setStatus] = useState<Status>('loading')
  const [info, setInfo] = useState<InvitacionMiembroInfo | null>(null)
  const [errorCode, setErrorCode] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Form de registro
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorCode('TOKEN_MISSING')
      setErrorMsg('No se proporcionó un token de invitación.')
      return
    }
    getInvitacionMiembro(token)
      .then((data) => {
        setInfo(data)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        const e = err as { code?: string; message?: string }
        setStatus('error')
        setErrorCode(e.code || 'UNKNOWN_ERROR')
        setErrorMsg(e.message || 'No se pudo cargar la invitación.')
      })
  }, [token])

  const saveTokenAndGo = (dest: string) => {
    sessionStorage.setItem('invitacion_miembro_token', token)
    router.push(dest)
  }

  const handleAceptar = async () => {
    setSubmitting(true)
    try {
      const res = await aceptarInvitacionMiembro(token)
      sessionStorage.removeItem('invitacion_miembro_token')
      toast.success(res.message || 'Te uniste a la inmobiliaria')
      router.push(res.redirect || '/dashboard')
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e.message || 'No se pudo aceptar la invitación')
      setSubmitting(false)
    }
  }

  const handleRegistrar = async (e: React.FormEvent) => {
    e.preventDefault()
    // El telefono es obligatorio: es el WhatsApp de contacto y el respaldo
    // para la firma de contratos. PhoneInput emite "+57 301..."; validamos
    // sin espacios.
    const tel = telefono.replace(/\s+/g, '').trim()
    if (!tel || !/^\+?\d{7,15}$/.test(tel)) {
      toast.error('Ingresa un teléfono válido (con código de país, ej. +57…). Es tu WhatsApp de contacto.')
      return
    }
    setSubmitting(true)
    try {
      await registrarMiembro(token, {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: tel,
        password,
      })
      setStatus('registrado')
    } catch (err: unknown) {
      const ex = err as { message?: string }
      toast.error(ex.message || 'No se pudo crear la cuenta')
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    sessionStorage.setItem('invitacion_miembro_token', token)
    router.push('/login')
  }

  if (status === 'loading' || !isInitialized) {
    return (
      <div className="flex items-center justify-center py-16">
        <IconLoader size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  if (status === 'error') {
    const titulo =
      errorCode === 'INVITACION_YA_ACEPTADA'
        ? 'Esta invitación ya fue aceptada'
        : errorCode === 'INVITACION_REVOCADA'
          ? 'Esta invitación fue revocada'
          : errorCode === 'INVITACION_EXPIRADA'
            ? 'El enlace expiró'
            : errorCode === 'INVITACION_NOT_FOUND'
              ? 'Invitación no encontrada'
              : 'No se pudo cargar la invitación'
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <IconX size={32} className="text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{titulo}</h1>
        <p className="text-sm text-gray-600 mb-6">{errorMsg}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
        >
          <IconHome size={16} />
          Volver al inicio
        </Link>
      </div>
    )
  }

  if (status === 'registrado' && info) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <IconCheck size={32} className="text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">¡Listo! Te uniste a {info.organizacion}</h1>
        <p className="text-sm text-gray-600 mb-6">
          Tu cuenta fue creada con el correo <strong>{info.email}</strong>. Inicia sesión para
          empezar a gestionar la cartera de la inmobiliaria.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
        >
          Iniciar sesión
        </button>
      </div>
    )
  }

  if (!info) return null

  const emailMatch = isAuthenticated && user?.email?.toLowerCase() === info.email.toLowerCase()
  const wrongRole = isAuthenticated && user?.rol !== 'inmobiliaria'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
          <IconShield size={20} className="text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Invitación a un equipo</h1>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        {info.invitador ? <strong>{info.invitador}</strong> : 'Una inmobiliaria'} te invitó a unirte a{' '}
        <strong>{info.organizacion}</strong> en Cofianza para gestionar inmuebles y expedientes en
        equipo.
      </p>

      <p className="text-xs text-gray-500 mb-6">
        Invitación enviada a: <strong className="text-gray-700">{info.email}</strong>
      </p>

      {/* No autenticado + ya tiene cuenta -> iniciar sesión */}
      {!isAuthenticated && info.tiene_cuenta && (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Ya tienes una cuenta con este correo. Inicia sesión y vuelve a este enlace para aceptar.
          </p>
          <button
            onClick={() => saveTokenAndGo('/login')}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            Iniciar sesión
          </button>
        </div>
      )}

      {/* No autenticado + sin cuenta -> registro inline */}
      {!isAuthenticated && !info.tiene_cuenta && (
        <form onSubmit={handleRegistrar} className="space-y-4">
          <p className="text-sm text-gray-700 font-medium">Crea tu cuenta para unirte</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Apellido</label>
              <input
                type="text"
                required
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <div>
            <PhoneInput
              label="Teléfono (WhatsApp)"
              value={telefono}
              onChange={setTelefono}
              placeholder="300 123 4567"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Tu WhatsApp de contacto y respaldo para la firma de contratos. Con código de país (ej. +57…).
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? <IconLoader size={16} className="animate-spin" /> : null}
            Crear cuenta y unirme
          </button>
          <p className="text-xs text-gray-500">
            Tu cuenta usará el correo <strong>{info.email}</strong> de la invitación.
          </p>
        </form>
      )}

      {/* Autenticado con rol equivocado */}
      {isAuthenticated && wrongRole && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-900">
            Estás autenticado como <strong>{user?.rol}</strong>. Esta invitación es para unirse como
            inmobiliaria. Cierra sesión e ingresa con la cuenta correcta.
          </p>
          <button
            onClick={handleLogout}
            className="mt-3 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700"
          >
            Cerrar sesión
          </button>
        </div>
      )}

      {/* Autenticado, rol correcto, email no coincide */}
      {isAuthenticated && !wrongRole && !emailMatch && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-900">
            Tu cuenta está asociada al email <strong>{user?.email}</strong>, pero esta invitación fue
            enviada a <strong>{info.email}</strong>. Inicia sesión con el email invitado.
          </p>
          <button
            onClick={handleLogout}
            className="mt-3 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700"
          >
            Cerrar sesión
          </button>
        </div>
      )}

      {/* Autenticado, rol correcto, email coincide -> aceptar */}
      {isAuthenticated && !wrongRole && emailMatch && (
        <div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <IconCheck size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-900">
                Tu cuenta coincide con la invitación. Al aceptar, tendrás acceso a la cartera de{' '}
                {info.organizacion}.
              </p>
            </div>
          </div>
          <button
            onClick={handleAceptar}
            disabled={submitting}
            className="w-full px-4 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? <IconLoader size={16} className="animate-spin" /> : null}
            Aceptar invitación
          </button>
        </div>
      )}
    </div>
  )
}
