/**
 * Lista de acreedores — Adenda 5 definitiva §3.
 *
 * Cada obligación que reportan las centrales se clasifica por su acreedor
 * (financiera, telefonía o comercio y otros sectores), no por el sector que
 * reporta la central. Aquí Cofianza mantiene esa lista: los acreedores que una
 * evaluación vio sin clasificar llegan como pendientes; al clasificarlos rigen
 * para las evaluaciones siguientes (las ya decididas no se recalculan).
 *
 * El administrador clasifica y agrega; gerencia solo consulta. El API valida
 * el rol, la categoría y el motivo. Las reglas de clasificación viven en el API.
 */

'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { IconArrowLeft, IconLoader, IconLock, IconPlus, IconRefresh, IconSearch } from '@/components/icons'
import { useAuth } from '@/hooks/useAuth'
import { useAcreedores } from '@/hooks/useAcreedores'
import { formatDate } from '@/lib/constants'
import { cn } from '@/lib/utils'
import {
  CATEGORIAS_ACREEDOR,
  NOMBRE_CENTRAL,
  type CategoriaAcreedor,
  type CentralAcreedor,
  type EstadoAcreedor,
  type IAcreedor,
} from '@/types/acreedor'

const LIMITE = 50
const ETIQUETA_CATEGORIA = Object.fromEntries(CATEGORIAS_ACREEDOR.map((c) => [c.valor, c.etiqueta])) as Record<CategoriaAcreedor, string>
/** Cómo cuenta cada categoría en la evaluación (solo para mostrar; la regla vive en el API). */
const CLASE_CATEGORIA: Record<CategoriaAcreedor, string> = {
  banco: 'financiera',
  cooperativa: 'financiera',
  fondo_empleados: 'financiera',
  prestamista_efectivo_o_tarjetas: 'financiera',
  libranza: 'financiera',
  telco: 'telefonía',
  real: 'comercio y otros',
}
const CAMPO = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'

/** Diálogo para clasificar un acreedor (o agregar uno a mano). Pide categoría y motivo. */
function DialogoClasificar({
  acreedor,
  nuevo,
  onClose,
  onGuardar,
}: {
  acreedor: IAcreedor | null
  nuevo: boolean
  onClose: () => void
  onGuardar: (datos: { categoria: CategoriaAcreedor; motivo: string; nombre?: string; central?: CentralAcreedor; acreedor_id?: string }) => Promise<boolean>
}) {
  const ids = { categoria: useId(), motivo: useId(), nombre: useId(), central: useId(), acreedor: useId() }
  const [categoria, setCategoria] = useState<CategoriaAcreedor | ''>(acreedor?.categoria ?? '')
  const [motivo, setMotivo] = useState('')
  const [nombre, setNombre] = useState(acreedor?.nombre ?? '')
  const [central, setCentral] = useState<CentralAcreedor>('datacredito')
  const [acreedorId, setAcreedorId] = useState('')
  const [guardando, setGuardando] = useState(false)
  const valido = categoria !== '' && motivo.trim().length > 0 && (!nuevo || acreedorId.trim().length > 0)

  const guardar = async () => {
    if (!valido || guardando) return
    setGuardando(true)
    const ok = await onGuardar({
      categoria: categoria as CategoriaAcreedor,
      motivo: motivo.trim(),
      ...(nombre.trim() ? { nombre: nombre.trim() } : {}),
      ...(nuevo ? { central, acreedor_id: acreedorId.trim() } : {}),
    })
    setGuardando(false)
    if (ok) onClose()
  }

  return (
    <Modal
      isOpen
      onClose={guardando ? () => {} : onClose}
      title={nuevo ? 'Agregar un acreedor' : 'Clasificar acreedor'}
      description="La clasificación aplica a las evaluaciones con las reglas de la Adenda 5 definitiva, desde que se encienda; las ya decididas no cambian."
      size="md"
      footer={
        <ModalAcciones>
          <button type="button" onClick={onClose} disabled={guardando} className={botonModal('secondary')}>
            Volver
          </button>
          <button type="button" onClick={guardar} disabled={!valido || guardando} aria-busy={guardando || undefined} className={botonModal('primary')}>
            {guardando && <IconLoader size={16} className="animate-spin" />}
            Guardar
          </button>
        </ModalAcciones>
      }
    >
      <div className="space-y-4">
        {nuevo ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={ids.central} className="mb-1 block text-sm font-medium text-gray-700">
                Central
              </label>
              <select id={ids.central} value={central} onChange={(e) => setCentral(e.target.value as CentralAcreedor)} className={CAMPO} disabled={guardando}>
                <option value="datacredito">{NOMBRE_CENTRAL.datacredito}</option>
                <option value="transunion">{NOMBRE_CENTRAL.transunion}</option>
              </select>
            </div>
            <div>
              <label htmlFor={ids.acreedor} className="mb-1 block text-sm font-medium text-gray-700">
                Identificador del acreedor en la central <span className="font-normal text-gray-500">(obligatorio)</span>
              </label>
              <input
                id={ids.acreedor}
                value={acreedorId}
                maxLength={40}
                required
                aria-required="true"
                aria-describedby={`${ids.acreedor}-ayuda`}
                onChange={(e) => setAcreedorId(e.target.value)}
                className={CAMPO}
                disabled={guardando}
              />
              <p id={`${ids.acreedor}-ayuda`} className="mt-1 text-xs text-gray-500">
                Tal como aparece en el reporte de la central; se guarda en mayúsculas.
              </p>
            </div>
          </div>
        ) : (
          acreedor && (
            <p className="text-sm text-gray-700">
              <span className="font-medium text-gray-900">{acreedor.nombre ?? 'Sin nombre'}</span> · {NOMBRE_CENTRAL[acreedor.central]} · {acreedor.acreedor_id}
            </p>
          )
        )}
        <div>
          <label htmlFor={ids.nombre} className="mb-1 block text-sm font-medium text-gray-700">
            Nombre visible <span className="font-normal text-gray-500">(opcional{nuevo ? '' : '; vacío conserva el actual'})</span>
          </label>
          <input id={ids.nombre} value={nombre} maxLength={200} onChange={(e) => setNombre(e.target.value)} className={CAMPO} disabled={guardando} />
        </div>
        <div>
          <label htmlFor={ids.categoria} className="mb-1 block text-sm font-medium text-gray-700">
            Categoría <span className="font-normal text-gray-500">(obligatorio)</span>
          </label>
          <select required aria-required="true" id={ids.categoria} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaAcreedor)} className={CAMPO} disabled={guardando}>
            <option value="" disabled>
              Elija una categoría
            </option>
            {CATEGORIAS_ACREEDOR.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.etiqueta}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={ids.motivo} className="mb-1 block text-sm font-medium text-gray-700">
            Motivo <span className="font-normal text-gray-500">(obligatorio)</span>
          </label>
          <textarea
            id={ids.motivo}
            required
            aria-required="true"
            value={motivo}
            maxLength={500}
            rows={3}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Por qué se clasifica así (queda en el registro)."
            className={CAMPO}
            disabled={guardando}
          />
        </div>
      </div>
    </Modal>
  )
}

export default function AcreedoresPage() {
  const { user } = useAuth()
  const esCofianza = user?.rol === 'administrador' || user?.rol === 'gerencia_consulta'
  const puedeEditar = user?.rol === 'administrador'

  const [estado, setEstado] = useState<EstadoAcreedor>('pendiente')
  const [central, setCentral] = useState<CentralAcreedor | ''>('')
  const [busqueda, setBusqueda] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [editando, setEditando] = useState<IAcreedor | null>(null)
  const [agregando, setAgregando] = useState(false)
  const idBusqueda = useId()
  const idCentral = useId()

  // La búsqueda se manda al dejar de escribir.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(busqueda.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [busqueda])

  const { acreedores, total, cargando, error, recargar, clasificar, crear } = useAcreedores(
    { estado, central: central || undefined, q: q || undefined, page, limit: LIMITE },
    esCofianza,
  )
  const paginas = Math.max(1, Math.ceil(total / LIMITE))

  const guardar = async (datos: { categoria: CategoriaAcreedor; motivo: string; nombre?: string; central?: CentralAcreedor; acreedor_id?: string }) => {
    try {
      if (agregando && datos.central && datos.acreedor_id) {
        await crear({ central: datos.central, acreedor_id: datos.acreedor_id, categoria: datos.categoria, motivo: datos.motivo, nombre: datos.nombre })
        toast.success('Acreedor agregado a la lista.')
      } else if (editando) {
        await clasificar(editando.id, { categoria: datos.categoria, motivo: datos.motivo, nombre: datos.nombre })
        toast.success('Acreedor clasificado.')
        // Si era el último pendiente de la página, se vuelve a la anterior (la de ahora quedaría vacía).
        if (estado === 'pendiente' && acreedores.length === 1 && page > 1) setPage((p) => p - 1)
      }
      return true
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'No se pudo guardar. Intente de nuevo.')
      return false
    }
  }

  if (!esCofianza) {
    return (
      <div className="space-y-6">
        <PageHeader title="Lista de acreedores" />
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-6">
          <IconLock className="text-red-600" size={20} />
          <p className="text-sm text-red-800">Esta sección solo la puede ver el equipo de Cofianza.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {puedeEditar && (
        <Link href="/admin/calibracion" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800">
          <IconArrowLeft size={16} />
          Calibración del modelo
        </Link>
      )}
      <PageHeader
        title="Lista de acreedores"
        subtitle="Cómo se clasifica cada acreedor que reportan las centrales: financiero, telefonía o comercio y otros sectores. Aplica a las evaluaciones con las reglas de la Adenda 5 definitiva. Mientras un acreedor esté pendiente, las evaluaciones lo clasifican por el sector que reporta la central."
        actions={
          puedeEditar ? (
            <button type="button" onClick={() => setAgregando(true)} className={botonModal('primary')}>
              <IconPlus size={16} />
              Agregar acreedor
            </button>
          ) : undefined
        }
      />

      {!puedeEditar && <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">Vista de consulta: solo un administrador puede clasificar acreedores.</p>}

      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div role="group" aria-label="Estado" className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          {(['pendiente', 'activo'] as const).map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={estado === e}
              onClick={() => {
                setEstado(e)
                setPage(1)
              }}
              className={cn(
                'min-h-10 flex-1 rounded-md px-4 text-sm font-medium',
                estado === e ? 'bg-primary-50 text-primary-800' : 'text-gray-700 hover:bg-gray-100',
              )}
            >
              {e === 'pendiente' ? 'Pendientes' : 'Clasificados'}
            </button>
          ))}
        </div>
        <div className="md:w-48">
          <label htmlFor={idCentral} className="mb-1 block text-xs font-medium text-gray-600">
            Central
          </label>
          <select
            id={idCentral}
            value={central}
            onChange={(e) => {
              setCentral(e.target.value as CentralAcreedor | '')
              setPage(1)
            }}
            className={cn(CAMPO, 'min-h-10')}
          >
            <option value="">Las dos</option>
            <option value="datacredito">{NOMBRE_CENTRAL.datacredito}</option>
            <option value="transunion">{NOMBRE_CENTRAL.transunion}</option>
          </select>
        </div>
        <div className="relative flex-1">
          <label htmlFor={idBusqueda} className="sr-only">
            Buscar por nombre o identificador
          </label>
          <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            id={idBusqueda}
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o identificador"
            className={cn(CAMPO, 'min-h-10 pl-10')}
          />
        </div>
      </div>

      {cargando && (acreedores.length === 0 || acreedores.some((a) => a.estado !== estado)) ? (
        <SkeletonTable filas={6} columnas={4} etiqueta="Cargando la lista de acreedores…" />
      ) : error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-semibold text-red-800">No se pudo cargar la lista de acreedores.</p>
          <p className="mt-1 text-sm text-red-700">Intente de nuevo en un momento.</p>
          <button
            type="button"
            onClick={() => void recargar()}
            disabled={cargando}
            aria-busy={cargando || undefined}
            className="mt-4 disabled:opacity-60 inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <IconRefresh size={14} />
            Reintentar
          </button>
        </div>
      ) : acreedores.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
          {q
            ? `Ningún acreedor coincide con «${q}».`
            : estado === 'pendiente'
              ? `No hay acreedores pendientes de clasificar${central ? ` en ${NOMBRE_CENTRAL[central]}` : ''}.`
              : `Todavía no hay acreedores clasificados${central ? ` en ${NOMBRE_CENTRAL[central]}` : ''}.`}
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-600" aria-live="polite">
            {total} {total === 1 ? 'acreedor' : 'acreedores'}
            {cargando ? ' · actualizando…' : ''}
          </p>
          <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
            {acreedores.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words font-medium text-gray-900">{a.nombre ?? 'Sin nombre'}</p>
                  <p className="mt-0.5 break-all text-sm text-gray-600">
                    {NOMBRE_CENTRAL[a.central]} · {a.acreedor_id}
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    {a.estado === 'pendiente' ? (
                      <>
                        Visto en {a.visto_en_estudios} {a.visto_en_estudios === 1 ? 'evaluación' : 'evaluaciones'}
                        {a.visto_ultima_vez ? `, la última el ${formatDate(a.visto_ultima_vez)}` : ''}
                      </>
                    ) : (
                      <>
                        {a.categoria ? `${ETIQUETA_CATEGORIA[a.categoria]} (${CLASE_CATEGORIA[a.categoria]})` : 'Sin categoría'} · actualizado el {formatDate(a.actualizado_en)}
                      </>
                    )}
                  </p>
                  {a.estado === 'activo' && a.motivo && <p className="mt-1 break-words text-sm text-gray-500">Motivo: {a.motivo}</p>}
                </div>
                {puedeEditar && (
                  <button type="button" onClick={() => setEditando(a)} className={botonModal(a.estado === 'pendiente' ? 'primary' : 'secondary', 'shrink-0')}>
                    {a.estado === 'pendiente' ? 'Clasificar' : 'Cambiar categoría'}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {paginas > 1 && (
            <nav aria-label="Páginas" className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={botonModal('secondary')}>
                Anterior
              </button>
              <span className="text-sm text-gray-600">
                Página {page} de {paginas}
              </span>
              <button type="button" onClick={() => setPage((p) => Math.min(paginas, p + 1))} disabled={page >= paginas} className={botonModal('secondary')}>
                Siguiente
              </button>
            </nav>
          )}
        </>
      )}

      {(editando || agregando) && (
        <DialogoClasificar
          acreedor={editando}
          nuevo={agregando}
          onClose={() => {
            setEditando(null)
            setAgregando(false)
          }}
          onGuardar={guardar}
        />
      )}
    </div>
  )
}
