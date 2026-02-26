/**
 * ImageViewer - Visor de imagenes con zoom, pan y rotacion
 * Patron de zoom/pan tomado de Lightbox.tsx (HP-203)
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { IconPlus, IconMinus, IconMaximize, IconRotateCw } from '@/components/icons'

interface ImageViewerProps {
  url: string
  alt: string
}

const ZOOM_LEVELS = [1, 1.5, 2, 3]
const MIN_ZOOM = 1
const MAX_ZOOM = 3

export function ImageViewer({ url, alt }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Reset state when URL changes
  useEffect(() => {
    setZoom(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
  }, [url])

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => {
      const idx = ZOOM_LEVELS.findIndex((z) => z >= prev)
      return ZOOM_LEVELS[Math.min(idx + 1, ZOOM_LEVELS.length - 1)]
    })
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const idx = ZOOM_LEVELS.findIndex((z) => z >= prev)
      const newIdx = Math.max(idx - 1, 0)
      if (newIdx === 0) setPosition({ x: 0, y: 0 })
      return ZOOM_LEVELS[newIdx]
    })
  }, [])

  const handleReset = useCallback(() => {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360)
  }, [])

  const handleDoubleClick = useCallback(() => {
    if (zoom > 1) {
      setZoom(1)
      setPosition({ x: 0, y: 0 })
    } else {
      setZoom(2)
    }
  }, [zoom])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
          handleZoomOut()
          break
        case 'r':
        case 'R':
          handleRotate()
          break
        case '0':
          handleReset()
          break
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handleZoomIn, handleZoomOut, handleRotate, handleReset])

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom > 1) {
        setIsDragging(true)
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
      }
    },
    [zoom, position]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && zoom > 1) {
        setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
      }
    },
    [isDragging, zoom, dragStart]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      e.deltaY < 0 ? handleZoomIn() : handleZoomOut()
    },
    [handleZoomIn, handleZoomOut]
  )

  const isZoomed = zoom > 1

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Image container */}
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          className="max-w-[90vw] max-h-[85vh] object-contain select-none transition-transform duration-100"
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px) rotate(${rotation}deg)`,
            cursor: isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          }}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          draggable={false}
        />
      </div>

      {/* Controls bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-black/60 rounded-full px-2 py-1">
        <button
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="p-2 text-white/80 hover:text-white disabled:text-white/30 transition-colors"
          aria-label="Alejar"
        >
          <IconMinus size={18} />
        </button>
        <span className="text-xs text-white/80 min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="p-2 text-white/80 hover:text-white disabled:text-white/30 transition-colors"
          aria-label="Acercar"
        >
          <IconPlus size={18} />
        </button>
        <div className="w-px h-5 bg-white/20 mx-1" />
        <button
          onClick={handleReset}
          className="p-2 text-white/80 hover:text-white transition-colors"
          aria-label="Restablecer"
        >
          <IconMaximize size={18} />
        </button>
        <button
          onClick={handleRotate}
          className="p-2 text-white/80 hover:text-white transition-colors"
          aria-label="Rotar"
        >
          <IconRotateCw size={18} />
        </button>
      </div>

      {/* Hint */}
      {!isZoomed && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-xs text-white/50">
          Doble clic o rueda del mouse para zoom
        </div>
      )}
    </div>
  )
}
