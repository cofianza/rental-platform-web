/**
 * ExcepcionTopeBlock — Adenda de precios §7.1, 7.3 y 7.4. Por encima del tope
 * el estudio pasa al analista, pero solo la Gerencia General lo aprueba. El
 * analista ve el aviso; la Gerencia (`es_gerencia_general` de /auth/me; el API
 * igual responde 403 al resto) autoriza la excepción con el canon autorizado,
 * que es el techo del contrato, y el motivo. Queda quién, cuándo y por qué.
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { MotivoDialog } from '@/components/ui/MotivoDialog'
import { IconAlertTriangle, IconShieldCheck } from '@/components/icons'
import { expedienteService } from '@/services/expedienteService'
import { useAuthStore } from '@/stores/auth.store'
import { formatCurrency, formatDate } from '@/lib/constants'
import type { ITopeCanonDetalle } from '@/types/expediente'

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'

export function ExcepcionTopeBlock({
  expedienteId,
  tope,
  onAutorizada,
}: {
  expedienteId: string
  tope: ITopeCanonDetalle
  onAutorizada: () => void
}) {
  const esGerencia = useAuthStore((s) => s.user?.es_gerencia_general === true)
  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [canon, setCanon] = useState(String(tope.canon_cop ?? ''))

  const ex = tope.excepcion
  if (!tope.requiere_gerencia && !ex) return null

  const autorizar = async (motivo: string) => {
    const valor = Number(canon)
    if (!Number.isInteger(valor) || valor <= tope.tope_cop) {
      toast.error(`El canon autorizado debe ser un valor en pesos mayor que el tope (${formatCurrency(tope.tope_cop)}).`)
      return false
    }
    setGuardando(true)
    try {
      await expedienteService.autorizarExcepcionTope(expedienteId, valor, motivo)
      toast.success('Excepción de tope autorizada')
      setAbierto(false)
      onAutorizada()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo autorizar la excepción')
      return false
    } finally {
      setGuardando(false)
    }
  }

  if (ex) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <IconShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-700" />
        <div className="text-sm text-emerald-900">
          <p className="font-medium">Excepción de tope autorizada por la Gerencia General</p>
          <p className="mt-1 text-xs">
            Canon autorizado de hasta {formatCurrency(ex.canon_autorizado_cop)} (tope vigente {formatCurrency(tope.tope_cop)}).
            {' '}Lo autorizó {ex.por_nombre || 'la Gerencia General'}
            {ex.en ? ` el ${formatDate(ex.en)}` : ''}.
          </p>
          {ex.motivo && <p className="mt-1 text-xs">Motivo: {ex.motivo}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <IconAlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
      <div className="flex-1 text-sm text-amber-900">
        <p className="font-medium">El canon supera el tope: la aprobación requiere autorización de la Gerencia General</p>
        <p className="mt-1 text-xs">
          Canon: {formatCurrency(tope.canon_cop ?? 0)} · Tope vigente: {formatCurrency(tope.tope_cop)}.
          {' '}El analista evalúa el caso, pero no puede aprobarlo por encima del tope.
        </p>
        {esGerencia && (
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="mt-2 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
          >
            Autorizar excepción de tope
          </button>
        )}
      </div>
      <MotivoDialog
        isOpen={abierto}
        onClose={() => setAbierto(false)}
        onConfirm={autorizar}
        isLoading={guardando}
        title="Autorizar excepción de tope"
        minLength={10}
        label="Motivo de la excepción"
        placeholder="Por qué se autoriza este canon, caso por caso"
        confirmLabel="Autorizar excepción"
        descripcion={
          <div className="space-y-2">
            <p>
              El canon autorizado es el máximo que podrá pactar el contrato. Queda registrado quién lo autorizó, cuándo y
              por qué.
            </p>
            <label className="block text-xs font-medium text-gray-700">
              Canon autorizado (pesos, sin IVA)
              <input
                type="number"
                inputMode="numeric"
                min={tope.tope_cop + 1}
                step={1}
                value={canon}
                onChange={(e) => setCanon(e.target.value)}
                disabled={guardando}
                className={`${INPUT_CLASS} mt-1`}
              />
            </label>
          </div>
        }
      />
    </div>
  )
}
