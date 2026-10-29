/**
 * Coarrendatario desde el asistente (Adenda 3 V2 §6.1, pedido de Gerencia):
 * opcional, con todos los datos obligatorios si se agrega. Al enviar el
 * asistente, se le manda su propia invitación antes de pedir la autorización
 * del titular. Cada uno se consulta apenas autoriza (reunión con Gerencia 23-oct).
 */

'use client'

import { useId } from 'react'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { IconUsers } from '@/components/icons'
import { FormField, TIPO_DOC_OPTIONS } from '@/components/expedientes/CoarrendatarioInviteForm'
import type { CoarrendatarioWizard } from '@/hooks/useExpedienteWizard'

const VACIO: CoarrendatarioWizard = { nombre: '', apellido: '', tipo_documento: 'cc', numero_documento: '', email: '', telefono: '' }

interface Props {
  value: CoarrendatarioWizard | null
  errors: Record<string, string>
  onChange: (value: CoarrendatarioWizard | null) => void
  onClearError: (campo: string) => void
}

export function CoarrendatarioInicio({ value, errors, onChange, onClearError }: Props) {
  const uid = useId()
  const set = (campo: keyof CoarrendatarioWizard) => (v: string) => {
    onChange({ ...(value ?? VACIO), [campo]: v })
    onClearError(campo)
  }

  return (
    <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked ? VACIO : null)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span>
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <IconUsers size={16} className="text-primary-700" />
            Agregar un coarrendatario (opcional)
          </span>
          <span className="mt-1 block text-sm text-gray-600">
            Es la persona que va a vivir con el solicitante. No es fiador: firma el contrato como arrendatario, junto
            con el titular, y los dos responden por el pago del canon. Su consulta va incluida en este estudio, sin
            costo adicional. Le enviamos su propia invitación por WhatsApp y correo para que autorice la consulta.
          </span>
        </span>
      </label>

      {value && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField id={`${uid}-nombre`} label="Nombre" value={value.nombre} error={errors.nombre} onChange={set('nombre')} />
            {/* Los dos, como en la cédula: van al contrato. A DataCrédito la API le manda solo el primero. */}
            <FormField id={`${uid}-apellido`} label="Apellidos (como en la cédula)" value={value.apellido} error={errors.apellido} onChange={set('apellido')} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <div className="sm:col-span-2">
              <label htmlFor={`${uid}-tipo`} className="mb-1 block text-xs font-medium text-gray-700">Tipo de documento</label>
              <select
                id={`${uid}-tipo`}
                value={value.tipo_documento}
                onChange={(e) => set('tipo_documento')(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {TIPO_DOC_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <FormField id={`${uid}-doc`} label="Número de documento" value={value.numero_documento} error={errors.numero_documento} onChange={set('numero_documento')} inputMode="numeric" />
            </div>
          </div>
          <FormField id={`${uid}-email`} label="Correo electrónico" type="email" value={value.email} error={errors.email} onChange={set('email')} />
          <PhoneInput label="Celular (WhatsApp)" value={value.telefono} onChange={set('telefono')} error={errors.telefono} />
        </div>
      )}
    </section>
  )
}
