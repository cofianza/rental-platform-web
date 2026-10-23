/**
 * CoarrendatarioInviteForm — formulario para invitar a un coarrendatario
 * cuando el estudio está en revisión ('condicionado') o, desde la Decisión 2
 * (2026-09-25), aprobado y todavía sin contrato: ahí baja la prima de
 * vinculación del 20 % al 10 % del canon. Compartido por:
 *   - el SOLICITANTE (audience='solicitante'), desde CoarrendatarioCard y, sin
 *     cuenta, desde su enlace personal /cargar-documentos (P18).
 *   - el GESTOR (audience='gestor'): inmobiliaria / propietario / admin /
 *     operador, desde CoarrendatarioPropietarioCard. Útil cuando es la
 *     inmobiliaria quien lleva el expediente y agrega al coarrendatario en
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
import { fechaCondicion } from './textoVisible'

// Sin tarjeta de identidad (el servicio es solo para mayores de edad), ni
// pasaporte (los burós colombianos no lo consultan: la evaluación fallaría), ni
// NIT: el coarrendatario es una persona natural (el contrato lo rechaza y el
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
  { value: 'ppt', label: 'Permiso por Protección Temporal (PPT)' },
  { value: 'pep', label: 'Permiso Especial de Permanencia (PEP)' },
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
  /** Estudio ya aprobado (Decisión 2): el coarrendatario es opcional y baja la prima. */
  aprobado?: boolean
  /** Adenda 3 §6: aprobado con condición de coarrendatario. Ahí NO es opcional
   *  ni lo revisa un analista: si no acepta antes de `vence_en`, el estudio se
   *  cierra sin aprobarse. `vence_en` falta donde la API no la manda (enlace). */
  condicion?: { vence_en?: string; vencida?: boolean } | null
  /** Adenda 3 V2 §6.1: el titular todavía no se evalúa (coarrendatario desde el inicio). */
  antesDeLaDecision?: boolean
}

type Campo = 'nombre' | 'apellido' | 'numDoc' | 'email' | 'telefono'

// Errores de la API que van junto a un campo (UX #4): el correo, el WhatsApp o
// el documento del titular. El mensaje no trae el dato del titular.
const CAMPO_DEL_ERROR: Record<string, Campo> = {
  COARRENDATARIO_MISMO_EMAIL: 'email',
  COARRENDATARIO_MISMO_TELEFONO: 'telefono',
  COARRENDATARIO_MISMO_DOCUMENTO: 'numDoc',
}

export function CoarrendatarioInviteForm({
  invitar,
  audience,
  initial,
  onInvited,
  aprobado = false,
  condicion = null,
  antesDeLaDecision = false,
}: CoarrendatarioInviteFormProps) {
  const esGestor = audience === 'gestor'
  const conCondicion = !esGestor && !!condicion
  const fechaLimite = condicion?.vence_en && !condicion.vencida ? fechaCondicion(condicion.vence_en) : null
  const uid = useId()
  const idDe = (c: Campo) => `${uid}-${c}`
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({})
  const limpiar = (c: Campo) => { if (errores[c]) setErrores((p) => ({ ...p, [c]: undefined })) }

  // Con datos precargados abrimos el formulario de una: esconderlo tras
  // "Agregar coarrendatario" ocultaria justo la prueba de que ya los tenemos.
  const [showForm, setShowForm] = useState(!!initial)
  const [submitting, setSubmitting] = useState(false)
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [apellido, setApellido] = useState(initial?.apellido ?? '')
  const [tipoDoc, setTipoDoc] = useState<IInvitarCoarrendatarioInput['tipo_documento']>('cc')
  const [numDoc, setNumDoc] = useState('')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [telefono, setTelefono] = useState(initial?.telefono ?? '')

  const handleInvitar = async () => {
    // Error junto a cada campo y foco en el primero: un toast genérico no
    // decía cuál faltaba.
    const e: Partial<Record<Campo, string>> = {}
    if (!nombre.trim()) e.nombre = 'Escriba el nombre.'
    else if (!esNombreValido(nombre.trim())) e.nombre = 'El nombre solo puede tener letras.'
    if (!apellido.trim()) e.apellido = 'Escriba el primer apellido.'
    else if (!esNombreValido(apellido.trim())) e.apellido = 'El apellido solo puede tener letras.'
    if (!numDoc.trim()) e.numDoc = 'Escriba el número de documento.'
    if (!email.trim()) e.email = 'Escriba el correo: ahí le llega la invitación.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Revise el correo: parece incompleto.'
    // CORR §3.1.3: obligatorio, porque la invitación también le llega por WhatsApp.
    if (telefono.replace(/\D/g, '').length < 10) e.telefono = 'Escriba el celular: ahí le llega la invitación por WhatsApp.'
    setErrores(e)
    const primero = (Object.keys(e) as Campo[])[0]
    if (primero) {
      document.getElementById(idDe(primero))?.focus()
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
        telefono: telefono.trim(),
      })
      toast.success(`Invitación enviada a ${email}`)
      setShowForm(false)
      setNombre(''); setApellido(''); setNumDoc(''); setEmail(''); setTelefono('')
      onInvited?.()
    } catch (err) {
      const campo = CAMPO_DEL_ERROR[(err as { code?: string })?.code ?? '']
      if (campo && err instanceof Error) {
        setErrores({ [campo]: err.message })
        document.getElementById(idDe(campo))?.focus()
      } else {
        toast.error(err instanceof Error ? err.message : 'No se pudo enviar la invitación.')
      }
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
            {esGestor
              ? 'Invite a un coarrendatario'
              : conCondicion
                ? `Invite a su coarrendatario${fechaLimite ? ` antes del ${fechaLimite}` : ''}`
                : 'Puede sumar un coarrendatario (opcional)'}
          </h3>
          <p className="text-sm text-gray-700">
            {conCondicion ? (
              <>
                {/* Adenda 3 V2 §6.9: el texto literal, sin «fiador» ni «codeudor» y sin
                    presentarlo como una condición negativa; solo se le suma el plazo. */}
                Está cerca. ¿Alguien más va a vivir con usted en el inmueble? Si esa persona tiene ingresos propios,
                agréguela como coarrendatario: volvemos a evaluar con los dos y le damos respuesta en segundos. Solo
                necesitamos su cédula y su autorización.{fechaLimite ? ` Plazo para agregarlo: hasta el ${fechaLimite}.` : ''}
              </>
            ) : aprobado ? (
              <>
                {esGestor
                  ? 'El estudio quedó aprobado y el solicitante puede firmar solo. Si antes del contrato suma como '
                  : 'Su estudio fue aprobado y puede firmar solo. Si antes del contrato suma como '}
                <strong>coarrendatario</strong> a la persona con quien {esGestor ? 'vivirá' : 'va a vivir'}, la prima de
                vinculación baja del 20 % al 10 % del canon; la evaluación del coarrendatario no tiene costo adicional.{' '}
                No necesita finca raíz. <strong>No es fiador: firma el contrato como arrendatario, junto con el titular, y responde solidariamente.</strong>
              </>
            ) : esGestor && antesDeLaDecision ? (
              <>
                Puede agregar a la persona con quien vivirá el solicitante como <strong>coarrendatario</strong>. Cada uno
                se consulta apenas autoriza (con el estudio pagado), y el estudio se decide con los dos. <strong>No es fiador: firma el contrato como arrendatario, junto con el titular, y responde solidariamente.</strong>
              </>
            ) : esGestor ? (
              <>
                El estudio quedó condicionado. Puede invitar a la persona con quien vivirá el
                solicitante como <strong>coarrendatario</strong>: se evalúa a ambos y los
                respaldamos juntos como un solo arrendatario. <strong>No es fiador: firma el contrato como arrendatario, junto con el titular, y responde solidariamente.</strong>
              </>
            ) : (
              <>
                Su estudio quedó condicionado y lo revisa un analista de Cofianza; no tiene que hacer
                nada para que avance. Si quiere reforzar su caso, invite a la persona con quien va a
                vivir como <strong>coarrendatario</strong>: los dos toman el arriendo y los respaldamos
                juntos como un solo arrendatario. <strong>No es fiador: firma el contrato como arrendatario, junto con el titular, y responde solidariamente.</strong>
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
          Agregar coarrendatario
          <IconArrowRight size={16} />
        </button>
      ) : (
        <div className="bg-white border border-amber-200 rounded-lg p-4 space-y-3">
          <p className="text-sm text-gray-700">
            {initial?.nombre
              ? `Ya nos contó de ${initial.nombre}: complete sus datos y envíele la invitación.`
              : esGestor
                ? 'Escriba los datos del coarrendatario. Le enviaremos una invitación a su correo para que acepte y autorice su evaluación crediticia.'
                : 'Escriba los datos de la persona. Le enviaremos una invitación a su correo para que acepte y autorice su evaluación crediticia.'}
            {' '}Todos los campos son obligatorios.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <FormField id={idDe('nombre')} label="Nombre" value={nombre} error={errores.nombre} onChange={(v) => { setNombre(v); limpiar('nombre') }} />
            {/* Solo el primero: DataCrédito lo contrasta contra la
                Registraduría tal cual — con los dos apellidos la consulta
                falla (código 10) y se factura igual. No se auto-recorta en
                código porque hay primeros apellidos compuestos ('De La Hoz'). */}
            <FormField id={idDe('apellido')} label="Primer apellido (como en la cédula)" value={apellido} error={errores.apellido} onChange={(v) => { setApellido(v); limpiar('apellido') }} />
          </div>

          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-2">
              <label htmlFor="coarrendatario-invite-form-tipo-doc" className="block text-xs font-medium text-gray-700 mb-1">Tipo de documento</label>
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
              <FormField id={idDe('numDoc')} label="Número de documento" value={numDoc} error={errores.numDoc} onChange={(v) => { setNumDoc(v); limpiar('numDoc') }} inputMode="numeric" />
            </div>
          </div>

          <FormField id={idDe('email')} label="Correo electrónico" type="email" value={email} error={errores.email} onChange={(v) => { setEmail(v); limpiar('email') }} />

          <PhoneInput
            label="Celular (WhatsApp): le llega la invitación también por ahí"
            value={telefono}
            onChange={(v) => { setTelefono(v); limpiar('telefono') }}
            error={errores.telefono}
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

export function FormField({
  id, label, value, onChange, error, type = 'text', inputMode,
}: {
  /** Un id por campo: el padre enfoca el primero con error. */
  id: string
  label: string; value: string; onChange: (v: string) => void; error?: string; type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${error ? 'border-red-300' : 'border-gray-300'}`}
      />
      {error && <p id={`${id}-error`} className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
