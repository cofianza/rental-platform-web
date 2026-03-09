/**
 * FirmaStep4Confirmation - HP-342
 * Paso 4: Confirmacion final con aceptacion legal
 * Ley 527 de 1999 - Comercio electronico Colombia
 */

'use client'

import { useState } from 'react'
import type { ISolicitudFirmaPublic } from '@/types/firma'
import {
  IconCheck,
  IconArrowLeft,
  IconLoader,
  IconAlertTriangle,
  IconShieldCheck,
  IconFileCheck,
  IconCheckCircle,
} from '@/components/icons'

interface FirmaStep4ConfirmationProps {
  data: ISolicitudFirmaPublic
  signatureDataUrl: string | null
  legalAccepted: boolean
  onLegalAcceptChange: (accepted: boolean) => void
  onSubmit: () => Promise<void>
  onBack: () => void
  isSubmitting: boolean
  error: string | null
}

export function FirmaStep4Confirmation({
  data,
  signatureDataUrl,
  legalAccepted,
  onLegalAcceptChange,
  onSubmit,
  onBack,
  isSubmitting,
  error,
}: FirmaStep4ConfirmationProps) {
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async () => {
    await onSubmit()
    setIsSuccess(true)
  }

  // Success state
  if (isSuccess && !error) {
    return (
      <div className="p-8 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
          <IconCheckCircle size={48} className="text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Firma completada
          </h2>
          <p className="mt-2 text-gray-500">
            El contrato ha sido firmado exitosamente
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-left">
          <p className="text-sm text-green-800">
            <span className="font-medium">Firmante:</span> {data.nombre_firmante}
          </p>
          <p className="text-sm text-green-800 mt-1">
            <span className="font-medium">Contrato:</span> {data.contrato_nombre}
          </p>
          <p className="text-sm text-green-800 mt-1">
            <span className="font-medium">Inmueble:</span> {data.inmueble_direccion}
            {data.inmueble_ciudad && `, ${data.inmueble_ciudad}`}
          </p>
        </div>
        <p className="text-sm text-gray-500">
          Recibiras una copia del contrato firmado en tu correo electronico.
        </p>
        <div className="pt-4">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <IconFileCheck size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          Confirma tu firma
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Revisa los datos y acepta los terminos para completar
        </p>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h3 className="font-medium text-gray-900 text-sm">Resumen del contrato</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Firmante:</span>
            <p className="font-medium text-gray-900">{data.nombre_firmante}</p>
          </div>
          <div>
            <span className="text-gray-500">Email:</span>
            <p className="font-medium text-gray-900">{data.email_firmante}</p>
          </div>
          <div className="sm:col-span-2">
            <span className="text-gray-500">Inmueble:</span>
            <p className="font-medium text-gray-900">
              {data.inmueble_direccion}
              {data.inmueble_ciudad && `, ${data.inmueble_ciudad}`}
            </p>
          </div>
          <div className="sm:col-span-2">
            <span className="text-gray-500">Contrato:</span>
            <p className="font-medium text-gray-900">{data.contrato_nombre}</p>
          </div>
        </div>
      </div>

      {/* Signature preview */}
      {signatureDataUrl && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-2">Tu firma:</p>
          <div className="bg-gray-50 rounded border border-gray-100 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signatureDataUrl}
              alt="Tu firma"
              className="max-h-24 mx-auto"
            />
          </div>
        </div>
      )}

      {/* Legal acceptance */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-start gap-3">
          <IconShieldCheck size={24} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-blue-800 text-sm">
              Declaracion legal
            </p>
            <p className="text-xs text-blue-700 mt-1">
              De conformidad con la Ley 527 de 1999 sobre Comercio Electronico y la Ley 1581 de 2012 sobre Proteccion de Datos Personales, al firmar este documento:
            </p>
            <ul className="text-xs text-blue-700 mt-2 space-y-1">
              <li>• Confirmo que he leido y entiendo el contenido del contrato</li>
              <li>• Acepto que mi firma electronica tiene validez legal</li>
              <li>• Autorizo el uso de mis datos para este proceso</li>
            </ul>
          </div>
        </div>

        {/* Checkbox */}
        <label className="flex items-start gap-3 mt-4 cursor-pointer group">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              checked={legalAccepted}
              onChange={(e) => onLegalAcceptChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-5 h-5 border-2 border-blue-400 rounded bg-white peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors">
              {legalAccepted && (
                <IconCheck size={16} className="text-white m-0.5" />
              )}
            </div>
          </div>
          <span className="text-sm text-blue-800 group-hover:text-blue-900">
            Acepto los terminos y condiciones descritos anteriormente y confirmo que deseo firmar este contrato de arrendamiento.
          </span>
        </label>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
          <IconAlertTriangle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-100">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          <IconArrowLeft size={18} />
          Volver
        </button>

        <button
          onClick={handleSubmit}
          disabled={!legalAccepted || isSubmitting}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors
            ${legalAccepted && !isSubmitting
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {isSubmitting ? (
            <>
              <IconLoader size={18} className="animate-spin" />
              Enviando firma...
            </>
          ) : (
            <>
              <IconCheck size={18} />
              Firmar contrato
            </>
          )}
        </button>
      </div>

      {/* Additional info */}
      <p className="text-xs text-gray-400 text-center">
        Al firmar, recibiras una copia del contrato firmado en tu correo electronico.
        Este proceso cumple con la normativa colombiana de firma electronica.
      </p>
    </div>
  )
}
