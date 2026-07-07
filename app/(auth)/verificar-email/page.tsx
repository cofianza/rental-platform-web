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
      setErrorMessage('El enlace de verificación es inválido o ha expirado.')
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
      setResendMessage('Si el email está registrado, recibirás un nuevo enlace de verificación.')
    } catch {
      setResendMessage('No se pudo enviar el correo. Intenta de nuevo más tarde.')
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
          <p className="text-sm text-gray-500">Esto solo tomará un momento.</p>
        </div>
      )}

      {state === 'success' && (
        <div className="space-y-5">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <IconCheck size={32} className="text-green-600" />
            </div>
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-gray-900">
              ¡Bienvenido a Cofianza!
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Verificamos tu correo y tu cuenta ya está activa. Cofianza reemplaza la
              fianza tradicional: <span className="font-semibold text-gray-800">nosotros
              respaldamos el contrato como fiador</span> y, si hay mora, pagamos y
              gestionamos el cobro — tú te enfocas en arrendar.
            </p>
          </div>

          {/* Explicación breve de cómo funciona (onboarding inmobiliaria/propietario) */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-left">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">
              Cómo funciona tu Oficina Virtual
            </p>
            <ul className="space-y-3">
              {[
                {
                  titulo: 'Publicas tus inmuebles',
                  detalle: 'Los subes a la vitrina de Cofianza sin costo y recibes interesados por la web y por WhatsApp.',
                },
                {
                  titulo: 'Estudias al candidato',
                  detalle: 'El candidato paga su estudio de crédito y recibes el resultado (aprobado, condicionado o rechazado) casi al instante.',
                },
                {
                  titulo: 'Generas y firman el contrato',
                  detalle: 'Se genera automático con tus datos y Cofianza como fiador; la firma es 100% digital con validez legal (Ley 527 de 1999).',
                },
                {
                  titulo: 'Quedas respaldado ante la mora',
                  detalle: 'Si el inquilino se atrasa, reportas la mora y Cofianza cubre el canon y gestiona el cobro por ti.',
                },
              ].map((paso, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-800">{paso.titulo}</span>
                    <span className="block text-xs leading-relaxed text-gray-500">{paso.detalle}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Primeros pasos concretos al entrar por primera vez */}
          <div className="rounded-xl border border-primary-100 bg-primary-50/60 p-4 text-left">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-primary-700">
              Tus primeros pasos
            </p>
            <ul className="space-y-2.5">
              {[
                'Completa los datos para el contrato en Configuración (NIT, representante y cuenta de pago).',
                'Publica tu primer inmueble en la vitrina.',
                'Cuando tengas un interesado, crea su expediente y solicita el estudio.',
              ].map((paso, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <IconCheck size={16} className="mt-0.5 shrink-0 text-primary-600" />
                  <span className="text-sm text-gray-700">{paso}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <Link
              href={AUTH_ROUTES.LOGIN}
              className="inline-flex w-full items-center justify-center gap-2 px-6 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition-colors"
            >
              Iniciar sesión y empezar
            </Link>
            <p className="text-xs text-gray-500">
              ¿Dudas? Escríbenos a{' '}
              <a href="mailto:hola@cofianza.co" className="font-medium text-primary-600 hover:text-primary-700">
                hola@cofianza.co
              </a>
            </p>
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
          <h1 className="text-xl font-bold text-gray-900">Verificación fallida</h1>
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
              Volver a inicio de sesión
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
