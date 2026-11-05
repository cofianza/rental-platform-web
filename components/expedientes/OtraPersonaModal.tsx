/**
 * Adenda 3 V2 §9: tras «no soy yo», si la cédula correcta es otra, es otra
 * persona: se abre un estudio nuevo con el mismo inmueble y responsable, el
 * pago ya hecho pasa al nuevo y el anterior se cierra. Quedan las dos cédulas y
 * quién hizo el cambio. La inmobiliaria puede hacerlo una vez por cédula;
 * después, solo Cofianza (la API responde 409).
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { IconLoader } from '@/components/icons'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { autorizacionService } from '@/services/autorizacionService'
import type { FuenteVerificacion } from '@/types/autorizacion'
import { TIPO_DOCUMENTO_OPTIONS as TIPOS } from './wizard/constants'

const FUENTES: { value: FuenteVerificacion; label: string }[] = [
  { value: 'documento_fisico', label: 'Documento físico' },
  { value: 'copia_documento', label: 'Copia del documento' },
  { value: 'confirmacion_telefonica', label: 'Confirmación telefónica con la persona' },
]

const campo = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50'
const etiqueta = 'block text-sm font-medium text-gray-700'

/** Marca de obligatorio: todos los campos de este formulario lo son. */
const Obligatorio = () => <span className="text-red-600" aria-hidden="true"> *</span>

export function OtraPersonaModal({ isOpen, onClose, expedienteId }: { isOpen: boolean; onClose: () => void; expedienteId: string }) {
  const router = useRouter()
  const [f, setF] = useState({ nombre: '', apellido: '', tipo_documento: 'cc', numero_documento: '', email: '', telefono: '', fuente: '' as FuenteVerificacion | '' })
  const [confirmar, setConfirmar] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })

  // Lo que falta, en el orden del formulario: se dice junto al botón en vez de dejarlo apagado sin explicación.
  const falta = !f.nombre.trim() || !f.apellido.trim()
    ? 'Escriba el nombre y el apellido.'
    : f.numero_documento.trim().length < 5
      ? 'El número de documento debe tener al menos 5 caracteres.'
      : !/\S+@\S+\.\S+/.test(f.email)
        ? 'Escriba un correo válido.'
        : f.telefono.trim().length < 7
          ? 'El celular debe tener al menos 7 dígitos.'
          : !f.fuente
            ? 'Elija con qué verificó el documento.'
            : null
  const valido =
    f.nombre.trim() && f.apellido.trim() && f.numero_documento.trim().length >= 5 && /\S+@\S+\.\S+/.test(f.email) && f.telefono.trim().length >= 7 && !!f.fuente

  const guardar = async () => {
    if (!f.fuente) return
    setGuardando(true)
    try {
      const r = await autorizacionService.otraPersona(expedienteId, {
        nombre: f.nombre.trim(),
        apellido: f.apellido.trim(),
        tipo_documento: f.tipo_documento,
        numero_documento: f.numero_documento.trim(),
        email: f.email.trim(),
        telefono: f.telefono.trim(),
        fuente_verificacion: f.fuente,
      })
      toast.success(`Se abrió el estudio ${r.expediente_nuevo.numero} para la persona correcta. Envíele el enlace de autorización desde allí.`)
      onClose()
      router.push(`/expedientes/${r.expediente_nuevo.id}`)
    } catch (err) {
      setConfirmar(false)
      toast.error(err instanceof Error ? err.message : 'No se pudo abrir el estudio nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  const campos: { k: 'nombre' | 'apellido' | 'numero_documento' | 'email' | 'telefono'; label: string; props: React.InputHTMLAttributes<HTMLInputElement> }[] = [
    { k: 'nombre', label: 'Nombre', props: { maxLength: 100, autoComplete: 'off' } },
    { k: 'apellido', label: 'Apellido', props: { maxLength: 100, autoComplete: 'off' } },
  ]

  return (
    <>
      <Modal
        isOpen={isOpen && !confirmar}
        onClose={guardando ? () => {} : onClose}
        title="La cédula es de otra persona"
        description="Se abre un estudio nuevo para la persona correcta, con el mismo inmueble y responsable; el pago ya hecho pasa a ese estudio y este se cierra."
        size="md"
        closeOnBackdrop={false}
        footer={
          <div className="space-y-2">
            {falta && (
              <p id="otra-persona-falta" role="status" className="text-sm text-gray-600">
                {falta}
              </p>
            )}
            <ModalAcciones>
              <button type="button" onClick={onClose} disabled={guardando} className={botonModal('secondary')}>
                Cancelar
              </button>
              <button
                type="submit"
                form="otra-persona-form"
                disabled={!valido || guardando}
                aria-describedby={falta ? 'otra-persona-falta' : undefined}
                className={botonModal('primary')}
              >
                {guardando && <IconLoader size={16} className="animate-spin" />}
                Continuar
              </button>
            </ModalAcciones>
          </div>
        }
      >
        <form
          id="otra-persona-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (valido) setConfirmar(true)
          }}
          className="space-y-4"
          noValidate
        >
          <p className="text-sm text-gray-700">Escriba los datos de la persona correcta. Todos los campos son obligatorios.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {campos.map((c) => (
              <div key={c.k}>
                <label htmlFor={`otra-persona-${c.k}`} className={etiqueta}>
                  {c.label}
                  <Obligatorio />
                </label>
                <input id={`otra-persona-${c.k}`} value={f[c.k]} onChange={set(c.k)} required disabled={guardando} className={`mt-1 ${campo}`} {...c.props} />
              </div>
            ))}
            <div>
              <label htmlFor="otra-persona-tipo" className={etiqueta}>
                Tipo de documento
                <Obligatorio />
              </label>
              <select id="otra-persona-tipo" value={f.tipo_documento} onChange={set('tipo_documento')} disabled={guardando} className={`mt-1 ${campo}`}>
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="otra-persona-numero" className={etiqueta}>
                Número de documento
                <Obligatorio />
              </label>
              <input
                id="otra-persona-numero"
                value={f.numero_documento}
                onChange={set('numero_documento')}
                maxLength={20}
                inputMode="numeric"
                autoComplete="off"
                required
                disabled={guardando}
                className={`mt-1 ${campo}`}
              />
            </div>
            <div>
              <label htmlFor="otra-persona-email" className={etiqueta}>
                Correo
                <Obligatorio />
              </label>
              <input id="otra-persona-email" type="email" value={f.email} onChange={set('email')} required disabled={guardando} className={`mt-1 ${campo}`} />
            </div>
            <div>
              <label htmlFor="otra-persona-telefono" className={etiqueta}>
                Celular
                <Obligatorio />
              </label>
              <input id="otra-persona-telefono" type="tel" value={f.telefono} onChange={set('telefono')} maxLength={20} required disabled={guardando} className={`mt-1 ${campo}`} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="otra-persona-fuente" className={etiqueta}>
                Verificó el documento con
                <Obligatorio />
              </label>
              <select id="otra-persona-fuente" value={f.fuente} onChange={set('fuente')} required disabled={guardando} className={`mt-1 ${campo}`}>
                <option value="">Elija una opción</option>
                {FUENTES.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={confirmar}
        onClose={() => setConfirmar(false)}
        onConfirm={guardar}
        title="¿Abrir el estudio para la persona correcta?"
        message={`Se abre un estudio nuevo para ${f.nombre} ${f.apellido}, el pago pasa a ese estudio y este se cierra. No se puede deshacer.`}
        confirmLabel="Abrir estudio nuevo"
        isLoading={guardando}
      />
    </>
  )
}
