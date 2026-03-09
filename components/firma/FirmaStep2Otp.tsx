/**
 * FirmaStep2Otp - HP-342/HP-343
 * Paso 2: Verificacion OTP con input de 6 digitos
 * Autofocus y navegacion automatica entre campos
 * Conectado a endpoints reales de solicitar/verificar OTP
 */

'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { firmaService } from '@/services/firmaService'
import {
  IconMail,
  IconLoader,
  IconArrowLeft,
  IconAlertTriangle,
  IconRefresh,
} from '@/components/icons'

interface FirmaStep2OtpProps {
  email: string
  token: string
  onSubmit: (code: string) => Promise<void>
  onChange: (code: string) => void
  value: string
  isSubmitting: boolean
  error: string | null
  onBack: () => void
}

const OTP_LENGTH = 6

type OtpPhase = 'initial' | 'sending' | 'input'

export function FirmaStep2Otp({
  email,
  token,
  onSubmit,
  onChange,
  value,
  isSubmitting,
  error,
  onBack,
}: FirmaStep2OtpProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [resendCooldown, setResendCooldown] = useState(0)
  const [phase, setPhase] = useState<OtpPhase>('initial')
  const [sendError, setSendError] = useState<string | null>(null)
  const [maskedDestination, setMaskedDestination] = useState<string | null>(null)

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, OTP_LENGTH)
  }, [])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Focus first input when entering input phase
  useEffect(() => {
    if (phase === 'input') {
      setTimeout(() => {
        inputRefs.current[0]?.focus()
      }, 100)
    }
  }, [phase])

  // Send OTP request
  const handleSendOtp = useCallback(async () => {
    setPhase('sending')
    setSendError(null)

    try {
      const result = await firmaService.solicitarOtp(token)
      setMaskedDestination(result.destino_enmascarado)
      setResendCooldown(60)
      setPhase('input')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al enviar el codigo'
      setSendError(msg)
      setPhase('initial')
    }
  }, [token])

  // Handle input change
  const handleChange = useCallback(
    (index: number, inputValue: string) => {
      const digit = inputValue.replace(/\D/g, '').slice(-1)

      const digits = value.split('')
      digits[index] = digit
      const newValue = digits.join('').slice(0, OTP_LENGTH)
      onChange(newValue)

      if (digit && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus()
      }

      if (newValue.length === OTP_LENGTH && !isSubmitting) {
        onSubmit(newValue)
      }
    },
    [value, onChange, onSubmit, isSubmitting]
  )

  // Handle key down for backspace navigation
  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        const digits = value.split('')
        if (!digits[index] && index > 0) {
          inputRefs.current[index - 1]?.focus()
          digits[index - 1] = ''
          onChange(digits.join(''))
        } else {
          digits[index] = ''
          onChange(digits.join(''))
        }
        e.preventDefault()
      } else if (e.key === 'ArrowLeft' && index > 0) {
        inputRefs.current[index - 1]?.focus()
      } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus()
      }
    },
    [value, onChange]
  )

  // Handle paste
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault()
      const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
      onChange(pastedData)

      const focusIndex = Math.min(pastedData.length, OTP_LENGTH - 1)
      inputRefs.current[focusIndex]?.focus()

      if (pastedData.length === OTP_LENGTH && !isSubmitting) {
        setTimeout(() => onSubmit(pastedData), 100)
      }
    },
    [onChange, onSubmit, isSubmitting]
  )

  // Resend OTP
  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return
    setSendError(null)

    try {
      const result = await firmaService.solicitarOtp(token)
      setMaskedDestination(result.destino_enmascarado)
      setResendCooldown(60)
      onChange('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al reenviar el codigo'
      setSendError(msg)
    }
  }, [resendCooldown, token, onChange])

  // Mask email for initial display
  const displayEmail = maskedDestination || email.replace(/(.{2})(.*)(@.*)/, '$1***$3')

  // ============================================
  // Phase: Initial — show "Send code" button
  // ============================================
  if (phase === 'initial' || phase === 'sending') {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <IconMail size={32} className="text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            Verifica tu identidad
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Enviaremos un codigo de 6 digitos a
          </p>
          <p className="font-medium text-gray-700">
            {displayEmail}
          </p>
        </div>

        {sendError && (
          <div className="flex items-center justify-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
            <IconAlertTriangle size={18} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-600">{sendError}</p>
          </div>
        )}

        <button
          onClick={handleSendOtp}
          disabled={phase === 'sending'}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
        >
          {phase === 'sending' ? (
            <>
              <IconLoader size={20} className="animate-spin" />
              Enviando codigo...
            </>
          ) : (
            <>
              <IconMail size={20} />
              Enviar codigo de verificacion
            </>
          )}
        </button>

        <div className="flex justify-between pt-4 border-t border-gray-100">
          <button
            onClick={onBack}
            disabled={phase === 'sending'}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            <IconArrowLeft size={18} />
            Volver
          </button>
        </div>
      </div>
    )
  }

  // ============================================
  // Phase: Input — show OTP input fields
  // ============================================
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
          <IconMail size={32} className="text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          Verifica tu identidad
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Ingresa el codigo de 6 digitos enviado a
        </p>
        <p className="font-medium text-gray-700">
          {displayEmail}
        </p>
      </div>

      {/* OTP Input */}
      <div className="flex justify-center gap-2 sm:gap-3">
        {Array.from({ length: OTP_LENGTH }).map((_, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[index] || ''}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={isSubmitting}
            className={`
              w-12 h-14 sm:w-14 sm:h-16
              text-center text-2xl font-bold
              border-2 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
              ${error
                ? 'border-red-300 bg-red-50'
                : value[index]
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 bg-white'
              }
            `}
            aria-label={`Digito ${index + 1}`}
          />
        ))}
      </div>

      {/* Error message */}
      {(error || sendError) && (
        <div className="flex items-center justify-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
          <IconAlertTriangle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{error || sendError}</p>
        </div>
      )}

      {/* Loading state */}
      {isSubmitting && (
        <div className="flex items-center justify-center gap-2 text-primary-600">
          <IconLoader size={20} className="animate-spin" />
          <span className="text-sm">Verificando codigo...</span>
        </div>
      )}

      {/* Resend link */}
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-2">
          No recibiste el codigo?
        </p>
        <button
          onClick={handleResend}
          disabled={resendCooldown > 0 || isSubmitting}
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <IconRefresh size={16} />
          {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar codigo'}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-100">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          <IconArrowLeft size={18} />
          Volver
        </button>
      </div>

      {/* Help text */}
      <p className="text-xs text-gray-400 text-center">
        El codigo expira en 10 minutos. Si no lo recibes, revisa tu carpeta de spam.
      </p>
    </div>
  )
}
