'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  IconFolderOpen,
  IconUpload,
  IconDownload,
  IconTrash,
  IconLoader,
  IconFileText,
  IconPlus,
} from '@/components/icons'
import { formatDateTime } from '@/lib/constants'
import { contratoService } from '@/services/contratoService'
import { useAuth } from '@/hooks/useAuth'
import type { IContrato, IContratoArchivo, TipoArchivoContrato } from '@/types/contrato'

interface ContratoArchivosSectionProps {
  contrato: IContrato
}

const TIPOS_ARCHIVO: { value: TipoArchivoContrato; label: string }[] = [
  { value: 'inventario', label: 'Inventario del inmueble' },
  { value: 'acta_entrega', label: 'Acta de entrega' },
  { value: 'documento_identidad', label: 'Documento de identidad' },
]

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

export function ContratoArchivosSection({ contrato }: ContratoArchivosSectionProps) {
  const { user } = useAuth()
  const canManage = user?.rol === 'administrador' || user?.rol === 'operador_analista'
  const isAdmin = user?.rol === 'administrador'

  const [archivos, setArchivos] = useState<IContratoArchivo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedTipo, setSelectedTipo] = useState<TipoArchivoContrato | ''>('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadArchivos()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contrato.id])

  async function loadArchivos() {
    try {
      const data = await contratoService.listarArchivos(contrato.id)
      setArchivos(data)
    } catch {
      // Non-critical
    } finally {
      setLoading(false)
    }
  }

  function handleUploadClick(tipo: TipoArchivoContrato) {
    setSelectedTipo(tipo)
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedTipo) return
    if (fileInputRef.current) fileInputRef.current.value = ''

    if (file.size > MAX_FILE_SIZE) {
      toast.error('El archivo excede el limite de 20 MB')
      return
    }

    setUploading(true)
    try {
      await contratoService.subirArchivo(contrato.id, file, selectedTipo as TipoArchivoContrato)
      toast.success('Archivo subido correctamente')
      await loadArchivos()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al subir el archivo'
      toast.error(message)
    } finally {
      setUploading(false)
      setSelectedTipo('')
    }
  }

  async function handleDescargar(archivo: IContratoArchivo) {
    setDownloadingId(archivo.id)
    try {
      const result = await contratoService.descargarArchivo(contrato.id, archivo.id)
      const a = document.createElement('a')
      a.href = result.url
      a.download = result.nombre_archivo || archivo.nombre_archivo
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al descargar'
      toast.error(message)
    } finally {
      setDownloadingId(null)
    }
  }

  function handleEliminar(archivo: IContratoArchivo) {
    toast(`¿Eliminar "${archivo.nombre_archivo}"?`, {
      duration: 10000,
      action: {
        label: 'Eliminar',
        onClick: async () => {
          setDeletingId(archivo.id)
          try {
            await contratoService.eliminarArchivo(contrato.id, archivo.id)
            toast.success('Archivo eliminado')
            setArchivos((prev) => prev.filter((a) => a.id !== archivo.id))
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error al eliminar'
            toast.error(message)
          } finally {
            setDeletingId(null)
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {},
      },
    })
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  // Group archivos by tipo
  const archivosByTipo = TIPOS_ARCHIVO.map((tipo) => ({
    ...tipo,
    archivos: archivos.filter((a) => a.tipo_archivo === tipo.value),
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <IconFolderOpen size={16} className="text-primary-600" />
        Archivos Asociados
      </h3>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <IconLoader size={20} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-4">
          {archivosByTipo.map((grupo) => (
            <div key={grupo.value}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {grupo.label}
                </p>
                {canManage && (
                  <button
                    onClick={() => handleUploadClick(grupo.value)}
                    disabled={uploading}
                    className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                  >
                    <IconPlus size={12} />
                    Agregar
                  </button>
                )}
              </div>

              {grupo.archivos.length > 0 ? (
                <div className="space-y-2">
                  {grupo.archivos.map((archivo) => (
                    <div
                      key={archivo.id}
                      className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg group"
                    >
                      <IconFileText size={16} className="text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {archivo.nombre_archivo}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatBytes(archivo.tamano_bytes)}
                          {archivo.subido_por && ` · ${archivo.subido_por.nombre} ${archivo.subido_por.apellido}`}
                          {' · '}{formatDateTime(archivo.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleDescargar(archivo)}
                          disabled={downloadingId === archivo.id}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded disabled:opacity-50"
                          title="Descargar"
                        >
                          {downloadingId === archivo.id ? (
                            <IconLoader size={14} className="animate-spin" />
                          ) : (
                            <IconDownload size={14} />
                          )}
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleEliminar(archivo)}
                            disabled={deletingId === archivo.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded disabled:opacity-50"
                            title="Eliminar"
                          >
                            {deletingId === archivo.id ? (
                              <IconLoader size={14} className="animate-spin" />
                            ) : (
                              <IconTrash size={14} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic py-2">Sin archivos</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Upload overlay */}
      {uploading && (
        <div className="mt-3 flex items-center gap-2 text-sm text-primary-600">
          <IconLoader size={14} className="animate-spin" />
          Subiendo archivo...
        </div>
      )}
    </div>
  )
}
