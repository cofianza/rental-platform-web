/**
 * Lightbox - HP-203
 * Visualizador de imágenes a pantalla completa con navegación y zoom
 */

'use client'

import { useEffect, useCallback, useState } from 'react'
import Image from 'next/image'
import { IconX, IconChevronLeft, IconChevronRight, IconPlus, IconMinus } from '@/components/icons'
import { useTouchGestures } from '@/hooks/useTouchGestures'

export interface LightboxImage {
  url: string
  descripcion?: string | null
}

export interface LightboxProps {
  images: LightboxImage[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
}

const ZOOM_LEVELS = [1, 1.5, 2, 3]
const MIN_ZOOM = 1
const MAX_ZOOM = 3

export function Lightbox({
  images,
  currentIndex,
  isOpen,
  onClose,
  onPrevious,
  onNext,
}: LightboxProps) {
  const currentImage = images[currentIndex]
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < images.length - 1

  // Estado de zoom
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const touchHandlers = useTouchGestures({
    zoom, setZoom, position, setPosition, minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM,
  })

  // Reset zoom cuando cambia la imagen
  useEffect(() => {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }, [currentIndex])

  // Zoom in
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => {
      const currentIdx = ZOOM_LEVELS.findIndex((z) => z >= prev)
      const nextIdx = Math.min(currentIdx + 1, ZOOM_LEVELS.length - 1)
      return ZOOM_LEVELS[nextIdx]
    })
  }, [])

  // Zoom out
  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const currentIdx = ZOOM_LEVELS.findIndex((z) => z >= prev)
      const prevIdx = Math.max(currentIdx - 1, 0)
      if (prevIdx === 0) {
        setPosition({ x: 0, y: 0 })
      }
      return ZOOM_LEVELS[prevIdx]
    })
  }, [])

  // Toggle zoom con doble click
  const handleDoubleClick = useCallback(() => {
    if (zoom > 1) {
      setZoom(1)
      setPosition({ x: 0, y: 0 })
    } else {
      setZoom(2)
    }
  }, [zoom])

  // Manejar teclas
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          if (hasPrevious) onPrevious()
          break
        case 'ArrowRight':
          if (hasNext) onNext()
          break
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
          handleZoomOut()
          break
      }
    },
    [isOpen, onClose, onPrevious, onNext, hasPrevious, hasNext, handleZoomIn, handleZoomOut]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Drag handlers para pan cuando hay zoom
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }, [zoom, position])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }, [isDragging, zoom, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      handleZoomIn()
    } else {
      handleZoomOut()
    }
  }, [handleZoomIn, handleZoomOut])

  if (!isOpen || !currentImage) return null

  const isZoomed = zoom > 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={isZoomed ? undefined : onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Botón cerrar */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-colors"
        aria-label="Cerrar"
      >
        <IconX size={24} />
      </button>

      {/* Contador y controles de zoom */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <div className="px-3 py-1.5 text-sm text-white/80 bg-black/40 rounded-full">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Controles de zoom */}
        <div className="flex items-center bg-black/40 rounded-full">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="p-2 text-white/80 hover:text-white disabled:text-white/40 disabled:cursor-not-allowed transition-colors"
            aria-label="Alejar"
          >
            <IconMinus size={18} />
          </button>
          <span className="px-2 text-sm text-white/80 min-w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="p-2 text-white/80 hover:text-white disabled:text-white/40 disabled:cursor-not-allowed transition-colors"
            aria-label="Acercar"
          >
            <IconPlus size={18} />
          </button>
        </div>
      </div>

      {/* Botón anterior */}
      {hasPrevious && !isZoomed && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPrevious()
          }}
          className="absolute left-4 z-20 p-3 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-colors"
          aria-label="Anterior"
        >
          <IconChevronLeft size={28} />
        </button>
      )}

      {/* Imagen con zoom */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] w-full h-full flex items-center justify-center overflow-hidden touch-none"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onTouchStart={touchHandlers.onTouchStart}
        onTouchMove={touchHandlers.onTouchMove}
        onTouchEnd={touchHandlers.onTouchEnd}
      >
        <div
          className="relative w-full h-full transition-transform duration-100"
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            cursor: isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          }}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
        >
          <Image
            src={currentImage.url}
            alt={currentImage.descripcion || 'Foto del inmueble'}
            fill
            className="object-contain select-none"
            sizes="90vw"
            priority
            draggable={false}
          />
        </div>
      </div>

      {/* Botón siguiente */}
      {hasNext && !isZoomed && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNext()
          }}
          className="absolute right-4 z-20 p-3 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-colors"
          aria-label="Siguiente"
        >
          <IconChevronRight size={28} />
        </button>
      )}

      {/* Descripción */}
      {currentImage.descripcion && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 max-w-md text-center text-white bg-black/60 rounded-lg">
          {currentImage.descripcion}
        </div>
      )}

      {/* Hint de zoom */}
      {!isZoomed && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 text-xs text-white/60">
          Doble clic, rueda del mouse o pellizco para zoom
        </div>
      )}
    </div>
  )
}
