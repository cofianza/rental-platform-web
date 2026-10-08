/**
 * BLQ §3: corrección CIEGA del documento del prospecto. Muestra solo lo que
 * registró la inmobiliaria y el campo nuevo; lo que digitó el prospecto nunca
 * llega a la web (§3.2). Exige la fuente contra la que se verificó (§3.4) y
 * solo cambia tipo y número (§3.5). No reenvía el enlace: es otro paso (§4.4).
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { IconLoader } from '@/components/icons'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { autorizacionService } from '@/services/autorizacionService'
import { ApiClientError } from '@/lib/api'
import type { FuenteVerificacion } from '@/types/autorizacion'
import { EVENTO_BLOQUEOS } from './BloqueosPendientesBanner'
// Los mismos tipos con los que se registra al prospecto (sin NIT: Adenda de precios §6.1).
import { TIPO_DOCUMENTO_OPTIONS as TIPOS } from './wizard/constants'

const FUENTES: { value: FuenteVerificacion; label: string }[] = [
  { value: 'documento_fisico', label: 'Documento físico' },
  { value: 'copia_documento', label: 'Copia del documento' },
  { value: 'confirmacion_telefonica', label: 'Confirmación telefónica con el prospecto' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  expedienteId: string
  tipoActual?: string | null
  numeroActual?: string | null
  /** null/undefined = la API no lo pudo contar (o es anterior al bloque 2). */
  correccionesRestantes?: number | null
  onCorregido?: () => void
}

export function CorregirDocumentoModal({
  isOpen,
  onClose,
  expedienteId,
  tipoActual,
  numeroActual,
  correccionesRestantes,
  onCorregido,
}: Props) {
  const [tipo, setTipo] = useState<string>(() => (TIPOS.some((t) => t.value === tipoActual) ? tipoActual! : 'cc'))
  const [numero, setNumero] = useState('')
  const [fuente, setFuente] = useState<FuenteVerificacion | ''>('')
  const [confirmar, setConfirmar] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const cerrar = () => {
    setNumero('')
    setFuente('')
    setConfirmar(false)
    onClose()
  }

  const valido = numero.trim().length >= 5 && !!fuente
  const restantes = correccionesRestantes ?? null

  const guardar = async () => {
    if (!fuente) return
    setGuardando(true)
    try {
      const r = await autorizacionService.corregirDocumento(expedienteId, {
        tipo_documento: tipo,
        numero_documento: numero.trim(),
        fuente_verificacion: fuente,
      })
      toast.success(
        `Documento corregido. Ahora reenvíe el enlace al prospecto.${
          r.correcciones_restantes === 0
            ? ' Ya no le quedan correcciones: si vuelve a fallar, deberá crear un estudio nuevo.'
            : r.correcciones_restantes === 1
              ? ' Le queda 1 corrección.'
              : ` Le quedan ${r.correcciones_restantes} correcciones.`
        }`,
      )
      window.dispatchEvent(new Event(EVENTO_BLOQUEOS))
      cerrar()
      onCorregido?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo corregir el documento.')
      // El límite cerró el estudio: refrescar para que se vea.
      if (err instanceof ApiClientError && err.code === 'LIMITE_CORRECCIONES_DOCUMENTO') {
        window.dispatchEvent(new Event(EVENTO_BLOQUEOS))
        cerrar()
        onCorregido?.()
      }
    } finally {
      setGuardando(false)
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valido) return
    // La última corrección y la que pasa el límite se confirman aparte.
    if (restantes != null && restantes <= 1) setConfirmar(true)
    else void guardar()
  }

  return (
    <>
      <Modal isOpen={isOpen && !confirmar} onClose={cerrar} title="Corregir documento" size="md" closeOnBackdrop={false}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
            <p className="text-xs text-gray-500">Documento registrado</p>
            <p className="font-mono font-semibold text-gray-900">
              {(tipoActual || '').toUpperCase()} {numeroActual || '—'}
            </p>
          </div>
          <p className="text-xs text-gray-600">
            Verifique el documento con el prospecto antes de corregirlo. Solo se corrigen el tipo y el número: si la
            persona es otra, cree un estudio nuevo.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <div className="sm:col-span-2">
              <label htmlFor="corregir-doc-tipo" className="mb-1 block text-xs font-medium text-gray-600">
                Tipo de documento
              </label>
              <select
                id="corregir-doc-tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                disabled={guardando}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="corregir-doc-numero" className="mb-1 block text-xs font-medium text-gray-600">
                Número correcto
              </label>
              <input
                id="corregir-doc-numero"
                inputMode="numeric"
                autoComplete="off"
                value={numero}
                maxLength={20}
                onChange={(e) => setNumero(e.target.value.replace(/[^\w]/g, ''))}
                disabled={guardando}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <fieldset>
            <legend className="mb-1 text-xs font-medium text-gray-600">¿Contra qué verificó el documento?</legend>
            <div className="space-y-1.5">
              {FUENTES.map((f) => (
                <label key={f.value} className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="corregir-doc-fuente"
                    value={f.value}
                    checked={fuente === f.value}
                    onChange={() => setFuente(f.value)}
                    disabled={guardando}
                    required
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </fieldset>
          {restantes != null && (
            <p className={restantes === 0 ? 'text-xs font-semibold text-red-700' : 'text-xs text-gray-600'}>
              {restantes === 0
                ? 'Ya usó todas las correcciones permitidas en este estudio.'
                : restantes === 1
                  ? 'Le queda 1 corrección.'
                  : `Le quedan ${restantes} correcciones.`}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={cerrar}
              disabled={guardando}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || !valido}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50"
            >
              {guardando && <IconLoader size={14} className="animate-spin" />}
              Guardar corrección
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={isOpen && confirmar}
        onClose={() => setConfirmar(false)}
        onConfirm={guardar}
        variant={restantes === 0 ? 'danger' : 'default'}
        title={restantes === 0 ? 'Se cerrará el estudio' : 'Última corrección'}
        message={
          restantes === 0
            ? 'Ya usó todas las correcciones del documento. Si continúa, el estudio se cerrará y deberá crear uno nuevo.'
            : 'Es la última corrección permitida. Si el documento vuelve a quedar mal, no podrá corregirlo otra vez y deberá crear un estudio nuevo.'
        }
        confirmLabel={restantes === 0 ? 'Cerrar el estudio' : 'Guardar corrección'}
      />
    </>
  )
}
