/**
 * EnviarFirmaPreviewModal (tarea 4.3) — pre-chequeo antes de enviar a firma.
 *
 * Muestra los firmantes derivados del expediente con el número al que le llega
 * SU código (OTP) por WhatsApp, y bloquea el envío si dos firmantes comparten
 * número o si a alguno le faltan datos. Así el gestor ve, ANTES de enviar, a
 * qué firmante corresponde cada celular (evita la confusión del reporte 4.3).
 */

'use client'

import { IconX, IconLoader, IconWhatsapp, IconAlertTriangle, IconUser, IconBuilding2, IconShieldCheck } from '@/components/icons'
import type { IFirmantePreview, RolFirmante } from '@/types/firma'

const ROL_META: Record<RolFirmante, { label: string; icon: typeof IconUser }> = {
  arrendatario: { label: 'Arrendatario', icon: IconUser },
  arrendador: { label: 'Arrendador', icon: IconBuilding2 },
  cofianza: { label: 'Cofianza', icon: IconShieldCheck },
}

interface Props {
  isOpen: boolean
  firmantes: IFirmantePreview[]
  puedeEnviar: boolean
  submitting: boolean
  onConfirm: () => void
  onClose: () => void
}

export function EnviarFirmaPreviewModal({ isOpen, firmantes, puedeEnviar, submitting, onConfirm, onClose }: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={submitting ? undefined : onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Enviar a firma</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <p className="text-sm text-gray-600">
            Cada parte recibe <strong>su propio</strong> código de firma por WhatsApp en el número indicado.
            Verifica a quién le llega cada uno antes de enviar.
          </p>

          {!puedeEnviar && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              <IconAlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                No se puede enviar todavía: hay firmantes con el <strong>mismo número</strong> o con datos
                faltantes. Cada parte necesita un número de WhatsApp distinto. Corrige los teléfonos en el
                expediente (arrendatario) o en el perfil de la inmobiliaria/Cofianza y vuelve a intentar.
              </span>
            </div>
          )}

          <ul className="space-y-2">
            {firmantes.map((f) => {
              const meta = ROL_META[f.rol_firmante]
              const Icon = meta?.icon ?? IconUser
              const problema = f.duplicado || f.falta_datos
              return (
                <li
                  key={f.rol_firmante}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${problema ? 'border-red-200 bg-red-50/40' : 'border-gray-100'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`shrink-0 ${problema ? 'text-red-500' : 'text-gray-400'}`}>
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {meta?.label ?? f.rol_firmante}
                        <span className="font-normal text-gray-500"> · {f.nombre}</span>
                      </p>
                      {f.auto ? (
                        <p className="text-xs text-gray-400">Firma automática (sello institucional) — no requiere número</p>
                      ) : (
                        <p className={`text-xs flex items-center gap-1 truncate ${problema ? 'text-red-700' : 'text-gray-500'}`}>
                          <IconWhatsapp size={11} className="text-green-600 shrink-0" />
                          <span className="truncate">
                            {f.telefono ? <>Su código llega a <span className="font-medium">{f.telefono}</span></> : 'Sin teléfono'}
                            {f.duplicado && ' · repetido'}
                            {f.falta_datos && !f.telefono && ' · falta teléfono'}
                            {f.falta_datos && f.telefono && !f.email && ' · falta correo'}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting || !puedeEnviar}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            title={!puedeEnviar ? 'Corrige los números repetidos o faltantes antes de enviar' : undefined}
          >
            {submitting && <IconLoader size={16} className="animate-spin" />}
            {submitting ? 'Enviando…' : 'Confirmar y enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}
