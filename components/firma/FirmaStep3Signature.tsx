/**
 * FirmaStep3Signature - HP-342
 * Paso 3: Canvas de firma con soporte para touch y mouse
 * Mobile-first, responsive
 */

'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import {
  IconPencil,
  IconTrash,
  IconArrowLeft,
  IconArrowRight,
} from '@/components/icons'

interface FirmaStep3SignatureProps {
  nombreFirmante: string
  onComplete: (signatureDataUrl: string) => void
  onBack: () => void
}

export function FirmaStep3Signature({
  nombreFirmante,
  onComplete,
  onBack,
}: FirmaStep3SignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null)

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match display size
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Configure drawing style
    ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Draw signature line
    drawSignatureLine(ctx, rect.width)
  }, [])

  // Draw the baseline for signature
  const drawSignatureLine = (ctx: CanvasRenderingContext2D, width: number) => {
    ctx.save()
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 3])
    ctx.beginPath()
    const y = 140 // Position for signature line
    ctx.moveTo(20, y)
    ctx.lineTo(width - 20, y)
    ctx.stroke()
    ctx.restore()

    // Restore drawing style
    ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 2.5
    ctx.setLineDash([])
  }

  // Get position from event (supports both mouse and touch)
  const getPosition = useCallback((
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    let clientX: number, clientY: number

    if ('touches' in e) {
      if (e.touches.length === 0) return null
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }, [])

  // Start drawing
  const startDrawing = useCallback((
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault()
    const pos = getPosition(e)
    if (!pos) return

    setIsDrawing(true)
    setLastPos(pos)
    setHasSignature(true)
  }, [getPosition])

  // Draw
  const draw = useCallback((
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault()
    if (!isDrawing || !lastPos) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const pos = getPosition(e)
    if (!pos) return

    ctx.beginPath()
    ctx.moveTo(lastPos.x, lastPos.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()

    setLastPos(pos)
  }, [isDrawing, lastPos, getPosition])

  // Stop drawing
  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
    setLastPos(null)
  }, [])

  // Clear signature
  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Reset scale for proper drawing
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)

    // Redraw signature line
    drawSignatureLine(ctx, rect.width)

    setHasSignature(false)
  }, [])

  // Get signature as data URL
  const handleContinue = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !hasSignature) return

    const dataUrl = canvas.toDataURL('image/png')
    onComplete(dataUrl)
  }, [hasSignature, onComplete])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
          <IconPencil size={32} className="text-purple-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          Dibuja tu firma
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Usa tu dedo o mouse para firmar en el area de abajo
        </p>
      </div>

      {/* Signature canvas */}
      <div className="relative">
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full touch-none cursor-crosshair"
            style={{ height: '200px' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        {/* Clear button */}
        {hasSignature && (
          <button
            onClick={clearSignature}
            className="absolute top-2 right-2 p-2 bg-white/90 text-gray-500 hover:text-red-500 rounded-lg border border-gray-200 transition-colors"
            title="Borrar firma"
          >
            <IconTrash size={18} />
          </button>
        )}

        {/* Helper text below canvas */}
        <p className="text-xs text-gray-400 text-center mt-2">
          {nombreFirmante}
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Instrucciones:</span>
        </p>
        <ul className="mt-2 text-sm text-gray-500 space-y-1">
          <li>• Firma dentro del area delimitada</li>
          <li>• Puedes borrar y volver a intentar si es necesario</li>
          <li>• La firma debe ser clara y legible</li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-100">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          <IconArrowLeft size={18} />
          Volver
        </button>

        <button
          onClick={handleContinue}
          disabled={!hasSignature}
          className={`
            flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors
            ${hasSignature
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Continuar
          <IconArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
