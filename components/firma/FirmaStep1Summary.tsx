/**
 * FirmaStep1Summary - HP-342
 * Paso 1: Resumen del contrato con visor PDF embebido
 * El PDF se muestra en modo solo lectura sin opcion de descarga
 */

'use client'

import { useState, useEffect } from 'react'
import type { ISolicitudFirmaPublic } from '@/types/firma'
import { firmaService } from '@/services/firmaService'
import {
  IconFileText,
  IconMapPin,
  IconUser,
  IconMail,
  IconArrowRight,
  IconShieldCheck,
  IconLoader,
  IconAlertTriangle,
} from '@/components/icons'

interface FirmaStep1SummaryProps {
  data: ISolicitudFirmaPublic
  token: string
  onContinue: () => void
}

type PdfState = 'loading' | 'ready' | 'error'

export function FirmaStep1Summary({ data, token, onContinue }: FirmaStep1SummaryProps) {
  const [pdfState, setPdfState] = useState<PdfState>('loading')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)

  // Fetch PDF URL on mount
  useEffect(() => {
    async function fetchPdf() {
      try {
        const result = await firmaService.getContratoPdf(token)
        setPdfUrl(result.pdf_url)
        setPdfState('ready')
      } catch (err) {
        setPdfError(err instanceof Error ? err.message : 'Error al cargar el PDF')
        setPdfState('error')
      }
    }
    fetchPdf()
  }, [token])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
          <IconFileText size={32} className="text-primary-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">
          Firma de Contrato de Arrendamiento
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Revisa el contrato completo antes de continuar
        </p>
      </div>

      {/* PDF Viewer */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-100">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2">
          <IconFileText size={18} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {data.contrato_nombre}
          </span>
        </div>

        {pdfState === 'loading' && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <IconLoader size={32} className="text-primary-600 animate-spin mx-auto" />
              <p className="text-sm text-gray-500">Cargando contrato...</p>
            </div>
          </div>
        )}

        {pdfState === 'error' && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <IconAlertTriangle size={32} className="text-amber-500 mx-auto" />
              <p className="text-sm text-gray-700 font-medium">No se pudo cargar el PDF</p>
              <p className="text-xs text-gray-500">{pdfError}</p>
            </div>
          </div>
        )}

        {pdfState === 'ready' && pdfUrl && (
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
            className="w-full"
            style={{ height: '400px' }}
            title="Contrato de arrendamiento"
          />
        )}
      </div>

      {/* Contract info summary */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
          Informacion del contrato
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Firmante */}
          <div className="flex items-center gap-2">
            <IconUser size={16} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Firmante</p>
              <p className="text-sm font-medium text-gray-900">{data.nombre_firmante}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-2">
            <IconMail size={16} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">{data.email_firmante}</p>
            </div>
          </div>

          {/* Inmueble */}
          <div className="flex items-center gap-2 sm:col-span-2">
            <IconMapPin size={16} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Inmueble</p>
              <p className="text-sm font-medium text-gray-900">
                {data.inmueble_direccion}
                {data.inmueble_ciudad && `, ${data.inmueble_ciudad}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
        <IconShieldCheck size={24} className="text-green-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-green-800 text-sm">
            Proceso seguro de firma electronica
          </p>
          <p className="text-xs text-green-700 mt-1">
            Se enviara un codigo de verificacion a tu correo electronico para confirmar tu identidad antes de firmar.
          </p>
        </div>
      </div>

      {/* Action button */}
      <button
        onClick={onContinue}
        disabled={pdfState === 'loading'}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Iniciar proceso de firma
        <IconArrowRight size={20} />
      </button>

      {/* Legal disclaimer */}
      <p className="text-xs text-gray-400 text-center">
        Al continuar, aceptas que has leido el contrato y deseas proceder con la firma electronica.
      </p>
    </div>
  )
}
