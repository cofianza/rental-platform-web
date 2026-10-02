/**
 * <LeadInteresModal> — formulario corto del visitante SIN cuenta que dice
 * «Me interesa»: nombre + celular (correo y mensaje opcionales) + autorización.
 * Registra un lead y avisa al anunciante; no crea cuenta ni estudio.
 * Lo usan la landing (VitrinaPreview) y el detalle del inmueble (MeInteresaCTA).
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { IconLoader, IconArrowRight } from '@/components/icons'
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

  const cerrar = () => {
    if (!submitting) onClose()
  }

  const enviar = async () => {
    const tel = telefono.replace(/\s+/g, '').trim()
    // PhoneInput siempre antepone el indicativo. El celular es el único contacto
    // obligatorio: en Colombia se exige completo (3 + 9 dígitos).
    const telOk = tel.startsWith('+57') ? /^\+573\d{9}$/.test(tel) : /^\+\d{8,15}$/.test(tel)
    if (nombre.trim().length < 2 || !telOk) {
      toast.error('Complete su nombre y celular')
      return
    }
    const correo = email.trim()
    if (correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
      toast.error('Ingrese un correo válido o deje el campo vacío')
      return
    }
    if (!acepta) {
      toast.error('Debe autorizar el tratamiento de sus datos para continuar')
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
      toast.success('¡Listo! Lo contactarán pronto para agendar la visita.')
      setNombre('')
      setTelefono('')
      setEmail('')
      setMensaje('')
      setAcepta(false)
      onClose()
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
      title="Me interesa este inmueble"
      size="md"
      closeOnBackdrop={false}
      // scroll-pb en el cuerpo desplazable del diálogo: al enfocar un campo (Tab
      // o «Siguiente» del teclado del celular) el navegador lo deja por encima
      // de la franja fija de botones, no escondido debajo de ella.
      className="[&>.overflow-y-auto]:scroll-pb-32"
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          enviar()
        }}
        className="space-y-4"
      >
        {resumen && <p className="text-sm text-gray-600 -mt-1">{resumen}</p>}

        <div>
          <label htmlFor="lead-interes-nombre" className="block text-sm font-medium text-gray-700 mb-1">
            Su nombre <span className="text-coral-700">*</span>
          </label>
          <input
            id="lead-interes-nombre"
            type="text"
            autoComplete="name"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre completo"
            className={INPUT}
          />
        </div>

        <PhoneInput
          label="Celular / WhatsApp"
          value={telefono}
          onChange={setTelefono}
          placeholder="300 123 4567"
          required
        />

        <div>
          <label htmlFor="lead-interes-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="font-normal text-gray-500">(opcional)</span>
          </label>
          <input
            id="lead-interes-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@email.com"
            className={INPUT}
          />
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
            placeholder="Ej. ¿Sigue disponible? Me gustaría verlo el sábado."
            className={INPUT}
          />
        </div>

        <label className="flex items-start gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={acepta}
            onChange={(e) => setAcepta(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span>
            Autorizo que Cofianza comparta mis datos de contacto con el anunciante de este
            inmueble y acepto la{' '}
            <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">
              Política de Tratamiento de Datos
            </a>
            .
          </span>
        </label>

        <p className="text-xs text-gray-500 leading-relaxed">
          El propietario o inmobiliaria lo contactará para agendar una visita. Si decide tomarlo,
          Cofianza se encarga del estudio y firma como su fiador.
        </p>

        {/* Botones pegados al pie del cuerpo desplazable del diálogo: en teléfonos
            bajos el formulario no cabe entero y «Solicitar visita» quedaba fuera
            de la vista. Los márgenes y el bottom negativos deshacen el padding
            del cuerpo (px-6 py-4 en Modal) para que la franja llegue a sus bordes;
            rounded-b-lg conserva las esquinas redondeadas del diálogo. */}
        <div className="sticky -bottom-4 -mx-6 -mb-4 flex gap-2 rounded-b-lg border-t border-gray-100 bg-white px-6 py-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50"
          >
            {submitting ? <IconLoader size={14} className="animate-spin" /> : null}
            Solicitar visita
            {!submitting && <IconArrowRight size={14} />}
          </button>
          <button
            type="button"
            onClick={cerrar}
            disabled={submitting}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}
