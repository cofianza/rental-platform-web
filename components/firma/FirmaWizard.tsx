/**
 * FirmaWizard - HP-342
 * Wizard de 4 pasos para firma electronica publica
 * Mobile-first, sin autenticacion
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import type { ISolicitudFirmaPublic } from '@/types/firma'
import { firmaService } from '@/services/firmaService'
import { FirmaStepIndicator } from './FirmaStepIndicator'
import { FirmaStep1Summary } from './FirmaStep1Summary'
import { FirmaStep2Otp } from './FirmaStep2Otp'
import { FirmaStep3Signature } from './FirmaStep3Signature'
import { FirmaStep4Confirmation } from './FirmaStep4Confirmation'

// ============================================
// Types
// ============================================

export type FirmaWizardStep = 1 | 2 | 3 | 4

interface FirmaWizardProps {
  data: ISolicitudFirmaPublic
  token: string
}

interface GeoData {
  latitud: number
  longitud: number
  precision: number
}

interface WizardState {
  step: FirmaWizardStep
  otpValidated: boolean
  otpCode: string
  signatureDataUrl: string | null
  legalAccepted: boolean
  isSubmitting: boolean
  error: string | null
  geo: GeoData | null
  firmadoEn: string | null
  tokenExpired: boolean
}

const STEP_LABELS = [
  'Resumen',
  'Verificacion',
  'Firma',
  'Confirmacion',
]

// ============================================
// Component
// ============================================

export function FirmaWizard({ data, token }: FirmaWizardProps) {
  const [state, setState] = useState<WizardState>({
    step: 1,
    otpValidated: false,
    otpCode: '',
    signatureDataUrl: null,
    legalAccepted: false,
    isSubmitting: false,
    error: null,
    geo: null,
    firmadoEn: null,
    tokenExpired: false,
  })

  // Check token expiration every 60 seconds
  useEffect(() => {
    function checkExpiration() {
      if (new Date(data.token_expiracion) < new Date()) {
        setState((s) => ({ ...s, tokenExpired: true }))
      }
    }
    checkExpiration()
    const interval = setInterval(checkExpiration, 60_000)
    return () => clearInterval(interval)
  }, [data.token_expiracion])

  // Navigate between steps
  const goToStep = useCallback((step: FirmaWizardStep) => {
    setState((s) => ({ ...s, step, error: null }))
  }, [])

  const nextStep = useCallback(() => {
    setState((s) => ({
      ...s,
      step: Math.min(s.step + 1, 4) as FirmaWizardStep,
      error: null,
    }))
  }, [])

  const prevStep = useCallback(() => {
    setState((s) => ({
      ...s,
      step: Math.max(s.step - 1, 1) as FirmaWizardStep,
      error: null,
    }))
  }, [])

  // Step 1: Start signing process
  const handleStartSigning = useCallback(() => {
    nextStep()
  }, [nextStep])

  // Step 2: OTP validation
  const handleOtpChange = useCallback((code: string) => {
    setState((s) => ({ ...s, otpCode: code }))
  }, [])

  const handleOtpSubmit = useCallback(async (code: string) => {
    setState((s) => ({ ...s, isSubmitting: true, error: null }))

    try {
      await firmaService.verificarOtp(token, code)

      setState((s) => ({
        ...s,
        otpValidated: true,
        otpCode: code,
        isSubmitting: false,
      }))
      nextStep()
    } catch (err) {
      setState((s) => ({
        ...s,
        isSubmitting: false,
        error: err instanceof Error ? err.message : 'Error al validar codigo',
      }))
    }
  }, [nextStep, token])

  // Request geolocation (non-blocking, 10s timeout)
  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState((s) => ({
          ...s,
          geo: {
            latitud: position.coords.latitude,
            longitud: position.coords.longitude,
            precision: position.coords.accuracy,
          },
        }))
      },
      () => { /* silently ignore — geolocation is optional */ },
      { timeout: 10000, enableHighAccuracy: false },
    )
  }, [])

  // Step 3: Capture signature
  const handleSignatureComplete = useCallback((dataUrl: string) => {
    setState((s) => ({
      ...s,
      signatureDataUrl: dataUrl,
    }))
    nextStep()
  }, [nextStep])

  // Step 4: Legal acceptance and final submission
  const handleLegalAcceptChange = useCallback((accepted: boolean) => {
    setState((s) => ({ ...s, legalAccepted: accepted }))
  }, [])

  const handleFinalSubmit = useCallback(async () => {
    if (!state.legalAccepted || !state.signatureDataUrl) {
      setState((s) => ({
        ...s,
        error: 'Debes aceptar los terminos legales',
      }))
      return
    }

    setState((s) => ({ ...s, isSubmitting: true, error: null }))

    try {
      const result = await firmaService.completarFirma(token, {
        firma_imagen: state.signatureDataUrl,
        user_agent: navigator.userAgent,
        ...(state.geo && {
          geo_latitud: state.geo.latitud,
          geo_longitud: state.geo.longitud,
          geo_precision: state.geo.precision,
        }),
      })

      setState((s) => ({ ...s, isSubmitting: false, firmadoEn: result.firmado_en }))
    } catch (err) {
      setState((s) => ({
        ...s,
        isSubmitting: false,
        error: err instanceof Error ? err.message : 'Error al enviar firma',
      }))
    }
  }, [state.legalAccepted, state.signatureDataUrl, state.geo, token])

  // Show expiration message if token expired mid-process (but not if already signed)
  if (state.tokenExpired && !state.firmadoEn) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          El enlace de firma ha expirado
        </h2>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          El tiempo para completar la firma se ha agotado. Por seguridad, el enlace ya no es válido.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left max-w-sm mx-auto">
          <p className="text-sm text-amber-800 font-medium mb-1">
            ¿Qué puedes hacer?
          </p>
          <p className="text-sm text-amber-700">
            Contacta al administrador de tu expediente para que te envíe un nuevo enlace de firma.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <FirmaStepIndicator
        currentStep={state.step}
        steps={STEP_LABELS}
        completedSteps={state.step - 1}
      />

      {/* Step content */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {state.step === 1 && (
          <FirmaStep1Summary
            data={data}
            onContinue={handleStartSigning}
          />
        )}

        {state.step === 2 && (
          <FirmaStep2Otp
            email={data.email_firmante}
            token={token}
            onSubmit={handleOtpSubmit}
            onChange={handleOtpChange}
            value={state.otpCode}
            isSubmitting={state.isSubmitting}
            error={state.error}
            onBack={prevStep}
          />
        )}

        {state.step === 3 && (
          <FirmaStep3Signature
            nombreFirmante={data.nombre_firmante}
            onComplete={handleSignatureComplete}
            onBack={prevStep}
            onRequestGeo={requestGeolocation}
          />
        )}

        {state.step === 4 && (
          <FirmaStep4Confirmation
            data={data}
            signatureDataUrl={state.signatureDataUrl}
            legalAccepted={state.legalAccepted}
            onLegalAcceptChange={handleLegalAcceptChange}
            onSubmit={handleFinalSubmit}
            onBack={prevStep}
            isSubmitting={state.isSubmitting}
            error={state.error}
            firmadoEn={state.firmadoEn}
          />
        )}
      </div>
    </div>
  )
}
