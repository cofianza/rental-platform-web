/**
 * SelfieCapture - HP-327
 * Componente para captura de selfie con camara
 * Incluye overlay de guia para posicionamiento del rostro
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
} from '@/components/icons'

// ============================================
// Types
// ============================================

interface SelfieCaptureProps {
  onCapture: (file: File) => void
  onCancel: () => void
  isUploading?: boolean
}

type CaptureState = 'initializing' | 'ready' | 'captured' | 'error'

// ============================================
// Component
// ============================================

export function SelfieCapture({ onCapture, onCancel, isUploading = false }: SelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [state, setState] = useState<CaptureState>('initializing')
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
    initializeCamera()
    return () => {
      stopCamera()
      // Clean up captured image URL
      if (capturedImageUrl) {
        URL.revokeObjectURL(capturedImageUrl)
      }
    }
  }, [initializeCamera, stopCamera])

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

      {/* Camera view / Captured image */}
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

        {(state === 'ready' || state === 'captured') && (
          <>
            {/* Video feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full max-h-full object-contain transform scale-x-[-1] ${
                state === 'captured' ? 'hidden' : ''
              }`}
            />

            {/* Captured image preview */}
            {state === 'captured' && capturedImageUrl && (
              <img
                src={capturedImageUrl}
                alt="Selfie capturada"
                className="h-full max-h-full object-contain"
              />
            )}

            {/* Face guide overlay (only when ready) */}
            {state === 'ready' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Oval face guide */}
                <div className="relative w-64 h-80">
                  {/* Outer dark overlay with cutout */}
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 256 320"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <mask id="faceMask">
                        <rect width="100%" height="100%" fill="white" />
                        <ellipse cx="128" cy="160" rx="100" ry="140" fill="black" />
                      </mask>
                    </defs>
                    <rect
                      width="100%"
                      height="100%"
                      fill="rgba(0,0,0,0.5)"
                      mask="url(#faceMask)"
                    />
                    <ellipse
                      cx="128"
                      cy="160"
                      rx="100"
                      ry="140"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      strokeDasharray="8 4"
                    />
                  </svg>
                </div>

                {/* Instructions */}
                <div className="absolute bottom-32 left-0 right-0 text-center">
                  <p className="text-white text-sm bg-black/50 inline-block px-4 py-2 rounded-full">
                    Centra tu rostro en el ovalo
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
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
      </div>
    </div>
  )
}
