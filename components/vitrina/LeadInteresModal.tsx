/**
 * <LeadInteresModal> — formulario corto del visitante SIN cuenta que dice
 * «Me interesa»: nombre + celular (correo y mensaje opcionales) + autorización.
 * Registra un lead y avisa al anunciante; no crea cuenta ni estudio.
 * Lo usan la landing (VitrinaPreview) y el detalle del inmueble (MeInteresaCTA).
 */

'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { IconLoader, IconArrowRight, IconCheckCircle } from '@/components/icons'
import { ariaError, scrollToFirstError } from '@/components/auth/registro-ui'
import { registrarInteresPublico, type PublicProperty } from '@/services/publicPropertiesService'
import { mensajeParaProspecto } from '@/lib/errorMessages'
import { formatCurrency } from '@/lib/constants'

interface LeadInteresModalProps {
  inmuebleId: string
  /** Línea bajo el título: «Apartamento Laureles · Medellín, Laureles · $1.800.000/mes». */
  resumen?: string
  isOpen: boolean
  onClose: () => void
}

const INPUT =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary-500'

/**
 * Texto de `resumen`, el mismo en la portada y en el detalle del inmueble:
 * tipo + barrio · ubicación · canon.
 */
export function resumenInmueble(
  tipoLabel: string,
  p: Pick<PublicProperty, 'ciudad' | 'barrio' | 'valor_arriendo'>,
): string {
  const ubicacion = p.barrio ? `${p.ciudad}, ${p.barrio}` : p.ciudad
  return `${tipoLabel} ${p.barrio || p.ciudad} · ${ubicacion} · ${formatCurrency(p.valor_arriendo)}/mes`
}

export function LeadInteresModal({ inmuebleId, resumen, isOpen, onClose }: LeadInteresModalProps) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [acepta, setAcepta] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // Errores junto a cada campo (antes un solo toast que no decía cuál fallaba).
  const [errors, setErrors] = useState<Record<string, string>>({})
  // Tras enviar, el diálogo queda abierto con la confirmación: un toast de
  // segundos se perdía en el celular y el visitante no sabía si se envió.
  const [enviado, setEnviado] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const limpiarError = (campo: string) => setErrors((e) => (e[campo] ? { ...e, [campo]: '' } : e))

  const cerrar = () => {
    if (submitting) return
    if (enviado) {
      setNombre('')
      setTelefono('')
      setEmail('')
      setMensaje('')
      setAcepta(false)
      setEnviado(false)
    }
    setErrors({})
    onClose()
  }

  const enviar = async () => {
    // Sin espacios ni guiones: PhoneInput entrega «indicativo número» y algún
    // indicativo trae guion («+1-809», República Dominicana); con el guion la
    // validación de abajo lo rechazaba y ese país no podía enviar el formulario.
    const tel = telefono.replace(/[\s-]+/g, '')
    // PhoneInput siempre antepone el indicativo. El celular es el único contacto
    // obligatorio: en Colombia se exige completo (3 + 9 dígitos).
    const telOk = tel.startsWith('+57') ? /^\+573\d{9}$/.test(tel) : /^\+\d{8,15}$/.test(tel)
    const correo = email.trim()
    const nuevos: Record<string, string> = {}
    if (nombre.trim().length < 2) nuevos.nombre = 'Escriba su nombre'
    if (!telOk) {
      nuevos.telefono = tel.startsWith('+57')
        ? 'Escriba el celular completo: 10 dígitos que empiezan por 3'
        : 'Escriba un número de celular válido'
    }
    if (correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
      nuevos.email = 'Escriba un correo válido o deje el campo vacío'
    }
    if (!acepta) nuevos.acepta = 'Debe autorizar el tratamiento de sus datos para continuar'
    setErrors(nuevos)
    if (Object.keys(nuevos).length > 0) {
      scrollToFirstError(formRef.current)
      return
    }

    setSubmitting(true)
    try {
      await registrarInteresPublico(inmuebleId, {
        nombre: nombre.trim(),
        telefono: tel,
        email: correo,
        mensaje: mensaje.trim() || undefined,
        acepta: true,
      })
      setEnviado(true)
    } catch (err) {
      // Sin red, fetch rechaza con un TypeError cuyo texto viene en inglés
      // («Failed to fetch»): mensajeParaProspecto lo cambia por el aviso de
      // conexión. Los demás errores traen el mensaje del API, ya en español.
      toast.error(
        mensajeParaProspecto(err, err instanceof Error ? err.message : 'No se pudo enviar su interés. Intente de nuevo.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={cerrar}
      title={enviado ? 'Listo, recibimos su interés' : 'Me interesa este inmueble'}
      description={enviado ? undefined : resumen}
      size="md"
      closeOnBackdrop={false}
      // scroll-pb en el cuerpo desplazable del diálogo: al enfocar un campo (Tab
      // o «Siguiente» del teclado del celular) el navegador lo deja visible por
      // encima del pie fijo de la base.
      className="[&>.overflow-y-auto]:scroll-pb-8"
      footer={
        enviado ? (
          <ModalAcciones>
            <button type="button" onClick={cerrar} className={botonModal('primary')}>
              Seguir viendo inmuebles
            </button>
          </ModalAcciones>
        ) : (
          <ModalAcciones>
            <button type="button" onClick={cerrar} disabled={submitting} className={botonModal('secondary')}>
              Cancelar
            </button>
            <button
              type="submit"
              form="lead-interes-form"
              disabled={submitting}
              aria-busy={submitting || undefined}
              className={botonModal('primary')}
            >
              {submitting && <IconLoader size={16} className="animate-spin" />}
              {submitting ? 'Enviando…' : 'Solicitar visita'}
              {!submitting && <IconArrowRight size={16} />}
            </button>
          </ModalAcciones>
        )
      }
    >
      {enviado ? (
        <div className="space-y-3 py-2 text-center" role="status">
          <IconCheckCircle size={44} className="mx-auto text-primary-600" />
          <p className="text-sm leading-relaxed text-gray-600">
            El propietario o la inmobiliaria lo contactará al <strong className="text-gray-900">{telefono}</strong> para
            agendar la visita.
          </p>
        </div>
      ) : (
      <form
        id="lead-interes-form"
        ref={formRef}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (!submitting) void enviar()
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="lead-interes-nombre" className="block text-sm font-medium text-gray-700 mb-1">
            Su nombre <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <input
            id="lead-interes-nombre"
            type="text"
            autoComplete="name"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value)
              limpiarError('nombre')
            }}
            disabled={submitting}
            required
            placeholder="Nombre completo"
            className={`${INPUT}${errors.nombre ? ' border-red-500' : ''}`}
            {...ariaError(errors, 'nombre')}
          />
          {errors.nombre && <p id="error-nombre" className="mt-1.5 text-sm text-red-600">{errors.nombre}</p>}
        </div>

        <PhoneInput
          label="Celular / WhatsApp"
          value={telefono}
          onChange={(v) => {
            setTelefono(v)
            limpiarError('telefono')
          }}
          placeholder="300 123 4567"
          error={errors.telefono}
          required
        />

        <div>
          <label htmlFor="lead-interes-email" className="block text-sm font-medium text-gray-700 mb-1">
            Correo <span className="font-normal text-gray-500">(opcional)</span>
          </label>
          <input
            id="lead-interes-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              limpiarError('email')
            }}
            disabled={submitting}
            placeholder="nombre@correo.com"
            className={`${INPUT}${errors.email ? ' border-red-500' : ''}`}
            {...ariaError(errors, 'email')}
          />
          {errors.email && <p id="error-email" className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="lead-interes-mensaje" className="block text-sm font-medium text-gray-700 mb-1">
            Mensaje <span className="font-normal text-gray-500">(opcional)</span>
          </label>
          <textarea
            id="lead-interes-mensaje"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={2}
            maxLength={500}
            disabled={submitting}
            placeholder="Ej. ¿Sigue disponible? Me gustaría verlo el sábado."
            className={INPUT}
          />
        </div>

        <div>
          <label className="flex min-h-10 items-start gap-3 text-sm leading-relaxed text-gray-600">
            <input
              type="checkbox"
              checked={acepta}
              onChange={(e) => {
                setAcepta(e.target.checked)
                limpiarError('acepta')
              }}
              disabled={submitting}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              {...ariaError(errors, 'acepta')}
            />
            <span>
              Autorizo que Cofianza comparta mis datos de contacto con el anunciante de este
              inmueble y acepto la{' '}
              <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-primary-700 underline underline-offset-2">
                Política de Tratamiento de Datos
              </a>
              .
            </span>
          </label>
          {errors.acepta && <p id="error-acepta" className="mt-1.5 text-sm text-red-600">{errors.acepta}</p>}
        </div>

        <p className="text-xs leading-relaxed text-gray-500">
          El propietario o la inmobiliaria lo contactará para agendar una visita. Si decide tomarlo,
          Cofianza se encarga del estudio y firma como su fiador.
        </p>
      </form>
      )}
    </Modal>
  )
}
