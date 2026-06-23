'use client'

/**
 * Panel de progreso de firma multi-parte de un contrato.
 * Muestra las partes (arrendatario / arrendador / Cofianza) en su orden de
 * firma, con el estado de cada una, una barra de progreso y auto-refresco
 * mientras haya firmas pendientes (se actualiza solo cuando llega el webhook de
 * Auco). Si el contrato no tiene firmantes (flujo de un solo firmante / firma
 * multi-parte desactivada), no renderiza nada.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { IconLoader, IconUser, IconBuilding2, IconShieldCheck, IconCheck, IconClock, IconRefresh, IconWhatsapp, IconMail } from '@/components/icons'
import { firmaService } from '@/services/firmaService'
import { formatDateTime } from '@/lib/constants'
import type { IContratoFirmante, ISolicitudFirma, RolFirmante, EstadoSolicitudFirma } from '@/types/firma'

const ROL_META: Record<RolFirmante, { label: string; icon: typeof IconUser }> = {
  arrendatario: { label: 'Arrendatario', icon: IconUser },
  arrendador: { label: 'Arrendador', icon: IconBuilding2 },
  cofianza: { label: 'Cofianza', icon: IconShieldCheck },
}

const ESTADO_STYLES: Record<EstadoSolicitudFirma, { label: string; bg: string; text: string }> = {
  pendiente: { label: 'Pendiente', bg: 'bg-gray-100', text: 'text-gray-700' },
  enviado: { label: 'Enviado · esperando firma', bg: 'bg-blue-100', text: 'text-blue-700' },
  abierto: { label: 'Abrió el enlace', bg: 'bg-amber-100', text: 'text-amber-700' },
  otp_validado: { label: 'OTP validado', bg: 'bg-purple-100', text: 'text-purple-700' },
  firmado: { label: 'Firmado', bg: 'bg-green-100', text: 'text-green-700' },
  expirado: { label: 'Expirado', bg: 'bg-red-100', text: 'text-red-700' },
  cancelado: { label: 'Rechazado', bg: 'bg-red-100', text: 'text-red-700' },
}

// Cada cuánto re-consultamos el estado de las firmas mientras haya pendientes.
const POLL_MS = 15000

export function FirmantesContratoSection({
  contratoId,
  canManage = false,
  onAllSigned,
  onFirmantesLoaded,
}: {
  contratoId: string
  /** Habilita el botón "Enviar recordatorio" (inmobiliaria/propietario/admin). */
  canManage?: boolean
  /** Se dispara (una vez) cuando todas las partes quedan firmadas, para que el
   *  padre refresque el estado del contrato (badge "Enviado a Firma" → "Firmado"). */
  onAllSigned?: () => void
  /** Reporta al padre cuántos firmantes multi-parte tiene el contrato (0 = flujo
   *  de un solo firmante). El padre lo usa para ocultar la sección legacy
   *  "Solicitudes de Firma" cuando hay multi-parte. */
  onFirmantesLoaded?: (total: number) => void
}) {
  const [firmantes, setFirmantes] = useState<IContratoFirmante[]>([])
  // Solicitud-sobre activa del contrato: la usamos para mandar el recordatorio.
  // Auco re-notifica a las partes pendientes (no crea documento → SIN costo).
  const [solicitud, setSolicitud] = useState<ISolicitudFirma | null>(null)
  const [enviandoRecordatorio, setEnviandoRecordatorio] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // El callback del padre puede cambiar de identidad en cada render; lo guardamos
  // en ref para no meterlo en deps de `cargar` (evitaría loops de refetch).
  const onFirmantesLoadedRef = useRef(onFirmantesLoaded)
  onFirmantesLoadedRef.current = onFirmantesLoaded

  // `silencioso` = no mostramos el spinner grande (para el auto-poll y el botón).
  const cargar = useCallback(async (silencioso = false) => {
    if (silencioso) setRefreshing(true)
    else setIsLoading(true)
    try {
      const [fs, sols] = await Promise.all([
        firmaService.listarFirmantes(contratoId),
        firmaService.listarPorContrato(contratoId).catch(() => [] as ISolicitudFirma[]),
      ])
      setFirmantes(fs)
      onFirmantesLoadedRef.current?.(fs.length)
      // Sobre aún en proceso (no firmado/expirado/cancelado) → recordable.
      setSolicitud(sols.find((s) => !['firmado', 'expirado', 'cancelado'].includes(s.estado)) ?? null)
    } catch {
      // Silencioso: si el contrato no es multi-parte, no hay panel que mostrar.
      if (!silencioso) {
        setFirmantes([])
        onFirmantesLoadedRef.current?.(0)
      }
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [contratoId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const firmados = firmantes.filter((f) => f.estado === 'firmado').length
  const total = firmantes.length
  const todasFirmaron = total > 0 && firmados === total
  const pendientes = total > 0 && !todasFirmaron

  // Auto-refresco mientras haya firmas pendientes: cuando llega el webhook de
  // Auco, la BD cambia y el panel se actualiza solo sin recargar la página.
  const pendientesRef = useRef(pendientes)
  pendientesRef.current = pendientes
  useEffect(() => {
    if (!pendientes) return
    const id = setInterval(() => {
      if (pendientesRef.current) cargar(true)
    }, POLL_MS)
    return () => clearInterval(id)
  }, [pendientes, cargar])

  // Cuando todas firman, avisamos al padre (una vez) para que refresque el
  // estado del contrato.
  const allSignedFiredRef = useRef(false)
  useEffect(() => {
    if (todasFirmaron && !allSignedFiredRef.current) {
      allSignedFiredRef.current = true
      onAllSigned?.()
    }
  }, [todasFirmaron, onAllSigned])

  const handleRecordatorio = async () => {
    if (!solicitud) return
    setEnviandoRecordatorio(true)
    try {
      // reenviarSolicitud → Auco sendReminder sobre el sobre ya creado: recuerda
      // a las partes pendientes. NO crea documento, así que NO gasta créditos.
      await firmaService.reenviarSolicitud(solicitud.id)
      toast.success('Recordatorio enviado a las partes pendientes')
      cargar(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar el recordatorio')
    } finally {
      setEnviandoRecordatorio(false)
    }
  }
  const recordatoriosAgotados = !!solicitud && solicitud.envios_realizados >= solicitud.max_envios

  // Sin firmantes registrados → flujo de un solo firmante: no mostramos nada.
  if (!isLoading && total === 0) return null

  const pct = total > 0 ? Math.round((firmados / total) * 100) : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900">Firmantes del contrato</h4>
        <div className="flex items-center gap-2">
          {!isLoading && (
            <span className={`text-xs font-medium ${todasFirmaron ? 'text-green-700' : 'text-gray-500'}`}>
              {firmados}/{total} firmaron
            </span>
          )}
          {canManage && !isLoading && pendientes && solicitud && (
            <button
              onClick={handleRecordatorio}
              disabled={enviandoRecordatorio || recordatoriosAgotados}
              className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50"
              title={recordatoriosAgotados ? 'Alcanzaste el máximo de recordatorios' : 'Reenviar recordatorio a las partes pendientes (sin costo de Auco)'}
            >
              {enviandoRecordatorio ? <IconLoader size={12} className="animate-spin" /> : <IconMail size={12} />}
              Recordatorio
            </button>
          )}
          <button
            onClick={() => cargar(true)}
            disabled={refreshing || isLoading}
            className="p-1 text-gray-400 hover:text-primary-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
            title="Actualizar estado de firmas"
          >
            <IconRefresh size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Barra de progreso */}
      {!isLoading && total > 0 && (
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${todasFirmaron ? 'bg-green-500' : 'bg-primary-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {todasFirmaron && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
          <IconCheck size={16} /> Todas las partes firmaron el contrato.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <IconLoader size={20} className="animate-spin text-primary-600" />
        </div>
      ) : (
        <ol className="space-y-2">
          {firmantes.map((f) => {
            const meta = ROL_META[f.rol_firmante]
            const Icon = meta?.icon ?? IconUser
            const estado = ESTADO_STYLES[f.estado] ?? ESTADO_STYLES.pendiente
            const firmado = f.estado === 'firmado'
            return (
              <li
                key={f.id}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${firmado ? 'border-green-200 bg-green-50/40' : 'border-gray-100'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${firmado ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {firmado ? <IconCheck size={14} /> : f.orden}
                  </span>
                  <span className={`shrink-0 ${firmado ? 'text-green-600' : 'text-gray-400'}`}>
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {meta?.label ?? f.rol_firmante}
                      <span className="font-normal text-gray-500"> · {f.nombre}</span>
                    </p>
                    {f.telefono && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                        <IconWhatsapp size={11} className="text-green-600 shrink-0" />
                        <span className="truncate">{firmado ? 'Firmó vía' : 'Le llega a'} {f.telefono}</span>
                      </p>
                    )}
                    {f.firmado_en ? (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <IconClock size={11} /> Firmó el {formatDateTime(f.firmado_en)}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 truncate">{f.email}</p>
                    )}
                  </div>
                </div>
                <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${estado.bg} ${estado.text}`}>
                  {estado.label}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      {pendientes && !isLoading && (
        <p className="mt-3 text-xs text-gray-400">
          Se actualiza solo cuando cada parte firma. También puedes refrescar con ↻.
        </p>
      )}
    </div>
  )
}
