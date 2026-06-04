/**
 * Tesorería — el administrador configura el capital disponible y la reserva
 * mínima de Cofianza. Alimenta el KPI "Capital libre" del Centro de Control
 * (capital libre = disponible − reserva). Solo administrador.
 *
 * Reemplaza la necesidad de editar configuracion_sistema vía SQL.
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { dashboardService } from '@/services/dashboardService'
import { ApiClientError } from '@/lib/api'
import { formatCurrency } from '@/lib/constants'
import { IconLoader, IconCheck, IconBank } from '@/components/icons'

export default function TesoreriaPage() {
  const router = useRouter()
  const { user } = useAuth()
  const isAdmin = user?.rol === 'administrador'

  const [capitalDisponible, setCapitalDisponible] = useState('')
  const [reservaMinima, setReservaMinima] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Solo admin. Si otro rol entra por URL, lo devolvemos al hub.
  useEffect(() => {
    if (user && !isAdmin) {
      router.replace('/configuracion')
    }
  }, [user, isAdmin, router])

  useEffect(() => {
    if (!isAdmin) return
    dashboardService
      .getTesoreria()
      .then((t) => {
        setCapitalDisponible(String(t.capitalDisponible))
        setReservaMinima(String(t.reservaMinima))
      })
      .catch(() => toast.error('No pudimos cargar la configuración de tesorería.'))
      .finally(() => setLoading(false))
  }, [isAdmin])

  const capNum = Number(capitalDisponible) || 0
  const resNum = Number(reservaMinima) || 0
  const capitalLibre = Math.max(0, capNum - resNum)
  const reservaExcede = resNum > capNum

  const handleSave = async () => {
    if (reservaExcede) {
      toast.error('La reserva mínima no puede superar el capital disponible.')
      return
    }
    setSaving(true)
    try {
      const res = await dashboardService.updateTesoreria({
        capitalDisponible: Math.round(capNum),
        reservaMinima: Math.round(resNum),
      })
      setCapitalDisponible(String(res.capitalDisponible))
      setReservaMinima(String(res.reservaMinima))
      toast.success('Tesorería actualizada. El Centro de Control ya refleja el cambio.')
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'No pudimos guardar los cambios.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Tesorería"
        subtitle="Configura el capital de Cofianza para el cálculo de exposición y capital libre."
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <IconLoader size={28} className="animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600 shrink-0">
              <IconBank size={20} />
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              El <strong className="text-gray-700">capital libre</strong> que ve el administrador en el
              Centro de Control se calcula como <em>capital disponible − reserva mínima</em>. Cuando el capital
              libre queda por debajo de la exposición máxima, el sistema muestra una alerta de riesgo de
              insolvencia.
            </p>
          </div>

          {/* Capital disponible */}
          <div>
            <label htmlFor="capital" className="block text-sm font-semibold text-gray-900 mb-1.5">
              Capital disponible (COP)
            </label>
            <input
              id="capital"
              type="number"
              min={0}
              step={1000}
              inputMode="numeric"
              value={capitalDisponible}
              onChange={(e) => setCapitalDisponible(e.target.value)}
              placeholder="0"
              className="w-full px-3.5 py-3 border-[1.5px] border-gray-200 rounded-[10px] text-[15px] text-gray-900 bg-white focus:outline-none focus:border-primary-600 focus:ring-[3px] focus:ring-primary-600/10 transition-all"
            />
            <p className="mt-1 text-xs text-gray-500">Capital total para cubrir siniestros.</p>
          </div>

          {/* Reserva mínima */}
          <div>
            <label htmlFor="reserva" className="block text-sm font-semibold text-gray-900 mb-1.5">
              Reserva mínima (COP)
            </label>
            <input
              id="reserva"
              type="number"
              min={0}
              step={1000}
              inputMode="numeric"
              value={reservaMinima}
              onChange={(e) => setReservaMinima(e.target.value)}
              placeholder="0"
              className={`w-full px-3.5 py-3 border-[1.5px] rounded-[10px] text-[15px] text-gray-900 bg-white focus:outline-none focus:ring-[3px] transition-all ${
                reservaExcede
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                  : 'border-gray-200 focus:border-primary-600 focus:ring-primary-600/10'
              }`}
            />
            <p className={`mt-1 text-xs ${reservaExcede ? 'text-red-600' : 'text-gray-500'}`}>
              {reservaExcede
                ? 'La reserva no puede superar el capital disponible.'
                : 'Reserva intocable que no se cuenta como capital libre.'}
            </p>
          </div>

          {/* Preview capital libre */}
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Capital libre resultante</span>
            <span className="text-xl font-extrabold tracking-tight text-gray-900">
              {formatCurrency(capitalLibre)}
            </span>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || reservaExcede}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? <IconLoader size={16} className="animate-spin" /> : <IconCheck size={16} />}
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
