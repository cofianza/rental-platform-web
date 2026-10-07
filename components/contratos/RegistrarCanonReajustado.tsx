/**
 * RegistrarCanonReajustado — plan cobro-tarifa-mensual B9/B8. Hasta 30 días
 * antes de cada aniversario de la fecha de inicio, la API le pide a la
 * inmobiliaria el canon reajustado (aviso «Confirme el canon reajustado»). Aquí
 * se registra: la tarifa mensual se liquida sobre ese canon desde el mes del
 * aniversario (o el siguiente, si cae a mitad de mes). Sin confirmarlo, se
 * sigue liquidando sobre el canon actual.
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { IconCalendar, IconLoader } from '@/components/icons'
import { formatCurrency, formatDate } from '@/lib/constants'
import { tarifaCobroService } from '@/services/tarifaCobroService'

export function RegistrarCanonReajustado({
  contratoId,
  aniversario,
  canonActual,
}: {
  contratoId: string
  /** AAAA-MM-DD: el aniversario en que se reajusta el canon. */
  aniversario: string
  canonActual: number | null
}) {
  const [abierto, setAbierto] = useState(false)
  const [canon, setCanon] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [registrado, setRegistrado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cerrar = () => {
    if (enviando) return
    setError(null)
    setAbierto(false)
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    const valor = Number(canon)
    if (!Number.isFinite(valor) || valor <= 0) return setError('Indique el canon reajustado')
    setError(null)
    setEnviando(true)
    try {
      await tarifaCobroService.registrarCanon(contratoId, aniversario, Math.round(valor))
      toast.success('Canon reajustado registrado.')
      setRegistrado(true)
      setAbierto(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el canon')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-amber-200 p-5">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        <IconCalendar size={15} className="text-amber-700" />
        Reajuste anual del canon
      </p>
      <p className="mt-1 text-sm text-gray-600">
        {registrado
          ? 'Ya registró el canon reajustado. Si necesita corregirlo, regístrelo de nuevo.'
          : `El ${formatDate(aniversario)} el contrato cumple un año más y el canon se reajusta. Mientras no registre el canon reajustado, la tarifa mensual se liquida sobre el canon actual. Si ya lo registró, no necesita hacerlo de nuevo.`}
      </p>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-3 px-3 py-1.5 text-xs font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800"
      >
        Registrar canon reajustado
      </button>

      <Modal isOpen={abierto} onClose={cerrar} title="Registrar canon reajustado" size="md" closeOnBackdrop={false}>
        <form onSubmit={enviar} className="space-y-4">
          <p className="text-sm text-gray-600">
            Canon actual: {canonActual ? formatCurrency(canonActual) : '—'}. El nuevo canon rige desde el aniversario (
            {formatDate(aniversario)}); si cae a mitad de mes, la tarifa lo toma desde el mes siguiente. El valor sugerido
            con el IPC está en el aviso que le enviamos.
          </p>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <div>
            <label htmlFor="canon-reajustado" className="block text-sm font-medium text-gray-700 mb-1">
              Canon mensual reajustado (COP) <span className="text-red-500">*</span>
            </label>
            <input
              id="canon-reajustado"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={canon}
              onChange={(e) => setCanon(e.target.value)}
              disabled={enviando}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={cerrar}
              disabled={enviando}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {enviando && <IconLoader size={16} className="animate-spin" />}
              {enviando ? 'Registrando…' : 'Registrar canon'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
