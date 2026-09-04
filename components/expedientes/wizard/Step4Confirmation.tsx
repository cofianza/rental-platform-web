/**
 * Step4Confirmation - HP-247
 * Paso 4: Confirmacion y creacion del expediente
 */

'use client'

import Image from 'next/image'
import Link from 'next/link'
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
  IconPencil,
  IconArrowRight,
  IconCreditCard,
} from '@/components/icons'
import { formatCurrency } from '@/lib/constants'
import type { WizardData } from '@/hooks/useExpedienteWizard'
import { WIZARD_MESSAGES } from './constants'
import { cn } from '@/lib/utils'
import { TIPO_LABELS } from '@/components/inmuebles/constants'

interface Step4ConfirmationProps {
  data: WizardData
  isSubmitting: boolean
  submitError: string | null
  /** 3.1: si el solicitante ya tiene un expediente activo para este inmueble,
   *  el backend lo devuelve para ofrecer "Ver expediente" en vez de un callejón. */
  existingExpediente?: { id: string; numero: string | null } | null
  onSubmit: () => void
  /** Volver a un paso del wizard para corregir datos (1=inmueble, 2=solicitante, 3=config). */
  onEditStep: (step: number) => void
}

export function Step4Confirmation({
  data,
  isSubmitting,
  submitError,
  existingExpediente,
  onSubmit,
  onEditStep,
}: Step4ConfirmationProps) {
  const { inmueble } = data.step1
  const { solicitante, isNewSolicitante, formData } = data.step2
  const { forma_pago, notas, analista_id, miembro_responsable_id, miembro_responsable_nombre } = data.step3

  // §7: el resumen debe mostrar "propiedad, canon, datos del prospecto y forma
  // de pago". Las tres primeras ya estaban; la forma de pago es lo que faltaba.
  const FORMA_PAGO_LABEL: Record<string, string> = {
    credito: 'Descontado del paquete de estudios (opción A)',
    inmobiliaria: 'Lo paga la inmobiliaria ahora (opción B)',
    prospecto: 'Enlace de pago al prospecto, después de que autorice (opción C)',
  }

  // Obtener datos del solicitante (existente o nuevo)
  const solicitanteData = solicitante || formData

  return (
    <div className="space-y-6">
      {/* Header del paso */}
      <div>
        <h2 className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-gray-900">
          <span className="inline-block h-2 w-2 rounded-full bg-primary-600" />
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
          <div className="min-w-0">
            <p className="text-sm font-medium text-red-800">
              {WIZARD_MESSAGES.ERROR}
            </p>
            <p className="text-xs text-red-600 mt-1">{submitError}</p>
            {/* 3.1: si ya hay un expediente activo para este inmueble, ofrecer
                ir directo a él en vez de dejar al usuario atascado. */}
            {existingExpediente && (
              <Link
                href={`/expedientes/${existingExpediente.id}`}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
              >
                Ver expediente{existingExpediente.numero ? ` ${existingExpediente.numero}` : ' existente'}
                <IconArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Resumen del Inmueble */}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <IconHome size={16} className="text-gray-400" />
            Inmueble Seleccionado
          </h3>
          <button
            type="button"
            onClick={() => onEditStep(1)}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-50"
          >
            <IconPencil size={13} /> Editar
          </button>
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
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                    {TIPO_LABELS[inmueble.tipo as keyof typeof TIPO_LABELS] || inmueble.tipo}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {inmueble.direccion}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <IconMapPin size={12} />
                  {inmueble.ciudad}, {inmueble.departamento}
                </p>
                <p className="mt-2 text-lg font-black tracking-tight text-primary-600">
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
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <IconUser size={16} className="text-gray-400" />
            Solicitante
            {isNewSolicitante && (
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                Nuevo
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={() => onEditStep(2)}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-50"
          >
            <IconPencil size={13} /> Editar
          </button>
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
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <IconFileText size={16} className="text-gray-400" />
            Configuracion
          </h3>
          <button
            type="button"
            onClick={() => onEditStep(3)}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-50"
          >
            <IconPencil size={13} /> Editar
          </button>
        </div>
        <div className="p-4 space-y-3">
          {/* Forma de pago — §7 la exige en el resumen */}
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">Forma de pago del estudio</p>
            {forma_pago ? (
              <p className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                <IconCreditCard size={14} className="text-gray-400" />
                {FORMA_PAGO_LABEL[forma_pago]}
              </p>
            ) : (
              <p className="text-sm text-red-600">Sin elegir — vuelve al paso 3</p>
            )}
          </div>

          {/* Notas */}
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">Notas internas</p>
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
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">Responsable asignado</p>
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
