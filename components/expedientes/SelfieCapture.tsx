/**
 * SelfieCapture - HP-327
 * Componente para captura de selfie con camara
 * Incluye overlay de guia para posicionamiento del rostro e identificacion
 *
 * CR Fixes:
 * - Pantalla de instrucciones antes de activar camara (G1)
 * - Guia overlay para rostro E identificacion (criterio 3)
 */

'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  IconCamera,
  IconRefresh,
  IconCheck,
  IconX,
  IconLoader,
  IconAlertTriangle,
  IconArrowRight,
  IconId,
  IconUser,
} from '@/components/icons'

// ============================================
// Types
// ============================================

interface SelfieCaptureProps {
  onCapture: (file: File) => void
  onCancel: () => void
  isUploading?: boolean
}

// CR: Nuevo estado 'instructions' antes de inicializar camara
type CaptureState = 'instructions' | 'initializing' | 'ready' | 'captured' | 'error'

// ============================================
// Instructions Screen subcomponent
// ============================================

interface InstructionsScreenProps {
  onContinue: () => void
  onCancel: () => void
}

function InstructionsScreen({ onContinue, onCancel }: InstructionsScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 bg-gray-900">
      <div className="max-w-sm text-center">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-600/20 flex items-center justify-center">
          <IconCamera size={40} className="text-primary-400" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-white mb-2">
          Captura de Selfie con Identificación
        </h3>
        <p className="text-gray-400 text-sm mb-8">
          Sigue las instrucciones para completar la verificación de identidad
        </p>

        {/* Instructions list */}
        <div className="text-left space-y-4 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
              1
            </div>
            <div>
              <p className="text-white font-medium">Ten a la mano tu documento</p>
              <p className="text-gray-400 text-sm">Cédula de ciudadanía o documento de identidad vigente</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
              2
            </div>
            <div>
              <p className="text-white font-medium">Busca buena iluminacion</p>
              <p className="text-gray-400 text-sm">Asegurate de estar en un lugar bien iluminado</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
              3
            </div>
            <div>
              <p className="text-white font-medium">Sostén el documento junto a tu rostro</p>
              <p className="text-gray-400 text-sm">Coloca tu documento visible al lado de tu cara</p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Continuar
            <IconArrowRight size={20} />
          </button>
          <button
            onClick={onCancel}
            className="w-full px-6 py-3 text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export function SelfieCapture({ onCapture, onCancel, isUploading = false }: SelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // CR: Iniciar con estado 'instructions'
  const [state, setState] = useState<CaptureState>('instructions')
  const [error, setError] = useState<string | null>(null)
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null)
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)

  // ============================================
  // Camera initialization
  // ============================================

  const initializeCamera = useCallback(async () => {
    setState('initializing')
    setError(null)

    try {
      // Request camera access with front-facing camera preferred
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setState('ready')
      }
    } catch (err) {
      console.error('Error accessing camera:', err)

      let errorMessage = 'Error al acceder a la camara'
      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotAllowedError':
            errorMessage = 'Permiso de camara denegado. Por favor, permite el acceso a la camara en la configuracion del navegador.'
            break
          case 'NotFoundError':
            errorMessage = 'No se encontro una camara disponible en este dispositivo.'
            break
          case 'NotReadableError':
            errorMessage = 'La camara esta siendo usada por otra aplicacion.'
            break
          case 'OverconstrainedError':
            errorMessage = 'No se pudo acceder a la camara con la configuracion solicitada.'
            break
        }
      }

      setError(errorMessage)
      setState('error')
    }
  }, [])

  // ============================================
  // Cleanup
  // ============================================

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => {
    // CR: Solo inicializar cleanup, no la camara automaticamente
    return () => {
      stopCamera()
      if (capturedImageUrl) {
        URL.revokeObjectURL(capturedImageUrl)
      }
    }
  }, [stopCamera, capturedImageUrl])

  // CR: Handler para continuar desde instrucciones
  const handleContinueFromInstructions = useCallback(() => {
    initializeCamera()
  }, [initializeCamera])

  // ============================================
  // Capture photo
  // ============================================

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || state !== 'ready') return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw the video frame to canvas (mirrored for selfie effect)
    ctx.save()
    ctx.scale(-1, 1)
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
    ctx.restore()

    // Convert canvas to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          setCapturedImageUrl(url)
          setCapturedBlob(blob)
          setState('captured')
          stopCamera()
        }
      },
      'image/jpeg',
      0.9
    )
  }, [state, stopCamera])

  // ============================================
  // Retake photo
  // ============================================

  const retakePhoto = useCallback(() => {
    if (capturedImageUrl) {
      URL.revokeObjectURL(capturedImageUrl)
    }
    setCapturedImageUrl(null)
    setCapturedBlob(null)
    initializeCamera()
  }, [capturedImageUrl, initializeCamera])

  // ============================================
  // Confirm capture
  // ============================================

  const confirmCapture = useCallback(() => {
    if (!capturedBlob) return

    // Create File from Blob
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const file = new File([capturedBlob], `selfie_${timestamp}.jpg`, {
      type: 'image/jpeg',
    })

    onCapture(file)
  }, [capturedBlob, onCapture])

  // ============================================
  // Render
  // ============================================

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
        <h2 className="text-white font-medium">Captura de Selfie</h2>
        <button
          onClick={onCancel}
          disabled={isUploading}
          className="p-2 text-white hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50"
        >
          <IconX size={24} />
        </button>
      </div>

      {/* CR: Instructions screen before camera */}
      {state === 'instructions' && (
        <InstructionsScreen
          onContinue={handleContinueFromInstructions}
          onCancel={onCancel}
        />
      )}

      {/* Camera view / Captured image */}
      {state !== 'instructions' && (
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-gray-900">
          {state === 'initializing' && (
            <div className="text-center text-white">
              <IconLoader size={48} className="mx-auto animate-spin mb-4" />
              <p>Iniciando camara...</p>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center text-white max-w-sm mx-auto px-4">
              <IconAlertTriangle size={48} className="mx-auto text-yellow-400 mb-4" />
              <p className="mb-4">{error}</p>
              <button
                onClick={initializeCamera}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <IconRefresh size={18} />
                Reintentar
              </button>
            </div>
          )}

          {(state === 'initializing' || state === 'ready' || state === 'captured') && (
            <>
              {/* Video feed — rendered during initializing (hidden) so ref is available for getUserMedia */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full max-h-full object-contain transform scale-x-[-1] ${
                  state !== 'ready' ? 'hidden' : ''
                }`}
              />

              {/* Captured image preview */}
              {state === 'captured' && capturedImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={capturedImageUrl}
                  alt="Selfie capturada"
                  className="h-full max-h-full object-contain"
                />
              )}

              {/* CR: Guide overlay for face AND ID document (only when ready) */}
              {state === 'ready' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Combined guide: Face on left, ID on right */}
                  <div className="relative w-full max-w-md h-80 mx-4">
                    <svg
                      className="absolute inset-0 w-full h-full"
                      viewBox="0 0 400 320"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <defs>
                        <mask id="combinedMask">
                          <rect width="100%" height="100%" fill="white" />
                          {/* Face oval cutout - left side */}
                          <ellipse cx="130" cy="160" rx="80" ry="110" fill="black" />
                          {/* ID card cutout - right side */}
                          <rect x="230" y="100" width="140" height="90" rx="8" fill="black" />
                        </mask>
                      </defs>
                      {/* Semi-transparent overlay */}
                      <rect
                        width="100%"
                        height="100%"
                        fill="rgba(0,0,0,0.5)"
                        mask="url(#combinedMask)"
                      />
                      {/* Face oval guide */}
                      <ellipse
                        cx="130"
                        cy="160"
                        rx="80"
                        ry="110"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeDasharray="8 4"
                      />
                      {/* ID card guide */}
                      <rect
                        x="230"
                        y="100"
                        width="140"
                        height="90"
                        rx="8"
                        fill="none"
                        stroke="#60a5fa"
                        strokeWidth="2"
                        strokeDasharray="8 4"
                      />
                      {/* Labels */}
                      <text x="130" y="290" textAnchor="middle" fill="white" fontSize="12" fontWeight="500">
                        Tu rostro
                      </text>
                      <text x="300" y="210" textAnchor="middle" fill="#60a5fa" fontSize="12" fontWeight="500">
                        Documento ID
                      </text>
                    </svg>

                    {/* Icon hints */}
                    <div className="absolute left-[80px] top-[50px] text-white/60">
                      <IconUser size={24} />
                    </div>
                    <div className="absolute right-[60px] top-[80px] text-blue-400/60">
                      <IconId size={24} />
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="absolute bottom-28 left-0 right-0 text-center px-4">
                    <p className="text-white text-sm bg-black/60 inline-block px-4 py-2 rounded-full">
                      Centra tu rostro y sostén el documento visible
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Controls */}
      {state !== 'instructions' && (
        <div className="px-4 py-6 bg-gray-900">
          {state === 'ready' && (
            <div className="flex justify-center">
              <button
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors shadow-lg"
              >
                <div className="w-16 h-16 rounded-full border-4 border-gray-900 flex items-center justify-center">
                  <IconCamera size={32} className="text-gray-900" />
                </div>
              </button>
            </div>
          )}

          {state === 'captured' && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={retakePhoto}
                disabled={isUploading}
                className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <IconRefresh size={20} />
                Tomar otra
              </button>
              <button
                onClick={confirmCapture}
                disabled={isUploading}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <IconLoader size={20} className="animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <IconCheck size={20} />
                    Usar esta foto
                  </>
                )}
              </button>
            </div>
          )}

          {state === 'error' && (
            <div className="flex justify-center">
              <button
                onClick={onCancel}
                className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}

          {state === 'initializing' && (
            <div className="flex justify-center">
              <button
                onClick={onCancel}
                className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
