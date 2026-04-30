'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { IconCheck, IconMail, IconLoader } from '@/components/icons'
import { authService } from '@/services/authService'
import { AUTH_ROUTES } from '@/lib/constants'

function SuccessContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  const handleResend = async () => {
    if (!email || resending) return
    setResending(true)
    setResendMessage(null)

    try {
      await authService.resendVerification(email)
      setResendMessage('Correo de verificacion reenviado. Revisa tu bandeja de entrada.')
    } catch {
      setResendMessage('No se pudo reenviar el correo. Intenta de nuevo mas tarde.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full text-center">
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <IconCheck size={32} className="text-green-600" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Registro exitoso</h1>

      <div className="space-y-4 mt-6">
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <IconMail size={20} className="text-primary-600" />
          <p className="text-sm">
            Hemos enviado un enlace de verificacion a{' '}
            <span className="font-medium text-gray-900">{email}</span>
          </p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 text-sm text-gray-600 space-y-2">
          <p>Revisa tu <span className="font-medium">bandeja de entrada</span> y la carpeta de <span className="font-medium">spam</span>.</p>
          <p>Una vez verificado tu email, un administrador activara tu cuenta para que puedas acceder a la plataforma.</p>
        </div>

        {resendMessage && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-700">{resendMessage}</p>
          </div>
        )}

        <button
          onClick={handleResend}
          disabled={resending || !email}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resending ? (
            <>
              <IconLoader size={16} className="animate-spin" /> Reenviando...
            </>
          ) : (
            'Reenviar correo de verificacion'
          )}
        </button>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <Link
          href={AUTH_ROUTES.LOGIN}
          className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
        >
          Volver a inicio de sesion
        </Link>
      </div>
    </div>
  )
}

export default function RegisterSuccessPage() {
  return (
    <Suspense fallback={
      <div className="bg-white rounded-xl shadow-lg p-8 w-full flex justify-center">
        <IconLoader size={24} className="animate-spin text-primary-600" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
