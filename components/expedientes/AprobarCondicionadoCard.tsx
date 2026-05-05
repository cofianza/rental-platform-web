/**
 * AprobarCondicionadoCard — visible para propietario/inmobiliaria/admin/operador
 * cuando el expediente está en 'condicionado'.
 *
 * Flujo: el buró devolvió el estudio como condicionado (necesita codeudor,
 * póliza extra, etc.). El propietario revisa la documentación adicional
 * y, si decide proceder, llena la duración del contrato + fecha de inicio
 * y hace clic. El backend transiciona expediente a 'aprobado' y genera
 * el contrato.
 *
 * El solicitante no ve esta card; ve EstudioEstadoCard (informativa).
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { expedienteService } from '@/services/expedienteService'
import { SoportesCondicionadoSection } from './SoportesCondicionadoSection'

interface AprobarCondicionadoCardProps {
  expedienteId: string
  expedienteEstado: string
  userRol?: string
  onAprobado?: () => void
}

const DURACION_OPCIONES = [1, 2, 3, 6, 9, 12, 18, 24, 36, 48, 60] as const

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function AprobarCondicionadoCard({
  expedienteId,
  expedienteEstado,
  userRol,
  onAprobado,
}: AprobarCondicionadoCardProps) {
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [duracionMeses, setDuracionMeses] = useState<number>(12)
  const [fechaInicio, setFechaInicio] = useState<string>(todayISO())

  const puedeAprobar =
    userRol === 'administrador' ||
    userRol === 'operador_analista' ||
    userRol === 'propietario' ||
    userRol === 'inmobiliaria'

  if (expedienteEstado !== 'condicionado' || !puedeAprobar) return null

  const handleAprobar = async () => {
    if (!duracionMeses || duracionMeses < 1) {
      toast.error('Selecciona la duración del contrato (al menos 1 mes)')
      return
    }
    if (!fechaInicio || !/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)) {
      toast.error('Selecciona la fecha de inicio del contrato')
      return
    }
    setLoading(true)
    try {
      const result = await expedienteService.aprobarCondicionado(expedienteId, {
        duracion_contrato_meses: duracionMeses,
        fecha_inicio_contrato: fechaInicio,
      })
      if (result.contrato_id) {
        toast.success('Expediente aprobado. Contrato generado y listo para enviar a firma.')
      } else {
        toast.success('Expediente aprobado. Genera el contrato desde la pestaña Contratos.')
      }
      onAprobado?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo aprobar el expediente.'
      toast.error(msg)
    } finally {
      setLoading(false)
      setShowForm(false)
    }
  }

  return (
    <div className="border-2 border-amber-300 bg-amber-50/60 rounded-lg p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 mb-0.5">Estudio condicionado — decisión pendiente</h3>
          <p className="text-sm text-gray-700 mb-3">
            El buró marcó la solicitud como condicionada. Revisa la documentación adicional que el solicitante haya subido (codeudor, póliza, etc.).
            Si decides proceder, captura los datos del contrato y se generará automáticamente.
          </p>

          <div className="mb-4 pb-4 border-b border-amber-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Documentación adicional del solicitante</p>
            <SoportesCondicionadoSection expedienteId={expedienteId} permitirSubir={false} />
          </div>

          {!showForm ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowForm(true)}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                Aprobar y generar contrato
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="bg-white border border-amber-200 rounded-lg p-4 space-y-4">
              <p className="text-sm text-gray-700">
                Datos del contrato — se usarán para generar el documento que firmará el solicitante.
              </p>

              <div>
                <label htmlFor="aprobar-cond-duracion" className="block text-sm font-medium text-gray-700 mb-1">
                  Duración del contrato (meses) <span className="text-red-500">*</span>
                </label>
                <select
                  id="aprobar-cond-duracion"
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
                <label htmlFor="aprobar-cond-fecha" className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de inicio del contrato <span className="text-red-500">*</span>
                </label>
                <input
                  id="aprobar-cond-fecha"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleAprobar}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Generando…' : 'Aprobar y generar contrato'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  disabled={loading}
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
