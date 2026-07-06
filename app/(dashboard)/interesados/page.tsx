/**
 * Interesados — leads de la vitrina (visitantes sin cuenta que dieron
 * "Me interesa este inmueble"). El dueño/inmobiliaria ve los de SUS inmuebles
 * (scopeado en el backend), con WhatsApp/correo para contactarlos y un estado
 * (nuevo/contactado/descartado) para gestionarlos.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { IconLoader, IconCheck, IconHome, IconUser, IconX, IconFileText } from '@/components/icons'
import {
  interesadosService,
  type Interesado,
  type InteresadoEstado,
} from '@/services/interesadosService'

const ESTADO_LABEL: Record<InteresadoEstado, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  descartado: 'Descartado',
}
const ESTADO_STYLE: Record<InteresadoEstado, string> = {
  nuevo: 'bg-amber-50 text-amber-700',
  contactado: 'bg-primary-50 text-primary-700',
  descartado: 'bg-gray-100 text-gray-500',
}

const FILTROS: { label: string; value: InteresadoEstado | 'todos' }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Nuevos', value: 'nuevo' },
  { label: 'Contactados', value: 'contactado' },
  { label: 'Descartados', value: 'descartado' },
]

const TIPO_LABEL: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  oficina: 'Oficina',
  local: 'Local',
  bodega: 'Bodega',
  apartaestudio: 'Apartaestudio',
  casa_finca: 'Casa Finca',
  finca: 'Finca',
  lote: 'Lote',
  parqueadero: 'Parqueadero',
}

function inmuebleLabel(it: Interesado): string {
  const inm = it.inmuebles
  if (!inm) return 'Inmueble'
  const tipo = TIPO_LABEL[inm.tipo] || inm.tipo
  // Dirección (lo más específico) o barrio, + ciudad, + código entre paréntesis
  // para distinguir inmuebles del mismo dueño en la misma ciudad.
  const detalle = inm.direccion?.trim() || inm.barrio?.trim()
  const lugar = detalle ? `${detalle}, ${inm.ciudad}` : inm.ciudad
  const codigo = inm.codigo?.trim()
  return `${tipo} en ${lugar}${codigo ? ` (cód. ${codigo})` : ''}`
}

function waLink(telefono: string): string {
  return `https://wa.me/${telefono.replace(/\D/g, '')}`
}

function formatFecha(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Link al wizard de nuevo expediente con el inmueble y los datos del interesado
// pre-llenados (el dueño solo completa el documento). Divide el nombre completo
// en nombre + apellido (best-effort: primera palabra = nombre, resto = apellido).
function crearExpedienteHref(it: Interesado): string {
  const partes = it.nombre.trim().split(/\s+/)
  const nombre = partes[0] || it.nombre.trim()
  const apellido = partes.slice(1).join(' ')
  const params = new URLSearchParams({
    inmueble_id: it.inmueble_id,
    nombre,
    apellido,
    telefono: it.telefono,
    email: it.email,
  })
  return `/expedientes/nuevo?${params.toString()}`
}

export default function InteresadosPage() {
  const [items, setItems] = useState<Interesado[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<InteresadoEstado | 'todos'>('todos')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    interesadosService
      .list(filtro === 'todos' ? {} : { estado: filtro })
      .then(setItems)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Error al cargar interesados'))
      .finally(() => setLoading(false))
  }, [filtro])

  useEffect(() => {
    load()
  }, [load])

  const cambiarEstado = async (id: string, estado: InteresadoEstado) => {
    setUpdatingId(id)
    try {
      await interesadosService.updateEstado(id, estado)
      toast.success('Estado actualizado')
      setItems((prev) =>
        prev
          .map((it) => (it.id === id ? { ...it, estado } : it))
          // Si hay filtro activo y el item ya no coincide, lo sacamos de la lista.
          .filter((it) => filtro === 'todos' || it.estado === filtro),
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo actualizar el estado')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Interesados"
        subtitle="Personas que mostraron interés en tus inmuebles desde la vitrina. Escríbeles por WhatsApp o correo para coordinar la visita."
      />

      {/* Filtros por estado */}
      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFiltro(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filtro === f.value
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <IconLoader size={16} className="animate-spin" /> Cargando interesados…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <IconUser size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-semibold text-gray-900">Aún no tienes interesados</p>
          <p className="text-sm text-gray-500 mt-1">
            Cuando alguien dé “Me interesa este inmueble” en tu vitrina, aparecerá aquí con sus datos
            de contacto.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div
              key={it.id}
              className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              {/* Miniatura del inmueble */}
              <div className="shrink-0">
                {it.inmuebles?.foto_fachada_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.inmuebles.foto_fachada_url}
                    alt={inmuebleLabel(it)}
                    className="h-16 w-24 rounded-lg object-cover border border-gray-200 bg-gray-50"
                  />
                ) : (
                  <div className="flex h-16 w-24 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                    <IconHome size={22} className="text-gray-300" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 truncate">{it.nombre}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${ESTADO_STYLE[it.estado]}`}
                  >
                    {ESTADO_LABEL[it.estado]}
                  </span>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                  <IconHome size={13} className="shrink-0 text-gray-400" />
                  <span className="truncate">{inmuebleLabel(it)}</span>
                  <span className="text-gray-300">·</span>
                  <span>{formatFecha(it.created_at)}</span>
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <a
                    href={waLink(it.telefono)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary-700 hover:underline"
                  >
                    WhatsApp: {it.telefono}
                  </a>
                  <a href={`mailto:${it.email}`} className="text-gray-600 hover:underline">
                    {it.email}
                  </a>
                </div>
                {it.mensaje && (
                  <p className="mt-2 rounded-md border border-gray-100 bg-gray-50 px-2.5 py-1.5 text-sm italic text-gray-700">
                    “{it.mensaje}”
                  </p>
                )}
              </div>

              {/* Acciones */}
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                {/* Convertir el interesado en expediente (datos pre-llenados) */}
                <Link
                  href={crearExpedienteHref(it)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                >
                  <IconFileText size={13} />
                  Crear expediente
                </Link>
                {it.estado !== 'contactado' && (
                  <button
                    type="button"
                    onClick={() => cambiarEstado(it.id, 'contactado')}
                    disabled={updatingId === it.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100 disabled:opacity-50"
                  >
                    {updatingId === it.id ? (
                      <IconLoader size={13} className="animate-spin" />
                    ) : (
                      <IconCheck size={13} />
                    )}
                    Contactado
                  </button>
                )}
                {it.estado !== 'descartado' ? (
                  <button
                    type="button"
                    onClick={() => cambiarEstado(it.id, 'descartado')}
                    disabled={updatingId === it.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <IconX size={13} />
                    Descartar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => cambiarEstado(it.id, 'nuevo')}
                    disabled={updatingId === it.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Reabrir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
