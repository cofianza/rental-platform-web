/**
 * Image Uploader - HP-174
 * Componente para subir foto de fachada del inmueble
 */

'use client'

import { useState, useRef, useCallback } from 'react'
import { IconUpload, IconCamera, IconX, IconLoader } from '@/components/icons'
import { inmuebleService } from '@/services/inmuebleService'
import { INMUEBLE_MESSAGES } from './constants'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface ImageUploaderProps {
  value: string // URL de la imagen
  onChange: (url: string) => void
  inmuebleId?: string
  disabled?: boolean
  error?: string
}

export function ImageUploader({
  value,
  onChange,
  inmuebleId,
  disabled = false,
  error,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Validar tipo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        setUploadError(INMUEBLE_MESSAGES.INVALID_FILE_TYPE)
        return
      }

      // Validar tamaño (5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        setUploadError(INMUEBLE_MESSAGES.FILE_TOO_LARGE)
        return
      }

      setUploadError(null)
      setIsUploading(true)

      try {
        const url = await inmuebleService.uploadFotoFachada(file, inmuebleId)
        onChange(url)
      } catch (err) {
        console.error('Error uploading image:', err)
        setUploadError(err instanceof Error ? err.message : INMUEBLE_MESSAGES.UPLOAD_ERROR)
      } finally {
        setIsUploading(false)
      }
    },
    [inmuebleId, onChange]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
    // Limpiar el input para permitir subir el mismo archivo de nuevo
    e.target.value = ''
  }

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragOver(false)

      if (disabled || isUploading) return

      const file = e.dataTransfer.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [disabled, isUploading, handleFileSelect]
  )

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!disabled && !isUploading) {
      setDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleRemove = () => {
    onChange('')
    setUploadError(null)
  }

  const handleClick = () => {
    if (!disabled && !isUploading) {
      inputRef.current?.click()
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {value ? (
        // Vista previa con acciones siempre visibles (el hover no existe en el celular)
        <div className="space-y-2">
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-gray-200">
            <Image
              src={value}
              alt="Foto de fachada"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center gap-2 text-sm text-gray-700">
                <IconLoader size={18} className="animate-spin" />
                Subiendo...
              </div>
            )}
          </div>
          {!disabled && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClick}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <IconUpload size={14} />
                Cambiar
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                <IconX size={14} />
                Quitar
              </button>
            </div>
          )}
        </div>
      ) : (
        // Zona de carga (clic, teclado o arrastrar)
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Subir foto de fachada"
          aria-invalid={!!(error || uploadError)}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleClick()
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'relative w-full aspect-[4/3] border-2 border-dashed rounded-lg transition-colors cursor-pointer',
            'flex flex-col items-center justify-center gap-3 px-4',
            'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500',
            dragOver
              ? 'border-primary-500 bg-primary-50'
              : error || uploadError
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          {isUploading ? (
            <>
              <IconLoader size={32} className="text-primary-600 animate-spin" />
              <p className="text-sm text-gray-600">Subiendo imagen...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center">
                <IconCamera size={24} className="text-primary-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  <span className="text-primary-700">Suba la foto</span>
                  <span className="hidden sm:inline"> o arrástrela aquí</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG o WebP (máx. 5 MB)</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Mensaje de error */}
      {(error || uploadError) && (
        <p className="text-xs text-red-600">{uploadError || error}</p>
      )}
    </div>
  )
}
