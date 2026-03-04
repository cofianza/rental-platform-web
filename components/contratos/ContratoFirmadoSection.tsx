'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  IconDownload,
  IconShield,
  IconUpload,
  IconLoader,
  IconCheck,
  IconX,
} from '@/components/icons'
import { formatDateTime } from '@/lib/constants'
import { contratoService } from '@/services/contratoService'
import { useAuth } from '@/hooks/useAuth'
import { SubirFirmadoModal } from './SubirFirmadoModal'
import { LogAccesosModal } from './LogAccesosModal'
import type { IContrato, IContratoInfoFirma, IContratoVerificacionIntegridad } from '@/types/contrato'

interface ContratoFirmadoSectionProps {
  contrato: IContrato
  onContratoUpdated: () => void
}

export function ContratoFirmadoSection({ contrato, onContratoUpdated }: ContratoFirmadoSectionProps) {
  const { user } = useAuth()
  const canManage = user?.rol === 'administrador' || user?.rol === 'operador_analista'
  const isAdmin = user?.rol === 'administrador'

  const [subirOpen, setSirOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [infoFirma, setInfoFirma] = useState<IContratoInfoFirma | null>(null)
  const [infoLoading, setInfoLoading] = useState(false)
  const [verificacion, setVerificacion] = useState<IContratoVerificacionIntegridad | null>(null)
  const [verificacionLoading, setVerificacionLoading] = useState(false)

  const tieneFirmado = !!contrato.firmado_storage_key

  async function handleDescargar() {
    setDownloadLoading(true)
    try {
      const result = await contratoService.descargarContratoFirmado(contrato.id)
      const a = document.createElement('a')
      a.href = result.url
      a.download = result.nombre_archivo || 'contrato-firmado.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al descargar'
      toast.error(message)
    } finally {
      setDownloadLoading(false)
    }
  }

  async function handleVerificar() {
    setVerificacionLoading(true)
    try {
      const result = await contratoService.verificarIntegridad(contrato.id)
      setVerificacion(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al verificar integridad'
      toast.error(message)
    } finally {
      setVerificacionLoading(false)
    }
  }

  async function handleLoadInfo() {
    if (infoFirma) return // Already loaded
    setInfoLoading(true)
    try {
      const result = await contratoService.getInfoFirma(contrato.id)
      setInfoFirma(result)
    } catch {
      // Non-critical
    } finally {
      setInfoLoading(false)
    }
  }

  // Auto-load info when firmado exists
  if (tieneFirmado && !infoFirma && !infoLoading) {
    handleLoadInfo()
  }

  function formatBytes(bytes: number | null): string {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  function truncateHash(hash: string | null): string {
    if (!hash) return '—'
    return `${hash.substring(0, 12)}...${hash.substring(hash.length - 8)}`
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <IconShield size={16} className="text-primary-600" />
        Documento Firmado
      </h3>

      {tieneFirmado ? (
        <div className="space-y-4">
          {/* File info */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Archivo</span>
              <span className="font-medium text-gray-900 text-right max-w-[200px] truncate">
                {contrato.firmado_nombre_archivo || 'firmado.pdf'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tamano</span>
              <span className="font-medium text-gray-900">
                {formatBytes(contrato.firmado_tamano_bytes)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Subido</span>
              <span className="font-medium text-gray-900">
                {contrato.firmado_subido_en ? formatDateTime(contrato.firmado_subido_en) : '—'}
              </span>
            </div>
            {infoFirma?.firmado_subido_por && (
              <div className="flex justify-between">
                <span className="text-gray-500">Subido por</span>
                <span className="font-medium text-gray-900">
                  {infoFirma.firmado_subido_por.nombre} {infoFirma.firmado_subido_por.apellido}
                </span>
              </div>
            )}
          </div>

          {/* Hash */}
          {contrato.firmado_hash_integridad && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Hash SHA-256</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-gray-700 flex-1">
                  {truncateHash(contrato.firmado_hash_integridad)}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(contrato.firmado_hash_integridad || '')
                    toast.success('Hash copiado')
                  }}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium shrink-0"
                >
                  Copiar
                </button>
              </div>
            </div>
          )}

          {/* OTP reference */}
          {contrato.firmado_referencia_otp && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Ref. OTP</span>
              <span className="font-medium text-gray-900">{contrato.firmado_referencia_otp}</span>
            </div>
          )}

          {/* Verification result */}
          {verificacion && (
            <div className={`p-3 rounded-lg ${verificacion.valido ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2">
                {verificacion.valido ? (
                  <IconCheck size={16} className="text-green-600" />
                ) : (
                  <IconX size={16} className="text-red-600" />
                )}
                <p className={`text-sm font-medium ${verificacion.valido ? 'text-green-700' : 'text-red-700'}`}>
                  {verificacion.valido ? 'Integridad verificada' : 'Integridad comprometida'}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Verificado: {formatDateTime(verificacion.fecha_verificacion)}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleDescargar}
              disabled={downloadLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {downloadLoading ? <IconLoader size={14} className="animate-spin" /> : <IconDownload size={14} />}
              Descargar
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={handleVerificar}
                  disabled={verificacionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 disabled:opacity-50"
                >
                  {verificacionLoading ? <IconLoader size={14} className="animate-spin" /> : <IconShield size={14} />}
                  Verificar Integridad
                </button>
                <button
                  onClick={() => setLogOpen(true)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                >
                  Ver Accesos
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-3">No se ha subido el contrato firmado</p>
          {canManage && (
            <button
              onClick={() => setSirOpen(true)}
              className="flex items-center gap-1.5 mx-auto px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              <IconUpload size={16} />
              Subir Contrato Firmado
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      <SubirFirmadoModal
        isOpen={subirOpen}
        onClose={() => setSirOpen(false)}
        contratoId={contrato.id}
        onSuccess={onContratoUpdated}
      />

      <LogAccesosModal
        isOpen={logOpen}
        onClose={() => setLogOpen(false)}
        contratoId={contrato.id}
      />
    </div>
  )
}
