/**
 * GenerarLinkPagoModal - HP-351
 * Modal para generar un enlace de pago por la pasarela
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { IconLoader } from '@/components/icons'
import { pagoService } from '@/services/pagoService'
import { pagoEstudioService } from '@/services/pagoEstudioService'
import { GarantiaIvaAyuda, usePrimaSugerida } from './GarantiaIva'

// ============================================
// Types
// ============================================

interface GenerarLinkPagoModalProps {
  isOpen: boolean
  onClose: () => void
  expedienteId: string
  /** Recarga del padre: se espera antes de cerrar, para no generar dos enlaces. */
  onSuccess: () => void | Promise<void>
}

const CONCEPTOS = [
  { value: 'estudio', label: 'Estudio de arrendamiento' },
  { value: 'garantia', label: 'Prima de vinculación de la fianza' },
  { value: 'primer_canon', label: 'Primer canon de arrendamiento' },
  // Sin 'deposito': en vivienda no se cobra (Ley 820 de 2003, art. 16) y la API lo rechaza.
  { value: 'otro', label: 'Otro' },
]

// ============================================
// Component
// ============================================

export function GenerarLinkPagoModal({
  isOpen,
  onClose,
  expedienteId,
  onSuccess,
}: GenerarLinkPagoModalProps) {
  const [concepto, setConcepto] = useState<string>('')
  const [monto, setMonto] = useState('')
  // Si lo escribió el gestor, una sugerencia no lo pisa.
  const [montoEditado, setMontoEditado] = useState(false)
  const [descripcion, setDescripcion] = useState('')
  const [emailPagador, setEmailPagador] = useState('')
  const [nombrePagador, setNombrePagador] = useState('')
  const [enviarEmail, setEnviarEmail] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // El precio del estudio NO lo decide quien llena este formulario: el API lo
  // pisa con el de configuracion_sistema (pagos.service.ts, concepto
  // 'estudio'), porque el gate de ejecucion solo comprueba que exista un pago
  // completado y nunca su valor — un link de $1.000 pagaba una consulta al buro
  // entera. Antes el campo se pedia igual y se descartaba en silencio: el
  // gestor tecleaba lo negociado, veia "$40.000 COP" confirmado debajo, y al
  // arrendatario le llegaba un link (y un correo) por otra cifra.
  const [montoEstudio, setMontoEstudio] = useState<number | null>(null)

  const esEstudio = concepto === 'estudio'

  useEffect(() => {
    if (!isOpen || !esEstudio || montoEstudio !== null) return
    let cancelado = false
    pagoEstudioService
      .getEstado(expedienteId)
      .then((e) => { if (!cancelado) setMontoEstudio(e.monto) })
      .catch(() => { /* si no carga, el campo sigue editable y manda el API */ })
    return () => { cancelado = true }
  }, [isOpen, esEstudio, expedienteId, montoEstudio])

  // Al elegir 'estudio' el monto deja de ser del usuario.
  useEffect(() => {
    if (esEstudio && montoEstudio !== null) setMonto(String(montoEstudio))
  }, [esEstudio, montoEstudio])

  // La garantía (prima de vinculación) se sugiere con IVA; el monto sigue siendo editable.
  const esGarantia = concepto === 'garantia'
  const primaSugerida = usePrimaSugerida(expedienteId, isOpen && esGarantia)
  useEffect(() => {
    const total = primaSugerida?.prima_vinculacion_con_iva_cop
    if (esGarantia && total != null && !montoEditado) setMonto(String(total))
  }, [esGarantia, primaSugerida, montoEditado])

  const resetForm = useCallback(() => {
    setConcepto('')
    setMonto('')
    setMontoEditado(false)
    setDescripcion('')
    setEmailPagador('')
    setNombrePagador('')
    setEnviarEmail(true)
    setError(null)
  }, [])

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      resetForm()
      onClose()
    }
  }, [isSubmitting, resetForm, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setError(null)

    // Validations
    if (!concepto) {
      setError('Seleccione el concepto del pago.')
      return
    }

    const montoNum = parseInt(monto, 10)
    if (!monto || montoNum <= 0 || isNaN(montoNum)) {
      setError('Escriba un monto mayor que 0.')
      return
    }

    if (!descripcion.trim()) {
      setError('Escriba la descripción que verá quien paga.')
      return
    }

    if (!emailPagador.trim()) {
      setError('Escriba el correo de quien paga.')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailPagador)) {
      setError('Revise el correo: no parece válido.')
      return
    }

    if (!nombrePagador.trim()) {
      setError('Escriba el nombre de quien paga.')
      return
    }

    setIsSubmitting(true)

    try {
      await pagoService.createPaymentLink(expedienteId, {
        concepto: concepto as 'estudio' | 'garantia' | 'primer_canon' | 'deposito' | 'otro',
        monto: montoNum,
        descripcion: descripcion.trim(),
        email_pagador: emailPagador.trim(),
        nombre_pagador: nombrePagador.trim(),
        enviar_email: enviarEmail,
      })

      // onSuccess puede devolver una promesa (PagosSection recarga la lista):
      // se espera antes de soltar el botón, así no hay doble envío.
      await onSuccess()
      resetForm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el enlace de pago. Intente de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format monto for display
  const formatMontoDisplay = (value: string) => {
    const num = parseInt(value, 10)
    if (isNaN(num)) return ''
    return new Intl.NumberFormat('es-CO').format(num)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generar enlace de pago"
      description="Se genera un enlace seguro para pagar con tarjeta de crédito, débito o PSE."
      size="md"
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
            <button type="submit" form="generar-enlace-pago-form" disabled={isSubmitting} aria-busy={isSubmitting || undefined} className={botonModal('primary')}>
              {isSubmitting && <IconLoader size={16} className="animate-spin" />}
              {isSubmitting ? 'Generando…' : 'Generar enlace'}
            </button>
          </ModalAcciones>
        </div>
      }
    >
      <form id="generar-enlace-pago-form" noValidate onSubmit={handleSubmit} className="space-y-4">

        {/* Concepto */}
        <div>
          <label htmlFor="generar-link-pago-modal-concepto" className="block text-sm font-medium text-gray-700 mb-1">
            Concepto <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <select id="generar-link-pago-modal-concepto"
            value={concepto}
            onChange={(e) => {
              setConcepto(e.target.value)
              // Un monto que no escribió el gestor (el del estudio, la prima) no pasa a otro concepto.
              if (!montoEditado) setMonto('')
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            disabled={isSubmitting}
          >
            <option value="">Seleccione…</option>
            {CONCEPTOS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Monto */}
        <div>
          <label htmlFor="generar-link-pago-modal-monto-cop" className="block text-sm font-medium text-gray-700 mb-1">
            Monto (COP) <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true">$</span>
            {/* Texto con separador de miles, no type="number": ahí "150.000" quedaba en $150 y "2.600.000" en blanco. */}
            <input id="generar-link-pago-modal-monto-cop"
              type="text"
              inputMode="numeric"
              value={formatMontoDisplay(monto)}
              onChange={(e) => {
                setMonto(e.target.value.replace(/\D/g, '').slice(0, 12))
                setMontoEditado(true)
              }}
              placeholder="Ej.: 150.000"
              readOnly={esEstudio && montoEstudio !== null}
              aria-describedby="generar-link-pago-modal-monto-ayuda"
              className={`w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 ${
                esEstudio && montoEstudio !== null ? 'bg-gray-50 text-gray-600' : ''
              }`}
              disabled={isSubmitting}
            />
          </div>
          <p id="generar-link-pago-modal-monto-ayuda" className="mt-1 text-xs text-gray-500">
            {esEstudio && montoEstudio !== null
              ? `$${formatMontoDisplay(monto)} COP — precio del estudio de arrendamiento, fijado por Cofianza.`
              : monto
                ? `$${formatMontoDisplay(monto)} COP`
                : ''}
          </p>
          {esGarantia && (
            <GarantiaIvaAyuda monto={parseInt(monto, 10) || 0} prima={primaSugerida} onUsar={(total) => setMonto(String(total))} />
          )}
        </div>

        {/* Descripcion */}
        <div>
          <label htmlFor="generar-link-pago-modal-descripcion" className="block text-sm font-medium text-gray-700 mb-1">
            Descripción <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <textarea id="generar-link-pago-modal-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción del pago que verá quien paga"
            maxLength={500}
            rows={2}
            aria-describedby="generar-enlace-pago-descripcion-contador"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
            disabled={isSubmitting}
          />
          <p id="generar-enlace-pago-descripcion-contador" className="mt-1 text-right text-xs tabular-nums text-gray-600">{descripcion.length}/500</p>
        </div>

        {/* Nombre del pagador */}
        <div>
          <label htmlFor="generar-link-pago-modal-nombre-del-pagador" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de quien paga <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <input id="generar-link-pago-modal-nombre-del-pagador"
            type="text"
            value={nombrePagador}
            onChange={(e) => setNombrePagador(e.target.value)}
            placeholder="Nombre completo"
            maxLength={200}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            disabled={isSubmitting}
          />
        </div>

        {/* Email del pagador */}
        <div>
          <label htmlFor="generar-link-pago-modal-email-del-pagador" className="block text-sm font-medium text-gray-700 mb-1">
            Correo de quien paga <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <input id="generar-link-pago-modal-email-del-pagador"
            type="email"
            value={emailPagador}
            onChange={(e) => setEmailPagador(e.target.value)}
            placeholder="correo@ejemplo.com"
            autoComplete="off"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            disabled={isSubmitting}
          />
        </div>

        {/* Enviar email */}
        <div className="flex min-h-10 items-center gap-2">
          <input
            type="checkbox"
            id="enviarEmail"
            checked={enviarEmail}
            onChange={(e) => setEnviarEmail(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            disabled={isSubmitting}
          />
          <label htmlFor="enviarEmail" className="text-sm text-gray-700">
            Enviarle el enlace por correo a quien paga
          </label>
        </div>

      </form>
    </Modal>
  )
}
