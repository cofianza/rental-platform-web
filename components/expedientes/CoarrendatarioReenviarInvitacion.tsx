/**
 * CoarrendatarioReenviarInvitacion — corrige los datos del co-arrendatario
 * invitado (contacto, nombre o documento) y reenvía la invitación pendiente, o
 * la cancela para invitar a otra persona (P4, 2026-09-24). Sin esto, un correo
 * o una cédula mal escritos eran un callejón sin salida.
 *
 * Solo se muestra con la invitación en 'pendiente_aceptacion': después de la
 * evaluación el co-arrendatario ya no se reemplaza (uno por estudio). El
 * backend regenera el token al reenviar y al cancelar, así que el enlace
 * anterior queda invalidado.
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { IconLoader, IconRefresh, IconUserX } from '@/components/icons'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PhoneInput } from '@/components/ui/PhoneInput'
import {
  coarrendatarioService,
  type ICoarrendatario,
  type IInvitarCoarrendatarioInput,
} from '@/services/coarrendatarioService'
import { esNombreValido, TIPO_DOC_OPTIONS } from './CoarrendatarioInviteForm'

interface CoarrendatarioReenviarInvitacionProps {
  expedienteId: string
  coa: ICoarrendatario
  /** Refresca la card padre tras reenviar o cancelar. */
  onCambio?: () => void
}

const INPUT =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'

export function CoarrendatarioReenviarInvitacion({
  expedienteId,
  coa,
  onCambio,
}: CoarrendatarioReenviarInvitacionProps) {
  const [nombre, setNombre] = useState(coa.nombre)
  const [apellido, setApellido] = useState(coa.apellido)
  const [tipoDoc, setTipoDoc] = useState(coa.tipo_documento as IInvitarCoarrendatarioInput['tipo_documento'])
  const [numDoc, setNumDoc] = useState(coa.numero_documento)
  const [email, setEmail] = useState(coa.email)
  const [telefono, setTelefono] = useState(coa.telefono ?? '')
  const [sending, setSending] = useState(false)
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false)

  if (coa.estado !== 'pendiente_aceptacion') return null

  const handleReenviar = async () => {
    const emailNorm = email.trim().toLowerCase()
    if (!emailNorm || !/.+@.+\..+/.test(emailNorm)) {
      toast.error('Ingresa un correo válido para reenviar la invitación')
      return
    }
    if (!nombre.trim() || !apellido.trim() || !numDoc.trim()) {
      toast.error('El nombre, el apellido y el documento no pueden quedar vacíos')
      return
    }
    if (!esNombreValido(nombre.trim()) || !esNombreValido(apellido.trim())) {
      toast.error('El nombre y el apellido solo pueden tener letras.')
      return
    }
    setSending(true)
    try {
      // Solo mandamos lo que cambió; sin cambios = reenviar a la misma persona.
      // El teléfono va solo si tiene dígitos reales (PhoneInput deja '+57 '
      // cuando se borra el número).
      const telDigits = telefono.replace(/\D/g, '').replace(/^57/, '')
      await coarrendatarioService.reenviar(expedienteId, {
        ...(emailNorm !== coa.email.toLowerCase() ? { email: emailNorm } : {}),
        ...(telDigits.length >= 7 && telefono !== (coa.telefono ?? '') ? { telefono } : {}),
        ...(nombre.trim() !== coa.nombre ? { nombre: nombre.trim() } : {}),
        ...(apellido.trim() !== coa.apellido ? { apellido: apellido.trim() } : {}),
        ...(tipoDoc !== coa.tipo_documento ? { tipo_documento: tipoDoc } : {}),
        ...(numDoc.trim() !== coa.numero_documento ? { numero_documento: numDoc.trim() } : {}),
      })
      toast.success(`Invitación reenviada a ${emailNorm}`)
      onCambio?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo reenviar la invitación')
    } finally {
      setSending(false)
    }
  }

  const handleCancelar = async () => {
    try {
      await coarrendatarioService.cancelar(expedienteId)
      toast.success('Invitación cancelada. Ya puedes invitar a otra persona.')
      onCambio?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cancelar la invitación')
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-xs font-semibold text-gray-700 mb-2">
        ¿No le llegó o algún dato está mal? Corrígelo y reenvía la invitación, o cancélala para invitar a otra persona
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <div>
          <label htmlFor="coarrendatario-reenviar-nombre" className="block text-[11px] font-medium text-gray-500 mb-1">Nombre</label>
          <input id="coarrendatario-reenviar-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={sending} className={INPUT} />
        </div>
        <div>
          <label htmlFor="coarrendatario-reenviar-apellido" className="block text-[11px] font-medium text-gray-500 mb-1">
            Primer apellido (como en la cédula)
          </label>
          <input id="coarrendatario-reenviar-apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} disabled={sending} className={INPUT} />
        </div>
        <div>
          <label htmlFor="coarrendatario-reenviar-tipo-doc" className="block text-[11px] font-medium text-gray-500 mb-1">Tipo de documento</label>
          <select
            id="coarrendatario-reenviar-tipo-doc"
            value={tipoDoc}
            onChange={(e) => setTipoDoc(e.target.value as IInvitarCoarrendatarioInput['tipo_documento'])}
            disabled={sending}
            className={INPUT}
          >
            {TIPO_DOC_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="coarrendatario-reenviar-num-doc" className="block text-[11px] font-medium text-gray-500 mb-1">Número de documento</label>
          <input
            id="coarrendatario-reenviar-num-doc"
            inputMode="numeric"
            value={numDoc}
            onChange={(e) => setNumDoc(e.target.value)}
            disabled={sending}
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="coarrendatario-reenviar-invitacion-correo" className="block text-[11px] font-medium text-gray-500 mb-1">Correo</label>
          <input id="coarrendatario-reenviar-invitacion-correo"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={sending}
            placeholder="correo@ejemplo.com"
            className={INPUT}
          />
        </div>
        <div>
          <PhoneInput
            label="Teléfono (opcional)"
            value={telefono}
            onChange={setTelefono}
            placeholder="300 123 4567"
          />
        </div>
      </div>
      <p className="text-[11px] text-gray-500 mb-2">
        Al reenviar o cancelar, el enlace anterior deja de funcionar. Reenviada, vale 7 días.
      </p>
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setConfirmandoCancelar(true)}
          disabled={sending}
          className="inline-flex shrink-0 items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <IconUserX size={14} />
          Cancelar invitación
        </button>
        <button
          type="button"
          onClick={handleReenviar}
          disabled={sending || !email.trim()}
          className="inline-flex shrink-0 items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? <IconLoader size={14} className="animate-spin" /> : <IconRefresh size={14} />}
          {sending ? 'Reenviando…' : 'Reenviar invitación'}
        </button>
      </div>

      <ConfirmDialog
        isOpen={confirmandoCancelar}
        onClose={() => setConfirmandoCancelar(false)}
        onConfirm={handleCancelar}
        title="¿Cancelar la invitación?"
        message={`El enlace que recibió ${coa.nombre} deja de funcionar. Después puedes invitar a otra persona.`}
        confirmLabel="Sí, cancelarla"
        cancelLabel="Volver"
        variant="danger"
      />
    </div>
  )
}
