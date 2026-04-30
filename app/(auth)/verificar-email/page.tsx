'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { IconCheck, IconX, IconLoader, IconMail } from '@/components/icons'
import { authService } from '@/services/authService'
import { AUTH_ROUTES } from '@/lib/constants'

type VerifyState = 'verifying' | 'success' | 'error'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [state, setState] = useState<VerifyState>('verifying')
  const [errorMessage, setErrorMessage] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  const verify = useCallback(async () => {
    if (!token) {
      setState('error')
      setErrorMessage('Token de verificacion no proporcionado.')
      return
    }

    try {
      await authService.verifyEmail(token)
      setState('success')
    } catch {
      setState('error')
      setErrorMessage('El enlace de verificacion es invalido o ha expirado.')
    }
  }, [token])

  useEffect(() => {
    verify()
  }, [verify])

  const handleResend = async () => {
    if (!resendEmail.trim() || resending) return
    setResending(true)
    setResendMessage(null)

    try {
      await authService.resendVerification(resendEmail)
      setResendMessage('Si el email esta registrado, recibiras un nuevo enlace de verificacion.')
    } catch {
      setResendMessage('No se pudo enviar el correo. Intenta de nuevo mas tarde.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full text-center">
      {/* Logo mobile */}

      {state === 'verifying' && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <IconLoader size={40} className="animate-spin text-primary-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Verificando tu email...</h1>
          <p className="text-sm text-gray-500">Esto solo tomara un momento.</p>
        </div>
      )}

      {state === 'success' && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <IconCheck size={32} className="text-green-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Cuenta activada</h1>
          <p className="text-sm text-gray-600">
            Tu correo fue verificado y tu cuenta quedo activa.
          </p>
          <div className="bg-green-50 rounded-lg p-4 text-sm text-gray-700">
            <p>Ya puedes iniciar sesion para continuar.</p>
          </div>
          <div className="pt-4">
            <Link
              href={AUTH_ROUTES.LOGIN}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              Ir a inicio de sesion
            </Link>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <IconX size={32} className="text-red-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Verificacion fallida</h1>
          <p className="text-sm text-gray-600">{errorMessage}</p>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <p className="text-sm text-gray-600">Ingresa tu email para solicitar un nuevo enlace:</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <IconMail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => { setResendEmail(e.target.value); setResendMessage(null) }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                  placeholder="tu@email.com"
                />
              </div>
              <button
                onClick={handleResend}
                disabled={resending || !resendEmail.trim()}
                className="px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {resending ? <IconLoader size={16} className="animate-spin" /> : 'Enviar'}
              </button>
            </div>
            {resendMessage && (
              <p className="text-xs text-gray-600">{resendMessage}</p>
            )}
          </div>

          <div className="pt-2">
            <Link
              href={AUTH_ROUTES.LOGIN}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Volver a inicio de sesion
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="bg-white rounded-xl shadow-lg p-8 w-full flex justify-center">
        <IconLoader size={24} className="animate-spin text-primary-600" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
