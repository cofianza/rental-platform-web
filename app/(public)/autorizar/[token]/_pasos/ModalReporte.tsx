'use client'

import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { buttonClasses } from '@/components/ui/Button'
import { MOTIVOS_REPORTE, type MotivoReporte } from './constantes'

/*
  §8.1 "Si los datos no corresponden a esa persona, debe existir una
  opcion para reportarlo y detener el proceso." Modal propio (nunca
  window.confirm) porque hace falta elegir motivo y poder escribir.
*/
export function ModalReporte({
  abierto,
  reportando,
  motivo,
  onMotivo,
  detalle,
  onDetalle,
  error,
  onCerrar,
  onEnviar,
}: {
  abierto: boolean
  reportando: boolean
  motivo: MotivoReporte
  onMotivo: (m: MotivoReporte) => void
  detalle: string
  onDetalle: (v: string) => void
  error: string
  onCerrar: () => void
  onEnviar: () => void
}) {
  return (
    <Modal
      isOpen={abierto}
      onClose={() => !reportando && onCerrar()}
      title="¿Qué pasa con estos datos?"
      size="sm"
      closeOnBackdrop={false}
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-500">
          Si algo no cuadra, detenemos el proceso ahora mismo y avisamos a Cofianza. No se consultará ninguna
          central de riesgo.
        </p>
        {MOTIVOS_REPORTE.map((m) => {
          const on = motivo === m.key
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={on}
              onClick={() => onMotivo(m.key)}
              className={cn(
                'block w-full rounded-xl border p-3 text-left transition-colors',
                on ? 'border-primary-600 bg-primary-50' : 'border-gray-200 bg-white',
              )}
            >
              <span className={cn('block text-sm font-bold', on ? 'text-primary-800' : 'text-gray-900')}>
                {m.label}
              </span>
              <span className="block text-xs text-gray-500">{m.sub}</span>
            </button>
          )
        })}
        {/* text-base, no text-sm: Safari iOS amplía la página al enfocar
            cualquier campo con font-size < 16px, y el modal es fixed inset-0
            — queda cortado por los lados y el zoom no se deshace solo. */}
        <textarea
          value={detalle}
          maxLength={500}
          rows={3}
          onChange={(e) => onDetalle(e.target.value)}
          placeholder="¿Quiere contarnos algo más? (opcional)"
          aria-label="Detalle adicional (opcional)"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-500 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
        />
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <button
          type="button"
          onClick={onEnviar}
          disabled={reportando}
          className={buttonClasses('primary', 'lg', 'w-full')}
        >
          {reportando ? 'Enviando…' : 'Detener y avisar a Cofianza'}
        </button>
        <button
          type="button"
          onClick={onCerrar}
          disabled={reportando}
          className="mx-auto flex min-h-11 items-center px-4 text-sm font-semibold text-gray-500 hover:text-gray-700"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  )
}
