'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { IconX, IconUpload, IconLoader } from '@/components/icons'
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
    if (f.type !== 'application/pdf') return 'Solo se aceptan archivos PDF'
    if (f.size > MAX_FILE_SIZE) return 'El archivo excede el limite de 20 MB'
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

  async function handleSubmit() {
    if (!file) return
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Subir Contrato Firmado</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <IconX size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${isDragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}
              ${isUploading ? 'pointer-events-none opacity-70' : ''}
              ${error ? 'border-red-300 bg-red-50' : ''}
            `}
          >
            {file ? (
              <div className="space-y-2">
                <div className="w-10 h-10 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                  <IconUpload size={20} className="text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">{fileSizeMB} MB</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setError(null) }}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Quitar archivo
                </button>
              </div>
            ) : (
              <>
                <IconUpload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-900">
                  Arrastra el PDF firmado o haz clic para seleccionar
                </p>
                <p className="text-xs text-gray-500 mt-1">Solo PDF, maximo 20 MB</p>
              </>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Optional fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referencia OTP <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={referenciaOtp}
              onChange={(e) => setReferenciaOtp(e.target.value)}
              placeholder="Codigo o referencia de verificacion"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Notas sobre la firma del contrato"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{notas.length}/1000</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || isUploading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <IconLoader size={16} className="animate-spin" />
                Subiendo...
              </>
            ) : (
              'Subir Contrato Firmado'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
