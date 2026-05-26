/**
 * Mi Inmobiliaria — gestión de los 7 documentos legales que la
 * inmobiliaria/propietario tiene que cargar para operar con Cofianza
 * (Mario 12-may-2026). Cada doc se sube/reemplaza/descarga/elimina via
 * /api/v1/documentos-legales/:tipo.
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  IconLoader,
  IconCheck,
  IconUpload,
  IconTrash,
  IconAlertTriangle,
  IconChevronLeft,
} from '@/components/icons'
import { useAuth } from '@/hooks/useAuth'
import {
  documentosLegalesService,
  type IDocumentoLegalResumen,
  type TipoDocumentoLegal,
} from '@/services/documentosLegalesService'

interface TipoConfig {
  tipo: TipoDocumentoLegal
  titulo: string
  descripcion: string
  obligatorio: boolean
  // Si aplica solo a inmobiliarias (no propietarios individuales).
  soloInmobiliaria?: boolean
}

const TIPOS: TipoConfig[] = [
  {
    tipo: 'camara_comercio',
    titulo: 'Cámara de Comercio',
    descripcion: 'Certificado de existencia y representación legal vigente (menos de 30 días).',
    obligatorio: true,
    soloInmobiliaria: true,
  },
  {
    tipo: 'rut',
    titulo: 'RUT',
    descripcion: 'Registro Único Tributario actualizado por la DIAN.',
    obligatorio: true,
  },
  {
    tipo: 'matricula_arrendador',
    titulo: 'Matrícula de Arrendador',
    descripcion: 'Matrícula otorgada por la alcaldía para operar como arrendador.',
    obligatorio: true,
    soloInmobiliaria: true,
  },
  {
    tipo: 'cedula_representante',
    titulo: 'Cédula del Representante Legal',
    descripcion: 'Cédula de ciudadanía del representante legal por ambos lados.',
    obligatorio: true,
  },
  {
    tipo: 'poder_notarial',
    titulo: 'Poder Notarial',
    descripcion: 'Solo si actúa con poder otorgado por el propietario.',
    obligatorio: false,
  },
  {
    tipo: 'poliza',
    titulo: 'Póliza de Seguros',
    descripcion: 'Póliza de responsabilidad civil o cumplimiento, según aplique.',
    obligatorio: false,
  },
  {
    tipo: 'contrato_marco',
    titulo: 'Contrato Marco con Cofianza',
    descripcion: 'Contrato firmado entre tu inmobiliaria/propietario y Cofianza. Lo gestiona nuestro equipo.',
    obligatorio: true,
    soloInmobiliaria: true,
  },
]

export default function MiInmobiliariaPage() {
  const { user } = useAuth()
  const isInmobiliaria = user?.rol === 'inmobiliaria'
  const isPropietario = user?.rol === 'propietario'

  const [docs, setDocs] = useState<IDocumentoLegalResumen[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDocs = async () => {
    setLoading(true)
    try {
      const data = await documentosLegalesService.listMine()
      setDocs(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar documentos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocs()
  }, [])

  // Filtrar tipos según rol: el propietario no necesita Cámara de Comercio,
  // Matrícula ni Contrato Marco (ese ultimo igual aplica si es inmobiliaria).
  const tiposVisibles = TIPOS.filter((t) => {
    if (isPropietario && t.soloInmobiliaria) return false
    return true
  })

  const tiposObligatorios = tiposVisibles.filter((t) => t.obligatorio)
  const cargadosObligatorios = tiposObligatorios.filter(
    (t) => docs.find((d) => d.tipo === t.tipo)?.cargado,
  ).length
  const pendientes = tiposObligatorios.length - cargadosObligatorios

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/configuracion" className="hover:text-primary-700 flex items-center gap-1">
          <IconChevronLeft size={14} /> Configuración
        </Link>
        <span>·</span>
        <span className="text-gray-900 font-medium">Mi {isInmobiliaria ? 'Inmobiliaria' : 'Perfil legal'}</span>
      </div>

      <PageHeader
        title={isInmobiliaria ? 'Mi Inmobiliaria' : 'Mis documentos legales'}
        subtitle={
          isInmobiliaria
            ? 'Documentos requeridos para operar con Cofianza. La validación la hace nuestro equipo después de cargar cada documento.'
            : 'Documentos legales de tu perfil como propietario.'
        }
      />

      {/* Resumen completitud */}
      {!loading && (
        <div
          className={`rounded-lg border p-4 flex items-center gap-3 ${
            pendientes === 0
              ? 'bg-primary-50 border-primary-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          {pendientes === 0 ? (
            <IconCheck size={20} className="text-primary-700 shrink-0" />
          ) : (
            <IconAlertTriangle size={20} className="text-amber-700 shrink-0" />
          )}
          <p
            className={`text-sm ${
              pendientes === 0 ? 'text-primary-900' : 'text-amber-900'
            }`}
          >
            <strong>
              {cargadosObligatorios} de {tiposObligatorios.length} documentos cargados.
            </strong>{' '}
            {pendientes === 0
              ? '¡Listo! Tu perfil legal está completo.'
              : `Faltan ${pendientes} ${pendientes === 1 ? 'documento obligatorio' : 'documentos obligatorios'}.`}
          </p>
        </div>
      )}

      {/* Grid de documentos */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <IconLoader size={16} className="animate-spin" /> Cargando documentos...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tiposVisibles.map((cfg) => {
            const doc = docs.find((d) => d.tipo === cfg.tipo)
            return (
              <DocumentoCard
                key={cfg.tipo}
                config={cfg}
                resumen={doc}
                onChange={fetchDocs}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Card individual por tipo de documento
// ============================================================

function DocumentoCard({
  config,
  resumen,
  onChange,
}: {
  config: TipoConfig
  resumen: IDocumentoLegalResumen | undefined
  onChange: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const cargado = resumen?.cargado ?? false
  const documento = resumen?.documento

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      toast.error('El archivo no puede superar 20 MB')
      return
    }
    setUploading(true)
    try {
      await documentosLegalesService.upload(config.tipo, file)
      toast.success(`${config.titulo} cargado correctamente`)
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir el documento')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDownload = async () => {
    try {
      const { url } = await documentosLegalesService.getDownloadUrl(config.tipo)
      window.open(url, '_blank')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al descargar')
    }
  }

  const handleDelete = () => {
    toast(`¿Eliminar el documento ${config.titulo}?`, {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          setRemoving(true)
          try {
            await documentosLegalesService.remove(config.tipo)
            toast.success(`${config.titulo} eliminado`)
            onChange()
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al eliminar')
          } finally {
            setRemoving(false)
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
    })
  }

  return (
    <div
      className={`border rounded-lg p-5 transition-colors ${
        cargado ? 'border-primary-200 bg-primary-50/40' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="font-semibold text-gray-900 mb-0.5">{config.titulo}</h3>
          {config.obligatorio ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
              Obligatorio
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
              Opcional
            </span>
          )}
        </div>
        {cargado && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-800 whitespace-nowrap">
            <IconCheck size={12} /> Cargado
          </span>
        )}
      </div>

      <p className="text-xs text-gray-600 mb-3 leading-relaxed">{config.descripcion}</p>

      {cargado && documento && (
        <div className="mb-3 text-xs text-gray-600 bg-white border border-gray-200 rounded p-2">
          <p className="font-medium text-gray-800 truncate" title={documento.nombre_archivo}>
            📄 {documento.nombre_archivo}
          </p>
          <p className="text-gray-500 mt-0.5">
            {(documento.tamano_bytes / 1024).toFixed(0)} KB ·{' '}
            {new Date(documento.subido_en).toLocaleDateString('es-CO', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || removing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {uploading ? (
            <IconLoader size={14} className="animate-spin" />
          ) : (
            <IconUpload size={14} />
          )}
          {cargado ? 'Reemplazar' : 'Subir'}
        </button>

        {cargado && (
          <>
            <button
              type="button"
              onClick={handleDownload}
              disabled={uploading || removing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Descargar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={uploading || removing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50"
            >
              {removing ? <IconLoader size={14} className="animate-spin" /> : <IconTrash size={14} />}
              Eliminar
            </button>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </div>
  )
}
