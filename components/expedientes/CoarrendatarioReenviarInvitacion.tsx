/**
 * CoarrendatarioReenviarInvitacion — corrige el contacto del co-arrendatario
 * invitado y reenvía la invitación pendiente. Sin esto, un email mal escrito
 * era un callejón sin salida: el enlace nunca llegaba y la invitación activa
 * bloqueaba invitar a otra persona (y solo el invitado podía declinar).
 *
 * Solo se muestra con la invitación en 'pendiente_aceptacion'. Mismo patrón
 * que el reintento de estudio: campos prellenados + botón de acción. El
 * backend regenera el token, así que el enlace anterior queda invalidado.
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { IconLoader, IconRefresh } from '@/components/icons'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { coarrendatarioService, type ICoarrendatario } from '@/services/coarrendatarioService'

interface CoarrendatarioReenviarInvitacionProps {
  expedienteId: string
  coa: ICoarrendatario
  /** Refresca la card padre tras reenviar (para ver el contacto actualizado). */
  onReenviado?: () => void
}

export function CoarrendatarioReenviarInvitacion({
  expedienteId,
  coa,
  onReenviado,
}: CoarrendatarioReenviarInvitacionProps) {
  const [email, setEmail] = useState(coa.email)
  const [telefono, setTelefono] = useState(coa.telefono ?? '')
  const [sending, setSending] = useState(false)

  if (coa.estado !== 'pendiente_aceptacion') return null

  const handleReenviar = async () => {
    const emailNorm = email.trim().toLowerCase()
    if (!emailNorm || !/.+@.+\..+/.test(emailNorm)) {
      toast.error('Ingresa un correo válido para reenviar la invitación')
      return
    }
    setSending(true)
    try {
      // Solo mandamos lo que cambió; sin cambios = reenviar al mismo contacto.
      // El teléfono va solo si tiene dígitos reales (PhoneInput deja '+57 '
      // cuando se borra el número).
      const telDigits = telefono.replace(/\D/g, '').replace(/^57/, '')
      await coarrendatarioService.reenviar(expedienteId, {
        ...(emailNorm !== coa.email.toLowerCase() ? { email: emailNorm } : {}),
        ...(telDigits.length >= 7 && telefono !== (coa.telefono ?? '')
          ? { telefono }
          : {}),
      })
      toast.success(`Invitación reenviada a ${emailNorm}`)
      onReenviado?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo reenviar la invitación')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-xs font-semibold text-gray-700 mb-2">
        ¿No le llegó la invitación? Verifica o corrige el contacto y reenvíala
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={sending}
            placeholder="correo@ejemplo.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px] text-gray-500">
          Al reenviar, el enlace anterior queda invalidado y se envía uno nuevo (vigente 7 días).
        </p>
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
    </div>
  )
}
