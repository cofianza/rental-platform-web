/**
 * Cláusulas adicionales — administrador (Contratos V3, Entrega 4, diseño §7).
 *
 * - Biblioteca: modelos sugeridos por Cofianza (inmobiliaria_id NULL). Crear y
 *   editar con EditorClausula en modo biblioteca (admite [[campo]]); inhabilitar
 *   con motivo o reactivar.
 * - Registro: cláusulas propias de las inmobiliarias. Solo lectura del texto y
 *   de sus usos; Cofianza puede inhabilitarlas hacia adelante (los borradores
 *   que la usan quedan bloqueados en el paso 4; los firmados no cambian).
 *
 * Las rutas del administrador no dependen de CONTRATOS_V3_ENABLED: Cofianza
 * carga la biblioteca antes del lanzamiento.
 */

'use client'

import { Fragment, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Badge, Button, ConfirmDialog, MotivoDialog, PageHeader, SearchInput, Tabs } from '@/components/ui'
import {
  IconChevronDown,
  IconChevronRight,
  IconLoader,
  IconLock,
  IconPencil,
  IconPlus,
  IconRefresh,
} from '@/components/icons'
import { Aviso, inputClass } from '@/components/contratos/v3/campos'
import { EditorClausula } from '@/components/contratos/v3/EditorClausula'
import { useAuth } from '@/hooks/useAuth'
import { useClausulasAdmin } from '@/hooks/useClausulasAdmin'
import { ESTADOS_CONTRATO, formatDate, type EstadoContratoKey } from '@/lib/constants'
import type { EstadoRegistro } from '@/services/clausulasService'
import type { ClausulaRegistro } from '@/types/contratoV3'

type Datos = ReturnType<typeof useClausulasAdmin>
type Pestana = 'biblioteca' | 'registro'

const ESTADO: Record<EstadoRegistro, { label: string; className: string }> = {
  activa: { label: 'Activa', className: 'border-green-300 bg-green-50 text-green-700' },
  inhabilitada: { label: 'Inhabilitada', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  eliminada: { label: 'Eliminada', className: 'border-gray-300 bg-gray-100 text-gray-600' },
}

export default function AdminClausulasAdicionalesPage() {
  const { user } = useAuth()

  if (user?.rol !== 'administrador') {
    return (
      <div className="space-y-6">
        <PageHeader title="Cláusulas adicionales" />
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-6">
          <IconLock className="text-red-600" size={20} />
          <p className="text-sm text-red-800">Solo los administradores pueden acceder a esta sección.</p>
        </div>
      </div>
    )
  }
  // Los hooks que llaman al API viven en los paneles: nada se pide sin ser administrador.
  return <Contenido />
}

function Contenido() {
  const [pestana, setPestana] = useState<Pestana>('biblioteca')
  return (
    <div className="space-y-2">
      <PageHeader
        title="Cláusulas adicionales"
        subtitle="Biblioteca de Cofianza y registro de las cláusulas de las inmobiliarias."
      />
      <Tabs
        tabs={[
          { id: 'biblioteca', label: 'Biblioteca' },
          { id: 'registro', label: 'Registro' },
        ]}
        activeTab={pestana}
        onChange={(id) => setPestana(id as Pestana)}
      />
      {/* Los dos paneles quedan montados: cada uno conserva sus filtros y filas abiertas. */}
      <div role="tabpanel" hidden={pestana !== 'biblioteca'}>
        <Biblioteca />
      </div>
      <div role="tabpanel" hidden={pestana !== 'registro'}>
        <Registro />
      </div>
    </div>
  )
}

function Biblioteca() {
  const datos = useClausulasAdmin({ origen: 'biblioteca' })
  // null = cerrado; { clausula: null } = nueva.
  const [editor, setEditor] = useState<{ clausula: ClausulaRegistro | null } | null>(null)
  // Tras un 409 la lista se recarga: el editor toma la versión vigente.
  const abierta = editor?.clausula
  const editando = abierta ? (datos.items.find((c) => c.id === abierta.id) ?? abierta) : null

  return (
    <div className="space-y-4 pt-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditor({ clausula: null })}>
          <IconPlus size={16} />
          Nueva cláusula
        </Button>
      </div>
      <Tabla
        datos={datos}
        biblioteca
        vacio="La biblioteca está vacía. Agrega la primera cláusula sugerida."
        onEditar={(c) => setEditor({ clausula: c })}
      />
      <EditorClausula
        isOpen={editor !== null}
        onClose={() => setEditor(null)}
        clausula={editando}
        biblioteca
        onGuardar={datos.guardar}
      />
    </div>
  )
}

function Registro() {
  const [estado, setEstado] = useState<EstadoRegistro | ''>('')
  const [q, setQ] = useState('')
  const datos = useClausulasAdmin({ origen: 'propia', estado: estado || undefined, q })
  const filtrado = estado !== '' || q.trim() !== ''

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput className="flex-1" placeholder="Buscar por título o texto" onSearch={setQ} />
        <select
          aria-label="Estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoRegistro | '')}
          className={`${inputClass()} bg-white sm:w-48`}
        >
          <option value="">Todas</option>
          <option value="activa">Activas</option>
          <option value="inhabilitada">Inhabilitadas</option>
          <option value="eliminada">Eliminadas</option>
        </select>
      </div>
      <Tabla
        datos={datos}
        vacio={
          filtrado
            ? 'Ninguna cláusula coincide con la búsqueda.'
            : 'Las inmobiliarias aún no han guardado cláusulas propias.'
        }
      />
    </div>
  )
}

function Tabla({
  datos,
  biblioteca = false,
  vacio,
  onEditar,
}: {
  datos: Datos
  biblioteca?: boolean
  vacio: string
  onEditar?: (c: ClausulaRegistro) => void
}) {
  const { items, total, isLoading, error, recargar, hayMas, cargarMas, cargandoMas, cambiarEstado, usos, cargarUsos } =
    datos
  const [abierta, setAbierta] = useState<string | null>(null)
  const [inhabilitar, setInhabilitar] = useState<ClausulaRegistro | null>(null)
  const [reactivar, setReactivar] = useState<ClausulaRegistro | null>(null)
  const [cambiando, setCambiando] = useState(false)

  if (error) {
    return (
      <Aviso tono="error">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>No pudimos cargar las cláusulas.</span>
          <Button variante="secondary" tamano="sm" onClick={() => void recargar()}>
            Reintentar
          </Button>
        </div>
      </Aviso>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Cargando cláusulas">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
            <div className="h-4 w-1/3 rounded bg-gray-200" />
            <div className="mt-3 h-3 w-2/3 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">{vacio}</p>
    )
  }

  const expandir = (id: string) => {
    const abrir = abierta !== id
    setAbierta(abrir ? id : null)
    if (abrir && (usos[id] === undefined || usos[id] === 'error')) void cargarUsos(id)
  }

  const conCambio = async (fn: () => Promise<unknown>) => {
    setCambiando(true)
    try {
      await fn()
    } finally {
      setCambiando(false)
    }
  }

  const acciones = (c: ClausulaRegistro) => (
    <div className="flex flex-wrap gap-2">
      {/* El API deja editar la biblioteca aunque esté inhabilitada (para corregirla antes de reactivarla). */}
      {biblioteca && onEditar && (
        <Button variante="secondary" tamano="sm" onClick={() => onEditar(c)}>
          <IconPencil size={14} />
          Editar
        </Button>
      )}
      {c.estado === 'activa' && (
        <Button variante="secondary" tamano="sm" onClick={() => setInhabilitar(c)}>
          <IconLock size={14} />
          {biblioteca ? 'Inhabilitar' : 'Inhabilitar hacia adelante'}
        </Button>
      )}
      {c.estado === 'inhabilitada' && (
        <Button variante="secondary" tamano="sm" onClick={() => setReactivar(c)}>
          <IconRefresh size={14} />
          Reactivar
        </Button>
      )}
    </div>
  )

  const columnas = biblioteca
    ? ['Título', 'Versión', 'Estado', 'Datos a completar', 'Usos', 'Acciones']
    : ['Título', 'Inmobiliaria', 'Versión', 'Estado', 'Usos', 'Actualizada']

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columnas.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((c) => {
              const open = abierta === c.id
              const e = ESTADO[c.estado]
              return (
                <Fragment key={c.id}>
                  <tr className="align-top">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => expandir(c.id)}
                        aria-expanded={open}
                        className="flex items-start gap-1.5 text-left font-medium text-gray-900 hover:text-primary-700"
                      >
                        {open ? (
                          <IconChevronDown size={16} className="mt-0.5 shrink-0 text-gray-400" />
                        ) : (
                          <IconChevronRight size={16} className="mt-0.5 shrink-0 text-gray-400" />
                        )}
                        <span className="break-words">{c.titulo}</span>
                      </button>
                    </td>
                    {!biblioteca && <td className="px-4 py-3 text-gray-700">{c.inmobiliaria?.nombre ?? '—'}</td>}
                    <td className="px-4 py-3 tabular-nums text-gray-700">{c.version}</td>
                    <td className="px-4 py-3">
                      <Badge estado={c.estado} label={e.label} className={e.className} />
                    </td>
                    {biblioteca && (
                      <td className="px-4 py-3 text-gray-700">{c.campos.length ? c.campos.join(', ') : '—'}</td>
                    )}
                    <td className="px-4 py-3 tabular-nums text-gray-700">{c.usos}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {biblioteca ? acciones(c) : formatDate(c.actualizadaEn)}
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-gray-50/60">
                      <td colSpan={columnas.length} className="px-4 py-4">
                        <Detalle c={c} usos={usos[c.id]} onReintentar={() => void cargarUsos(c.id)}>
                          {!biblioteca && acciones(c)}
                        </Detalle>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span>
          Mostrando {items.length.toLocaleString('es-CO')} de {total.toLocaleString('es-CO')}
        </span>
        {hayMas && (
          <Button variante="secondary" tamano="sm" onClick={() => void cargarMas()} disabled={cargandoMas}>
            {cargandoMas ? 'Cargando…' : 'Cargar más'}
          </Button>
        )}
      </div>

      <MotivoDialog
        // Remonta al cambiar de cláusula: un motivo escrito y cancelado no pasa a otra.
        key={inhabilitar?.id ?? 'cerrado'}
        isOpen={inhabilitar !== null}
        onClose={() => setInhabilitar(null)}
        title="Inhabilitar la cláusula"
        label="Motivo (lo verá la inmobiliaria)"
        confirmLabel="Inhabilitar"
        variant="danger"
        minLength={3}
        isLoading={cambiando}
        onConfirm={(motivo) =>
          conCambio(async () => {
            if (inhabilitar) await cambiarEstado(inhabilitar.id, { estado: 'inhabilitada', motivo })
            setInhabilitar(null)
          })
        }
      />

      <ConfirmDialog
        isOpen={reactivar !== null}
        onClose={() => setReactivar(null)}
        onConfirm={() =>
          conCambio(async () => {
            if (reactivar) await cambiarEstado(reactivar.id, { estado: 'activa' })
          })
        }
        title="¿Reactivar la cláusula?"
        message="Volverá a estar disponible para nuevos contratos."
        confirmLabel="Reactivar"
        isLoading={cambiando}
      />
    </div>
  )
}

function Detalle({
  c,
  usos,
  onReintentar,
  children,
}: {
  c: ClausulaRegistro
  usos: Datos['usos'][string] | undefined
  onReintentar: () => void
  children?: ReactNode
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Texto (versión {c.version})</h3>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800">{c.texto}</p>
        {c.estado === 'inhabilitada' && c.inhabilitadaMotivo && (
          <p className="mt-2 text-xs text-amber-800">Motivo de la inhabilitación: {c.inhabilitadaMotivo}</p>
        )}
      </div>

      {children}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Contratos que la usan</h3>
        {usos === undefined || usos === 'cargando' ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
            <IconLoader size={16} className="animate-spin text-primary-600" />
            Cargando usos…
          </p>
        ) : usos === 'error' ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-red-700">
            <span>No pudimos cargar los usos.</span>
            <Button variante="secondary" tamano="sm" onClick={onReintentar}>
              Reintentar
            </Button>
          </div>
        ) : usos.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Ningún contrato la ha usado.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Contrato N°', 'Estado', 'Versión usada', 'Cláusula', 'Fecha'].map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-500"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usos.map((u) => (
                  <tr key={u.contratoId}>
                    <td className="whitespace-nowrap px-3 py-2">
                      {u.expedienteId ? (
                        <Link
                          href={`/expedientes/${u.expedienteId}/contrato`}
                          className="font-medium text-primary-700 hover:underline"
                        >
                          {u.contratoNumero || 'Sin número'}
                        </Link>
                      ) : (
                        u.contratoNumero || 'Sin número'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                      {ESTADOS_CONTRATO[u.contratoEstado as EstadoContratoKey]?.label ?? u.contratoEstado}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-gray-700">{u.version}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-700">{u.numero}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-700">{formatDate(u.en)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
