/**
 * CoarrendatarioInviteForm — formulario para invitar a un co-arrendatario
 * cuando el expediente está 'condicionado'. Compartido por:
 *   - el SOLICITANTE (audience='solicitante'), desde CoarrendatarioCard.
 *   - el GESTOR (audience='gestor'): inmobiliaria / propietario / admin /
 *     operador, desde CoarrendatarioPropietarioCard. Útil cuando es la
 *     inmobiliaria quien lleva el expediente y agrega al co-arrendatario en
 *     nombre del inquilino.
 *
 * El backend ya autoriza a ambos (roleGuard del POST /:id/coarrendatario);
 * esto solo aporta la UI. Al enviar, llama onInvited() para que la card padre
 * refresque y muestre el estado de la invitación.
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { IconUsers, IconArrowRight } from '@/components/icons'
import {
  coarrendatarioService,
  type IInvitarCoarrendatarioInput,
} from '@/services/coarrendatarioService'

const TIPO_DOC_OPTIONS: Array<{ value: IInvitarCoarrendatarioInput['tipo_documento']; label: string }> = [
  { value: 'cc', label: 'Cédula de Ciudadanía' },
  { value: 'ce', label: 'Cédula de Extranjería' },
  { value: 'ti', label: 'Tarjeta de Identidad' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'nit', label: 'NIT' },
]

interface CoarrendatarioInviteFormProps {
  expedienteId: string
  audience: 'solicitante' | 'gestor'
  onInvited?: () => void
}

export function CoarrendatarioInviteForm({
  expedienteId,
  audience,
  onInvited,
}: CoarrendatarioInviteFormProps) {
  const esGestor = audience === 'gestor'

  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [tipoDoc, setTipoDoc] = useState<IInvitarCoarrendatarioInput['tipo_documento']>('cc')
  const [numDoc, setNumDoc] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')

  const handleInvitar = async () => {
    if (!nombre.trim() || !apellido.trim() || !numDoc.trim() || !email.trim()) {
      toast.error('Llena todos los campos requeridos.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Email inválido.')
      return
    }
    setSubmitting(true)
    try {
      await coarrendatarioService.invitar(expedienteId, {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        tipo_documento: tipoDoc,
        numero_documento: numDoc.trim(),
        email: email.trim(),
        telefono: telefono.trim() || undefined,
      })
      toast.success(`Invitación enviada a ${email}`)
      setShowForm(false)
      setNombre(''); setApellido(''); setNumDoc(''); setEmail(''); setTelefono('')
      onInvited?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar la invitación.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border-2 border-amber-300 bg-amber-50/60 rounded-lg p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <IconUsers size={20} className="text-amber-700" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-0.5">
            {esGestor ? 'Invita a un co-arrendatario' : 'Tu solicitud necesita un co-arrendatario'}
          </h3>
          <p className="text-sm text-gray-700">
            {esGestor ? (
              <>
                El estudio quedó condicionado. Puedes invitar a la persona con quien vivirá el
                solicitante como <strong>co-arrendatario</strong>: se hace un estudio a ambos y los
                respaldamos juntos como un solo arrendatario. <strong>No es fiador ni codeudor.</strong>
              </>
            ) : (
              <>
                Tu estudio crediticio salió como condicionado. La forma de proceder en Cofianza es
                invitar a la persona con quien vas a vivir como <strong>co-arrendatario</strong> — los
                dos toman el arriendo y los respaldamos juntos como un solo arrendatario. <strong>No es
                un fiador ni codeudor</strong>: es tu copiloto en este arriendo.
              </>
            )}
          </p>
        </div>
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
        >
          Agregar co-arrendatario
          <IconArrowRight size={16} />
        </button>
      ) : (
        <div className="bg-white border border-amber-200 rounded-lg p-4 space-y-3">
          <p className="text-sm text-gray-700">
            {esGestor
              ? 'Captura los datos del co-arrendatario. Le enviaremos una invitación a su correo para que acepte y autorice su estudio crediticio.'
              : 'Captura los datos de la persona. Le enviaremos una invitación a su correo para que acepte y autorice su estudio crediticio.'}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nombre" value={nombre} onChange={setNombre} />
            <FormField label="Apellido" value={apellido} onChange={setApellido} />
          </div>

          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo doc.</label>
              <select
                value={tipoDoc}
                onChange={(e) => setTipoDoc(e.target.value as IInvitarCoarrendatarioInput['tipo_documento'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {TIPO_DOC_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <FormField label="Número de documento" value={numDoc} onChange={setNumDoc} />
            </div>
          </div>

          <FormField label="Email" type="email" value={email} onChange={setEmail} />

          <PhoneInput
            label="WhatsApp (opcional — le llega la invitación también por ahí)"
            value={telefono}
            onChange={setTelefono}
          />

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleInvitar}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Enviando…' : 'Enviar invitación'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function FormField({
  label, value, onChange, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  )
}
