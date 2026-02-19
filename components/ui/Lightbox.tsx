/**
 * Lightbox - HP-203
 * Visualizador de imágenes a pantalla completa con navegación
 */

'use client'

import { useEffect, useCallback } from 'react'
import Image from 'next/image'
import { IconX, IconChevronLeft, IconChevronRight } from '@/components/icons'

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
      }
    },
    [isOpen, onClose, onPrevious, onNext, hasPrevious, hasNext]
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

  if (!isOpen || !currentImage) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Botón cerrar */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-colors"
        aria-label="Cerrar"
      >
        <IconX size={24} />
      </button>

      {/* Contador */}
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 text-sm text-white/80 bg-black/40 rounded-full">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Botón anterior */}
      {hasPrevious && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPrevious()
          }}
          className="absolute left-4 z-10 p-3 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-colors"
          aria-label="Anterior"
        >
          <IconChevronLeft size={28} />
        </button>
      )}

      {/* Imagen */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={currentImage.url}
          alt={currentImage.descripcion || 'Foto del inmueble'}
          fill
          className="object-contain"
          sizes="90vw"
          priority
        />
      </div>

      {/* Botón siguiente */}
      {hasNext && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNext()
          }}
          className="absolute right-4 z-10 p-3 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-colors"
          aria-label="Siguiente"
        >
          <IconChevronRight size={28} />
        </button>
      )}

      {/* Descripción */}
      {currentImage.descripcion && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 max-w-md text-center text-white bg-black/60 rounded-lg">
          {currentImage.descripcion}
        </div>
      )}
    </div>
  )
}
