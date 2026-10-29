/**
 * Step4Confirmation - HP-247
 * Paso 4: Confirmacion y creacion del expediente
 */

'use client'

import { useEffect, useState } from 'react'
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
  IconUsers,
} from '@/components/icons'
import { formatCurrency } from '@/lib/constants'
import { estudioService, type ITopeCanon } from '@/services/estudioService'
import type { WizardData, CoarrendatarioWizard } from '@/hooks/useExpedienteWizard'
import { WIZARD_MESSAGES } from './constants'
import { cn, formatNumeroEstudio } from '@/lib/utils'
import { TIPO_LABELS } from '@/components/inmuebles/constants'

interface Step4ConfirmationProps {
  data: WizardData
  /** Adenda 3 V2 §6.1: coarrendatario agregado en el paso 2 (null = sin él). */
  coarrendatario?: CoarrendatarioWizard | null
  isSubmitting: boolean
  submitError: string | null
  /** 3.1: si el solicitante ya tiene un expediente activo para este inmueble,
   *  el backend lo devuelve para ofrecer "Ver estudio" en vez de un callejón. */
  existingExpediente?: { id: string; numero: string | null } | null
  onSubmit: () => void
  /** Volver a un paso del wizard para corregir datos (1=inmueble, 2=solicitante, 3=config). */
  onEditStep: (step: number) => void
}

export function Step4Confirmation({
  data,
  coarrendatario = null,
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
    credito: 'Se reserva un cupo de su paquete; se descuenta cuando la central entrega el resultado',
    // Adenda 2 §7: se paga en línea; la solicitud sale al confirmarse el pago.
    inmobiliaria: 'Usted paga ahora con Mercado Pago; la solicitud de autorización sale cuando se confirme el pago',
    prospecto: 'Enlace de pago al prospecto, después de que autorice',
  }
  // Paga la inmobiliaria en línea: el botón no envía nada todavía, lleva al pago.
  const pagaAhora = forma_pago === 'inmobiliaria'

  // CORR §5.2: el precio (con IVA incluido) y los plazos vivos del panel, para
  // explicar qué pasa al enviar. Sin ellos la lista sale sin las cifras.
  const [panel, setPanel] = useState<ITopeCanon | null>(null)
  useEffect(() => {
    let vivo = true
    estudioService
      .getTopeCanon()
      .then((r) => {
        if (vivo) setPanel(r)
      })
      .catch(() => {
        // No se bloquea: la página de pago y los mensajes llevan sus propias cifras.
      })
    return () => {
      vivo = false
    }
  }, [])

  // Obtener datos del solicitante (existente o nuevo)
  const solicitanteData = solicitante || formData

  // Qué pasa al pulsar el botón: solo los pasos que aplican a esta forma de pago.
  const nombre = solicitanteData?.nombre?.trim() || 'la persona'
  const precio = panel?.precio_estudio
  const pasos: string[] = []
  if (forma_pago === 'credito') {
    pasos.push('Apartamos 1 cupo de su paquete. Se descuenta solo si la consulta a las centrales da resultado.')
  } else if (pagaAhora) {
    pasos.push(
      `Lo llevamos a Mercado Pago para pagar ${precio ?? 'el estudio'}. La solicitud sale cuando se confirme su pago.`,
    )
  }
  pasos.push(
    `Le enviamos a ${nombre} ${solicitanteData?.telefono ? `un WhatsApp al ${solicitanteData.telefono} y ` : ''}un correo a ${solicitanteData?.email ?? ''} con un enlace personal${panel?.dias_enlace ? ` que vence en ${panel.dias_enlace} días` : ''}. El mensaje lo envía Cofianza, la empresa fiadora: avísele antes para que lo reconozca.`,
  )
  pasos.push(
    `${nombre} confirma su documento y autoriza la consulta desde el celular.${panel?.verificacion_identidad ? ' También se le puede pedir una foto de su documento y de su rostro: conviene que tenga la cédula a mano.' : ''}`,
  )
  if (forma_pago === 'prospecto') {
    pasos.push(
      `Después de autorizar le llega el enlace de pago${precio ? ` por ${precio}` : ''}. No se consulta hasta que pague.`,
    )
  }
  pasos.push(
    'Apenas autorice y el estudio esté pagado, consultamos las centrales de riesgo y le avisamos el resultado en la plataforma.',
  )
  // Adenda 4: el titular se consulta apenas autoriza; lo que espera al coarrendatario es la decisión.
  if (coarrendatario) {
    const horas = panel?.horas_espera_coarrendatario
    pasos.push(
      `A ${coarrendatario.nombre.trim()} le llega su propia invitación. Cada uno se consulta apenas autoriza; ${
        horas
          ? `la decisión espera hasta ${horas} horas a que esta persona autorice y, si no lo hace, se decide con quienes hayan autorizado.`
          : 'el estudio se decide con los resultados de los dos.'
      }`,
    )
  }
  const FIN_CADUCIDAD: Record<string, string> = {
    credito: 'el cupo vuelve a su paquete.',
    inmobiliaria: 'le devolvemos el pago.',
    prospecto: 'no se cobra nada.',
  }
  const pieCaducidad =
    panel?.dias_caducidad && forma_pago
      ? `Si ${nombre} no autoriza en ${panel.dias_caducidad} días, el estudio se cierra solo y ${FIN_CADUCIDAD[forma_pago]}`
      : null
  const etiquetaBoton = pagaAhora ? WIZARD_MESSAGES.CONFIRM_CREATE_PAGO : WIZARD_MESSAGES.CONFIRM_CREATE

  return (
    <div className="space-y-6">
      {/* Header del paso */}
      <div>
        <h2 className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-gray-900">
          <span className="inline-block h-2 w-2 rounded-full bg-primary-600" />
          {WIZARD_MESSAGES.STEP4_TITLE}
        </h2>
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
                Ver estudio{existingExpediente.numero ? ` ${formatNumeroEstudio(existingExpediente.numero)}` : ' existente'}
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
            <IconHome size={16} className="text-gray-500" />
            {data.step1.sinInmueble ? 'Sin propiedad todavía' : 'Inmueble seleccionado'}
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
          {data.step1.sinInmueble && (
            <div className="text-sm text-gray-700">
              <p>
                Se evalúa con un canon de{' '}
                <strong className="text-primary-700">{formatCurrency(data.step1.canonObjetivo ?? 0)}</strong>
                {' '}({data.step1.destinacion === 'comercial' ? 'comercial' : 'vivienda'}).
              </p>
              <p className="mt-1 text-xs text-gray-500">
                El certificado dirá que la aprobación está sujeta a que el inmueble quede dentro del canon aprobado y a
                que el propietario o la inmobiliaria firmen convenio con Cofianza.
              </p>
            </div>
          )}
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
            <IconUser size={16} className="text-gray-500" />
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
                  {solicitanteData.tipo_persona === 'natural' ? 'Persona Natural' : 'Persona Jurídica'}
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
                  <IconMail size={14} className="text-gray-500" />
                  {solicitanteData.email}
                </span>
                {solicitanteData.telefono && (
                  <span className="flex items-center gap-1">
                    <IconPhone size={14} className="text-gray-500" />
                    {solicitanteData.telefono}
                  </span>
                )}
              </div>

              {/* Info adicional si existe */}
              {(solicitanteData.ocupacion || solicitanteData.empresa) && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <IconBuilding2 size={14} className="text-gray-500" />
                  {solicitanteData.ocupacion}
                  {solicitanteData.empresa && ` - ${solicitanteData.empresa}`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {coarrendatario && (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <IconUsers size={16} className="text-gray-500" />
              Coarrendatario
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
          <div className="space-y-2 p-4 text-sm text-gray-600">
            <p className="font-medium text-gray-900">{coarrendatario.nombre} {coarrendatario.apellido}</p>
            <p><span className="uppercase font-medium">{coarrendatario.tipo_documento}:</span> {coarrendatario.numero_documento}</p>
            <div className="flex flex-wrap gap-4">
              <span className="flex items-center gap-1"><IconMail size={14} className="text-gray-500" />{coarrendatario.email}</span>
              <span className="flex items-center gap-1"><IconPhone size={14} className="text-gray-500" />{coarrendatario.telefono}</span>
            </div>
          </div>
        </div>
      )}

      {/* Resumen del pago */}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <IconFileText size={16} className="text-gray-500" />
            Pago
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
                <IconCreditCard size={14} className="text-gray-500" />
                {FORMA_PAGO_LABEL[forma_pago]}
              </p>
            ) : (
              <p className="text-sm text-red-600">Sin elegir: vuelva al paso 3</p>
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
              <p className="text-sm text-gray-500 italic">Sin notas</p>
            )}
          </div>

          {/* Responsable */}
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">Responsable asignado</p>
            {miembro_responsable_id ? (
              <p className="text-sm text-gray-700">
                <span className="inline-flex items-center gap-1">
                  <IconUser size={14} className="text-gray-500" />
                  {miembro_responsable_nombre || 'Responsable asignado'}
                </span>
              </p>
            ) : analista_id ? (
              <p className="text-sm text-gray-700">
                <span className="inline-flex items-center gap-1">
                  <IconUser size={14} className="text-gray-500" />
                  Analista asignado
                </span>
              </p>
            ) : (
              <p className="text-sm text-gray-500 italic">Sin asignar</p>
            )}
          </div>
        </div>
      </div>

      {/* Boton de crear, con lo que va a pasar justo encima */}
      <div className="border-t border-gray-200 pt-5">
        <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50/50 p-4">
          <h3 className="text-sm font-bold text-gray-900">Qué pasa cuando pulse «{etiquetaBoton}»</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-gray-700">
            {pasos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
          {pieCaducidad && <p className="mt-3 text-xs text-gray-600">{pieCaducidad}</p>}
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-colors',
            isSubmitting
              ? 'cursor-not-allowed bg-gray-300 text-gray-500'
              : 'bg-coral-500 text-ink-900 shadow-sm hover:bg-coral-400'
          )}
        >
          {isSubmitting ? (
            <>
              <IconLoader size={18} className="animate-spin" />
              {pagaAhora ? WIZARD_MESSAGES.CREATING_PAGO : WIZARD_MESSAGES.CREATING}
            </>
          ) : (
            <>
              {pagaAhora ? <IconCreditCard size={18} /> : <IconCheck size={18} />}
              {etiquetaBoton}
            </>
          )}
        </button>
        {/* Reunión con Gerencia 23-oct: un nombre mal escrito tiene arreglo. */}
        <p className="mt-2 text-center text-xs text-gray-500">
          Revise el nombre y el documento: la consulta a las centrales los coteja. Si después nota un error, lo corrige
          desde el estudio con «Corregir datos» mientras la persona no haya autorizado.
        </p>
      </div>
    </div>
  )
}
