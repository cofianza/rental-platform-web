'use client'

/**
 * Verificación de identidad previa a la firma (Adenda 2 §9), dentro del panel
 * de firmantes del contrato.
 *
 * - El gestor (inmobiliaria/propietario) solo ve si el arrendatario la tiene
 *   pendiente o ya la completó, y puede reenviarle el enlace. El resultado del
 *   cotejo no se le muestra: §9.2 "no se comparte con la inmobiliaria".
 * - El analista de Cofianza ve el resultado y, cuando no quedó limpio, registra
 *   cómo verificó la identidad por otro medio. "Suplantación" cancela el
 *   contrato (el contrato nunca espera a esta revisión).
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { IconAlertTriangle, IconCheck, IconClock, IconLoader, IconMail, IconShieldCheck } from '@/components/icons'
import { useAuth } from '@/hooks/useAuth'
import { contratoService } from '@/services/contratoService'
import { firmaService } from '@/services/firmaService'
import { formatDateTime } from '@/lib/constants'
import type { IVerificacionIdentidad } from '@/types/firma'

function detalleCofianza(v: IVerificacionIdentidad): { texto: string; tono: 'ok' | 'alerta' | 'error' | 'neutro' } {
  if (v.revision === 'suplantacion') return { texto: `Suplantación detectada: ${v.revision_nota ?? ''}`, tono: 'error' }
  if (v.revision === 'confirmada') return { texto: `Identidad confirmada por un analista: ${v.revision_nota ?? ''}`, tono: 'ok' }
  if (v.requiere_analista) {
    const causa = v.estado === 'omitida' ? 'Prefirió que un analista verifique su identidad por otro medio.' : v.motivo ?? 'Sin cotejo biométrico.'
    return { texto: `${causa} Verifica su identidad por otro medio y registra el resultado.`, tono: 'alerta' }
  }
  return { texto: `Identidad verificada con foto${v.similitud != null ? ` (similitud ${v.similitud} %)` : ''}.`, tono: 'ok' }
}

const TONO = {
  ok: 'border-green-200 bg-green-50 text-green-800',
  alerta: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  neutro: 'border-gray-200 bg-gray-50 text-gray-600',
}

export function VerificacionIdentidadFirma({
  contratoId,
  verificaciones,
  hayFirmantes,
  canManage,
  onChange,
}: {
  contratoId: string
  verificaciones: IVerificacionIdentidad[]
  /** false = aún no hay sobre de Auco (la verificación va primero, o el envío falló). */
  hayFirmantes: boolean
  canManage: boolean
  onChange: () => void
}) {
  const { user } = useAuth()
  const esAnalista = user?.rol === 'administrador' || user?.rol === 'operador_analista'
  const esCofianza = esAnalista || user?.rol === 'gerencia_consulta'

  const [enviando, setEnviando] = useState(false)
  const [revision, setRevision] = useState<{ v: IVerificacionIdentidad; resultado: 'confirmada' | 'suplantacion' } | null>(null)
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)

  const pendiente = verificaciones.some((v) => v.estado === 'pendiente')

  // Reenviar el enlace o, si la verificación ya terminó y el sobre no salió
  // (Auco falló), volver a enviarlo: el mismo "Enviar a firma" decide.
  const handleEnviar = async () => {
    setEnviando(true)
    try {
      const res = await contratoService.enviarAFirma(contratoId)
      toast.success(res.message)
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar')
    } finally {
      setEnviando(false)
    }
  }

  const handleRevisar = async () => {
    if (!revision) return
    setGuardando(true)
    try {
      await firmaService.revisarIdentidad(contratoId, revision.v.id, { resultado: revision.resultado, nota: nota.trim() })
      toast.success(revision.resultado === 'suplantacion' ? 'Suplantación registrada. El contrato quedó cancelado.' : 'Identidad confirmada.')
      setRevision(null)
      setNota('')
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la revisión')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="mb-3 rounded-lg border border-gray-200 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          <IconShieldCheck size={15} className="text-primary-600" /> Verificación de identidad
        </p>
        {canManage && (pendiente || !hayFirmantes) && (
          <button
            onClick={handleEnviar}
            disabled={enviando}
            className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50"
          >
            {enviando ? <IconLoader size={12} className="animate-spin" /> : <IconMail size={12} />}
            {pendiente ? 'Reenviar enlace' : 'Enviar a firma'}
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {verificaciones.map((v) => {
          const det = esCofianza && v.estado !== 'pendiente' ? detalleCofianza(v) : null
          return (
            <li key={v.id} className="text-sm">
              <p className="font-medium text-gray-900">
                Arrendatario <span className="font-normal text-gray-500">· {v.nombre}</span>
              </p>
              {v.estado === 'pendiente' ? (
                <p className="flex items-center gap-1 text-xs text-gray-500">
                  <IconClock size={11} /> Le enviamos el enlace a {v.email}. El contrato sale a firma cuando confirme su identidad.
                  {v.token_expiracion && ` Vence el ${formatDateTime(v.token_expiracion)}.`}
                </p>
              ) : det ? (
                <p className={`mt-1 rounded-md border px-2 py-1.5 text-xs ${TONO[det.tono]}`}>{det.texto}</p>
              ) : (
                <p className="flex items-center gap-1 text-xs text-green-700">
                  <IconCheck size={11} /> Completó la verificación de identidad.
                </p>
              )}
              {!hayFirmantes && v.estado !== 'pendiente' && (
                <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                  <IconAlertTriangle size={11} /> El contrato no salió a firma en Auco. Vuelve a enviarlo.
                </p>
              )}
              {esAnalista && v.requiere_analista && !v.revision && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => setRevision({ v, resultado: 'confirmada' })}
                    className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700"
                  >
                    Identidad confirmada
                  </button>
                  <button
                    onClick={() => setRevision({ v, resultado: 'suplantacion' })}
                    className="rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    Suplantación
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <Modal
        isOpen={!!revision}
        onClose={() => { if (!guardando) setRevision(null) }}
        title={revision?.resultado === 'suplantacion' ? 'Registrar suplantación' : 'Confirmar identidad'}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {revision?.resultado === 'suplantacion'
              ? 'El contrato se cancela y queda registrado quién lo decidió y por qué.'
              : 'Queda registrado quién confirmó la identidad, cuándo y cómo.'}
          </p>
          <div>
            <label htmlFor="nota-identidad" className="mb-1 block text-sm font-medium text-gray-700">
              Cómo verificaste la identidad <span className="text-red-500">*</span>
            </label>
            <textarea
              id="nota-identidad"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              disabled={guardando}
              placeholder="Por ejemplo: videollamada con la cédula en mano (mínimo 10 caracteres)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-2">
            <button
              type="button"
              onClick={() => setRevision(null)}
              disabled={guardando}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => { void handleRevisar() }}
              disabled={guardando || nota.trim().length < 10}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                revision?.resultado === 'suplantacion' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              {guardando ? 'Guardando…' : revision?.resultado === 'suplantacion' ? 'Cancelar el contrato' : 'Confirmar identidad'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
