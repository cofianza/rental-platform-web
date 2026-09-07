/**
 * TarifaEstudioBlock — Adenda 1 §5: tarifa mensual, prima y cashback del
 * estudio segun su via de aprobacion, con las "condiciones especiales
 * negociadas caso por caso" que solo Gerencia General (administrador) puede
 * poner o quitar. Cada cambio queda con quien autorizo, cuando y por que, y
 * regenera el CRC ya emitido.
 *
 * Solo aparece en estudios completados y aprobados/condicionados: antes no
 * hay tarifa que mostrar.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { estudioService } from '@/services/estudioService'
import { formatCurrency, formatDate } from '@/lib/constants'
import type { IEstudio, ITarifaEstudio, ITarifaOverrideInput, ViaAprobacion } from '@/types/estudio'

const VIA_LABEL: Record<ViaAprobacion, string> = {
  automatica: 'aprobación automática',
  condicionada_coarrendatario: 'condicionada con coarrendatario',
  revision_manual: 'revisión manual',
}

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'

function avisarCrc(d: ITarifaEstudio) {
  if (d.crc_regenerado) toast.success('CRC regenerado con las nuevas condiciones')
  else if (d.crc_error) toast.warning(`La tarifa quedó guardada, pero el CRC no se regeneró: ${d.crc_error}`)
}

export function TarifaEstudioBlock({ estudio, userRol }: { estudio: IEstudio; userRol?: string }) {
  const aplica =
    estudio.estado === 'completado' &&
    (estudio.resultado === 'aprobado' || estudio.resultado === 'condicionado')
  const [data, setData] = useState<ITarifaEstudio | null>(null)
  const [editando, setEditando] = useState(false)
  const [confirmarQuitar, setConfirmarQuitar] = useState(false)
  const [quitando, setQuitando] = useState(false)

  const cargar = useCallback(async () => {
    if (!aplica) return
    try {
      setData(await estudioService.getTarifa(estudio.id))
    } catch {
      // Sin tarifa no hay bloque; el resto del panel sigue igual.
    }
  }, [aplica, estudio.id])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (!aplica || !data) return null
  const t = data.tarifas
  const o = data.override
  const esGerencia = userRol === 'administrador'

  const quitar = async () => {
    setQuitando(true)
    try {
      const d = await estudioService.quitarTarifaOverride(estudio.id)
      setData(d)
      setConfirmarQuitar(false)
      toast.success('Tarifa estándar restablecida')
      avisarCrc(d)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo quitar la condición especial')
    } finally {
      setQuitando(false)
    }
  }

  return (
    <div className="mt-2 text-xs text-gray-700 space-y-0.5">
      <p>
        Tarifa mensual: <span className="font-semibold">{t.tarifa_mensual_pct}% + IVA</span>
        {t.tarifa_mensual_cop != null && ` (${formatCurrency(t.tarifa_mensual_cop)})`}
        {' · '}Prima: <span className="font-semibold">{t.prima_vinculacion_pct}%</span>
        {t.prima_vinculacion_cop != null && ` (${formatCurrency(t.prima_vinculacion_cop)})`}
        {' · '}Cashback: <span className="font-semibold">{t.cashback_pct}%</span>{' '}
        <span className="text-gray-500">({VIA_LABEL[t.via]})</span>
      </p>
      {o && (
        <p className="text-amber-700">
          Condiciones especiales autorizadas por {o.autorizado_por_nombre || 'Gerencia'} el {formatDate(o.autorizado_en)}
          {o.motivo ? ` — ${o.motivo}` : ''}
        </p>
      )}
      {esGerencia && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            {o ? 'Editar condiciones especiales' : 'Condiciones especiales'}
          </button>
          {o && (
            <button
              type="button"
              onClick={() => setConfirmarQuitar(true)}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Volver a la tabla estándar
            </button>
          )}
        </div>
      )}

      {editando && (
        <TarifaOverrideModal
          estudioId={estudio.id}
          actual={data}
          onClose={() => setEditando(false)}
          onSaved={(d) => {
            setData(d)
            setEditando(false)
            toast.success('Condiciones especiales guardadas')
            avisarCrc(d)
          }}
        />
      )}
      <ConfirmDialog
        isOpen={confirmarQuitar}
        onClose={() => setConfirmarQuitar(false)}
        onConfirm={quitar}
        isLoading={quitando}
        title="Volver a la tabla estándar"
        message="Se quitan las condiciones especiales y el CRC se regenera con la tarifa estándar de la Adenda. Queda registro de quién lo hizo."
        confirmLabel="Quitar condiciones"
      />
    </div>
  )
}

function TarifaOverrideModal({
  estudioId,
  actual,
  onClose,
  onSaved,
}: {
  estudioId: string
  actual: ITarifaEstudio
  onClose: () => void
  onSaved: (d: ITarifaEstudio) => void
}) {
  const o = actual.override
  const [tarifa, setTarifa] = useState(o?.tarifa_mensual_pct?.toString() ?? '')
  const [prima, setPrima] = useState(o?.prima_vinculacion_pct?.toString() ?? '')
  const [cashback, setCashback] = useState(o?.cashback_pct?.toString() ?? '')
  const [motivo, setMotivo] = useState(o?.motivo ?? '')
  const [guardando, setGuardando] = useState(false)

  const num = (v: string) => (v.trim() === '' ? undefined : Number(v))

  const guardar = async () => {
    const input: ITarifaOverrideInput = {
      tarifa_mensual_pct: num(tarifa),
      prima_vinculacion_pct: num(prima),
      cashback_pct: num(cashback),
      motivo: motivo.trim(),
    }
    const pcts = [input.tarifa_mensual_pct, input.prima_vinculacion_pct, input.cashback_pct]
    if (pcts.every((p) => p === undefined)) {
      toast.error('Indica al menos un porcentaje')
      return
    }
    if (pcts.some((p) => p !== undefined && (!Number.isFinite(p) || p < 0 || p > 100))) {
      toast.error('Los porcentajes van de 0 a 100')
      return
    }
    if (input.motivo.length < 5) {
      toast.error('Indica el motivo de la condición especial')
      return
    }
    setGuardando(true)
    try {
      onSaved(await estudioService.setTarifaOverride(estudioId, input))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron guardar las condiciones')
    } finally {
      setGuardando(false)
    }
  }

  // Los valores estándar de la Adenda van como placeholder: vacío = se mantiene.
  const campos: Array<[string, string, string, (v: string) => void]> = [
    ['Tarifa mensual (% del canon + IVA)', actual.tarifas.negociada ? '' : String(actual.tarifas.tarifa_mensual_pct), tarifa, setTarifa],
    ['Prima de vinculación (% del canon)', String(actual.tarifas.prima_vinculacion_pct), prima, setPrima],
    ['Cashback (% de tarifas pagadas)', String(actual.tarifas.cashback_pct), cashback, setCashback],
  ]

  return (
    <Modal isOpen onClose={onClose} title="Condiciones especiales (Adenda §5)" size="sm">
      <div className="space-y-3">
        <p className="text-xs text-gray-600">
          Sobrescribe la tabla estándar para este estudio. Deja vacío lo que no cambia. Queda registro de quién autorizó, cuándo y por qué, y el CRC se regenera.
        </p>
        {campos.map(([label, placeholder, valor, setValor]) => (
          <label key={label} className="block text-xs font-medium text-gray-700">
            {label}
            <input
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={valor}
              placeholder={placeholder ? `estándar: ${placeholder}%` : ''}
              onChange={(e) => setValor(e.target.value)}
              disabled={guardando}
              className={`${INPUT_CLASS} mt-1`}
            />
          </label>
        ))}
        <label className="block text-xs font-medium text-gray-700">
          Motivo (obligatorio)
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            maxLength={500}
            disabled={guardando}
            placeholder="Ej.: negociación con la inmobiliaria X, cliente corporativo…"
            className={`${INPUT_CLASS} mt-1`}
          />
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
