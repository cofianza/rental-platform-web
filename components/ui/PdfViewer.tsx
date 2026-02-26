/**
 * PdfViewer - Visor de PDF usando el visor nativo del navegador
 * El visor nativo incluye: zoom, navegacion de paginas, busqueda, rotacion
 */

'use client'

import { useState } from 'react'
import { IconLoader } from '@/components/icons'

interface PdfViewerProps {
  url: string
}

export function PdfViewer({ url }: PdfViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
          <IconLoader size={40} className="text-white/70 animate-spin" />
          <span className="text-sm text-white/60">Cargando PDF...</span>
        </div>
      )}

      {hasError ? (
        <div className="text-center text-red-400">
          <p className="text-sm">Error al cargar el PDF</p>
        </div>
      ) : (
        <iframe
          src={url}
          className="w-full h-full rounded-lg bg-white"
          title="Visor de PDF"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true)
            setIsLoading(false)
          }}
        />
      )}
    </div>
  )
}
