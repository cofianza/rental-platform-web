'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { IconX, IconLoader, IconDownload, IconShieldCheck, IconMapPin, IconClock, IconGlobe } from '@/components/icons'
import { firmaService } from '@/services/firmaService'
import { formatDateTime } from '@/lib/constants'
import type { IEvidenciaFirma } from '@/types/firma'

interface EvidenciaFirmaModalProps {
  isOpen: boolean
  onClose: () => void
  solicitudId: string
  nombreFirmante: string
}

export function EvidenciaFirmaModal({ isOpen, onClose, solicitudId, nombreFirmante }: EvidenciaFirmaModalProps) {
  const [evidencia, setEvidencia] = useState<IEvidenciaFirma | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setIsLoading(true)
    setError(null)
    firmaService.getEvidencia(solicitudId)
      .then(setEvidencia)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error al cargar evidencia')
      })
      .finally(() => setIsLoading(false))
  }, [isOpen, solicitudId])

  async function handleDownloadAcuse() {
    setIsDownloading(true)
    try {
      const result = await firmaService.downloadAcuse(solicitudId)
      window.open(result.url, '_blank')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al descargar acuse'
      toast.error(message)
    } finally {
      setIsDownloading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <IconShieldCheck size={16} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Evidencia de Firma</h3>
              <p className="text-xs text-gray-500">{nombreFirmante}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
            <IconX size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <IconLoader size={24} className="animate-spin text-primary-600" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {evidencia && !isLoading && (
            <div className="space-y-4">
              {/* Timestamps */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fechas</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <IconClock size={12} /> OTP verificado
                    </p>
                    <p className="text-sm font-medium text-gray-900">{formatDateTime(evidencia.otp_verificado_en)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <IconClock size={12} /> Firmado
                    </p>
                    <p className="text-sm font-medium text-gray-900">{formatDateTime(evidencia.firmado_en)}</p>
                  </div>
                </div>
              </div>

              {/* Network info */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Red</h4>
                <div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <IconGlobe size={12} /> Dirección IP
                  </p>
                  <p className="text-sm font-mono text-gray-900">{evidencia.ip_firmante}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">User Agent</p>
                  <p className="text-xs font-mono text-gray-700 break-all">{evidencia.user_agent}</p>
                </div>
              </div>

              {/* Geolocation */}
              {(evidencia.geo_latitud != null || evidencia.geo_longitud != null) && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <IconMapPin size={12} /> Geolocalización
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Latitud</p>
                      <p className="text-sm font-mono text-gray-900">{evidencia.geo_latitud}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Longitud</p>
                      <p className="text-sm font-mono text-gray-900">{evidencia.geo_longitud}</p>
                    </div>
                    {evidencia.geo_precision != null && (
                      <div>
                        <p className="text-xs text-gray-500">Precisión</p>
                        <p className="text-sm font-mono text-gray-900">{evidencia.geo_precision}m</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Document hash */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Integridad del Documento</h4>
                <div>
                  <p className="text-xs text-gray-500">Hash SHA-256</p>
                  <p className="text-xs font-mono text-gray-700 break-all select-all">{evidencia.hash_documento}</p>
                </div>
              </div>

              {/* Signature image */}
              {evidencia.firma_imagen_url && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Imagen de Firma</h4>
                  <div className="bg-white border border-gray-200 rounded-lg p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={evidencia.firma_imagen_url}
                      alt="Firma del firmante"
                      className="max-h-32 mx-auto"
                    />
                  </div>
                </div>
              )}

              {/* Acuse PDF download */}
              {evidencia.tiene_acuse && (
                <button
                  onClick={handleDownloadAcuse}
                  disabled={isDownloading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isDownloading ? (
                    <IconLoader size={16} className="animate-spin" />
                  ) : (
                    <IconDownload size={16} />
                  )}
                  Descargar Acuse PDF
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
