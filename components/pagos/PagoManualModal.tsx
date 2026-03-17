'use client'

import { useState, useRef, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { pagoService } from '@/services/pagoService'

// ============================================
// Types
// ============================================

interface PagoManualModalProps {
  isOpen: boolean
  onClose: () => void
  expedienteId: string
  onSuccess: () => void
}

const CONCEPTOS = [
  { value: 'estudio', label: 'Estudio de riesgo crediticio' },
  { value: 'garantia', label: 'Garantia de arrendamiento' },
  { value: 'primer_canon', label: 'Primer canon de arrendamiento' },
  { value: 'deposito', label: 'Deposito de garantia' },
  { value: 'otro', label: 'Otro' },
]

const METODOS = [
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'cheque', label: 'Cheque' },
]

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// ============================================
// Component
// ============================================

export function PagoManualModal({ isOpen, onClose, expedienteId, onSuccess }: PagoManualModalProps) {
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [referenciaBancaria, setReferenciaBancaria] = useState('')
  const [notas, setNotas] = useState('')
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0])
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = useCallback(() => {
    setConcepto('')
    setMonto('')
    setMetodo('')
    setDescripcion('')
    setReferenciaBancaria('')
    setNotas('')
    setFechaPago(new Date().toISOString().split('T')[0])
    setFile(null)
    setFilePreview(null)
    setError(null)
  }, [])

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      resetForm()
      onClose()
    }
  }, [isSubmitting, resetForm, onClose])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      setError('Solo se aceptan archivos PDF, JPG o PNG')
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('El archivo excede el limite de 5MB')
      return
    }

    setFile(selectedFile)
    setError(null)

    // Preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setFilePreview(ev.target?.result as string)
      reader.readAsDataURL(selectedFile)
    } else {
      setFilePreview(null)
    }
  }, [])

  const removeFile = useCallback(() => {
    setFile(null)
    setFilePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validations
    const montoNum = parseInt(monto, 10)
    if (!concepto) { setError('Selecciona un concepto'); return }
    if (!monto || montoNum <= 0 || isNaN(montoNum)) { setError('Ingresa un monto valido mayor a 0'); return }
    if (!metodo) { setError('Selecciona un metodo de pago'); return }
    if (!fechaPago) { setError('Selecciona la fecha de pago'); return }

    const today = new Date().toISOString().split('T')[0]
    if (fechaPago > today) { setError('La fecha de pago no puede ser futura'); return }

    setIsSubmitting(true)

    try {
      await pagoService.registrarPagoManualConComprobante(
        expedienteId,
        {
          concepto,
          monto: montoNum,
          metodo: metodo as 'transferencia' | 'efectivo' | 'cheque',
          descripcion: descripcion || undefined,
          referencia_bancaria: referenciaBancaria || undefined,
          notas: notas || undefined,
          fecha_pago: fechaPago,
        },
        file,
      )

      resetForm()
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar el pago')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Registrar Pago Manual" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Concepto + Metodo */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Concepto <span className="text-red-500">*</span>
            </label>
            <select
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              disabled={isSubmitting}
            >
              <option value="">Seleccionar...</option>
              {CONCEPTOS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metodo de pago <span className="text-red-500">*</span>
            </label>
            <select
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              disabled={isSubmitting}
            >
              <option value="">Seleccionar...</option>
              {METODOS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Monto + Fecha */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto (COP) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Ej: 150000"
              min="1"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de pago <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Referencia bancaria */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Referencia bancaria
          </label>
          <input
            type="text"
            value={referenciaBancaria}
            onChange={(e) => setReferenciaBancaria(e.target.value)}
            placeholder="Numero de referencia o transaccion"
            maxLength={255}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            disabled={isSubmitting}
          />
        </div>

        {/* Descripcion */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripcion
          </label>
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripcion breve del pago"
            maxLength={500}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            disabled={isSubmitting}
          />
        </div>

        {/* Comprobante */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comprobante de pago
          </label>
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors"
            >
              <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16v-8m0 0l-3 3m3-3l3 3M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                Haz clic para seleccionar archivo
              </p>
              <p className="mt-1 text-xs text-gray-400">
                PDF, JPG o PNG (max 5MB)
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              {/* Preview */}
              {filePreview ? (
                <img src={filePreview} alt="Preview" className="h-12 w-12 object-cover rounded" />
              ) : (
                <div className="h-12 w-12 flex items-center justify-center bg-red-100 rounded">
                  <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                disabled={isSubmitting}
              >
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notas
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Notas adicionales sobre el pago..."
            maxLength={2000}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
            disabled={isSubmitting}
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
              </svg>
            )}
            {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
