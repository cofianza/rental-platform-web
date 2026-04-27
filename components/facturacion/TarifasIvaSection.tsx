'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { facturacionService } from '@/services/facturacionService'
import { useAuthStore } from '@/stores/auth.store'
import { IconLoader, IconCheck } from '@/components/icons'

const CONCEPTO_LABELS: Record<string, string> = {
  estudio: 'Estudio crediticio',
  garantia: 'Garantía de arrendamiento',
  primer_canon: 'Primer canon',
  deposito: 'Depósito',
  otro: 'Otros conceptos',
}

interface Tarifa {
  concepto: string
  tasa: number
}

export function TarifasIvaSection() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.rol === 'administrador'

  const [tarifas, setTarifas] = useState<Tarifa[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [edited, setEdited] = useState(false)

  useEffect(() => {
    facturacionService
      .getTarifasIva()
      .then(setTarifas)
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Error al cargar tarifas'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (concepto: string, value: string) => {
    const tasa = Number(value)
    setTarifas((prev) => prev.map((t) => (t.concepto === concepto ? { ...t, tasa } : t)))
    setEdited(true)
  }

  const handleSave = async () => {
    for (const t of tarifas) {
      if (Number.isNaN(t.tasa) || t.tasa < 0 || t.tasa > 100) {
        toast.error(`La tasa de "${CONCEPTO_LABELS[t.concepto] ?? t.concepto}" debe estar entre 0 y 100`)
        return
      }
    }
    setSaving(true)
    try {
      const updated = await facturacionService.updateTarifasIva(tarifas)
      setTarifas(updated)
      setEdited(false)
      toast.success('Tarifas actualizadas')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center">
        <IconLoader size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">Tarifas de IVA por concepto</h3>
        <p className="text-sm text-gray-500 mt-1">
          Tasa aplicada al emitir facturas electrónicas. <strong>0 = exento</strong> (servicio
          financiero excluido de IVA, opción por defecto en Cofianza).
        </p>
      </div>

      <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
        {tarifas.map((t) => (
          <div key={t.concepto} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium text-gray-700">
              {CONCEPTO_LABELS[t.concepto] ?? t.concepto}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                max={100}
                value={t.tasa}
                disabled={!isAdmin || saving}
                onChange={(e) => handleChange(t.concepto, e.target.value)}
                className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm text-right focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
              <span className="text-sm text-gray-500 w-4">%</span>
              {t.tasa === 0 && (
                <span className="text-xs text-emerald-600 font-medium">Exento</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {isAdmin ? (
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSave}
            disabled={!edited || saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <IconLoader size={16} className="animate-spin" />
            ) : (
              <IconCheck size={16} />
            )}
            {saving ? 'Guardando…' : 'Guardar tarifas'}
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic mt-3">
          Solo el administrador puede modificar estas tarifas.
        </p>
      )}
    </div>
  )
}
