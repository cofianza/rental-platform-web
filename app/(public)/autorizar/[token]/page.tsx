/**
 * Pagina publica de firma de autorizacion habeas data
 * Accesible sin autenticacion via token unico
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { autorizacionPublicService } from '@/services/autorizacionService'
import { SignatureCanvas } from '@/components/ui/SignatureCanvas'
import type { IAutorizacionPublicData, MetodoFirma } from '@/types/autorizacion'

// ============================================
// Types
// ============================================

type PageState = 'loading' | 'form' | 'signed' | 'error'
type OtpState = 'idle' | 'sending' | 'sent' | 'verifying' | 'verified'

// ============================================
// Page Component
// ============================================

export default function AutorizarPage() {
  const params = useParams()
  const token = params.token as string

  const [pageState, setPageState] = useState<PageState>('loading')
  const [data, setData] = useState<IAutorizacionPublicData | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  // Form state
  const [acepta, setAcepta] = useState(false)
  const [metodo, setMetodo] = useState<MetodoFirma>('canvas')
  const [firmaData, setFirmaData] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [hashDocumento, setHashDocumento] = useState<string | null>(null)

  // OTP state
  const [otpState, setOtpState] = useState<OtpState>('idle')
  const [otpCodigo, setOtpCodigo] = useState('')
  const [otpCooldown, setOtpCooldown] = useState(0)

  // Load data
  useEffect(() => {
    async function load() {
      try {
        const result = await autorizacionPublicService.getData(token)
        setData(result)
        setPageState('form')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Enlace invalido o expirado'
        setErrorMessage(msg)
        setPageState('error')
      }
    }
    load()
  }, [token])

  // OTP cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return
    const timer = setTimeout(() => setOtpCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [otpCooldown])

  const handleEnviarOtp = useCallback(async () => {
    setOtpState('sending')
    try {
      await autorizacionPublicService.enviarOtp(token)
      setOtpState('sent')
      setOtpCooldown(60)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al enviar codigo'
      setErrorMessage(msg)
      setOtpState('idle')
    }
  }, [token])

  const handleVerificarOtp = useCallback(async () => {
    if (otpCodigo.length !== 6) return
    setOtpState('verifying')
    try {
      await autorizacionPublicService.verificarOtp(token, otpCodigo)
      setOtpState('verified')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Codigo incorrecto'
      setErrorMessage(msg)
      setOtpState('sent')
    }
  }, [token, otpCodigo])

  const canSubmit =
    acepta &&
    ((metodo === 'canvas' && firmaData) ||
      (metodo === 'otp' && otpState === 'verified'))

  const handleFirmar = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setErrorMessage('')
    try {
      const result = await autorizacionPublicService.firmar(token, {
        metodo_firma: metodo,
        datos_firma: metodo === 'canvas' ? firmaData! : undefined,
        codigo_otp: metodo === 'otp' ? otpCodigo : undefined,
      })
      setHashDocumento(result.hash_documento)
      setPageState('signed')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al firmar'
      setErrorMessage(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ============================================
  // Render states
  // ============================================

  if (pageState === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Cargando autorizacion...</p>
        </div>
      </div>
    )
  }

  if (pageState === 'error' && !data) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Enlace no valido</h2>
        <p className="text-sm text-gray-500">{errorMessage}</p>
      </div>
    )
  }

  if (pageState === 'signed') {
    return (
      <div className="bg-white rounded-xl border border-green-200 p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Autorizacion firmada exitosamente</h2>
        <p className="text-sm text-gray-500">
          Tu autorizacion para consulta en centrales de riesgo ha sido registrada.
        </p>
        {hashDocumento && (
          <p className="text-xs text-gray-400 font-mono break-all">
            Hash de verificacion: {hashDocumento}
          </p>
        )}
        <p className="text-sm text-gray-500">Puedes cerrar esta pagina.</p>
      </div>
    )
  }

  // Form state
  return (
    <div className="space-y-6">
      {/* Banner info */}
      {data && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <h1 className="text-xl font-bold text-gray-900">
            Autorizacion de consulta en centrales de riesgo
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Solicitante:</span>{' '}
              <span className="font-medium text-gray-900">
                {data.solicitante.nombre} {data.solicitante.apellido}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Expediente:</span>{' '}
              <span className="font-medium text-gray-900">{data.expediente.numero_expediente}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-gray-500">Inmueble:</span>{' '}
              <span className="font-medium text-gray-900">
                {data.expediente.inmueble.direccion}, {data.expediente.inmueble.ciudad}
                {data.expediente.inmueble.barrio && ` - ${data.expediente.inmueble.barrio}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Texto legal */}
      {data && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Terminos de la autorizacion</h2>
          <div className="max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {data.texto_legal}
          </div>
          <p className="text-xs text-gray-400">Version: {data.version_terminos}</p>
        </div>
      )}

      {/* Checkbox acepto */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acepta}
            onChange={(e) => setAcepta(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">
            He leido y acepto los terminos de autorizacion para la consulta de mi informacion en centrales de riesgo crediticio.
          </span>
        </label>
      </div>

      {/* Metodo de firma */}
      {acepta && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Metodo de firma</h2>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="metodo"
                value="canvas"
                checked={metodo === 'canvas'}
                onChange={() => setMetodo('canvas')}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Firma manuscrita</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="metodo"
                value="otp"
                checked={metodo === 'otp'}
                onChange={() => setMetodo('otp')}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Codigo OTP por email</span>
            </label>
          </div>

          {/* Canvas signature */}
          {metodo === 'canvas' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Dibuje su firma en el recuadro:</p>
              <SignatureCanvas
                onSignatureChange={setFirmaData}
                width={Math.min(480, typeof window !== 'undefined' ? window.innerWidth - 80 : 480)}
                height={180}
              />
            </div>
          )}

          {/* OTP flow */}
          {metodo === 'otp' && (
            <div className="space-y-4">
              {data && (
                <p className="text-sm text-gray-500">
                  Se enviara un codigo de 6 digitos a <strong>{data.solicitante.email}</strong>
                </p>
              )}

              {/* Send OTP button */}
              {(otpState === 'idle' || otpState === 'sent') && (
                <button
                  onClick={handleEnviarOtp}
                  disabled={otpCooldown > 0}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {otpCooldown > 0
                    ? `Reenviar en ${otpCooldown}s`
                    : otpState === 'sent'
                      ? 'Reenviar codigo'
                      : 'Enviar codigo'
                  }
                </button>
              )}

              {otpState === 'sending' && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  Enviando codigo...
                </div>
              )}

              {/* OTP input */}
              {(otpState === 'sent' || otpState === 'verifying') && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={otpCodigo}
                      onChange={(e) => setOtpCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-40 text-center text-2xl font-mono tracking-widest rounded-lg border border-gray-300 p-3 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <button
                      onClick={handleVerificarOtp}
                      disabled={otpCodigo.length !== 6 || otpState === 'verifying'}
                      className="px-4 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      {otpState === 'verifying' ? 'Verificando...' : 'Verificar'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">El codigo expira en 5 minutos</p>
                </div>
              )}

              {/* OTP verified */}
              {otpState === 'verified' && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Codigo verificado correctamente
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {errorMessage && pageState === 'form' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Submit button */}
      {acepta && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <button
            onClick={handleFirmar}
            disabled={!canSubmit || submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Firmando autorizacion...
              </>
            ) : (
              'Firmar autorizacion'
            )}
          </button>
          <p className="text-xs text-gray-400 text-center mt-3">
            Al firmar, autoriza la consulta de su informacion en centrales de riesgo conforme a la Ley 1581/2012 y Ley 1266/2008.
          </p>
        </div>
      )}
    </div>
  )
}
