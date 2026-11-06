'use client'

import { useState, useRef, useCallback } from 'react'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { IconFileText, IconLoader, IconUpload, IconX } from '@/components/icons'
import { pagoService } from '@/services/pagoService'
import { hoyBogota } from '@/hooks/useContratoV3'
import { GarantiaIvaAyuda, usePrimaSugerida } from './GarantiaIva'
import { fechaCompleta } from '@/lib/constants'

// ============================================
// Types
// ============================================

interface PagoManualModalProps {
  isOpen: boolean
  onClose: () => void
  expedienteId: string
  /** Recarga del padre: se espera antes de cerrar, para no reenviar el mismo pago. */
  onSuccess: () => void | Promise<void>
}

const CONCEPTOS = [
  { value: 'estudio', label: 'Evaluación crediticia' },
  { value: 'garantia', label: 'Prima de vinculación de la fianza' },
  { value: 'primer_canon', label: 'Primer canon de arrendamiento' },
  // Sin 'deposito': en vivienda no se cobra (Ley 820 de 2003, art. 16) y la API lo rechaza.
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
  const [fechaPago, setFechaPago] = useState(hoyBogota)
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Aquí se registra plata ya recibida: la prima sugerida (con IVA) no se
  // precarga, se ofrece con «Usar este valor».
  const esGarantia = concepto === 'garantia'
  const primaSugerida = usePrimaSugerida(expedienteId, isOpen && esGarantia)

  const resetForm = useCallback(() => {
    setConcepto('')
    setMonto('')
    setMetodo('')
    setDescripcion('')
    setReferenciaBancaria('')
    setNotas('')
    setFechaPago(hoyBogota())
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
      setError('Solo se aceptan archivos PDF, JPG o PNG.')
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('El archivo pesa más de 5 MB. Adjunte uno más liviano.')
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
    if (isSubmitting) return
    if (!concepto) { setError('Seleccione el concepto del pago.'); return }
    if (!monto || montoNum <= 0 || isNaN(montoNum)) { setError('Escriba un monto mayor que 0.'); return }
    if (!metodo) { setError('Seleccione el método de pago.'); return }
    if (!fechaCompleta(fechaPago)) { setError('Seleccione una fecha de pago válida.'); return }

    const today = hoyBogota()
    if (fechaPago > today) { setError('La fecha de pago no puede ser posterior a hoy.'); return }

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

      // onSuccess puede devolver una promesa (PagosSection recarga la lista):
      // se espera antes de soltar el botón, así un segundo clic no registra
      // el mismo pago dos veces.
      await onSuccess()
      resetForm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pago. Intente de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Registrar pago manual"
      description="Para un pago que ya recibió por fuera de la pasarela: transferencia, efectivo o cheque."
      size="lg"
      footer={
        <div className="space-y-2">
          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}
          <ModalAcciones>
            <button type="button" onClick={handleClose} disabled={isSubmitting} className={botonModal('secondary')}>
              Cancelar
            </button>
            <button type="submit" form="pago-manual-form" disabled={isSubmitting} aria-busy={isSubmitting || undefined} className={botonModal('primary')}>
              {isSubmitting && <IconLoader size={16} className="animate-spin" />}
              {isSubmitting ? 'Registrando…' : 'Registrar pago'}
            </button>
          </ModalAcciones>
        </div>
      }
    >
      <form id="pago-manual-form" noValidate onSubmit={handleSubmit} className="space-y-4">

        {/* Concepto + Metodo */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pago-manual-modal-concepto" className="block text-sm font-medium text-gray-700 mb-1">
              Concepto <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <select id="pago-manual-modal-concepto"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              disabled={isSubmitting}
            >
              <option value="">Seleccione…</option>
              {CONCEPTOS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="pago-manual-modal-metodo-de-pago" className="block text-sm font-medium text-gray-700 mb-1">
              Método de pago <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <select id="pago-manual-modal-metodo-de-pago"
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              disabled={isSubmitting}
            >
              <option value="">Seleccione…</option>
              {METODOS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Monto + Fecha */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pago-manual-modal-monto-cop" className="block text-sm font-medium text-gray-700 mb-1">
              Monto (COP) <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            {/* Texto con separador de miles, no type="number": ahí "150.000" quedaba en $150 y "2.600.000" en blanco. */}
            <input id="pago-manual-modal-monto-cop"
              type="text"
              inputMode="numeric"
              value={monto ? Number(monto).toLocaleString('es-CO') : ''}
              onChange={(e) => setMonto(e.target.value.replace(/\D/g, '').slice(0, 12))}
              placeholder="Ej.: 150.000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="pago-manual-modal-fecha-de-pago" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de pago <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input id="pago-manual-modal-fecha-de-pago"
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              max={hoyBogota()}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              disabled={isSubmitting}
            />
          </div>
        </div>
        {esGarantia && (
          <GarantiaIvaAyuda monto={parseInt(monto, 10) || 0} prima={primaSugerida} onUsar={(total) => setMonto(String(total))} />
        )}

        {/* Referencia bancaria */}
        <div>
          <label htmlFor="pago-manual-modal-referencia-bancaria" className="block text-sm font-medium text-gray-700 mb-1">
            Referencia bancaria <span className="font-normal text-gray-500">(opcional)</span>
          </label>
          <input id="pago-manual-modal-referencia-bancaria"
            type="text"
            value={referenciaBancaria}
            onChange={(e) => setReferenciaBancaria(e.target.value)}
            placeholder="Número de referencia o transacción"
            maxLength={255}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            disabled={isSubmitting}
          />
        </div>

        {/* Descripcion */}
        <div>
          <label htmlFor="pago-manual-modal-descripcion" className="block text-sm font-medium text-gray-700 mb-1">
            Descripción <span className="font-normal text-gray-500">(opcional)</span>
          </label>
          <input id="pago-manual-modal-descripcion"
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción breve del pago"
            maxLength={500}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            disabled={isSubmitting}
          />
        </div>

        {/* Comprobante */}
        <div>
          <p id="pago-manual-comprobante-etiqueta" className="block text-sm font-medium text-gray-700 mb-1">
            Comprobante de pago <span className="font-normal text-gray-500">(opcional)</span>
          </p>
          {!file ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              aria-describedby="pago-manual-comprobante-ayuda"
              className="flex w-full flex-col items-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-primary-400 hover:bg-primary-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"
            >
              <IconUpload size={32} className="text-gray-500" />
              <span className="mt-2 text-sm font-medium text-gray-700">Seleccionar archivo</span>
              <span id="pago-manual-comprobante-ayuda" className="mt-1 text-xs text-gray-600">
                PDF, JPG o PNG (máx. 5 MB)
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              {/* Preview */}
              {filePreview ? (
                <img src={filePreview} alt="Vista previa del comprobante" className="h-12 w-12 object-cover rounded" />
              ) : (
                <div className="h-12 w-12 flex items-center justify-center bg-red-100 rounded">
                  <IconFileText size={24} className="text-red-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                type="button"
                onClick={removeFile}
                aria-label={`Quitar el archivo ${file.name}`}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"
                disabled={isSubmitting}
              >
                <IconX size={16} />
              </button>
            </div>
          )}
          <input
            id="pago-manual-comprobante"
            aria-labelledby="pago-manual-comprobante-etiqueta"
            tabIndex={-1}
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Notas */}
        <div>
          <label htmlFor="pago-manual-modal-notas" className="block text-sm font-medium text-gray-700 mb-1">
            Notas <span className="font-normal text-gray-500">(opcional)</span>
          </label>
          <textarea id="pago-manual-modal-notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Notas adicionales sobre el pago…"
            maxLength={2000}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
            disabled={isSubmitting}
          />
        </div>

      </form>
    </Modal>
  )
}
