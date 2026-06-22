/**
 * Carga pública de documentos del solicitante — accesible sin login vía token.
 * La inmobiliaria envía este enlace cuando el estudio quedó condicionado para
 * que el solicitante suba su documentación adicional.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { IconLoader, IconCheckCircle, IconFileText } from '@/components/icons'
import {
  cargarDocumentosService,
  type ContextoCargaDocumentos,
  type PropositoSoporte,
} from '@/services/cargarDocumentosService'

const PROPOSITOS: { value: PropositoSoporte; label: string }[] = [
  { value: 'certificacion_laboral', label: 'Certificación laboral' },
  { value: 'extractos_bancarios', label: 'Extractos bancarios' },
  { value: 'declaracion_renta', label: 'Declaración de renta' },
  { value: 'carta_referencia', label: 'Carta de referencia' },
  { value: 'codeudor', label: 'Documentos de codeudor' },
  { value: 'poliza', label: 'Póliza' },
  { value: 'otros_soportes', label: 'Otros soportes' },
]
const PROPOSITO_LABEL = Object.fromEntries(PROPOSITOS.map((p) => [p.value, p.label]))

const MIME_OK = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_BYTES = 10 * 1024 * 1024

export default function CargarDocumentosPage() {
  const token = useParams().token as string
  const [ctx, setCtx] = useState<ContextoCargaDocumentos | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [proposito, setProposito] = useState<PropositoSoporte>('certificacion_laboral')
  const [file, setFile] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)

  const cargar = useCallback(async () => {
    try {
      setCtx(await cargarDocumentosService.getContexto(token))
      setError(null)
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Enlace no válido o expirado.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    cargar()
  }, [cargar])

  const handleSubir = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    if (!file) {
      toast.error('Selecciona un archivo')
      return
    }
    if (!MIME_OK.includes(file.type)) {
      toast.error('Formato no permitido. Usa PDF, JPG o PNG.')
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('El archivo supera los 10MB.')
      return
    }
    setSubiendo(true)
    try {
      const pre = await cargarDocumentosService.presignedUrl(token, {
        nombre_original: file.name,
        tipo_mime: file.type,
        tamano_bytes: file.size,
        proposito,
      })
      await cargarDocumentosService.uploadToSignedUrl(pre.signed_url, file)
      await cargarDocumentosService.confirmar(token, {
        storage_key: pre.storage_key,
        nombre_original: file.name,
        tipo_mime: file.type,
        tamano_bytes: file.size,
        proposito,
      })
      toast.success('Documento cargado correctamente')
      setFile(null)
      form.reset()
      await cargar()
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message || 'No se pudo cargar el documento')
    } finally {
      setSubiendo(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <IconLoader size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  if (error || !ctx) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Enlace no disponible</h1>
          <p className="text-sm text-gray-600">{error || 'El enlace no es válido o expiró. Pide uno nuevo a la inmobiliaria.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Carga de documentos</h1>
          <p className="text-sm text-gray-600 mt-1">
            Hola {ctx.solicitante}, sube los documentos para tu solicitud de arriendo
            {ctx.inmueble.direccion ? ` del inmueble en ${ctx.inmueble.direccion}` : ''}.
          </p>
        </div>

        {ctx.puede_subir ? (
          <form onSubmit={handleSubir} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div>
              <label htmlFor="cargar-proposito" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de documento
              </label>
              <select
                id="cargar-proposito"
                value={proposito}
                onChange={(e) => setProposito(e.target.value as PropositoSoporte)}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                {PROPOSITOS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cargar-file" className="block text-sm font-medium text-gray-700 mb-1">
                Archivo (PDF, JPG o PNG · máx. 10MB)
              </label>
              <input
                id="cargar-file"
                type="file"
                accept=".pdf,image/jpeg,image/png"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
            </div>
            <button
              type="submit"
              disabled={subiendo}
              className="w-full px-5 py-2.5 text-sm font-medium text-white bg-coral-500 rounded-lg hover:bg-coral-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {subiendo ? <IconLoader size={16} className="animate-spin" /> : null}
              {subiendo ? 'Subiendo…' : 'Subir documento'}
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center text-sm text-gray-600">
            Este enlace ya no admite cargar documentos (la solicitud cambió de estado). Si tienes dudas, contacta a la inmobiliaria.
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Documentos cargados ({ctx.soportes.length})</h2>
          </div>
          {ctx.soportes.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-500 text-center">Aún no has subido documentos.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {ctx.soportes.map((s) => (
                <li key={s.id} className="px-5 py-3 flex items-center gap-3">
                  <IconCheckCircle size={18} className="text-green-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{PROPOSITO_LABEL[s.proposito] || s.proposito}</p>
                    <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                      <IconFileText size={11} /> {s.nombre_original}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
