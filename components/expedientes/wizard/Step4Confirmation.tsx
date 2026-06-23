/**
 * Step4Confirmation - HP-247
 * Paso 4: Confirmacion y creacion del expediente
 */

'use client'

import Image from 'next/image'
import {
  IconHome,
  IconMapPin,
  IconUser,
  IconMail,
  IconPhone,
  IconBuilding2,
  IconFileText,
  IconCheck,
  IconLoader,
  IconAlertTriangle,
} from '@/components/icons'
import { formatCurrency } from '@/lib/constants'
import type { WizardData } from '@/hooks/useExpedienteWizard'
import { WIZARD_MESSAGES } from './constants'
import { cn } from '@/lib/utils'

interface Step4ConfirmationProps {
  data: WizardData
  isSubmitting: boolean
  submitError: string | null
  onSubmit: () => void
}

export function Step4Confirmation({
  data,
  isSubmitting,
  submitError,
  onSubmit,
}: Step4ConfirmationProps) {
  const { inmueble } = data.step1
  const { solicitante, isNewSolicitante, formData } = data.step2
  const { notas, analista_id, miembro_responsable_id, miembro_responsable_nombre } = data.step3

  // Obtener datos del solicitante (existente o nuevo)
  const solicitanteData = solicitante || formData

  return (
    <div className="space-y-6">
      {/* Header del paso */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          {WIZARD_MESSAGES.STEP4_TITLE}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {WIZARD_MESSAGES.STEP4_SUBTITLE}
        </p>
      </div>

      {/* Error de submit */}
      {submitError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <IconAlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">
              {WIZARD_MESSAGES.ERROR}
            </p>
            <p className="text-xs text-red-600 mt-1">{submitError}</p>
          </div>
        </div>
      )}

      {/* Resumen del Inmueble */}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <IconHome size={16} className="text-gray-400" />
            Inmueble Seleccionado
          </h3>
        </div>
        <div className="p-4">
          {inmueble && (
            <div className="flex gap-4">
              {/* Imagen */}
              <div className="shrink-0 w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
                {inmueble.foto_fachada_url ? (
                  <Image
                    src={inmueble.foto_fachada_url}
                    alt={inmueble.direccion}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <IconHome size={32} className="text-gray-300" />
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    {inmueble.codigo}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full capitalize">
                    {inmueble.tipo}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {inmueble.direccion}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <IconMapPin size={12} />
                  {inmueble.ciudad}, {inmueble.departamento}
                </p>
                <p className="text-lg font-bold text-primary-600 mt-2">
                  {formatCurrency(inmueble.valor_arriendo)}
                  <span className="text-xs font-normal text-gray-500">/mes</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resumen del Solicitante */}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <IconUser size={16} className="text-gray-400" />
            Solicitante
            {isNewSolicitante && (
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                Nuevo
              </span>
            )}
          </h3>
        </div>
        <div className="p-4">
          {solicitanteData && (
            <div className="space-y-3">
              {/* Nombre y documento */}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {solicitanteData.nombre} {solicitanteData.apellido}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {solicitanteData.tipo_persona === 'natural' ? 'Persona Natural' : 'Persona Juridica'}
                </p>
              </div>

              {/* Documento */}
              <div className="text-sm text-gray-600">
                <span className="uppercase font-medium">{solicitanteData.tipo_documento}:</span>{' '}
                {solicitanteData.numero_documento}
              </div>

              {/* Contacto */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <IconMail size={14} className="text-gray-400" />
                  {solicitanteData.email}
                </span>
                {solicitanteData.telefono && (
                  <span className="flex items-center gap-1">
                    <IconPhone size={14} className="text-gray-400" />
                    {solicitanteData.telefono}
                  </span>
                )}
              </div>

              {/* Info adicional si existe */}
              {(solicitanteData.ocupacion || solicitanteData.empresa) && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <IconBuilding2 size={14} className="text-gray-400" />
                  {solicitanteData.ocupacion}
                  {solicitanteData.empresa && ` - ${solicitanteData.empresa}`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Resumen de Configuracion */}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <IconFileText size={16} className="text-gray-400" />
            Configuracion
          </h3>
        </div>
        <div className="p-4 space-y-3">
          {/* Notas */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Notas internas</p>
            {notas ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                {notas}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">Sin notas</p>
            )}
          </div>

          {/* Responsable */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Responsable asignado</p>
            {miembro_responsable_id ? (
              <p className="text-sm text-gray-700">
                <span className="inline-flex items-center gap-1">
                  <IconUser size={14} className="text-gray-400" />
                  {miembro_responsable_nombre || 'Responsable asignado'}
                </span>
              </p>
            ) : analista_id ? (
              <p className="text-sm text-gray-700">
                <span className="inline-flex items-center gap-1">
                  <IconUser size={14} className="text-gray-400" />
                  Analista asignado
                </span>
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">Sin asignar</p>
            )}
          </div>
        </div>
      </div>

      {/* Boton de crear */}
      <div className="border-t border-gray-200 pt-5">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-colors',
            isSubmitting
              ? 'cursor-not-allowed bg-gray-300 text-gray-500'
              : 'bg-coral-500 text-white shadow-sm hover:bg-coral-600'
          )}
        >
          {isSubmitting ? (
            <>
              <IconLoader size={18} className="animate-spin" />
              {WIZARD_MESSAGES.CREATING}
            </>
          ) : (
            <>
              <IconCheck size={18} />
              {WIZARD_MESSAGES.CONFIRM_CREATE}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
