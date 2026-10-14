/**
 * TerminacionEfectivaTarifa — plan cobro-tarifa-mensual A5. Cofianza
 * (administrador u operador) registra la fecha real en que terminó el contrato
 * cuando el registro en la plataforma quedó en otra fecha (p. ej. se terminó
 * días después, ya en el mes siguiente). Prevalece sobre la fecha de
 * terminación para el cobro: la API anula las líneas de la tarifa de los meses
 * posteriores (las facturadas quedan para nota crédito). Los avisos «Registre
 * la fecha efectiva de terminación» enlazan aquí.
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { IconCalendar, IconLoader } from '@/components/icons'
import { formatDate } from '@/lib/constants'
import { tarifaCobroService } from '@/services/tarifaCobroService'

export function TerminacionEfectivaTarifa({
  contratoId,
  actual,
  onRegistrada,
}: {
  contratoId: string
  /** AAAA-MM-DD ya registrada, o null. */
  actual: string | null
  onRegistrada: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [fecha, setFecha] = useState(actual ?? '')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cerrar = () => {
    if (enviando) return
    setError(null)
    setAbierto(false)
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fecha) return setError('Indique la fecha efectiva de terminación')
    setError(null)
    setEnviando(true)
    try {
      const { lineas_anuladas } = await tarifaCobroService.registrarTerminacionEfectiva(contratoId, fecha)
      toast.success(
        lineas_anuladas
          ? `Fecha registrada. Se anuló la tarifa de ${lineas_anuladas} ${lineas_anuladas === 1 ? 'mes posterior' : 'meses posteriores'}.`
          : 'Fecha efectiva de terminación registrada.',
      )
      setAbierto(false)
      onRegistrada()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la fecha')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        <IconCalendar size={15} className="text-gray-500" />
        Terminación efectiva (tarifa mensual)
      </p>
      <p className="mt-1 text-sm text-gray-600">
        {actual
          ? `Registrada: ${formatDate(actual)}. La tarifa mensual se cobra hasta ese mes, completo.`
          : 'Si el contrato terminó en una fecha distinta a la del registro en la plataforma, regístrela: la tarifa mensual se cobra hasta ese mes, completo, y se anula la de los meses siguientes.'}
      </p>
      <button
        type="button"
        onClick={() => {
          setFecha(actual ?? '')
          setAbierto(true)
        }}
        className="mt-3 px-3 py-1.5 text-xs font-semibold text-primary-700 bg-white border border-primary-200 rounded-lg hover:bg-primary-50"
      >
        {actual ? 'Corregir fecha efectiva' : 'Registrar fecha efectiva'}
      </button>

      <Modal isOpen={abierto} onClose={cerrar} title="Fecha efectiva de terminación" size="md" closeOnBackdrop={false}>
        <form onSubmit={enviar} className="space-y-4">
          <p className="text-sm text-gray-600">
            Prevalece sobre la fecha de terminación para el cobro de la tarifa mensual. Las líneas de los meses posteriores
            se anulan; si ya salieron en una factura, quedan marcadas para nota crédito.
          </p>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <div>
            <label htmlFor="terminacion-efectiva" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha efectiva de terminación <span className="text-red-500">*</span>
            </label>
            <input
              id="terminacion-efectiva"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
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
              {enviando ? 'Registrando…' : 'Registrar fecha'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
