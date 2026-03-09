'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { IconMail, IconLoader, IconX, IconClock, IconCheck, IconEye } from '@/components/icons'
import { EnviarFirmaModal } from './EnviarFirmaModal'
import { firmaService } from '@/services/firmaService'
import { formatDateTime } from '@/lib/constants'
import type { ISolicitudFirma, EstadoSolicitudFirma } from '@/types/firma'

const ESTADO_STYLES: Record<EstadoSolicitudFirma, { label: string; bg: string; text: string }> = {
  pendiente: { label: 'Pendiente', bg: 'bg-gray-100', text: 'text-gray-700' },
  enviado: { label: 'Enviado', bg: 'bg-blue-100', text: 'text-blue-700' },
  abierto: { label: 'Abierto', bg: 'bg-amber-100', text: 'text-amber-700' },
  otp_validado: { label: 'OTP Validado', bg: 'bg-purple-100', text: 'text-purple-700' },
  firmado: { label: 'Firmado', bg: 'bg-green-100', text: 'text-green-700' },
  expirado: { label: 'Expirado', bg: 'bg-red-100', text: 'text-red-700' },
  cancelado: { label: 'Cancelado', bg: 'bg-slate-100', text: 'text-slate-700' },
}

interface FirmaSolicitudesSectionProps {
  contratoId: string
  estadoContrato: string
  canManage: boolean
  defaultNombre?: string
  defaultEmail?: string
  defaultTelefono?: string
}

export function FirmaSolicitudesSection({
  contratoId,
  estadoContrato,
  canManage,
  defaultNombre = '',
  defaultEmail = '',
  defaultTelefono = '',
}: FirmaSolicitudesSectionProps) {
  const [solicitudes, setSolicitudes] = useState<ISolicitudFirma[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [enviarOpen, setEnviarOpen] = useState(false)
  const [reenviandoId, setReenviandoId] = useState<string | null>(null)
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)

  const fetchSolicitudes = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await firmaService.listarPorContrato(contratoId)
      setSolicitudes(data)
    } catch {
      // silently fail — section is secondary
    } finally {
      setIsLoading(false)
    }
  }, [contratoId])

  useEffect(() => {
    fetchSolicitudes()
  }, [fetchSolicitudes])

  async function handleReenviar(id: string) {
    setReenviandoId(id)
    try {
      await firmaService.reenviarSolicitud(id)
      toast.success('Solicitud reenviada correctamente')
      fetchSolicitudes()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al reenviar'
      toast.error(message)
    } finally {
      setReenviandoId(null)
    }
  }

  async function handleCancelar(id: string) {
    setCancelandoId(id)
    try {
      await firmaService.cancelarSolicitud(id)
      toast.success('Solicitud cancelada')
      fetchSolicitudes()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cancelar'
      toast.error(message)
    } finally {
      setCancelandoId(null)
    }
  }

  const canSendFirma = canManage && estadoContrato === 'pendiente_firma'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <IconLoader size={20} className="animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">
          Solicitudes de Firma ({solicitudes.length})
        </h4>
        {canSendFirma && (
          <button
            onClick={() => setEnviarOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            <IconMail size={14} />
            Enviar para firma
          </button>
        )}
      </div>

      {solicitudes.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">No hay solicitudes de firma</p>
          {canSendFirma && (
            <p className="text-xs text-gray-400 mt-1">
              Envía un enlace seguro al firmante para que revise y firme el contrato
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {solicitudes.map((s) => {
            const style = ESTADO_STYLES[s.estado]
            const isActive = !['firmado', 'expirado', 'cancelado'].includes(s.estado)
            return (
              <div
                key={s.id}
                className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {s.nombre_firmante}
                    </p>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{s.email_firmante}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <IconClock size={12} />
                      {formatDateTime(s.created_at)}
                    </span>
                    {s.abierto_en && (
                      <span className="flex items-center gap-1">
                        <IconEye size={12} />
                        Abierto {formatDateTime(s.abierto_en)}
                      </span>
                    )}
                    {s.firmado_en && (
                      <span className="flex items-center gap-1">
                        <IconCheck size={12} />
                        Firmado {formatDateTime(s.firmado_en)}
                      </span>
                    )}
                    <span>Envíos: {s.envios_realizados}/{s.max_envios}</span>
                  </div>
                </div>

                {isActive && canManage && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleReenviar(s.id)}
                      disabled={reenviandoId === s.id || s.envios_realizados >= s.max_envios}
                      className="px-2.5 py-1 text-xs font-medium text-primary-700 bg-primary-50 rounded-md hover:bg-primary-100 disabled:opacity-50"
                      title="Reenviar enlace"
                    >
                      {reenviandoId === s.id ? (
                        <IconLoader size={12} className="animate-spin" />
                      ) : (
                        'Reenviar'
                      )}
                    </button>
                    <button
                      onClick={() => handleCancelar(s.id)}
                      disabled={cancelandoId === s.id}
                      className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
                      title="Cancelar solicitud"
                    >
                      {cancelandoId === s.id ? (
                        <IconLoader size={12} className="animate-spin" />
                      ) : (
                        <IconX size={14} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <EnviarFirmaModal
        isOpen={enviarOpen}
        onClose={() => setEnviarOpen(false)}
        contratoId={contratoId}
        onSuccess={fetchSolicitudes}
        defaultNombre={defaultNombre}
        defaultEmail={defaultEmail}
        defaultTelefono={defaultTelefono}
      />
    </div>
  )
}
