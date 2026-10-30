'use client'

/**
 * Adenda 3 V2 §7: una coincidencia en listas restrictivas (OFAC u ONU) que
 * Cofianza debe confirmar o descartar antes de decidir. Confirmada, el estudio
 * se rechaza sin apelación ni excepción y se avisa a la Gerencia General;
 * descartada (homónimo), el caso sigue en la revisión manual. Solo Cofianza
 * (la API la manda solo a esos roles y responde 403 a los demás).
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconAlertTriangle, IconShield } from '@/components/icons'
import { estudioService, type IListasEstudio } from '@/services/estudioService'

const MIN_MOTIVO = 10

export function ListasPorConfirmar({
  estudioId,
  listas,
  onResuelto,
}: {
  estudioId: string
  listas: IListasEstudio
  onResuelto: () => void
}) {
  const [accion, setAccion] = useState<'confirmar' | 'descartar' | null>(null)
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)

  if (listas.estado === 'confirmada') {
    return (
      <p role="status" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        <IconShield size={16} className="mt-0.5 shrink-0" />
        Coincidencia en listas restrictivas confirmada por Cofianza: el estudio se rechazó y no admite apelación ni excepción.
      </p>
    )
  }
  if (listas.estado === 'descartada') {
    return (
      <p role="status" className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
        <IconShield size={16} className="mt-0.5 shrink-0" />
        Cofianza descartó la coincidencia en listas restrictivas (homónimo).{listas.motivo ? ` Motivo: ${listas.motivo}` : ''}
      </p>
    )
  }

  async function guardar() {
    if (motivo.trim().length < MIN_MOTIVO) {
      toast.error(`Escriba el motivo (mínimo ${MIN_MOTIVO} caracteres).`)
      return
    }
    setGuardando(true)
    try {
      if (accion === 'confirmar') await estudioService.confirmarListas(estudioId, motivo.trim())
      else await estudioService.descartarListas(estudioId, motivo.trim())
      toast.success(accion === 'confirmar' ? 'Coincidencia confirmada: el estudio quedó no aprobable.' : 'Coincidencia descartada: el caso sigue en revisión.')
      setAccion(null)
      setMotivo('')
      onResuelto()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la decisión.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div role="alert" className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <p className="flex items-start gap-2 text-sm font-semibold text-amber-900">
        <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
        Coincidencia en listas restrictivas (OFAC u ONU) por confirmar
      </p>
      <p className="text-sm text-amber-800">
        Revise el reporte de antecedentes. Si es la misma persona, confírmela: el estudio se rechaza sin apelación y se
        avisa a la Gerencia General. Si es un homónimo, descártela y el caso sigue en revisión.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAccion('confirmar')}
          className="inline-flex min-h-10 items-center rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
        >
          Confirmar coincidencia
        </button>
        <button
          type="button"
          onClick={() => setAccion('descartar')}
          className="inline-flex min-h-10 items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Descartar (homónimo)
        </button>
      </div>
      <ConfirmDialog
        isOpen={accion !== null}
        onClose={() => setAccion(null)}
        onConfirm={guardar}
        title={accion === 'confirmar' ? 'Confirmar la coincidencia en listas' : 'Descartar la coincidencia (homónimo)'}
        variant={accion === 'confirmar' ? 'danger' : 'default'}
        confirmLabel={accion === 'confirmar' ? 'Confirmar y rechazar' : 'Descartar'}
        isLoading={guardando}
        message={
          <div className="space-y-2">
            <p>
              {accion === 'confirmar'
                ? 'El estudio completo se rechaza y no lo levanta nadie. Queda registrado en la cédula.'
                : 'El caso sigue en la revisión manual de siempre.'}
            </p>
            <label className="block text-xs font-medium text-gray-700">
              Motivo (queda en el registro)
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={500}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
        }
      />
    </div>
  )
}
