/**
 * AccionHabilitarEstudioCard — Resumen del expediente.
 *
 * Aparece cuando:
 *   - hay cita realizada
 *   - el estudio aun NO se habilito ni se rechazo
 *   - el usuario tiene permiso para decidir (propietario/inmobiliaria/admin/operador)
 *
 * Da al propietario el control de "Habilitar estudio" o "No habilitar"
 * sin tener que ir al kanban /citas — mantiene el flujo dentro del
 * expediente. Tras la accion, el padre refresca via onAction.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { IconShieldCheck, IconLoader, IconAlertTriangle } from '@/components/icons'
import { Modal } from '@/components/ui'
import { citaService } from '@/services/citaService'
import { expedienteService } from '@/services/expedienteService'

interface AccionHabilitarEstudioCardProps {
  expedienteId: string
  estudioHabilitado: boolean
  estudioRechazado: boolean | null | undefined
  /** Datos del contrato pre-existentes en el expediente. Si vienen, prefilamos
   *  el modal con esos valores; si no, defaults razonables (12 meses + hoy). */
  duracionContratoMeses?: number | null
  fechaInicioContrato?: string | null
  userRol?: string
  onAction: () => void | Promise<void>
}

const DURACION_OPCIONES = [
  1, 2, 3, 6, 9, 12, 18, 24, 36, 48, 60,
] as const

function todayISO(): string {
  // Fecha local en formato YYYY-MM-DD, sin afectacion de zona horaria.
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function AccionHabilitarEstudioCard({
  expedienteId,
  estudioHabilitado,
  estudioRechazado,
  duracionContratoMeses,
  fechaInicioContrato,
  userRol,
  onAction,
}: AccionHabilitarEstudioCardProps) {
  const puedeDecidir =
    userRol === 'propietario' ||
    userRol === 'inmobiliaria' ||
    userRol === 'administrador' ||
    userRol === 'operador_analista'

  const [tieneCitaRealizada, setTieneCitaRealizada] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showRechazar, setShowRechazar] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Modal de captura de datos del contrato — paso previo a habilitar.
  const [showHabilitar, setShowHabilitar] = useState(false)
  const [duracionMeses, setDuracionMeses] = useState<number>(duracionContratoMeses ?? 12)
  const [fechaInicio, setFechaInicio] = useState<string>(fechaInicioContrato ?? todayISO())

  // Solo fetcha citas si hay chance de mostrar la card. Para los otros
  // casos (estudio ya decidido o usuario sin permiso) salimos sin gasto.
  const fetchCitas = useCallback(async () => {
    if (!puedeDecidir || estudioHabilitado || estudioRechazado) {
      setLoading(false)
      return
    }
    try {
      const citas = await citaService.getCitasByExpediente(expedienteId)
      setTieneCitaRealizada(citas.some((c) => c.estado === 'realizada'))
    } catch {
      // Si falla, no mostramos la card — es informativa, no critica.
      setTieneCitaRealizada(false)
    } finally {
      setLoading(false)
    }
  }, [expedienteId, puedeDecidir, estudioHabilitado, estudioRechazado])

  useEffect(() => { fetchCitas() }, [fetchCitas])

  const handleConfirmarHabilitar = async () => {
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
      await expedienteService.habilitarEstudio(expedienteId, {
        duracion_contrato_meses: duracionMeses,
        fecha_inicio_contrato: fechaInicio,
      })
      toast.success('Estudio habilitado, se notifico al solicitante')
      setShowHabilitar(false)
      await onAction()
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string }
      if (errObj.code === 'ESTUDIO_YA_HABILITADO') {
        toast.message('El estudio ya estaba habilitado. Refrescando...')
        setShowHabilitar(false)
        await onAction()
      } else {
        toast.error(errObj.message || 'Error al habilitar el estudio')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleRechazar = async () => {
    setSubmitting(true)
    try {
      await expedienteService.rechazarEstudio(expedienteId, motivoRechazo.trim() || undefined)
      toast.success('Estudio no habilitado, se notifico al solicitante')
      setShowRechazar(false)
      setMotivoRechazo('')
      await onAction()
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      toast.error(errObj.message || 'Error al rechazar el estudio')
    } finally {
      setSubmitting(false)
    }
  }

  // Reglas de visibilidad combinadas — early-return para no renderizar nada
  // cuando no aplica.
  if (loading) return null
  if (estudioHabilitado || estudioRechazado) return null
  if (!puedeDecidir) return null
  if (!tieneCitaRealizada) return null

  return (
    <>
      <div className="border-2 border-primary-300 bg-primary-50/50 rounded-lg p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <IconShieldCheck size={22} className="text-primary-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 mb-0.5">
              Acción requerida: ¿habilitamos el estudio crediticio?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              La cita de visita se realizó. Decide si proceder con el estudio crediticio del solicitante (le llegará el link para pagar y completar) o cerrar el proceso aquí.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowHabilitar(true)}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <IconShieldCheck size={14} />
                Habilitar estudio
              </button>
              <button
                onClick={() => setShowRechazar(true)}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                No habilitar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de datos del contrato — paso previo al estudio. Estos datos
          quedan en el expediente y alimentan el contrato cuando se genere. */}
      <Modal
        isOpen={showHabilitar}
        onClose={() => !submitting && setShowHabilitar(false)}
        title="Datos del contrato"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Antes de habilitar el estudio, captura los datos del contrato. Estos datos podrán editarse hasta que se ejecute el estudio; después quedan congelados y se usan al generar el contrato.
          </p>

          <div>
            <label htmlFor="duracion-meses-select" className="block text-sm font-medium text-gray-700 mb-1">
              Duración del contrato (meses) <span className="text-red-500">*</span>
            </label>
            <select
              id="duracion-meses-select"
              value={duracionMeses}
              onChange={(e) => setDuracionMeses(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {DURACION_OPCIONES.map((m) => (
                <option key={m} value={m}>
                  {m === 1 ? '1 mes' : `${m} meses`}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Lo más común es 12 meses. Si necesitas otra duración no listada, escríbeme y la agregamos.
            </p>
          </div>

          <div>
            <label htmlFor="fecha-inicio-input" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de inicio del contrato <span className="text-red-500">*</span>
            </label>
            <input
              id="fecha-inicio-input"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowHabilitar(false)}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmarHabilitar}
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <IconLoader size={14} className="animate-spin" />}
              <IconShieldCheck size={14} />
              Confirmar y habilitar estudio
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showRechazar}
        onClose={() => !submitting && setShowRechazar(false)}
        title="No habilitar estudio"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <IconAlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              Al confirmar, el solicitante recibirá un aviso por correo de que decidiste no continuar con el proceso. Esta acción es irreversible.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo (opcional)
            </label>
            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Ej: prefiero esperar otro candidato, no me convencio el perfil, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Este texto aparecerá en el correo al solicitante.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowRechazar(false)}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleRechazar}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <IconLoader size={14} className="animate-spin" />}
              Confirmar — no habilitar
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
