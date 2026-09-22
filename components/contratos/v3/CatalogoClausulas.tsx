/**
 * Catálogo de cláusulas adicionales del paso 4 (Contratos V3, Entrega 4), solo
 * para la inmobiliaria: biblioteca de Cofianza y sus cláusulas propias.
 * "Agregar" las pasa a la lista del contrato (la maneja el paso 4); redactar,
 * editar y eliminar las propias pasa por el API (useClausulasAdicionales).
 */

'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Badge, Button, ConfirmDialog, SearchInput, Tabs } from '@/components/ui'
import { IconCheck, IconPencil, IconPlus, IconTrash } from '@/components/icons'
import type { useClausulasAdicionales } from '@/hooks/useClausulasAdicionales'
import type { ClausulaCatalogo } from '@/types/contratoV3'
import { Aviso } from './campos'
import { EditorClausula } from './EditorClausula'

export type DatosCatalogo = ReturnType<typeof useClausulasAdicionales>

interface Props {
  /** Resultado de useClausulasAdicionales(): el paso 4 lo comparte para pintar su lista. */
  datos: DatosCatalogo
  /** Ids de las cláusulas que ya están en la lista del contrato. */
  elegidas: string[]
  /** Agregar desde una tarjeta, o una cláusula propia recién redactada. */
  onAgregar: (c: ClausulaCatalogo) => void
  /** Se eliminó una propia que estaba en la lista: quítala del contrato. */
  onQuitar: (id: string) => void
}

type Pestana = 'biblioteca' | 'propias'

/** Minúsculas y sin tildes, para buscar "clausula" y encontrar "Cláusula". */
const plano = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

function filtrar(lista: ClausulaCatalogo[], q: string) {
  const p = plano(q.trim())
  return p ? lista.filter((c) => plano(`${c.titulo} ${c.texto}`).includes(p)) : lista
}

export function CatalogoClausulas({ datos, elegidas, onAgregar, onQuitar }: Props) {
  const { catalogo, error, recargar, guardar, eliminar } = datos
  const [pestana, setPestana] = useState<Pestana>('biblioteca')
  const [q, setQ] = useState<Record<Pestana, string>>({ biblioteca: '', propias: '' })
  // null = cerrado; { clausula: null } = nueva.
  const [editor, setEditor] = useState<{ clausula: ClausulaCatalogo | null } | null>(null)
  const [borrando, setBorrando] = useState<ClausulaCatalogo | null>(null)
  const [eliminando, setEliminando] = useState(false)

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

  if (!catalogo) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Cargando cláusulas">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
            <div className="h-4 w-1/3 rounded bg-gray-200" />
            <div className="mt-3 h-3 w-full rounded bg-gray-100" />
            <div className="mt-2 h-3 w-5/6 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    )
  }

  // Tras un 409 el catálogo se recarga: el editor toma la versión vigente (si sigue existiendo).
  const abierta = editor?.clausula
  const editando = abierta ? (catalogo.propias.find((c) => c.id === abierta.id) ?? abierta) : null

  const lista = (items: ClausulaCatalogo[], busqueda: string, vacio: string, acciones?: (c: ClausulaCatalogo) => ReactNode) => {
    const visibles = filtrar(items, busqueda)
    if (visibles.length === 0) {
      return (
        <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          {items.length === 0 ? vacio : `Ninguna cláusula coincide con «${busqueda.trim()}».`}
        </p>
      )
    }
    return (
      <ul className="space-y-3">
        {visibles.map((c) => (
          <Tarjeta key={c.id} c={c} elegida={elegidas.includes(c.id)} onAgregar={() => onAgregar(c)}>
            {acciones?.(c)}
          </Tarjeta>
        ))}
      </ul>
    )
  }

  const confirmarBorrado = async () => {
    if (!borrando) return
    setEliminando(true)
    try {
      if ((await eliminar(borrando.id)) && elegidas.includes(borrando.id)) onQuitar(borrando.id)
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div>
      <Tabs
        tabs={[
          { id: 'biblioteca', label: 'Biblioteca de Cofianza', count: catalogo.biblioteca.length },
          { id: 'propias', label: 'Mis cláusulas', count: catalogo.propias.length },
        ]}
        activeTab={pestana}
        onChange={(id) => setPestana(id as Pestana)}
      />

      {/* Los dos paneles quedan montados para que cada búsqueda conserve lo escrito. */}
      <div role="tabpanel" hidden={pestana !== 'biblioteca'} className="space-y-3 pt-4">
        <p className="text-sm text-gray-500">
          Modelos sugeridos por Cofianza. Al incorporarlos quedan bajo responsabilidad de la inmobiliaria.
        </p>
        <SearchInput
          placeholder="Buscar por título o texto"
          onSearch={(v) => setQ((p) => (p.biblioteca === v ? p : { ...p, biblioteca: v }))}
        />
        {lista(catalogo.biblioteca, q.biblioteca, 'Cofianza aún no ha publicado cláusulas en la biblioteca.')}
      </div>

      <div role="tabpanel" hidden={pestana !== 'propias'} className="space-y-3 pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput
            className="flex-1"
            placeholder="Buscar por título o texto"
            onSearch={(v) => setQ((p) => (p.propias === v ? p : { ...p, propias: v }))}
          />
          <Button onClick={() => setEditor({ clausula: null })}>
            <IconPlus size={16} />
            Redactar cláusula
          </Button>
        </div>
        {lista(
          catalogo.propias,
          q.propias,
          'Aún no has guardado cláusulas propias. Redacta una para reutilizarla en tus contratos.',
          (c) => (
            <>
              {/* El API solo edita cláusulas activas (una inhabilitada solo se elimina). */}
              {c.estado === 'activa' && (
                <Button variante="secondary" tamano="sm" onClick={() => setEditor({ clausula: c })}>
                  <IconPencil size={14} />
                  Editar
                </Button>
              )}
              <Button variante="secondary" tamano="sm" onClick={() => setBorrando(c)}>
                <IconTrash size={14} />
                Eliminar
              </Button>
            </>
          ),
        )}
      </div>

      <EditorClausula
        isOpen={editor !== null}
        onClose={() => setEditor(null)}
        clausula={editando}
        onGuardar={guardar}
        onGuardada={editor?.clausula ? undefined : onAgregar}
      />

      <ConfirmDialog
        isOpen={borrando !== null}
        onClose={() => setBorrando(null)}
        onConfirm={confirmarBorrado}
        title="¿Eliminar la cláusula?"
        message={
          borrando
            ? `«${borrando.titulo}» dejará de estar disponible para nuevos contratos. Los contratos que ya la usan conservan su texto.${
                elegidas.includes(borrando.id) ? ' También se quitará de este contrato.' : ''
              }`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        isLoading={eliminando}
      />
    </div>
  )
}

function Tarjeta({
  c,
  elegida,
  onAgregar,
  children,
}: {
  c: ClausulaCatalogo
  elegida: boolean
  onAgregar: () => void
  children?: ReactNode
}) {
  const inhabilitada = c.estado === 'inhabilitada'

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900">{c.titulo}</h4>
        {inhabilitada && (
          <Badge
            estado="inhabilitada"
            label="Inhabilitada por Cofianza"
            className="border-amber-200 bg-amber-50 text-amber-800"
          />
        )}
      </div>
      <TextoClausula texto={c.texto} lineas={3} />
      {c.campos.length > 0 && (
        <p className="mt-1 text-xs text-gray-500">Datos a completar: {c.campos.join(', ')}</p>
      )}
      {inhabilitada && c.inhabilitadaMotivo && (
        <p className="mt-2 text-xs text-amber-800">Motivo: {c.inhabilitadaMotivo}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {elegida ? (
          <Button variante="secondary" tamano="sm" disabled>
            <IconCheck size={14} />
            Agregada
          </Button>
        ) : (
          !inhabilitada && (
            <Button tamano="sm" onClick={onAgregar}>
              <IconPlus size={14} />
              Agregar
            </Button>
          )
        )}
        {children}
      </div>
    </li>
  )
}

/** Vista recortada a 2 (o 3) líneas; "Ver texto" aparece siempre que el recorte oculte algo (en un celular, casi siempre). */
export function TextoClausula({ texto, lineas = 2 }: { texto: string; lineas?: 2 | 3 }) {
  const [completo, setCompleto] = useState(false)
  const [recortado, setRecortado] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || completo) return
    // observe() ya entrega una primera medida; después, cada cambio de ancho vuelve a medir.
    const ro = new ResizeObserver(() => setRecortado(el.scrollHeight > el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [texto, completo])
  return (
    <>
      <p ref={ref} className={`mt-1 break-words text-sm text-gray-600 ${completo ? '' : lineas === 3 ? 'line-clamp-3' : 'line-clamp-2'}`}>
        {texto}
      </p>
      {(recortado || completo) && (
        <button
          type="button"
          aria-expanded={completo}
          onClick={() => setCompleto((v) => !v)}
          className="mt-1 text-xs font-semibold text-primary-700 hover:underline"
        >
          {completo ? 'Ocultar texto' : 'Ver texto'}
        </button>
      )}
    </>
  )
}
