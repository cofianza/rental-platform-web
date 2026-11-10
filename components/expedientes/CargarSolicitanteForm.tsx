/**
 * CargarSolicitanteForm — la persona que entra como solicitante del estudio,
 * una vez que la API confirmó el cambio (y su pago, si lo lleva). Al enviarlo
 * la API deja el estudio a nombre de esa persona y le envía su solicitud de
 * autorización. Aquí solo se piden y se validan los datos de contacto.
 */

'use client'

import { useId, useState } from 'react'
import { IconArrowRight, IconLoader } from '@/components/icons'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { botonModal } from '@/components/ui/Modal'
import { PhoneInput } from '@/components/ui/PhoneInput'
import type { ICargarSolicitanteInput } from '@/types/sustitucion'
import { FormField, TIPO_DOC_OPTIONS, esNombreValido } from './CoarrendatarioInviteForm'

type Campo = 'nombre' | 'apellido' | 'numDoc' | 'email' | 'telefono'

interface CargarSolicitanteFormProps {
  /** Quien sale (para el texto de confirmación). */
  nombreQueSale: string | null
  /** Envía a la API. Lanza su error para mostrarlo aquí. */
  cargar: (input: ICargarSolicitanteInput) => Promise<unknown>
}

export function CargarSolicitanteForm({ nombreQueSale, cargar }: CargarSolicitanteFormProps) {
  const uid = useId()
  const idDe = (c: Campo) => `${uid}-${c}`
  const [abierto, setAbierto] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorApi, setErrorApi] = useState<string | null>(null)
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({})
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [tipoDoc, setTipoDoc] = useState<ICargarSolicitanteInput['tipo_documento']>('cc')
  const [numDoc, setNumDoc] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const limpiar = (c: Campo) => {
    if (errores[c]) setErrores((p) => ({ ...p, [c]: undefined }))
  }

  const validar = (): boolean => {
    const e: Partial<Record<Campo, string>> = {}
    if (!nombre.trim()) e.nombre = 'Escriba el nombre.'
    else if (!esNombreValido(nombre.trim())) e.nombre = 'El nombre solo puede tener letras.'
    if (!apellido.trim()) e.apellido = 'Escriba los apellidos.'
    else if (!esNombreValido(apellido.trim())) e.apellido = 'El apellido solo puede tener letras.'
    if (!numDoc.trim()) e.numDoc = 'Escriba el número de documento.'
    if (!email.trim()) e.email = 'Escriba el correo: ahí recibirá esta persona su solicitud de autorización.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Revise el correo: parece incompleto.'
    if (telefono.trim() && telefono.replace(/\D/g, '').length < 10) e.telefono = 'Revise el celular: parece incompleto.'
    setErrores(e)
    const primero = (Object.keys(e) as Campo[])[0]
    if (primero) document.getElementById(idDe(primero))?.focus()
    return !primero
  }

  const enviar = async () => {
    setEnviando(true)
    setErrorApi(null)
    try {
      await cargar({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        tipo_documento: tipoDoc,
        numero_documento: numDoc.trim(),
        email: email.trim(),
        ...(telefono.replace(/\D/g, '').length >= 10 ? { telefono: telefono.trim() } : {}),
      })
      setAbierto(false)
    } catch (err) {
      setErrorApi(err instanceof Error && err.message ? err.message : 'No se pudo cargar a la persona. Inténtelo de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className={botonModal('primary', 'w-full sm:w-auto')}>
        Cargar al solicitante nuevo
        <IconArrowRight size={16} aria-hidden="true" />
      </button>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
      <p className="text-sm text-gray-700">Datos de la persona que entra como solicitante. Le enviaremos a esta persona su solicitud de autorización por correo y, si escribe el celular, por WhatsApp.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField id={idDe('nombre')} label="Nombre" value={nombre} error={errores.nombre} onChange={(v) => { setNombre(v); limpiar('nombre') }} />
        <FormField id={idDe('apellido')} label="Apellidos (como en el documento)" value={apellido} error={errores.apellido} onChange={(v) => { setApellido(v); limpiar('apellido') }} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-tipo`} className="mb-1 block text-xs font-medium text-gray-700">
            Tipo de documento
          </label>
          <select
            id={`${uid}-tipo`}
            value={tipoDoc}
            onChange={(e) => setTipoDoc(e.target.value as ICargarSolicitanteInput['tipo_documento'])}
            className="min-h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {TIPO_DOC_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3">
          <FormField id={idDe('numDoc')} label="Número de documento" value={numDoc} error={errores.numDoc} onChange={(v) => { setNumDoc(v); limpiar('numDoc') }} inputMode="numeric" />
        </div>
      </div>
      <FormField id={idDe('email')} label="Correo electrónico" type="email" value={email} error={errores.email} onChange={(v) => { setEmail(v); limpiar('email') }} />
      <PhoneInput label="Celular (opcional)" value={telefono} onChange={(v) => { setTelefono(v); limpiar('telefono') }} error={errores.telefono} />
      {errorApi && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {errorApi}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => validar() && setConfirmando(true)} disabled={enviando} aria-busy={enviando || undefined} className={botonModal('primary', 'w-full sm:w-auto')}>
          {enviando && <IconLoader size={16} className="animate-spin" aria-hidden="true" />}
          {enviando ? 'Cargando…' : 'Continuar'}
        </button>
        <button type="button" onClick={() => setAbierto(false)} disabled={enviando} className={botonModal('secondary', 'w-full sm:w-auto')}>
          Volver
        </button>
      </div>

      <ConfirmDialog
        isOpen={confirmando}
        onClose={() => setConfirmando(false)}
        onConfirm={async () => {
          setConfirmando(false)
          await enviar()
        }}
        title="Confirmar el solicitante nuevo"
        message={
          <div className="space-y-2">
            <p>
              {`${nombre.trim()} ${apellido.trim()}`.trim()} quedará como solicitante de este estudio
              {nombreQueSale ? ` en lugar de ${nombreQueSale}` : ''}, que deja de tener acceso a él.
            </p>
            <p>El estudio vuelve a revisión hasta que la persona nueva autorice y se conozca su resultado. Este paso no se puede deshacer desde aquí.</p>
          </div>
        }
        confirmLabel="Confirmar y enviar la autorización"
        isLoading={enviando}
      />
    </div>
  )
}
