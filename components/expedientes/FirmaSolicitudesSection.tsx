'use client'

import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { IconMail, IconLoader, IconX, IconClock, IconCheck, IconEye } from '@/components/icons'
import { EnviarFirmaModal } from './EnviarFirmaModal'
import { firmaService } from '@/services/firmaService'
import { formatDateTime } from '@/lib/constants'
import type { ISolicitudFirma, EstadoSolicitudFirma } from '@/types/firma'
import type { Bloqueo } from '@/types/contratoV3'
import { Skeleton } from '@/components/ui/Skeleton'

const ESTADO_STYLES: Record<EstadoSolicitudFirma, { label: string; bg: string; text: string }> = {
  pendiente: { label: 'Pendiente', bg: 'bg-gray-100', text: 'text-gray-700' },
  enviado: { label: 'Enviado', bg: 'bg-blue-100', text: 'text-blue-700' },
  abierto: { label: 'Abierto', bg: 'bg-amber-100', text: 'text-amber-700' },
  otp_validado: { label: 'Código verificado', bg: 'bg-purple-100', text: 'text-purple-700' },
  firmado: { label: 'Firmado', bg: 'bg-green-100', text: 'text-green-700' },
  expirado: { label: 'Expirado', bg: 'bg-red-100', text: 'text-red-700' },
  cancelado: { label: 'Cancelado', bg: 'bg-slate-100', text: 'text-slate-700' },
  bloqueado: { label: 'Bloqueado', bg: 'bg-amber-100', text: 'text-amber-800' },
}

interface FirmaSolicitudesSectionProps {
  contratoId: string
  estadoContrato: string
  canManage: boolean
  defaultNombre?: string
  defaultEmail?: string
  defaultTelefono?: string
  /** Se pasa a EnviarFirmaModal: la evaluación ya no alcanza para firmar. */
  onEvaluacionVencida?: (bloqueo: Bloqueo) => void
}

export function FirmaSolicitudesSection({
  contratoId,
  estadoContrato,
  canManage,
  defaultNombre = '',
  defaultEmail = '',
  defaultTelefono = '',
  onEvaluacionVencida,
}: FirmaSolicitudesSectionProps) {
  const [solicitudes, setSolicitudes] = useState<ISolicitudFirma[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [enviarOpen, setEnviarOpen] = useState(false)
  const [reenviandoId, setReenviandoId] = useState<string | null>(null)
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)
  const [reenviarTarget, setReenviarTarget] = useState<ISolicitudFirma | null>(null)
  // Email destino del reenvío — prellenado con el del firmante y corregible
  // en el modal (antes era solo lectura y un email mal escrito no tenía arreglo).
  const [reenviarEmail, setReenviarEmail] = useState('')
  const [reenviarError, setReenviarError] = useState<string | null>(null)

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

  async function handleReenviarConfirmed() {
    if (!reenviarTarget || reenviandoId) return
    const emailNuevo = reenviarEmail.trim().toLowerCase()
    if (!emailNuevo || !/.+@.+\..+/.test(emailNuevo)) {
      setReenviarError('Escriba un correo válido para reenviar.')
      return
    }
    setReenviarError(null)
    const id = reenviarTarget.id
    // Solo mandamos email_alternativo si difiere del registrado — así el
    // backend hace un reenvío simple cuando no cambió, y re-emite la
    // solicitud al nuevo firmante cuando sí.
    const original = (reenviarTarget.email_firmante ?? '').toLowerCase()
    const options = emailNuevo !== original ? { email_alternativo: emailNuevo } : undefined
    // El diálogo sigue abierto (con «Reenviando…») hasta que la lista se recarga.
    setReenviandoId(id)
    try {
      await firmaService.reenviarSolicitud(id, options)
      toast.success(`Solicitud reenviada a ${emailNuevo}`)
      await fetchSolicitudes()
      setReenviarTarget(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo reenviar la solicitud.'
      setReenviarError(message)
    } finally {
      setReenviandoId(null)
    }
  }

  const [cancelarTarget, setCancelarTarget] = useState<ISolicitudFirma | null>(null)

  async function handleCancelar(id: string) {
    setCancelandoId(id)
    try {
      await firmaService.cancelarSolicitud(id)
      toast.success('Solicitud cancelada')
      await fetchSolicitudes()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cancelar'
      toast.error(message)
    } finally {
      setCancelandoId(null)
    }
  }

  const canSendFirma = canManage && estadoContrato === 'pendiente_firma'

  // Solo la primera carga: al refrescar se sigue viendo lo que ya estaba.
  if (isLoading && solicitudes.length === 0) {
    return (
      <div role="status" className="space-y-2">
        <span className="sr-only">Cargando firmas…</span>
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <ConfirmDialog
        isOpen={!!cancelarTarget}
        onClose={() => setCancelarTarget(null)}
        onConfirm={async () => {
          if (cancelarTarget) await handleCancelar(cancelarTarget.id)
          setCancelarTarget(null)
        }}
        title="¿Cancelar esta solicitud de firma?"
        message={`El enlace enviado a ${cancelarTarget?.email_firmante ?? 'el firmante'} dejará de funcionar.`}
        confirmLabel="Sí, cancelar"
        cancelLabel="Volver"
        variant="danger"
        isLoading={!!cancelandoId}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-base font-semibold text-gray-900">
          Solicitudes de firma <span className="font-normal text-gray-600 tabular-nums">({solicitudes.length})</span>
        </h4>
        {canSendFirma && (
          <button
            type="button"
            onClick={() => setEnviarOpen(true)}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 bg-primary-700 text-white hover:bg-primary-800"
          >
            <IconMail size={16} />
            Enviar a firma
          </button>
        )}
      </div>

      {solicitudes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-6 text-center">
          <p className="text-sm font-medium text-gray-700">No hay solicitudes de firma</p>
          {canSendFirma && (
            <p className="text-xs text-gray-600 mt-1">
              Envíe un enlace seguro al firmante para que revise y firme el contrato
            </p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {solicitudes.map((s) => {
            const style = ESTADO_STYLES[s.estado]
            const isActive = !['firmado', 'expirado', 'cancelado'].includes(s.estado)
            return (
              <li
                key={s.id}
                className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
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
                  <p className="text-xs text-gray-600 truncate">{s.email_firmante}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-600">
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

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {isActive && canManage && (
                    <>
                      <button
                        onClick={() => {
                          setReenviarEmail(s.email_firmante ?? '')
                          setReenviarError(null)
                          setReenviarTarget(s)
                        }}
                        disabled={reenviandoId === s.id || s.envios_realizados >= s.max_envios}
                        type="button"
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      >
                        {reenviandoId === s.id ? <IconLoader size={16} className="animate-spin" /> : <IconMail size={16} />}
                        Reenviar enlace
                      </button>
                      <button
                        onClick={() => setCancelarTarget(s)}
                        disabled={cancelandoId === s.id}
                        type="button"
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 text-red-700 hover:bg-red-50"
                      >
                        {cancelandoId === s.id ? <IconLoader size={16} className="animate-spin" /> : <IconX size={16} />}
                        Cancelar solicitud
                      </button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <EnviarFirmaModal
        isOpen={enviarOpen}
        onClose={() => setEnviarOpen(false)}
        contratoId={contratoId}
        onSuccess={fetchSolicitudes}
        defaultNombre={defaultNombre}
        defaultEmail={defaultEmail}
        defaultTelefono={defaultTelefono}
        onEvaluacionVencida={onEvaluacionVencida}
      />

      {/* Confirmación del reenvío */}
      {reenviarTarget && (
        <Modal
          isOpen
          onClose={reenviandoId ? () => {} : () => setReenviarTarget(null)}
          title="Reenviar enlace de firma"
          description="El enlace anterior quedará invalidado por seguridad: el firmante deberá usar el nuevo."
          size="sm"
          closeOnBackdrop={false}
          footer={
            <div className="space-y-2">
              {reenviarError && (
                <p id="reenviar-firma-error" role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {reenviarError}
                </p>
              )}
              <ModalAcciones>
                <button type="button" onClick={() => setReenviarTarget(null)} disabled={!!reenviandoId} className={botonModal('secondary')}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="reenviar-firma-form"
                  disabled={!!reenviandoId}
                  aria-busy={!!reenviandoId || undefined}
                  className={botonModal('primary')}
                >
                  {reenviandoId ? <IconLoader size={16} className="animate-spin" /> : <IconMail size={16} />}
                  {reenviandoId ? 'Reenviando…' : 'Reenviar enlace'}
                </button>
              </ModalAcciones>
            </div>
          }
        >
          <form
            id="reenviar-firma-form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              void handleReenviarConfirmed()
            }}
            className="space-y-4"
          >
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-gray-500">Firmante</dt>
              <dd className="min-w-0 break-words font-medium text-gray-900">{reenviarTarget.nombre_firmante}</dd>
              <dt className="text-gray-500">Envíos</dt>
              <dd className="font-medium tabular-nums text-gray-900">
                {reenviarTarget.envios_realizados} de {reenviarTarget.max_envios}
              </dd>
            </dl>
            <div>
              <label htmlFor="firma-solicitudes-section-correo-destino" className="block text-sm font-medium text-gray-700 mb-1">
                Correo de destino <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <input
                id="firma-solicitudes-section-correo-destino"
                type="email"
                value={reenviarEmail}
                onChange={(e) => {
                  setReenviarEmail(e.target.value)
                  setReenviarError(null)
                }}
                placeholder="correo@ejemplo.com"
                required
                disabled={!!reenviandoId}
                aria-invalid={!!reenviarError || undefined}
                aria-describedby={reenviarError ? 'reenviar-firma-error firma-correo-ayuda' : 'firma-correo-ayuda'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p id="firma-correo-ayuda" className="mt-1 text-xs text-gray-600">
                Corríjalo si estaba mal escrito.
              </p>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
