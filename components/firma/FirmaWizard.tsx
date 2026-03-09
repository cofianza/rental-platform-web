/**
 * FirmaWizard - HP-342
 * Wizard de 4 pasos para firma electronica publica
 * Mobile-first, sin autenticacion
 */

'use client'

import { useState, useCallback } from 'react'
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
  })

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
