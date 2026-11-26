/**
 * Documentos legales y contacto de la inmobiliaria/propietario (antes la página «Mi Inmobiliaria»).
 *
 * Reporte de la Oficina Virtual (25-nov), punto 13: va dentro de «Datos de mi inmobiliaria»
 * (/configuracion/datos-inmobiliaria), junto a los datos para contratos y facturas, que ya no se repiten
 * aquí (la tarjeta «Identidad» de solo lectura sobraba). Los documentos que tiene que cargar para operar con
 * Cofianza (Gerencia 12-may-2026): cada uno se sube/reemplaza/descarga/elimina vía
 * /api/v1/documentos-legales/:tipo.
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  IconLoader,
  IconCheck,
  IconUpload,
  IconTrash,
  IconAlertTriangle,
  IconDownload,
  IconFileText,
  IconBuilding2,
  IconReceipt,
  IconFileCheck,
  IconId,
  IconScrollText,
} from '@/components/icons'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/hooks/useAuth'
import {
  documentosLegalesService,
  type IDocumentoLegalResumen,
  type TipoDocumentoLegal,
} from '@/services/documentosLegalesService'
import { perfilArrendadorService, type IPerfilArrendador } from '@/services/perfilArrendadorService'
import { authService } from '@/services/authService'
import { abrirEnPestana } from '@/lib/utils'

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
    tipo: 'contrato_marco',
    titulo: 'Contrato Marco con Cofianza',
    descripcion: 'Contrato firmado entre su inmobiliaria/propietario y Cofianza. Lo gestiona nuestro equipo.',
    obligatorio: true,
    icon: IconFileText,
    soloInmobiliaria: true,
  },
]

export function DocumentosLegalesInmobiliaria() {
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
  // Afianzadora/aseguradora actual (dato de conversión, tarea 1.6) — editable.
  const [afTipo, setAfTipo] = useState<'' | 'afianzadora' | 'aseguradora' | 'ninguna'>('')
  const [afActual, setAfActual] = useState('')
  const [savingAf, setSavingAf] = useState(false)

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

  // La afianzadora actual vive en el mismo perfil (los demás datos se editan en la sección de arriba).
  useEffect(() => {
    perfilArrendadorService
      .getMe()
      .then((p) => {
        setPerfil(p)
        setAfTipo(p.afianzadora_tipo ?? '')
        setAfActual(p.afianzadora_actual ?? '')
      })
      .catch(() => {})
  }, [])

  const afDirty =
    afTipo !== (perfil?.afianzadora_tipo ?? '') || afActual !== (perfil?.afianzadora_actual ?? '')

  const guardarAfianzadora = async () => {
    if (savingAf || soloLectura) return
    setSavingAf(true)
    try {
      const updated = await perfilArrendadorService.updateMe({
        afianzadora_tipo: afTipo === '' ? null : afTipo,
        afianzadora_actual: afActual,
      })
      setPerfil(updated)
      setAfTipo(updated.afianzadora_tipo ?? '')
      setAfActual(updated.afianzadora_actual ?? '')
      toast.success('Afianzadora actualizada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSavingAf(false)
    }
  }

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
    <section aria-labelledby="documentos-legales-titulo" className="space-y-6">
      <h2 id="documentos-legales-titulo" className="text-lg font-semibold text-gray-900">
        {isInmobiliaria ? 'Contacto y documentos de la inmobiliaria' : 'Contacto y documentos legales'}
      </h2>

      {/* Contacto y notificaciones: a dónde llegan los mensajes de Cofianza
          (correo + WhatsApp). Editable desde Mi cuenta. */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Contacto y notificaciones</h3>
            <p className="text-sm text-gray-600">
              Las notificaciones de Cofianza (estudios, contratos, pagos) le llegan a:
            </p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-gray-700">
                Correo: <span className="font-semibold text-gray-900">{user?.email || '—'}</span>
              </span>
              <span className="text-gray-700">
                WhatsApp/Tel: <span className="font-semibold text-gray-900">{telefonoContacto || 'sin registrar'}</span>
                {!telefonoContacto && (
                  <span className="ml-1.5 text-xs text-amber-700 font-medium">agregue su número para recibir avisos por WhatsApp</span>
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
              ? '¡Listo! Su perfil legal está completo.'
              : `Faltan ${pendientes} ${pendientes === 1 ? 'documento obligatorio' : 'documentos obligatorios'}.`}
          </p>
        </div>
      )}

      {/* Afianzadora/aseguradora actual — editable (tarea 1.6). Dato de
          conversión: con qué respaldan hoy sus arriendos. Solo inmobiliaria. */}
      {perfil && isInmobiliaria && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-gray-900">¿Qué usan hoy para respaldar sus arriendos?</h3>
          <p className="mt-0.5 mb-4 text-sm text-gray-500">
            Afianzadora o aseguradora con la que trabajan actualmente (opcional).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <select
              value={afTipo}
              onChange={(e) => setAfTipo(e.target.value as typeof afTipo)}
              disabled={soloLectura}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="">Seleccionar…</option>
              <option value="afianzadora">Afianzadora</option>
              <option value="aseguradora">Aseguradora</option>
              <option value="ninguna">Ninguna</option>
            </select>
            {(afTipo === 'afianzadora' || afTipo === 'aseguradora') && (
              <input
                type="text"
                value={afActual}
                onChange={(e) => setAfActual(e.target.value)}
                disabled={soloLectura}
                maxLength={200}
                placeholder="Nombre de la afianzadora / aseguradora"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
              />
            )}
          </div>
          {soloLectura ? (
            <p className="mt-3 text-xs text-gray-500">Solo el titular de la inmobiliaria puede editar este dato.</p>
          ) : (
            <div className="mt-4 text-right">
              <button
                type="button"
                onClick={guardarAfianzadora}
                disabled={savingAf || !afDirty}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingAf ? <IconLoader size={15} className="animate-spin" /> : null}
                {savingAf ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          )}
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
        {loading && docs.length === 0 ? (
          <div role="status" aria-live="polite" className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))]">
            <span className="sr-only">Cargando documentos…</span>
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))]">
            {tiposVisibles.map((cfg) => {
              const doc = docs.find((d) => d.tipo === cfg.tipo)
              return (
                <DocumentoCard key={cfg.tipo} config={cfg} resumen={doc} onChange={fetchDocs} soloLectura={soloLectura} />
              )
            })}
          </div>
        )}
      </div>
    </section>
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
      await abrirEnPestana(async () => (await documentosLegalesService.getDownloadUrl(config.tipo)).url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al descargar')
    }
  }

  const [confirmarBorrar, setConfirmarBorrar] = useState(false)
  const handleDelete = () => setConfirmarBorrar(true)
  const borrar = async () => {
    setRemoving(true)
    try {
      await documentosLegalesService.remove(config.tipo)
      toast.success(`${config.titulo} eliminado`)
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el documento')
    } finally {
      setRemoving(false)
    }
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
            <IconFileText size={13} className="shrink-0 text-gray-500" />
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
          <p className="text-center text-xs text-gray-500">Pendiente — lo carga el titular.</p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={handleFile}
          className="hidden"
        />
      </div>
      <ConfirmDialog
        isOpen={confirmarBorrar}
        onClose={() => setConfirmarBorrar(false)}
        onConfirm={borrar}
        title={`¿Eliminar el documento ${config.titulo}?`}
        message="Podrá cargarlo de nuevo cuando quiera."
        confirmLabel="Eliminar documento"
        variant="danger"
      />
    </div>
  )
}
