/**
 * CoarrendatarioReenviarInvitacion — corrige los datos del coarrendatario
 * invitado (contacto, nombre o documento) y reenvía la invitación pendiente, o
 * la cancela para invitar a otra persona (P4, 2026-09-24). Sin esto, un correo
 * o una cédula mal escritos eran un callejón sin salida.
 *
 * Solo se muestra con la invitación en 'pendiente_aceptacion': después de la
 * evaluación el coarrendatario ya no se reemplaza (uno por estudio). El
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
  'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'

type Campo = 'nombre' | 'apellido' | 'num-doc' | 'invitacion-correo'
const idDe = (c: Campo) => `coarrendatario-reenviar-${c}`

/** Atributos del campo con su error (borde rojo + aria) y el mensaje debajo. */
function conError(c: Campo, error?: string) {
  return {
    id: idDe(c),
    'aria-invalid': !!error,
    'aria-describedby': error ? `${idDe(c)}-error` : undefined,
    className: `${INPUT} ${error ? 'border-red-300' : 'border-gray-300'}`,
  }
}

function MensajeError({ campo, error }: { campo: Campo; error?: string }) {
  return error ? <p id={`${idDe(campo)}-error`} className="mt-1 text-xs text-red-600">{error}</p> : null
}

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
  // Error junto a cada campo: un toast genérico no decía cuál.
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({})
  const limpiar = (c: Campo) => { if (errores[c]) setErrores((p) => ({ ...p, [c]: undefined })) }

  if (coa.estado !== 'pendiente_aceptacion') return null

  const handleReenviar = async () => {
    const emailNorm = email.trim().toLowerCase()
    const e: Partial<Record<Campo, string>> = {}
    if (!nombre.trim()) e.nombre = 'Escriba el nombre.'
    else if (!esNombreValido(nombre.trim())) e.nombre = 'El nombre solo puede tener letras.'
    if (!apellido.trim()) e.apellido = 'Escriba el primer apellido.'
    else if (!esNombreValido(apellido.trim())) e.apellido = 'El apellido solo puede tener letras.'
    if (!numDoc.trim()) e['num-doc'] = 'Escriba el número de documento.'
    if (!emailNorm || !/.+@.+\..+/.test(emailNorm)) e['invitacion-correo'] = 'Escriba un correo válido: ahí le llega la invitación.'
    setErrores(e)
    const primero = (Object.keys(e) as Campo[])[0]
    if (primero) {
      document.getElementById(idDe(primero))?.focus()
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
      toast.success('Invitación cancelada. Ya puede invitar a otra persona.')
      onCambio?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cancelar la invitación')
    }
  }

  // La invitó quien tramita su arriendo: el titular no ve el contacto del
  // tercero, así que no corrige ni reenvía; puede cancelarla.
  const protegidos = !!coa.datos_protegidos

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-xs font-semibold text-gray-700 mb-2">
        {protegidos
          ? 'Esta invitación la envió quien tramita su arriendo. Si algún dato está mal, pídale que la corrija y la reenvíe, o cancélela para invitar a otra persona'
          : '¿No le llegó o algún dato está mal? Corríjalo y reenvíe la invitación, o cancélela para invitar a otra persona'}
      </p>
      {!protegidos && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <div>
          <label htmlFor="coarrendatario-reenviar-nombre" className="block text-[11px] font-medium text-gray-500 mb-1">Nombre</label>
          <input {...conError('nombre', errores.nombre)} value={nombre} onChange={(e) => { setNombre(e.target.value); limpiar('nombre') }} disabled={sending} />
          <MensajeError campo="nombre" error={errores.nombre} />
        </div>
        <div>
          <label htmlFor="coarrendatario-reenviar-apellido" className="block text-[11px] font-medium text-gray-500 mb-1">
            Primer apellido (como en la cédula)
          </label>
          <input {...conError('apellido', errores.apellido)} value={apellido} onChange={(e) => { setApellido(e.target.value); limpiar('apellido') }} disabled={sending} />
          <MensajeError campo="apellido" error={errores.apellido} />
        </div>
        <div>
          <label htmlFor="coarrendatario-reenviar-tipo-doc" className="block text-[11px] font-medium text-gray-500 mb-1">Tipo de documento</label>
          <select
            id="coarrendatario-reenviar-tipo-doc"
            value={tipoDoc}
            onChange={(e) => setTipoDoc(e.target.value as IInvitarCoarrendatarioInput['tipo_documento'])}
            disabled={sending}
            className={`${INPUT} border-gray-300`}
          >
            {TIPO_DOC_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="coarrendatario-reenviar-num-doc" className="block text-[11px] font-medium text-gray-500 mb-1">Número de documento</label>
          <input
            {...conError('num-doc', errores['num-doc'])}
            inputMode="numeric"
            value={numDoc}
            onChange={(e) => { setNumDoc(e.target.value); limpiar('num-doc') }}
            disabled={sending}
          />
          <MensajeError campo="num-doc" error={errores['num-doc']} />
        </div>
        <div>
          <label htmlFor="coarrendatario-reenviar-invitacion-correo" className="block text-[11px] font-medium text-gray-500 mb-1">Correo</label>
          <input
            {...conError('invitacion-correo', errores['invitacion-correo'])}
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); limpiar('invitacion-correo') }}
            disabled={sending}
            placeholder="correo@ejemplo.com"
          />
          <MensajeError campo="invitacion-correo" error={errores['invitacion-correo']} />
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
      )}
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
        {!protegidos && (
        <button
          type="button"
          onClick={handleReenviar}
          disabled={sending || !email.trim()}
          className="inline-flex shrink-0 items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? <IconLoader size={14} className="animate-spin" /> : <IconRefresh size={14} />}
          {sending ? 'Reenviando…' : 'Reenviar invitación'}
        </button>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmandoCancelar}
        onClose={() => setConfirmandoCancelar(false)}
        onConfirm={handleCancelar}
        title="¿Cancelar la invitación?"
        message={`El enlace que recibió ${coa.nombre} deja de funcionar. Después puede invitar a otra persona.`}
        confirmLabel="Sí, cancelarla"
        cancelLabel="Volver"
        variant="danger"
      />
    </div>
  )
}
