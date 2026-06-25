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
  IconDownload,
  IconFileText,
  IconBuilding2,
  IconReceipt,
  IconFileCheck,
  IconId,
  IconScrollText,
  IconShieldCheck,
} from '@/components/icons'
import { useAuth } from '@/hooks/useAuth'
import {
  documentosLegalesService,
  type IDocumentoLegalResumen,
  type TipoDocumentoLegal,
} from '@/services/documentosLegalesService'
import { perfilArrendadorService, type IPerfilArrendador } from '@/services/perfilArrendadorService'
import { authService } from '@/services/authService'

interface TipoConfig {
  tipo: TipoDocumentoLegal
  titulo: string
  descripcion: string
  obligatorio: boolean
  // Icono de la librería (@/components/icons) para el icon-wrap de la card.
  icon: typeof IconFileText
  // Si aplica solo a inmobiliarias (no propietarios individuales).
  soloInmobiliaria?: boolean
}

const TIPOS: TipoConfig[] = [
  {
    tipo: 'camara_comercio',
    titulo: 'Cámara de Comercio',
    descripcion: 'Certificado de existencia y representación legal vigente (menos de 30 días).',
    obligatorio: true,
    icon: IconBuilding2,
    soloInmobiliaria: true,
  },
  {
    tipo: 'rut',
    titulo: 'RUT',
    descripcion: 'Registro Único Tributario actualizado por la DIAN.',
    obligatorio: true,
    icon: IconReceipt,
  },
  {
    tipo: 'matricula_arrendador',
    titulo: 'Matrícula de Arrendador',
    descripcion: 'Matrícula otorgada por la alcaldía para operar como arrendador.',
    obligatorio: true,
    icon: IconFileCheck,
    soloInmobiliaria: true,
  },
  {
    tipo: 'cedula_representante',
    titulo: 'Cédula del Representante Legal',
    descripcion: 'Cédula de ciudadanía del representante legal por ambos lados.',
    obligatorio: true,
    icon: IconId,
  },
  {
    tipo: 'poder_notarial',
    titulo: 'Poder Notarial',
    descripcion: 'Solo si actúa con poder otorgado por el propietario.',
    obligatorio: false,
    icon: IconScrollText,
  },
  {
    tipo: 'poliza',
    titulo: 'Póliza de Seguros',
    descripcion: 'Póliza de responsabilidad civil o cumplimiento, según aplique.',
    obligatorio: false,
    icon: IconShieldCheck,
  },
  {
    tipo: 'contrato_marco',
    titulo: 'Contrato Marco con Cofianza',
    descripcion: 'Contrato firmado entre tu inmobiliaria/propietario y Cofianza. Lo gestiona nuestro equipo.',
    obligatorio: true,
    icon: IconFileText,
    soloInmobiliaria: true,
  },
]

export default function MiInmobiliariaPage() {
  const { user } = useAuth()
  const isInmobiliaria = user?.rol === 'inmobiliaria'
  const isPropietario = user?.rol === 'propietario'
  // Documentos legales de la ORG: solo el titular los gestiona; los miembros los
  // ven (y descargan) en modo lectura. El backend también lo bloquea.
  const soloLectura = isInmobiliaria && user?.rol_miembro !== 'owner'

  const [docs, setDocs] = useState<IDocumentoLegalResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [perfil, setPerfil] = useState<IPerfilArrendador | null>(null)
  // Teléfono de contacto (a dónde llegan los WhatsApp) — viene del perfil
  // completo (/auth/me), no del user del store que solo trae lo básico.
  const [telefonoContacto, setTelefonoContacto] = useState<string | null>(null)

  useEffect(() => {
    authService
      .getMyProfile()
      .then((p) => setTelefonoContacto(p.telefono ?? null))
      .catch(() => setTelefonoContacto(null))
  }, [])

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

  // Identidad (logo / nombre / NIT / dirección) — se edita en datos-contrato;
  // aquí solo la mostramos para que esta pantalla refleje el mockup.
  useEffect(() => {
    perfilArrendadorService.getMe().then(setPerfil).catch(() => {})
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

      {soloLectura && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <IconAlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            Los documentos de la inmobiliaria los gestiona <strong>el titular</strong> y son los mismos
            para todo el equipo. Puedes verlos y descargarlos, pero no editarlos.
          </p>
        </div>
      )}

      {/* Contacto y notificaciones: a dónde llegan los mensajes de Cofianza
          (correo + WhatsApp). Editable desde Mi cuenta. */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Contacto y notificaciones</h3>
            <p className="text-sm text-gray-600">
              Las notificaciones de Cofianza (estudios, contratos, pagos) te llegan a:
            </p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-gray-700">
                Correo: <span className="font-semibold text-gray-900">{user?.email || '—'}</span>
              </span>
              <span className="text-gray-700">
                WhatsApp/Tel: <span className="font-semibold text-gray-900">{telefonoContacto || 'sin registrar'}</span>
                {!telefonoContacto && (
                  <span className="ml-1.5 text-xs text-amber-700 font-medium">agrega tu número para recibir avisos por WhatsApp</span>
                )}
              </span>
            </div>
          </div>
          <Link
            href="/configuracion/cuenta"
            className="shrink-0 px-3 py-1.5 text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-md hover:bg-primary-100 transition-colors"
          >
            Editar en Mi cuenta
          </Link>
        </div>
      </div>

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

      {/* Identidad de la inmobiliaria (solo lectura; editar en datos-contrato) */}
      {perfil && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">
            Identidad de {isInmobiliaria ? 'la inmobiliaria' : 'tu perfil'}
          </h3>
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="shrink-0">
              {perfil.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={perfil.logo_url}
                  alt="Logo"
                  className="h-20 w-20 rounded-lg object-contain border border-gray-200 bg-gray-50"
                />
              ) : (
                <div className="h-20 w-20 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-[11px] text-gray-400 text-center px-2">
                  Sin logo
                </div>
              )}
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-400">Nombre comercial</div>
                <div className="font-medium text-gray-900">
                  {perfil.razon_social || `${perfil.nombre} ${perfil.apellido}`.trim() || '—'}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-400">NIT / Documento</div>
                <div className="font-medium text-gray-900">{perfil.numero_documento || '—'}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-400">Dirección</div>
                <div className="font-medium text-gray-900">
                  {[perfil.domicilio_direccion, perfil.domicilio_ciudad].filter(Boolean).join(', ') || '—'}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-400">Contacto</div>
                <div className="font-medium text-gray-900">
                  {perfil.whatsapp_recaudo || perfil.email_recaudo || '—'}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-right">
            <Link
              href="/configuracion/datos-contrato"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline"
            >
              Editar datos →
            </Link>
          </div>
        </div>
      )}

      {/* Documentos legales */}
      <div className="space-y-3">
        <div>
          <h3 className="flex items-center gap-2.5 text-base font-bold text-gray-900">
            <span className="inline-block h-2 w-2 rounded-full bg-primary-600" />
            Documentos legales requeridos
          </h3>
          <p className="mt-0.5 text-sm text-gray-500">
            Requeridos por Cofianza para el vínculo. La validación la hace nuestro equipo tras cargar cada uno.
          </p>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <IconLoader size={16} className="animate-spin" /> Cargando documentos...
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
            {tiposVisibles.map((cfg) => {
              const doc = docs.find((d) => d.tipo === cfg.tipo)
              return (
                <DocumentoCard key={cfg.tipo} config={cfg} resumen={doc} onChange={fetchDocs} soloLectura={soloLectura} />
              )
            })}
          </div>
        )}
      </div>
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
  soloLectura = false,
}: {
  config: TipoConfig
  resumen: IDocumentoLegalResumen | undefined
  onChange: () => void
  soloLectura?: boolean
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

  const Icon = config.icon

  return (
    <div
      className={`flex flex-col rounded-xl border p-5 transition-colors ${
        cargado ? 'border-primary-200 bg-primary-50/40' : 'border-gray-200 bg-white'
      }`}
    >
      {/* Icon-wrap + estado (Cargado / Pendiente) con puntito */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${
            cargado ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          <Icon size={22} />
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            cargado ? 'bg-primary-50 text-primary-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${cargado ? 'bg-primary-500' : 'bg-amber-500'}`} />
          {cargado ? 'Cargado' : 'Pendiente'}
        </span>
      </div>

      <h3 className="text-sm font-bold text-gray-900">{config.titulo}</h3>
      <span
        className={`mt-1 inline-flex w-fit items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
          config.obligatorio ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
        }`}
      >
        {config.obligatorio ? 'Obligatorio' : 'Opcional'}
      </span>

      <p className="mt-2 text-xs leading-relaxed text-gray-600">{config.descripcion}</p>

      {cargado && documento && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-600">
          <p
            className="flex items-center gap-1.5 font-medium text-gray-800"
            title={documento.nombre_archivo}
          >
            <IconFileText size={13} className="shrink-0 text-gray-400" />
            <span className="truncate">{documento.nombre_archivo}</span>
          </p>
          <p className="mt-0.5 text-gray-500">
            {(documento.tamano_bytes / 1024).toFixed(0)} KB ·{' '}
            {new Date(documento.subido_en).toLocaleDateString('es-CO', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      )}

      {/* Acciones — el titular sube/reemplaza/elimina; los miembros solo descargan. */}
      <div className="mt-auto space-y-2 pt-4">
        {!soloLectura && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || removing}
            className={`flex w-full items-center justify-center gap-1.5 rounded-lg border-[1.5px] px-3 py-2.5 text-xs font-bold transition-colors disabled:opacity-50 ${
              cargado
                ? 'border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100'
                : 'border-dashed border-gray-300 text-gray-600 hover:border-primary-500 hover:text-primary-700'
            }`}
          >
            {uploading ? <IconLoader size={14} className="animate-spin" /> : <IconUpload size={14} />}
            {cargado ? 'Reemplazar documento' : 'Subir documento'}
          </button>
        )}

        {cargado && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={uploading || removing}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <IconDownload size={14} /> Descargar
            </button>
            {!soloLectura && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={uploading || removing}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {removing ? <IconLoader size={14} className="animate-spin" /> : <IconTrash size={14} />}
                Eliminar
              </button>
            )}
          </div>
        )}

        {soloLectura && !cargado && (
          <p className="text-center text-xs text-gray-400">Pendiente — lo carga el titular.</p>
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
