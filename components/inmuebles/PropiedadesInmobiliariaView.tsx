/**
 * PropiedadesInmobiliariaView — vista de "Propiedades y Vitrina" para la
 * inmobiliaria con el diseño del mockup 13_v2 (tab Propiedades): encabezado con
 * intro + saldo de propiedades + "Agregar propiedad", stat-cards reales, chips
 * de filtro tipo pill (Todas / En vitrina / Pausadas / Sin publicar), lista de
 * filas horizontales con chip de código copiable, badge de vitrina y acciones
 * (Ver en web / Pausar-Publicar / Editar), y el panel de solicitudes de visita.
 *
 * NO inventa datos: reutiliza useInmuebles (listado + filtros + paginación), el
 * toggle real inmuebleService.toggleVisibleVitrina + updateInmuebleInList
 * optimista, y TIPO_LABELS. El mockup usaba `nombre`, `visitas` y `publicado`
 * que NO existen en IInmueble → se sustituyen por `direccion`,
 * money(valor_arriendo) y el badge de vitrina derivado de visible_vitrina/estado.
 * Admin/operador/propietario conservan su vista compartida (InmueblesTable).
 */

'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { useInmuebles } from '@/hooks/useInmuebles'
import { useAuth } from '@/hooks/useAuth'
import { usePerfilCompletitud } from '@/hooks/usePerfilCompletitud'
import { inmuebleService } from '@/services/inmuebleService'
import type { IInmueble } from '@/types/inmueble'
import { TIPO_LABELS } from './constants'
import { money } from '@/components/dashboard/secciones/_shared'
import { SolicitudesVisitaWidget } from './SolicitudesVisitaWidget'
import { cn } from '@/lib/utils'
import {
  IconPlus,
  IconLoader,
  IconEye,
  IconEyeOff,
  IconGlobe,
  IconPencil,
  IconBuilding2,
  IconCheck,
  IconImage,
  IconMapPin,
  IconBed,
  IconBath,
  IconRuler,
  IconCar,
} from '@/components/icons'

// ── Helpers de presentación (estilo mockup) ──────────────────

type VitrinaKind = 'vitrina' | 'pausada' | 'inactiva' | 'arrendada' | 'estudio'

const VITRINA_STYLE: Record<VitrinaKind, { wrap: string; dot: string; label: string }> = {
  vitrina: { wrap: 'bg-primary-50 text-primary-700', dot: 'bg-primary-600', label: 'En vitrina' },
  arrendada: { wrap: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', label: 'Arrendada' },
  estudio: { wrap: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500', label: 'En estudio' },
  pausada: {
    wrap: 'bg-gray-50 text-gray-600 border border-gray-200',
    dot: 'bg-gray-400',
    label: 'Pausada',
  },
  inactiva: {
    wrap: 'bg-gray-50 text-gray-600 border border-gray-200',
    dot: 'bg-gray-400',
    label: 'Inactiva',
  },
}

// Publicado DE VERDAD = flag + estado 'disponible' (la vitrina pública exige
// ambos; el flag solo no basta — un ocupado con flag residual NO se publica).
function estaPublicado(i: IInmueble): boolean {
  return i.visible_vitrina && i.estado === 'disponible'
}

// 2.5: "Pausar" = visible_vitrina=false conservando estado 'disponible'. Por
// eso "Pausada" es NO estar en vitrina estando disponible; 'inactivo' es el
// soft-delete ("Inactiva"), 'ocupado' es un arriendo en curso ("Arrendada") y
// 'en_estudio' un candidato en proceso ("En estudio") — ninguno de esos dos
// está publicado aunque conserve un flag residual.
function vitrinaKind(i: IInmueble): VitrinaKind {
  if (i.estado === 'inactivo') return 'inactiva'
  if (i.estado === 'ocupado') return 'arrendada'
  if (i.estado === 'en_estudio') return 'estudio'
  if (estaPublicado(i)) return 'vitrina'
  return 'pausada'
}

// Chips de filtro: reutilizan el mapeo de patch de VitrinaFilterChips (page).
type ChipKey = 'todas' | 'vitrina' | 'pausadas' | 'inactivas'

const CHIPS: Array<{
  key: ChipKey
  label: string
  patch: { visible_vitrina: boolean | ''; estado: IInmueble['estado'] | '' }
}> = [
  { key: 'todas', label: 'Todas', patch: { visible_vitrina: '', estado: '' } },
  // Publicado real = flag + disponible (un ocupado con flag residual no está en la vitrina).
  { key: 'vitrina', label: 'En vitrina', patch: { visible_vitrina: true, estado: 'disponible' } },
  // 2.5: "Pausadas" = fuera de vitrina estando disponible (lo que produce Pausar).
  { key: 'pausadas', label: 'Pausadas', patch: { visible_vitrina: false, estado: 'disponible' } },
  { key: 'inactivas', label: 'Inactivas', patch: { visible_vitrina: '', estado: 'inactivo' } },
]

// ── Componente ───────────────────────────────────────────────

export function PropiedadesInmobiliariaView() {
  const router = useRouter()
  const { user } = useAuth()
  const { inmuebles, meta, filters, isLoading, setFilters, updateInmuebleInList } = useInmuebles()

  const { completitud } = usePerfilCompletitud()
  const perfilIncompleto =
    user?.rol === 'inmobiliaria' && completitud !== null && !completitud.completo

  // Stat-cards reales derivados del listado en pantalla + meta.
  // Publicado real = flag + disponible (un ocupado con flag residual no cuenta).
  const enVitrina = inmuebles.filter(estaPublicado).length
  const disponibles = inmuebles.filter((i) => i.estado === 'disponible').length
  // 2.5: pausada = disponible pero fuera de vitrina (lo que hace "Pausar").
  const pausadas = inmuebles.filter((i) => !i.visible_vitrina && i.estado === 'disponible').length

  // Detección endurecida: los chips vitrina/pausadas setean flag + estado
  // 'disponible'; una combinación mixta (p. ej. flag=true con otro estado,
  // metida por URL o filtros externos) no resalta ningún chip específico.
  const activeChip: ChipKey =
    filters.visible_vitrina === true && filters.estado === 'disponible'
      ? 'vitrina'
      : filters.visible_vitrina === false && filters.estado === 'disponible'
        ? 'pausadas'
        : filters.estado === 'inactivo'
          ? 'inactivas'
          : 'todas'

  // "Agregar propiedad": gate por perfil incompleto → datos-contrato con returnTo.
  function handleCreateClick() {
    if (perfilIncompleto) {
      router.push('/configuracion/datos-contrato?returnTo=' + encodeURIComponent('/inmuebles/nuevo'))
      return
    }
    router.push('/inmuebles/nuevo')
  }

  // Toggle vitrina: optimista + revert (lógica de page.tsx:113-135).
  async function handleToggleVitrina(inmueble: IInmueble, value: boolean) {
    updateInmuebleInList({ ...inmueble, visible_vitrina: value })
    try {
      await inmuebleService.toggleVisibleVitrina(inmueble.id, value)
      toast.success(value ? 'Inmueble publicado en la vitrina' : 'Inmueble retirado de la vitrina')
    } catch {
      updateInmuebleInList({ ...inmueble, visible_vitrina: !value })
      toast.error('Error al actualizar la visibilidad en vitrina')
    }
  }

  async function copiarCodigo(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo)
      toast.success(`Código ${codigo} copiado`)
    } catch {
      toast.error('No se pudo copiar el código')
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado: intro + saldo + agregar propiedad */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-500">
          Gestiona tus propiedades · Publica en cofianza.co · Recibe solicitudes de visita
        </p>
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary-600 bg-primary-50 px-3.5 py-1.5 text-sm font-bold text-primary-700">
            <IconBuilding2 size={14} />
            {meta ? meta.total : '…'} propiedades
          </span>
          <button
            type="button"
            onClick={handleCreateClick}
            className="inline-flex items-center gap-1.5 rounded-lg bg-coral-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-coral-600"
          >
            <IconPlus size={16} />
            Agregar propiedad
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total"
          value={meta?.total ?? inmuebles.length}
          sub="Propiedades registradas"
          icon={IconBuilding2}
          iconClass="bg-slate-100 text-slate-500"
        />
        <StatCard
          label="En vitrina"
          value={enVitrina}
          color="text-primary-600"
          sub="Publicadas en cofianza.co"
          icon={IconGlobe}
          iconClass="bg-primary-50 text-primary-600"
        />
        <StatCard
          label="Disponibles"
          value={disponibles}
          color="text-blue-600"
          sub="Listas para arrendar"
          icon={IconCheck}
          iconClass="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Pausadas"
          value={pausadas}
          sub="Inactivas en este momento"
          icon={IconEyeOff}
          iconClass="bg-gray-100 text-gray-500"
        />
      </div>

      {/* Lista de propiedades */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-5">
          <h3 className="flex items-center gap-2.5 text-base font-bold text-gray-900">
            <span className="inline-block h-2 w-2 rounded-full bg-primary-600" />
            Tus propiedades
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {CHIPS.map((c) => (
              <button
                key={c.key}
                onClick={() => setFilters({ ...c.patch, page: 1 })}
                className={cn(
                  'rounded-full border-[1.5px] px-3.5 py-1 text-xs font-bold transition-colors',
                  activeChip === c.key
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary-600',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
              <IconLoader size={20} className="animate-spin text-primary-600" />
              Cargando propiedades…
            </div>
          ) : inmuebles.length === 0 ? (
            <div className="py-12 text-center">
              <IconBuilding2 size={44} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-900">No hay propiedades para este filtro</p>
              <p className="mt-1 text-sm text-gray-500">
                Agrega una con el botón “Agregar propiedad”.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {inmuebles.map((i) => {
                const vk = vitrinaKind(i)
                const vs = VITRINA_STYLE[vk]
                // "Pausar" se ofrece siempre que el flag esté encendido (limpia
                // también un flag residual en no-disponibles); "Publicar" solo
                // en 'disponible' (el API rechaza publicar en otros estados).
                const flagVitrina = i.visible_vitrina
                const puedeTogglear = i.estado !== 'inactivo' && (flagVitrina || i.estado === 'disponible')
                return (
                  <div
                    key={i.id}
                    className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-primary-300 hover:shadow-md sm:flex-row sm:items-center"
                  >
                    {/* Foto de la fachada */}
                    <Link
                      href={`/inmuebles/${i.id}`}
                      className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-24 sm:w-36"
                    >
                      {i.foto_fachada_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={i.foto_fachada_url}
                          alt={i.direccion}
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-300">
                          <IconImage size={30} />
                        </div>
                      )}
                      {/* Badge de vitrina sobre la foto */}
                      <span
                        className={cn(
                          'absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur-sm',
                          vs.wrap,
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', vs.dot)} />
                        {vs.label}
                      </span>
                    </Link>

                    {/* Info de la propiedad */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copiarCodigo(i.codigo)}
                          title="Click para copiar el código"
                          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary-50 px-2 py-0.5 font-mono text-[11px] font-extrabold text-primary-700 transition-colors hover:bg-primary-100"
                        >
                          {i.codigo}
                        </button>
                        <span className="truncate text-xs font-medium text-gray-400">{TIPO_LABELS[i.tipo]}</span>
                      </div>

                      <h4 className="truncate text-base font-bold text-gray-900">{i.direccion}</h4>
                      {i.ciudad && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                          <IconMapPin size={12} className="shrink-0 text-gray-400" />
                          <span className="truncate">{i.ciudad}</span>
                        </p>
                      )}

                      {/* Chips de amenidades */}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs font-medium text-gray-500">
                        {i.habitaciones > 0 && (
                          <span className="inline-flex items-center gap-1" title="Habitaciones">
                            <IconBed size={14} className="text-gray-400" />
                            {i.habitaciones}
                          </span>
                        )}
                        {i.banos > 0 && (
                          <span className="inline-flex items-center gap-1" title="Baños">
                            <IconBath size={14} className="text-gray-400" />
                            {i.banos}
                          </span>
                        )}
                        {i.area_m2 ? (
                          <span className="inline-flex items-center gap-1" title="Área">
                            <IconRuler size={14} className="text-gray-400" />
                            {i.area_m2} m²
                          </span>
                        ) : null}
                        {i.parqueaderos > 0 && (
                          <span className="inline-flex items-center gap-1" title="Parqueaderos">
                            <IconCar size={14} className="text-gray-400" />
                            {i.parqueaderos}
                          </span>
                        )}
                      </div>

                      {/* Precio */}
                      <p className="mt-2">
                        <span className="text-lg font-black tracking-tight text-gray-900">{money(i.valor_arriendo)}</span>
                        <span className="ml-1 text-xs font-medium text-gray-400">/mes</span>
                      </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
                      <Link
                        href={`/inmuebles/${i.id}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:border-coral-500 hover:text-coral-600"
                      >
                        <IconGlobe size={13} />
                        Ver en web
                      </Link>
                      {puedeTogglear && (
                        <button
                          type="button"
                          onClick={() => handleToggleVitrina(i, !flagVitrina)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:border-coral-500 hover:text-coral-600"
                        >
                          {flagVitrina ? <IconEyeOff size={13} /> : <IconEye size={13} />}
                          {flagVitrina ? 'Pausar' : 'Publicar'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => router.push(`/inmuebles/${i.id}/editar`)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:border-coral-500 hover:text-coral-600"
                      >
                        <IconPencil size={13} />
                        Editar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Paginación simple (reusa meta del listado) */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 text-sm text-gray-500">
            <span>
              Página {meta.page} de {meta.totalPages} · {meta.total} propiedades
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ page: meta.page - 1 })}
                disabled={meta.page <= 1}
                className="rounded-md border border-gray-200 px-3 py-1 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setFilters({ page: meta.page + 1 })}
                disabled={meta.page >= meta.totalPages}
                className="rounded-md border border-gray-200 px-3 py-1 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Solicitudes de visita recibidas (la page deja de renderizarlo para
          inmobiliaria por el early-return; se incluye aquí para evitar perderlo). */}
      <SolicitudesVisitaWidget />
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  color = 'text-gray-900',
  icon: Icon,
  iconClass = 'bg-gray-100 text-gray-500',
}: {
  label: string
  value: number
  sub: string
  color?: string
  icon?: typeof IconBuilding2
  iconClass?: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</div>
        {Icon && (
          <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', iconClass)}>
            <Icon size={15} />
          </span>
        )}
      </div>
      <div className={cn('mt-2 text-3xl font-black leading-none tracking-tight', color)}>{value}</div>
      <div className="mt-1 text-xs text-gray-500">{sub}</div>
    </div>
  )
}
