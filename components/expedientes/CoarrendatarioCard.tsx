/**
 * CoarrendatarioCard — visible para el SOLICITANTE cuando su expediente
 * está en estado 'condicionado'.
 *
 * Mario (5-may-2026): nuevo paradigma. Cuando el estudio queda condicionado,
 * en vez de pedir documentos, ofrecemos invitar a un co-arrendatario.
 * Cofianza no pide fiador — pide que pongas a la persona con quien vas
 * a vivir y juntos los respaldamos como un solo arrendatario.
 *
 * El form captura los datos del invitado, se manda invitación por correo,
 * y aquí mostramos el estado actual (pendiente / aceptado / rechazado /
 * estudio completado).
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { PhoneInput } from '@/components/ui/PhoneInput'
import {
  coarrendatarioService,
  type ICoarrendatario,
  type IInvitarCoarrendatarioInput,
} from '@/services/coarrendatarioService'

interface CoarrendatarioCardProps {
  expedienteId: string
  expedienteEstado: string
  userRol?: string
  onUpdate?: () => void
}

const TIPO_DOC_OPTIONS: Array<{ value: IInvitarCoarrendatarioInput['tipo_documento']; label: string }> = [
  { value: 'cc', label: 'Cédula de Ciudadanía' },
  { value: 'ce', label: 'Cédula de Extranjería' },
  { value: 'ti', label: 'Tarjeta de Identidad' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'nit', label: 'NIT' },
]

export function CoarrendatarioCard({
  expedienteId,
  expedienteEstado,
  userRol,
  onUpdate,
}: CoarrendatarioCardProps) {
  const [coa, setCoa] = useState<ICoarrendatario | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [tipoDoc, setTipoDoc] = useState<IInvitarCoarrendatarioInput['tipo_documento']>('cc')
  const [numDoc, setNumDoc] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')

  const coaLoadedRef = useRef(false)
  const fetchCoa = useCallback(async () => {
    try {
      const data = await coarrendatarioService.getDelExpediente(expedienteId)
      setCoa(data)
      coaLoadedRef.current = true
    } catch {
      // No borrar la card por un error transitorio del polling: solo dejamos
      // null si nunca llegó a cargar.
      if (!coaLoadedRef.current) setCoa(null)
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => { fetchCoa() }, [fetchCoa])

  // Polling sutil mientras está pendiente_aceptacion o aceptado (sin resultado)
  // para que el solicitante vea el cambio sin recargar.
  useEffect(() => {
    if (!coa) return
    const enEspera = coa.estado === 'pendiente_aceptacion' || coa.estado === 'aceptado'
    if (!enEspera) return
    const id = setInterval(fetchCoa, 6000)
    return () => clearInterval(id)
  }, [coa, fetchCoa])

  // Visibilidad: solo cuando expediente está condicionado y el usuario es solicitante.
  if (loading) return null
  if (expedienteEstado !== 'condicionado') return null
  if (userRol !== 'solicitante') return null

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
      await fetchCoa()
      onUpdate?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo enviar la invitación.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Sin coarrendatario: invitar ────────────────────────────────────
  if (!coa) {
    return (
      <div className="border-2 border-amber-300 bg-amber-50/60 rounded-lg p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-0.5">Tu solicitud necesita un co-arrendatario</h3>
            <p className="text-sm text-gray-700">
              Tu estudio crediticio salió como condicionado. La forma de proceder en Cofianza es invitar a la persona con quien vas a vivir como
              <strong> co-arrendatario</strong> — los dos toman el arriendo y los respaldamos juntos como un solo arrendatario. <strong>No es un fiador
              ni codeudor</strong>: es tu copiloto en este arriendo.
            </p>
          </div>
        </div>

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
          >
            Agregar co-arrendatario
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        ) : (
          <div className="bg-white border border-amber-200 rounded-lg p-4 space-y-3">
            <p className="text-sm text-gray-700">
              Captura los datos de la persona. Le enviaremos una invitación a su correo para que acepte y autorice su estudio crediticio.
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
              label="Teléfono (opcional, para notificaciones futuras)"
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

  // ── Con coarrendatario invitado: estado actual ─────────────────────
  return (
    <div className="border-2 border-amber-300 bg-amber-50/60 rounded-lg p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 mb-0.5">Co-arrendatario invitado</h3>
          <p className="text-sm text-gray-700 truncate">
            <strong>{coa.nombre} {coa.apellido}</strong> · {coa.email}
          </p>
        </div>
      </div>

      <EstadoBadge estado={coa.estado} />
    </div>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────────

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

function EstadoBadge({ estado }: { estado: ICoarrendatario['estado'] }) {
  const cfg: Record<ICoarrendatario['estado'], { color: string; label: string; mensaje: string }> = {
    pendiente_aceptacion: {
      color: 'bg-blue-50 border-blue-200 text-blue-900',
      label: 'Esperando respuesta',
      mensaje: 'Le enviamos la invitación por correo. Te avisaremos cuando responda.',
    },
    aceptado: {
      color: 'bg-blue-50 border-blue-200 text-blue-900',
      label: 'Aceptó la invitación',
      mensaje: 'Estamos procesando su estudio crediticio. Cuando termine, te diremos si pasaron juntos.',
    },
    rechazado_invitacion: {
      color: 'bg-red-50 border-red-200 text-red-900',
      label: 'Declinó la invitación',
      mensaje: 'La persona declinó. Puedes invitar a alguien más.',
    },
    estudio_completado: {
      color: 'bg-green-50 border-green-200 text-green-900',
      label: 'Estudio completado',
      mensaje: 'El estudio del co-arrendatario terminó. Revisa el resumen del expediente para ver el resultado combinado.',
    },
  }
  const c = cfg[estado]
  return (
    <div className={`border rounded-md p-3 ${c.color}`}>
      <p className="text-sm font-medium">{c.label}</p>
      <p className="text-xs mt-1 opacity-90">{c.mensaje}</p>
    </div>
  )
}
