'use client'

import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { IconUpload, IconLoader, IconFileText } from '@/components/icons'
import { contratoService } from '@/services/contratoService'

interface SubirFirmadoModalProps {
  isOpen: boolean
  onClose: () => void
  contratoId: string
  onSuccess: () => void
}

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

export function SubirFirmadoModal({ isOpen, onClose, contratoId, onSuccess }: SubirFirmadoModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [referenciaOtp, setReferenciaOtp] = useState('')
  const [notas, setNotas] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  function validateFile(f: File): string | null {
    if (f.type !== 'application/pdf') return 'Solo se aceptan archivos PDF.'
    if (f.size > MAX_FILE_SIZE) return 'El archivo pesa más de 20 MB. Comprímalo o súbalo en menor resolución.'
    return null
  }

  function handleFile(f: File) {
    const err = validateFile(f)
    if (err) {
      setError(err)
      setFile(null)
      return
    }
    setError(null)
    setFile(f)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) handleFile(files[0])
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files && files.length > 0) handleFile(files[0])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClose() {
    if (isUploading) return
    onClose()
  }

  async function handleSubmit() {
    if (!file || isUploading) return
    setIsUploading(true)
    try {
      await contratoService.subirContratoFirmado(contratoId, file, {
        referencia_otp: referenciaOtp || undefined,
        notas: notas || undefined,
      })
      toast.success('Contrato firmado subido correctamente')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al subir el contrato firmado'
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }

  const fileSizeMB = file ? (file.size / (1024 * 1024)).toFixed(2) : null

  return (
    <Modal
      isOpen
      onClose={handleClose}
      title="Subir contrato firmado"
      description="Adjunte el PDF del contrato ya firmado por todas las partes. Queda como la versión firmada del contrato."
      size="md"
      footer={
        <ModalAcciones>
          <button type="button" onClick={handleClose} disabled={isUploading} className={botonModal('secondary')}>
            Cancelar
          </button>
          <button
            type="submit"
            form="subir-firmado-form"
            disabled={!file || isUploading}
            aria-busy={isUploading || undefined}
            className={botonModal('primary')}
          >
            {isUploading ? <IconLoader size={16} className="animate-spin" /> : <IconUpload size={16} />}
            {isUploading ? 'Subiendo…' : 'Subir contrato firmado'}
          </button>
        </ModalAcciones>
      }
    >
      <form
        id="subir-firmado-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
        className="space-y-5"
      >
        {file ? (
          // Archivo elegido: fila con nombre, peso y «Quitar» (sin botones anidados en la zona de arrastre).
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
            <IconFileText size={20} className="shrink-0 text-primary-700" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{fileSizeMB} MB</p>
            </div>
            <button
              type="button"
              onClick={() => { setFile(null); setError(null) }}
              disabled={isUploading}
              className="min-h-10 shrink-0 rounded-lg px-3 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"
            >
              Quitar
            </button>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            role="button"
            tabIndex={isUploading ? -1 : 0}
            aria-label="Seleccionar el PDF firmado"
            aria-describedby={error ? 'subir-firmado-error' : undefined}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return
              e.preventDefault()
              if (!isUploading) fileInputRef.current?.click()
            }}
            className={`rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
              error
                ? 'border-red-300 bg-red-50'
                : isDragOver
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <IconUpload size={28} className="mx-auto mb-2 text-gray-500" aria-hidden="true" />
            <p className="text-sm font-medium text-gray-900">Arrastre el PDF firmado o haga clic para elegirlo</p>
            <p className="mt-1 text-xs text-gray-500">Solo PDF, máximo 20 MB.</p>
          </div>
        )}

        {error && (
          <p id="subir-firmado-error" role="alert" className="text-sm text-red-700">{error}</p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />

        <div>
          <label htmlFor="subir-firmado-modal-referencia-otp-opcional" className="block text-sm font-medium text-gray-700 mb-1">
            Referencia del código de verificación <span className="text-gray-500 font-normal">(opcional)</span>
          </label>
          <input id="subir-firmado-modal-referencia-otp-opcional"
            type="text"
            value={referenciaOtp}
            onChange={(e) => setReferenciaOtp(e.target.value)}
            disabled={isUploading}
            placeholder="Código o referencia con que se verificó la firma"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50"
          />
        </div>

        <div>
          <label htmlFor="subir-firmado-modal-notas-opcional" className="block text-sm font-medium text-gray-700 mb-1">
            Notas <span className="text-gray-500 font-normal">(opcional)</span>
          </label>
          <textarea id="subir-firmado-modal-notas-opcional"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            disabled={isUploading}
            maxLength={1000}
            rows={3}
            placeholder="Notas sobre la firma del contrato"
            aria-describedby="subir-firmado-notas-contador"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none disabled:bg-gray-50"
          />
          <p id="subir-firmado-notas-contador" className="text-xs text-gray-500 mt-1 text-right tabular-nums">{notas.length}/1000</p>
        </div>
      </form>
    </Modal>
  )
}
