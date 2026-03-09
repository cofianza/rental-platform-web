/**
 * FirmaStep1Summary - HP-342
 * Paso 1: Resumen del contrato antes de iniciar firma
 */

'use client'

import type { ISolicitudFirmaPublic } from '@/types/firma'
import {
  IconFileText,
  IconMapPin,
  IconUser,
  IconMail,
  IconArrowRight,
  IconShieldCheck,
} from '@/components/icons'

interface FirmaStep1SummaryProps {
  data: ISolicitudFirmaPublic
  onContinue: () => void
}

export function FirmaStep1Summary({ data, onContinue }: FirmaStep1SummaryProps) {
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
          Revisa la informacion del contrato antes de continuar
        </p>
      </div>

      {/* Contract info */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        {/* Firmante */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
            <IconUser size={20} className="text-gray-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Firmante</p>
            <p className="font-medium text-gray-900">{data.nombre_firmante}</p>
          </div>
        </div>

        {/* Email */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
            <IconMail size={20} className="text-gray-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Correo electronico</p>
            <p className="font-medium text-gray-900">{data.email_firmante}</p>
          </div>
        </div>

        {/* Inmueble */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
            <IconMapPin size={20} className="text-gray-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Inmueble</p>
            <p className="font-medium text-gray-900">
              {data.inmueble_direccion}
              {data.inmueble_ciudad && `, ${data.inmueble_ciudad}`}
            </p>
          </div>
        </div>

        {/* Contrato */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
            <IconFileText size={20} className="text-gray-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Contrato</p>
            <p className="font-medium text-gray-900">{data.contrato_nombre}</p>
            {data.expediente_numero && (
              <p className="text-sm text-gray-500">
                Expediente: {data.expediente_numero}
              </p>
            )}
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
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
      >
        Iniciar proceso de firma
        <IconArrowRight size={20} />
      </button>

      {/* Legal disclaimer */}
      <p className="text-xs text-gray-400 text-center">
        Al continuar, aceptas recibir comunicaciones relacionadas con este contrato.
      </p>
    </div>
  )
}
