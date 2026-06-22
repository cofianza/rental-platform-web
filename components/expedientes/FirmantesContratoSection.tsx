'use client'

/**
 * Panel de progreso de firma multi-parte de un contrato.
 * Muestra las partes (arrendatario / arrendador / Cofianza) en su orden de
 * firma, con el estado de cada una. Si el contrato no tiene firmantes
 * (flujo de un solo firmante / firma multi-parte desactivada), no renderiza
 * nada.
 */

import { useEffect, useState, useCallback } from 'react'
import { IconLoader, IconUser, IconBuilding2, IconShieldCheck, IconCheck, IconClock } from '@/components/icons'
import { firmaService } from '@/services/firmaService'
import { formatDateTime } from '@/lib/constants'
import type { IContratoFirmante, RolFirmante, EstadoSolicitudFirma } from '@/types/firma'

const ROL_META: Record<RolFirmante, { label: string; icon: typeof IconUser }> = {
  arrendatario: { label: 'Arrendatario', icon: IconUser },
  arrendador: { label: 'Arrendador', icon: IconBuilding2 },
  cofianza: { label: 'Cofianza', icon: IconShieldCheck },
}

const ESTADO_STYLES: Record<EstadoSolicitudFirma, { label: string; bg: string; text: string }> = {
  pendiente: { label: 'Pendiente', bg: 'bg-gray-100', text: 'text-gray-700' },
  enviado: { label: 'Enviado', bg: 'bg-blue-100', text: 'text-blue-700' },
  abierto: { label: 'Abierto', bg: 'bg-amber-100', text: 'text-amber-700' },
  otp_validado: { label: 'OTP validado', bg: 'bg-purple-100', text: 'text-purple-700' },
  firmado: { label: 'Firmado', bg: 'bg-green-100', text: 'text-green-700' },
  expirado: { label: 'Expirado', bg: 'bg-red-100', text: 'text-red-700' },
  cancelado: { label: 'Cancelado', bg: 'bg-slate-100', text: 'text-slate-700' },
}

export function FirmantesContratoSection({ contratoId }: { contratoId: string }) {
  const [firmantes, setFirmantes] = useState<IContratoFirmante[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const cargar = useCallback(async () => {
    setIsLoading(true)
    try {
      setFirmantes(await firmaService.listarFirmantes(contratoId))
    } catch {
      // Silencioso: si el contrato no es multi-parte, no hay panel que mostrar.
      setFirmantes([])
    } finally {
      setIsLoading(false)
    }
  }, [contratoId])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Sin firmantes registrados → flujo de un solo firmante: no mostramos nada.
  if (!isLoading && firmantes.length === 0) return null

  const firmados = firmantes.filter((f) => f.estado === 'firmado').length

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Firmantes del contrato</h4>
        {!isLoading && (
          <span className="text-xs text-gray-500">
            {firmados}/{firmantes.length} firmaron
          </span>
        )}
      </div>

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
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                    {f.orden}
                  </span>
                  <span className={`flex-shrink-0 ${firmado ? 'text-green-600' : 'text-gray-400'}`}>
                    {firmado ? <IconCheck size={16} /> : <Icon size={16} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {meta?.label ?? f.rol_firmante}
                      <span className="font-normal text-gray-500"> · {f.nombre}</span>
                    </p>
                    {f.firmado_en && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <IconClock size={11} /> {formatDateTime(f.firmado_en)}
                      </p>
                    )}
                  </div>
                </div>
                <span className={`inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${estado.bg} ${estado.text}`}>
                  {estado.label}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
