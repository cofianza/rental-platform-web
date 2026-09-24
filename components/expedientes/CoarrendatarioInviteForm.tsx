/**
 * CoarrendatarioInviteForm — formulario para invitar a un co-arrendatario
 * cuando el expediente está 'condicionado'. Compartido por:
 *   - el SOLICITANTE (audience='solicitante'), desde CoarrendatarioCard y, sin
 *     cuenta, desde su enlace personal /cargar-documentos (P18).
 *   - el GESTOR (audience='gestor'): inmobiliaria / propietario / admin /
 *     operador, desde CoarrendatarioPropietarioCard. Útil cuando es la
 *     inmobiliaria quien lleva el expediente y agrega al co-arrendatario en
 *     nombre del inquilino.
 *
 * Quien lo monta decide a qué endpoint va (`invitar`): el panel o el enlace
 * con token. Al enviar, llama onInvited() para que el padre refresque.
 */

'use client'

import { useId, useState } from 'react'
import { toast } from 'sonner'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { IconUsers, IconArrowRight } from '@/components/icons'
import type { IInvitarCoarrendatarioInput } from '@/services/coarrendatarioService'

// Sin tarjeta de identidad (el servicio es solo para mayores de edad), ni
// pasaporte (los burós colombianos no lo consultan: la evaluación fallaría), ni
// NIT: el co-arrendatario es una persona natural (el contrato lo rechaza y el
// enlace del prospecto solo acepta estas dos).
/**
 * Mismo filtro que el API (src/lib/textoSinEnlaces.ts): letras, espacios,
 * apóstrofo, punto y guion, y sin dominios («www.x.co», «pago.info»). El nombre
 * va en el correo y el WhatsApp a un tercero. Validarlo aquí evita el error, y
 * desde el enlace del prospecto, gastar uno de sus intentos del día.
 */
const CON_ENLACE = /[<>]|h(?:tt|xx)ps?:|[\p{L}\d-][.．。｡]\p{L}{2,}/iu
export const esNombreValido = (v: string) => /^\p{L}[\p{L}\p{M}'’´ .-]*$/u.test(v) && !CON_ENLACE.test(v)

export const TIPO_DOC_OPTIONS: Array<{ value: IInvitarCoarrendatarioInput['tipo_documento']; label: string }> = [
  { value: 'cc', label: 'Cédula de Ciudadanía' },
  { value: 'ce', label: 'Cédula de Extranjería' },
]

interface CoarrendatarioInviteFormProps {
  /** Envía la invitación: el panel (por estudio) o el enlace del prospecto (por token). */
  invitar: (input: IInvitarCoarrendatarioInput) => Promise<unknown>
  audience: 'solicitante' | 'gestor'
  /** Lo que el prospecto YA nos contó en el paso 2 de la autorizacion
   *  ("con quien vas a vivir"). Ahi se le prometio que no tendria que repetir
   *  nada; si el estudio queda condicionado y esta card llega vacia, la
   *  promesa se rompe y le toca teclear los mismos cuatro campos otra vez. */
  initial?: { nombre?: string; apellido?: string; email?: string; telefono?: string } | null
  onInvited?: () => void
}

export function CoarrendatarioInviteForm({
  invitar,
  audience,
  initial,
  onInvited,
}: CoarrendatarioInviteFormProps) {
  const esGestor = audience === 'gestor'

  // Con datos precargados abrimos el formulario de una: esconderlo tras
  // "Agregar co-arrendatario" ocultaria justo la prueba de que ya los tenemos.
  const [showForm, setShowForm] = useState(!!initial)
  const [submitting, setSubmitting] = useState(false)
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [apellido, setApellido] = useState(initial?.apellido ?? '')
  const [tipoDoc, setTipoDoc] = useState<IInvitarCoarrendatarioInput['tipo_documento']>('cc')
  const [numDoc, setNumDoc] = useState('')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [telefono, setTelefono] = useState(initial?.telefono ?? '')

  const handleInvitar = async () => {
    if (!nombre.trim() || !apellido.trim() || !numDoc.trim() || !email.trim()) {
      toast.error('Llena todos los campos requeridos.')
      return
    }
    if (!esNombreValido(nombre.trim()) || !esNombreValido(apellido.trim())) {
      toast.error('El nombre y el apellido solo pueden tener letras.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Email inválido.')
      return
    }
    setSubmitting(true)
    try {
      await invitar({
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
            {esGestor ? 'Invita a un co-arrendatario' : 'Puedes sumar un co-arrendatario (opcional)'}
          </h3>
          <p className="text-sm text-gray-700">
            {esGestor ? (
              <>
                El estudio quedó condicionado. Puedes invitar a la persona con quien vivirá el
                solicitante como <strong>co-arrendatario</strong>: se evalúa a ambos y los
                respaldamos juntos como un solo arrendatario. <strong>No es fiador ni codeudor.</strong>
              </>
            ) : (
              <>
                Tu estudio quedó condicionado y lo revisa un analista de Cofianza; no tienes que hacer
                nada para que avance. Si quieres reforzar tu caso, invita a la persona con quien vas a
                vivir como <strong>co-arrendatario</strong>: los dos toman el arriendo y los respaldamos
                juntos como un solo arrendatario. <strong>No es un fiador ni codeudor</strong>.
              </>
            )}
          </p>
        </div>
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 transition-colors shadow-sm"
        >
          Agregar co-arrendatario
          <IconArrowRight size={16} />
        </button>
      ) : (
        <div className="bg-white border border-amber-200 rounded-lg p-4 space-y-3">
          <p className="text-sm text-gray-700">
            {initial?.nombre
              ? `Ya nos contaste de ${initial.nombre}: completa sus datos y envíale la invitación.`
              : esGestor
                ? 'Captura los datos del co-arrendatario. Le enviaremos una invitación a su correo para que acepte y autorice su evaluación crediticia.'
                : 'Captura los datos de la persona. Le enviaremos una invitación a su correo para que acepte y autorice su evaluación crediticia.'}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nombre" value={nombre} onChange={setNombre} />
            {/* Solo el primero: DataCrédito lo contrasta contra la
                Registraduría tal cual — con los dos apellidos la consulta
                falla (código 10) y se factura igual. No se auto-recorta en
                código porque hay primeros apellidos compuestos ('De La Hoz'). */}
            <FormField label="Primer apellido (como en la cédula)" value={apellido} onChange={setApellido} />
          </div>

          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-2">
              <label htmlFor="coarrendatario-invite-form-tipo-doc" className="block text-xs font-medium text-gray-700 mb-1">Tipo doc.</label>
              <select id="coarrendatario-invite-form-tipo-doc"
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
              <FormField label="Número de documento" value={numDoc} onChange={setNumDoc} inputMode="numeric" />
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
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50 transition-colors"
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
  label, value, onChange, type = 'text', inputMode,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  // Un id por campo: todos compartían el mismo y tocar cualquier etiqueta
  // enfocaba el primer campo.
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  )
}
