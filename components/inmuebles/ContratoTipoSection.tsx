/**
 * ContratoTipoSection — upload/ver/eliminar contrato tipo del inmueble.
 *
 * El propietario/inmobiliaria puede subir un PDF que se usará como contrato
 * base para los expedientes de este inmueble. Admin también puede gestionarlo.
 */

'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { inmuebleService } from '@/services/inmuebleService'
import type { IInmueble } from '@/types/inmueble'

interface ContratoTipoSectionProps {
  inmueble: IInmueble
  canManage: boolean
  onChange?: () => void | Promise<void>
}

const MAX_MB = 10

export function ContratoTipoSection({ inmueble, canManage, onChange }: ContratoTipoSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [opening, setOpening] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const tieneContrato = Boolean(inmueble.contrato_tipo_storage_key)

  const handleUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Solo se acepta formato PDF')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`El archivo no puede superar ${MAX_MB} MB`)
      return
    }
    setUploading(true)
    try {
      await inmuebleService.subirContratoTipo(inmueble.id, file)
      toast.success('Contrato tipo subido correctamente')
      await onChange?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No pudimos subir el archivo'
      toast.error(msg)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleVer = async () => {
    setOpening(true)
    try {
      const res = await inmuebleService.getContratoTipoUrl(inmueble.id)
      window.open(res.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No pudimos abrir el contrato'
      toast.error(msg)
    } finally {
      setOpening(false)
    }
  }

  const handleEliminar = () => {
    toast('¿Eliminar el contrato tipo?', {
      description: 'Los expedientes nuevos usarán la plantilla estándar de Cofianza.',
      duration: 10000,
      action: {
        label: 'Eliminar',
        onClick: async () => {
          setDeleting(true)
          try {
            await inmuebleService.eliminarContratoTipo(inmueble.id)
            toast.success('Contrato tipo eliminado')
            await onChange?.()
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'No pudimos eliminar el archivo'
            toast.error(msg)
          } finally {
            setDeleting(false)
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {},
      },
    })
  }

  const fmtTamano = (bytes?: number | null) => {
    if (!bytes) return ''
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(2)} MB`
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-900 mb-1">Contrato tipo</h3>
      <p className="text-xs text-gray-500 mb-3">
        PDF que se usará como contrato base cuando se genere el expediente de arrendamiento. Si no subes uno, se usará la plantilla estándar de Cofianza.
      </p>

      {tieneContrato ? (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded bg-red-100 flex items-center justify-center shrink-0">
              <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {inmueble.contrato_tipo_nombre_archivo || 'contrato-tipo.pdf'}
              </p>
              <p className="text-xs text-gray-500">
                {fmtTamano(inmueble.contrato_tipo_tamano_bytes)}
                {inmueble.contrato_tipo_subido_en && (
                  <> · Subido el {new Date(inmueble.contrato_tipo_subido_en).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={handleVer}
              disabled={opening}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              {opening ? 'Abriendo...' : 'Ver PDF'}
            </button>
            {canManage && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-white border border-primary-300 rounded hover:bg-primary-50 disabled:opacity-50"
                >
                  {uploading ? 'Subiendo...' : 'Reemplazar'}
                </button>
                <button
                  onClick={handleEliminar}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50"
                >
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        canManage ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <svg className="mx-auto h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-600 mb-3">
              Aún no has subido un contrato tipo. Se usará la plantilla estándar.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {uploading ? 'Subiendo...' : 'Subir PDF'}
            </button>
            <p className="text-xs text-gray-400 mt-2">Solo PDF, máx. {MAX_MB} MB</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">El propietario no ha subido un contrato tipo. Se usará la plantilla estándar de Cofianza.</p>
        )
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file)
        }}
      />
    </div>
  )
}
