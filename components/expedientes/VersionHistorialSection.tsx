'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { IconDownload, IconHistory, IconLoader } from '@/components/icons'
import { contratoService } from '@/services/contratoService'
import { formatDateTime } from '@/lib/constants'
import type { IContratoVersion } from '@/types/contrato'

interface VersionHistorialSectionProps {
  contratoId: string
  currentVersion: number
  onCompare?: (v1: number, v2: number) => void
}

export function VersionHistorialSection({
  contratoId,
  currentVersion,
  onCompare,
}: VersionHistorialSectionProps) {
  const [versiones, setVersiones] = useState<IContratoVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [downloadingVersion, setDownloadingVersion] = useState<number | null>(null)

  const fetchVersiones = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await contratoService.getVersiones(contratoId)
      setVersiones(data)
    } catch {
      // Silent fail — section is supplementary
    } finally {
      setIsLoading(false)
    }
  }, [contratoId])

  useEffect(() => {
    fetchVersiones()
  }, [fetchVersiones])

  async function handleDownloadVersion(versionNum: number) {
    setDownloadingVersion(versionNum)
    try {
      const result = await contratoService.descargarVersion(contratoId, versionNum)
      const a = document.createElement('a')
      a.href = result.url
      a.download = result.nombre_archivo || 'contrato.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      toast.error('Error al descargar la version')
    } finally {
      setDownloadingVersion(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <IconLoader size={18} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (versiones.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
          <IconHistory size={16} className="text-gray-500" />
          Historial de Versiones
        </h3>
        <p className="text-xs text-gray-500">Sin versiones anteriores</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
        <IconHistory size={16} className="text-gray-500" />
        Historial de Versiones ({versiones.length})
      </h3>

      <div className="space-y-2">
        {/* Current version indicator */}
        <div className="flex items-center gap-3 p-2.5 bg-primary-50 border border-primary-200 rounded-lg text-sm">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
            v{currentVersion}
          </span>
          <span className="text-primary-700 font-medium">Version actual</span>
        </div>

        {/* Archived versions */}
        {versiones.map((v) => (
          <div
            key={v.id}
            className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                  v{v.version}
                </span>
                <span className="text-xs text-gray-500">
                  {v.fecha_generacion ? formatDateTime(v.fecha_generacion) : '—'}
                </span>
                {v.plantilla_version && (
                  <span className="text-xs text-gray-400">
                    (plantilla v{v.plantilla_version})
                  </span>
                )}
              </div>
              {v.resumen_cambios && (
                <p className="text-xs text-gray-500 mt-1 truncate" title={v.resumen_cambios}>
                  {v.resumen_cambios}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {onCompare && (
                <button
                  onClick={() => onCompare(v.version, currentVersion)}
                  className="px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded"
                  title={`Comparar v${v.version} con v${currentVersion}`}
                >
                  Comparar
                </button>
              )}
              <button
                onClick={() => handleDownloadVersion(v.version)}
                disabled={downloadingVersion === v.version}
                className="p-1.5 text-gray-400 hover:text-primary-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
                title={`Descargar v${v.version}`}
              >
                {downloadingVersion === v.version ? (
                  <IconLoader size={14} className="animate-spin" />
                ) : (
                  <IconDownload size={14} />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
