/**
 * WipeTestDataCard — TEMPORAL (Mario, 7-may-2026).
 *
 * Boton "Borrar datos de prueba" en el dashboard del administrador. Sirve
 * para limpiar el ambiente entre rondas de QA: borra todos los expedientes,
 * inmuebles, solicitantes, contratos, estudios, citas, pagos, notificaciones,
 * coarrendatarios, fotos, etc., y todas las cuentas que NO son administrador.
 *
 * ELIMINAR este componente, su uso en page.tsx, el endpoint backend
 * /api/v1/admin-tools/wipe-test-data y la migracion 20260507000005 antes
 * de pasar a produccion.
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'

const CONFIRM_PHRASE = 'BORRAR-TODO'

interface WipeResult {
  ok: true
  deleted: Record<string, number>
}

export function WipeTestDataCard() {
  const [showModal, setShowModal] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resumen, setResumen] = useState<Record<string, number> | null>(null)

  const canSubmit = confirmInput.trim() === CONFIRM_PHRASE && !submitting

  const handleWipe = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const res = await apiClient.post<WipeResult>('/admin-tools/wipe-test-data', {
        confirm: CONFIRM_PHRASE,
      }) as unknown as { data: WipeResult }
      const totalFilas = Object.values(res.data.deleted).reduce(
        (acc, v) => acc + (typeof v === 'number' ? v : 0),
        0,
      )
      toast.success(`Datos de prueba borrados (${totalFilas} filas afectadas).`)
      setResumen(res.data.deleted)
      setConfirmInput('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo borrar los datos de prueba.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) return
    setShowModal(false)
    setConfirmInput('')
    setResumen(null)
  }

  return (
    <>
      <div className="border border-red-200 bg-red-50/40 rounded-lg p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <svg className="h-4 w-4 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.76-2.93L13.76 4a2 2 0 00-3.52 0L3.17 16.07A2 2 0 004.93 19z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-900">Herramienta temporal de QA</h3>
          <p className="text-xs text-red-800 mt-0.5">
            Borra <strong>todos los datos de prueba</strong> (expedientes, inmuebles, solicitantes, contratos,
            estudios, citas, pagos, notificaciones, etc.) y <strong>todas las cuentas no-administrador</strong>.
            Las cuentas de administrador y los datos de configuración se conservan.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
          >
            Borrar datos de prueba
          </button>
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {!resumen ? (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Borrar datos de prueba</h2>
                <p className="text-sm text-gray-700 mb-3">
                  Esta acción borra <strong>de forma irreversible</strong> todos los expedientes, inmuebles,
                  solicitantes, contratos, estudios, citas, pagos, notificaciones, fotos y todas las cuentas
                  excepto las de <strong>administrador</strong>.
                </p>
                <p className="text-sm text-gray-700 mb-4">
                  Las plantillas de contrato, configuración del sistema y catálogos de referencia <strong>no</strong> se
                  ven afectadas. Los archivos en Supabase Storage <strong>no</strong> se borran (limpiar manualmente
                  desde el panel de Storage si es necesario).
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Para confirmar, escribe <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-red-700">{CONFIRM_PHRASE}</code>
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  disabled={submitting}
                  placeholder={CONFIRM_PHRASE}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={handleClose}
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleWipe}
                    disabled={!canSubmit}
                    className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? 'Borrando…' : 'Borrar todo'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Datos de prueba borrados</h2>
                <p className="text-sm text-gray-700 mb-3">
                  La operación se completó. Resumen de filas afectadas:
                </p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <tbody>
                      {Object.entries(resumen)
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .map(([tabla, count]) => (
                          <tr key={tabla} className="border-b border-gray-100 last:border-0">
                            <td className="py-1 pr-3 text-gray-700 font-mono">{tabla}</td>
                            <td className="py-1 text-right font-semibold text-gray-900">{String(count)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
