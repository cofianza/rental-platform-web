/**
 * AccionContratoPendienteCard — señaliza al propietario/inmobiliaria/admin/operador
 * cuando un expediente está aprobado pero aún no tiene contrato generado.
 *
 * El propietario captura aquí la duración del contrato y la fecha de inicio.
 * Al hacer clic, el backend genera el contrato y queda en 'borrador' listo
 * para enviar a firma desde la pestaña Contratos.
 *
 * Flujo: estudio aprobado por el buró → expediente queda en 'aprobado'
 * SIN contrato (el orchestrator ya no lo auto-genera, decisión Mario
 * 5-may-2026) → este card pide los datos y dispara la generación.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { contratoService } from '@/services/contratoService'
import { expedienteService } from '@/services/expedienteService'

interface AccionContratoPendienteCardProps {
  expedienteId: string
  expedienteEstado: string
  userRol?: string
  onGenerated?: () => void
}

const DURACION_OPCIONES = [1, 2, 3, 6, 9, 12, 18, 24, 36, 48, 60] as const

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function AccionContratoPendienteCard({
  expedienteId,
  expedienteEstado,
  userRol,
  onGenerated,
}: AccionContratoPendienteCardProps) {
  const [loading, setLoading] = useState(true)
  const [hasContrato, setHasContrato] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [duracionMeses, setDuracionMeses] = useState<number>(12)
  const [fechaInicio, setFechaInicio] = useState<string>(todayISO())

  const fetchContratos = useCallback(async () => {
    try {
      const res = await contratoService.getContratosForExpediente(expedienteId, { page: 1, limit: 1 })
      const activos = (res.data || []).filter((c) => c.estado !== 'cancelado')
      setHasContrato(activos.length > 0)
    } catch {
      setHasContrato(false)
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => { fetchContratos() }, [fetchContratos])

  // Solo relevante cuando el expediente está APROBADO y no hay contrato aún.
  // En 'condicionado' se muestra AprobarCondicionadoCard, no este card.
  if (loading) return null
  if (hasContrato) return null
  if (expedienteEstado !== 'aprobado') return null

  const puedeGenerar =
    userRol === 'administrador' ||
    userRol === 'operador_analista' ||
    userRol === 'inmobiliaria' ||
    userRol === 'propietario'

  const handleGenerar = async () => {
    if (!duracionMeses || duracionMeses < 1) {
      toast.error('Selecciona la duración del contrato (al menos 1 mes)')
      return
    }
    if (!fechaInicio || !/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)) {
      toast.error('Selecciona la fecha de inicio del contrato')
      return
    }
    setSubmitting(true)
    try {
      const result = await expedienteService.generarContratoExpediente(expedienteId, {
        duracion_contrato_meses: duracionMeses,
        fecha_inicio_contrato: fechaInicio,
      })
      if (result.contrato_id) {
        toast.success('Contrato generado. Revísalo desde la pestaña Contratos antes de enviarlo a firma.')
      } else {
        toast.message('El expediente quedó listo. Genera el contrato desde la pestaña Contratos si no aparece en breve.')
      }
      setShowForm(false)
      onGenerated?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo generar el contrato.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (puedeGenerar) {
    return (
      <div className="border-2 border-primary-300 bg-primary-50/50 rounded-lg p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <svg className="h-5 w-5 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 mb-0.5">Acción requerida: generar contrato</h3>
            <p className="text-sm text-gray-600 mb-3">
              El expediente está aprobado. Captura la duración del contrato y la fecha de inicio para generarlo y dejarlo listo para enviar a firma.
            </p>

            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
              >
                Generar contrato
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            ) : (
              <div className="bg-white border border-primary-200 rounded-lg p-4 space-y-4">
                <div>
                  <label htmlFor="generar-contrato-duracion" className="block text-sm font-medium text-gray-700 mb-1">
                    Duración del contrato (meses) <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="generar-contrato-duracion"
                    value={duracionMeses}
                    onChange={(e) => setDuracionMeses(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {DURACION_OPCIONES.map((m) => (
                      <option key={m} value={m}>{m === 1 ? '1 mes' : `${m} meses`}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="generar-contrato-fecha" className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de inicio del contrato <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="generar-contrato-fecha"
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={handleGenerar}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Generando…' : 'Confirmar y generar'}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Otros roles (solicitante, gerencia_consulta) — informativo.
  return (
    <div className="border border-blue-200 bg-blue-50 rounded-lg p-5">
      <div className="flex items-start gap-3">
        <svg className="h-5 w-5 text-blue-700 shrink-0 mt-0.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-blue-900 mb-0.5">Esperando generación del contrato</p>
          <p className="text-sm text-blue-800">
            El estudio del solicitante fue aprobado. La inmobiliaria o el operador de Cofianza están preparando el contrato — recibirás una notificación cuando esté listo.
          </p>
        </div>
      </div>
    </div>
  )
}
