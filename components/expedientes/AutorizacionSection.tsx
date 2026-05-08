/**
 * AutorizacionSection — Estado de autorizacion habeas data en el expediente
 * 4 estados visuales: sin autorizacion, pendiente, autorizado, revocado/expirado
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconShield, IconMail, IconCheck, IconClock, IconLoader, IconAlertTriangle } from '@/components/icons'
import { autorizacionService } from '@/services/autorizacionService'
import type { IAutorizacion } from '@/types/autorizacion'

interface AutorizacionSectionProps {
  expedienteId: string
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const METODO_LABELS: Record<string, string> = {
  canvas: 'Firma manuscrita digital',
  otp: 'Verificación por código OTP',
}

export function AutorizacionSection({ expedienteId }: AutorizacionSectionProps) {
  const [autorizacion, setAutorizacion] = useState<IAutorizacion | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showRevocar, setShowRevocar] = useState(false)
  const [revocarMotivo, setRevocarMotivo] = useState('')
  const [revocando, setRevocando] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const data = await autorizacionService.getStatus(expedienteId)
      setAutorizacion(data)
    } catch {
      // silent — section just won't show data
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleEnviarEnlace = async () => {
    setSending(true)
    try {
      const result = await autorizacionService.enviarEnlace(expedienteId)
      toast.success('Enlace de autorizacion enviado al arrendatario')
      setAutorizacion({
        id: result.id,
        estado: 'pendiente',
        canal: 'enlace',
        metodo_firma: null,
        autorizado_en: null,
        hash_documento: null,
        fecha_revocacion: null,
        motivo_revocacion: null,
        token_expiracion: result.token_expiracion,
        created_at: new Date().toISOString(),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al enviar enlace'
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  const handleRevocar = async () => {
    if (revocarMotivo.length < 10) {
      toast.error('El motivo debe tener al menos 10 caracteres')
      return
    }
    setRevocando(true)
    try {
      await autorizacionService.revocar(expedienteId, { motivo: revocarMotivo })
      toast.success('Autorización revocada')
      setShowRevocar(false)
      setRevocarMotivo('')
      fetchStatus()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al revocar'
      toast.error(msg)
    } finally {
      setRevocando(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-gray-400">
          <IconLoader size={16} className="animate-spin" />
          <span className="text-sm">Cargando autorizacion...</span>
        </div>
      </div>
    )
  }

  const estado = autorizacion?.estado

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <IconShield size={20} className="text-primary-600" />
          <h3 className="text-base font-semibold text-gray-900">Autorización Habeas Data</h3>
        </div>
        {estado && <Badge estado={estado} />}
      </div>

      {/* Sin autorizacion */}
      {!autorizacion && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            El arrendatario debe autorizar la consulta en centrales de riesgo antes de crear un estudio.
          </p>
          <button
            onClick={handleEnviarEnlace}
            disabled={sending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {sending ? (
              <IconLoader size={16} className="animate-spin" />
            ) : (
              <IconMail size={16} />
            )}
            Enviar autorizacion al arrendatario
          </button>
        </div>
      )}

      {/* Pendiente */}
      {estado === 'pendiente' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <IconClock size={18} className="text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Esperando firma del arrendatario</p>
              <p className="text-xs text-yellow-600 mt-1">
                Enlace enviado el {formatDate(autorizacion?.created_at)}.
                {autorizacion?.token_expiracion && (
                  <> Expira el {formatDate(autorizacion.token_expiracion)}.</>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={handleEnviarEnlace}
            disabled={sending}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 disabled:opacity-50"
          >
            {sending ? (
              <IconLoader size={14} className="animate-spin" />
            ) : (
              <IconMail size={14} />
            )}
            Reenviar enlace
          </button>
        </div>
      )}

      {/* Autorizado */}
      {estado === 'autorizado' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
            <IconCheck size={18} className="text-green-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-green-800">
                Autorizado el {formatDate(autorizacion?.autorizado_en)}
              </p>
              {autorizacion?.metodo_firma && (
                <p className="text-xs text-green-600">
                  Metodo: {METODO_LABELS[autorizacion.metodo_firma] || autorizacion.metodo_firma}
                </p>
              )}
              {autorizacion?.hash_documento && (
                <p className="text-xs text-green-600 font-mono truncate max-w-xs" title={autorizacion.hash_documento}>
                  Hash: {autorizacion.hash_documento.slice(0, 16)}...
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowRevocar(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
          >
            <IconAlertTriangle size={14} />
            Revocar autorizacion
          </button>

          {/* Revocar dialog */}
          {showRevocar && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-red-800">Motivo de revocacion:</p>
              <textarea
                value={revocarMotivo}
                onChange={(e) => setRevocarMotivo(e.target.value)}
                placeholder="Ingresa el motivo de la revocación (mín. 10 caracteres)"
                rows={3}
                className="w-full rounded-lg border border-red-300 p-2 text-sm focus:ring-red-500 focus:border-red-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleRevocar}
                  disabled={revocando || revocarMotivo.length < 10}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {revocando && <IconLoader size={14} className="animate-spin" />}
                  Confirmar revocación
                </button>
                <button
                  onClick={() => { setShowRevocar(false); setRevocarMotivo('') }}
                  className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Revocado */}
      {estado === 'revocado' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
            <IconAlertTriangle size={18} className="text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Autorización revocada</p>
              {autorizacion?.motivo_revocacion && (
                <p className="text-xs text-red-600 mt-1">Motivo: {autorizacion.motivo_revocacion}</p>
              )}
              <p className="text-xs text-red-500 mt-1">
                Revocada el {formatDate(autorizacion?.fecha_revocacion)}
              </p>
            </div>
          </div>
          <button
            onClick={handleEnviarEnlace}
            disabled={sending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {sending ? (
              <IconLoader size={16} className="animate-spin" />
            ) : (
              <IconMail size={16} />
            )}
            Enviar nueva autorizacion
          </button>
        </div>
      )}

      {/* Expirado */}
      {estado === 'expirado' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <IconClock size={18} className="text-gray-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">El enlace de autorizacion ha expirado</p>
              <p className="text-xs text-gray-500 mt-1">
                Enviado el {formatDate(autorizacion?.created_at)}
              </p>
            </div>
          </div>
          <button
            onClick={handleEnviarEnlace}
            disabled={sending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {sending ? (
              <IconLoader size={16} className="animate-spin" />
            ) : (
              <IconMail size={16} />
            )}
            Enviar nueva autorizacion
          </button>
        </div>
      )}
    </div>
  )
}
