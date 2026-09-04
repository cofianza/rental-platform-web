/**
 * Canje de invitación externa — sección 5.4 minuta 8-abr
 * El cliente llega aquí con el link del email que envió el propietario.
 * Decide UX según el estado de auth (useAuthStore, local al cliente).
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { IconLoader, IconHome, IconX, IconCheck } from '@/components/icons'
import { useAuthStore } from '@/stores/auth.store'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency } from '@/lib/constants'
import {
  getInvitacionInfo,
  canjearInvitacion,
  type InvitacionInfo,
} from '@/services/invitacionService'

type Status = 'loading' | 'error' | 'ready'

export default function InvitacionPage() {
  const params = useParams()
  const router = useRouter()
  const token = (params?.token as string) || ''

  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const { logout } = useAuth()

  const [status, setStatus] = useState<Status>('loading')
  const [info, setInfo] = useState<InvitacionInfo | null>(null)
  const [errorCode, setErrorCode] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [canjeando, setCanjeando] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorCode('TOKEN_MISSING')
      setErrorMsg('No se proporcionó un token de invitación.')
      return
    }

    getInvitacionInfo(token)
      .then((data) => {
        setInfo(data)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        setStatus('error')
        const errObj = err as { code?: string; message?: string }
        setErrorCode(errObj.code || 'UNKNOWN_ERROR')
        setErrorMsg(errObj.message || 'No se pudo cargar la invitación.')
      })
  }, [token])

  const saveTokenAndGo = (dest: string) => {
    sessionStorage.setItem('invitacion_token', token)
    router.push(dest)
  }

  const handleCanjear = async () => {
    if (!info) return
    setCanjeando(true)
    try {
      const result = await canjearInvitacion(token)
      sessionStorage.removeItem('invitacion_token')
      toast.success('Tu expediente está listo. El siguiente paso es autorizar la consulta en centrales')
      router.push(result.redirect)
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string }
      toast.error(errObj.message || 'No se pudo canjear la invitación')
      setCanjeando(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    // Al cerrar sesión el usuario puede ingresar con el email correcto.
    // El token sigue válido (no canjeado) — lo preservamos en sessionStorage.
    sessionStorage.setItem('invitacion_token', token)
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
      errorCode === 'INVITACION_YA_CANJEADA'
        ? 'Esta invitación ya fue canjeada'
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

  if (!info) return null

  const emailInvitacion = info.email_invitacion
  const emailMatch =
    isAuthenticated && user?.email?.toLowerCase() === emailInvitacion.toLowerCase()
  const wrongRole = isAuthenticated && user?.rol !== 'solicitante'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Tienes una invitación</h1>
      <p className="text-sm text-gray-600 mb-6">
        <strong>{info.propietario_invitante.nombre_publico}</strong> te invitó a iniciar tu
        expediente de arrendamiento para el siguiente inmueble:
      </p>

      {/* Tarjeta del inmueble */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <p className="text-xs text-gray-500 font-mono">{info.inmueble.codigo}</p>
            <p className="text-base font-semibold text-gray-900 mt-1">
              {info.inmueble.direccion}
            </p>
            <p className="text-sm text-gray-600">{info.inmueble.ciudad}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Canon mensual</p>
            <p className="text-lg font-bold text-primary-700">
              {formatCurrency(info.inmueble.valor_arriendo)}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
          Expediente: <span className="font-mono">{info.expediente.numero}</span>
        </p>
      </div>

      <p className="text-xs text-gray-500 mb-6">
        Invitación enviada a: <strong className="text-gray-700">{emailInvitacion}</strong>
      </p>

      {/* Decisión UX por estado de auth */}
      {!isAuthenticated && (
        <div className="space-y-3">
          <p className="text-sm text-gray-700 font-medium">
            Para continuar, inicia sesión o crea una cuenta.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => saveTokenAndGo('/login')}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-primary-700 bg-white border-2 border-primary-600 rounded-lg hover:bg-primary-50"
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => saveTokenAndGo('/registro/solicitante')}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              Crear cuenta
            </button>
          </div>
        </div>
      )}

      {isAuthenticated && wrongRole && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-900">
            Estás autenticado como <strong>{user?.rol}</strong>. Esta invitación solo puede
            canjearse desde una cuenta de solicitante. Cierra sesión e ingresa con una cuenta
            adecuada.
          </p>
          <button
            onClick={handleLogout}
            className="mt-3 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700"
          >
            Cerrar sesión
          </button>
        </div>
      )}

      {isAuthenticated && !wrongRole && !emailMatch && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-900">
            Tu cuenta está asociada al email <strong>{user?.email}</strong>, pero esta
            invitación fue enviada a <strong>{emailInvitacion}</strong>. Debes iniciar sesión
            con el email al que se envió la invitación.
          </p>
          <button
            onClick={handleLogout}
            className="mt-3 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700"
          >
            Cerrar sesión
          </button>
        </div>
      )}

      {isAuthenticated && !wrongRole && emailMatch && (
        <div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <IconCheck size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-900">
                Tu cuenta coincide con la invitación. Al canjear, se vinculará este expediente
                a tu perfil y podrás autorizar la consulta en centrales de riesgo (el cobro del
                estudio llega después de que autorices).
              </p>
            </div>
          </div>
          <button
            onClick={handleCanjear}
            disabled={canjeando}
            className="w-full px-4 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {canjeando ? (
              <>
                <IconLoader size={16} className="animate-spin" />
                Canjeando...
              </>
            ) : (
              'Canjear invitación'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
