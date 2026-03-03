/**
 * PdfViewer - Visor de PDF con react-pdf
 * Navegacion de paginas, zoom y controles propios
 */

'use client'

import { useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import {
  IconChevronLeft,
  IconChevronRight,
  IconMinus,
  IconPlus,
  IconLoader,
} from '@/components/icons'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface PdfViewerProps {
  url: string
}

const SCALE_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2]
const DEFAULT_SCALE_INDEX = 2

export function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scaleIndex, setScaleIndex] = useState(DEFAULT_SCALE_INDEX)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const scale = SCALE_LEVELS[scaleIndex]

  const onDocumentLoadSuccess = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total)
    setIsLoading(false)
  }, [])

  const onDocumentLoadError = useCallback(() => {
    setHasError(true)
    setIsLoading(false)
  }, [])

  const goToPrevPage = useCallback(() => {
    setPageNumber((prev) => Math.max(prev - 1, 1))
  }, [])

  const goToNextPage = useCallback(() => {
    setPageNumber((prev) => Math.min(prev + 1, numPages ?? prev))
  }, [numPages])

  const zoomIn = useCallback(() => {
    setScaleIndex((prev) => Math.min(prev + 1, SCALE_LEVELS.length - 1))
  }, [])

  const zoomOut = useCallback(() => {
    setScaleIndex((prev) => Math.max(prev - 1, 0))
  }, [])

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
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
        <div className="flex-1 min-h-0 w-full overflow-auto flex justify-center py-4">
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              loading={null}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        </div>
      )}

      {/* Controls bar */}
      {numPages !== null && !hasError && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-black/60 rounded-full px-2 py-1">
          {/* Page navigation */}
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="p-2 text-white/80 hover:text-white disabled:text-white/30 transition-colors"
            aria-label="Pagina anterior"
          >
            <IconChevronLeft size={18} />
          </button>
          <span className="text-xs text-white/80 min-w-20 text-center">
            Pagina {pageNumber} de {numPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="p-2 text-white/80 hover:text-white disabled:text-white/30 transition-colors"
            aria-label="Pagina siguiente"
          >
            <IconChevronRight size={18} />
          </button>

          <div className="w-px h-5 bg-white/20 mx-1" />

          {/* Zoom controls */}
          <button
            onClick={zoomOut}
            disabled={scaleIndex <= 0}
            className="p-2 text-white/80 hover:text-white disabled:text-white/30 transition-colors"
            aria-label="Alejar"
          >
            <IconMinus size={18} />
          </button>
          <span className="text-xs text-white/80 min-w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scaleIndex >= SCALE_LEVELS.length - 1}
            className="p-2 text-white/80 hover:text-white disabled:text-white/30 transition-colors"
            aria-label="Acercar"
          >
            <IconPlus size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
