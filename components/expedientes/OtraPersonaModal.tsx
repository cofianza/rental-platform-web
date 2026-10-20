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
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { autorizacionService } from '@/services/autorizacionService'
import type { FuenteVerificacion } from '@/types/autorizacion'
import { TIPO_DOCUMENTO_OPTIONS as TIPOS } from './wizard/constants'

const FUENTES: { value: FuenteVerificacion; label: string }[] = [
  { value: 'documento_fisico', label: 'Documento físico' },
  { value: 'copia_documento', label: 'Copia del documento' },
  { value: 'confirmacion_telefonica', label: 'Confirmación telefónica con la persona' },
]

const campo = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'

export function OtraPersonaModal({ isOpen, onClose, expedienteId }: { isOpen: boolean; onClose: () => void; expedienteId: string }) {
  const router = useRouter()
  const [f, setF] = useState({ nombre: '', apellido: '', tipo_documento: 'cc', numero_documento: '', email: '', telefono: '', fuente: '' as FuenteVerificacion | '' })
  const [confirmar, setConfirmar] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })

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

  return (
    <>
      <Modal isOpen={isOpen && !confirmar} onClose={onClose} title="La cédula es de otra persona" size="md" closeOnBackdrop={false}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (valido) setConfirmar(true)
          }}
          className="space-y-3"
          noValidate
        >
          <p className="text-xs text-gray-600">
            Una cédula distinta es otra persona: se abre un estudio nuevo para ella con el mismo inmueble y responsable,
            el pago ya hecho pasa al estudio nuevo y este se cierra. Escriba los datos de la persona correcta.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-gray-600">
              Nombre
              <input value={f.nombre} onChange={set('nombre')} maxLength={100} className={`mt-1 ${campo}`} />
            </label>
            <label className="text-xs font-medium text-gray-600">
              Apellido
              <input value={f.apellido} onChange={set('apellido')} maxLength={100} className={`mt-1 ${campo}`} />
            </label>
            <label className="text-xs font-medium text-gray-600">
              Tipo de documento
              <select value={f.tipo_documento} onChange={set('tipo_documento')} className={`mt-1 ${campo}`}>
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">
              Número de documento
              <input value={f.numero_documento} onChange={set('numero_documento')} maxLength={20} inputMode="numeric" className={`mt-1 ${campo}`} />
            </label>
            <label className="text-xs font-medium text-gray-600">
              Correo
              <input type="email" value={f.email} onChange={set('email')} className={`mt-1 ${campo}`} />
            </label>
            <label className="text-xs font-medium text-gray-600">
              Celular
              <input type="tel" value={f.telefono} onChange={set('telefono')} maxLength={20} className={`mt-1 ${campo}`} />
            </label>
            <label className="text-xs font-medium text-gray-600 sm:col-span-2">
              Verificó el documento con
              <select value={f.fuente} onChange={set('fuente')} className={`mt-1 ${campo}`}>
                <option value="">Elija una opción</option>
                {FUENTES.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!valido || guardando}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50"
            >
              {guardando && <IconLoader size={14} className="animate-spin" />}
              Continuar
            </button>
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
