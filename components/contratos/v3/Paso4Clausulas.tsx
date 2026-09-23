/**
 * Paso 4 del asistente de contratos V3: cláusulas adicionales (Entrega 4).
 *
 * Solo la inmobiliaria del contrato arma la lista (biblioteca de Cofianza y
 * cláusulas propias) y acepta el aviso de responsabilidad; los roles internos
 * la ven en solo lectura. La lista vive en la página (forms[4]); aquí se pinta
 * con los ordinales reales que calcula el API. Las reglas, el máximo y la
 * autorización del exceso los decide el API; aquí solo se muestran.
 */

'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Badge, Button, ConfirmDialog } from '@/components/ui'
import {
  IconCheckCircle,
  IconChevronDown,
  IconChevronUp,
  IconMail,
  IconShield,
  IconShieldCheck,
  IconX,
} from '@/components/icons'
import { formatDate, formatDateTime } from '@/lib/constants'
import { useClausulasAdicionales } from '@/hooks/useClausulasAdicionales'
import type { ErrorPaso, ErroresPaso, FormPaso4 } from '@/hooks/useContratoV3'
import { soporteService } from '@/services/soporteService'
import type { ClausulaCatalogo, EstadoAsistente, Paso4 } from '@/types/contratoV3'
import { Aviso, Campo, EncabezadoPaso } from './campos'
import { CatalogoClausulas, TextoClausula } from './CatalogoClausulas'
import { ListaHallazgos } from './EditorClausula'

type Adicionales = NonNullable<EstadoAsistente['contrato']>['adicionales']
export type Paso4ConClausulas = Extract<Paso4, { clausulas: unknown }>

/** Tope técnico: la numeración llega a QUINCUAGÉSIMA OCTAVA (25 ordinales). */
const MAX_LISTA = 25

/** Vista previa: llena los [[campo]] con lo escrito; los vacíos quedan a la vista. */
const llenar = (texto: string, valores: Record<string, string>) =>
  texto.replace(/\[\[([^\]]+)\]\]/g, (m, k: string) => valores[k]?.trim() || m)

interface Props {
  value: FormPaso4
  onChange: (v: FormPaso4) => void
  errores: ErroresPaso
  /** Último 422 del paso 4: hallazgos por fila (`indice`). */
  errorPaso: ErrorPaso | null
  adicionales: Adicionales
  /** Paso 4 guardado con cláusulas; null si se omitió o no se ha guardado. */
  guardado: Paso4ConClausulas | null
  /** La lista del formulario es la guardada (sin cambios pendientes). */
  sinCambios: boolean
  /** RBAC inmobiliaria con edición: arma la lista y acepta el aviso. */
  incorpora: boolean
  /** Administrador: autoriza el exceso sobre el máximo. */
  esAdmin: boolean
  /** Bloqueo ADICIONALES_EXCEDEN_LIMITE vigente (lista guardada, sin autorizar). */
  excedeLimite: boolean
  autorizando: boolean
  onAutorizar: (huella: string) => Promise<boolean>
  contratoNumero: string
  expedienteNumero: string | null
  expedienteId: string
}

export function Paso4Clausulas(p: Props) {
  const { value, onChange, errores, adicionales, guardado, sinCambios, incorpora } = p
  const datos = useClausulasAdicionales(incorpora)
  const { catalogo } = datos
  const [solicitando, setSolicitando] = useState(false)
  const [solicitada, setSolicitada] = useState(false)
  // Lista guardada que el administrador tenía en pantalla al pedir autorizar: se autoriza su huella.
  const [aAutorizar, setAAutorizar] = useState<Paso4ConClausulas | null>(null)

  const { elegidas } = value
  const n = elegidas.length
  const excede = n > adicionales.maximo
  const porId = new Map([...(catalogo?.biblioteca ?? []), ...(catalogo?.propias ?? [])].map((c) => [c.id, c]))
  const guardadas = new Map((guardado?.clausulas ?? []).map((c) => [c.clausulaId, c]))
  // La aceptación guardada vale mientras la lista no cambie y el aviso sea el mismo.
  const aceptacion =
    sinCambios && guardado?.aceptacion.avisoVersion === adicionales.aviso.version ? guardado.aceptacion : null

  // Las claves de `valores` siguen los [[campo]] de la versión vigente del catálogo: el API
  // guarda siempre esa versión, y una versión nueva puede traer otros datos (si no, 422 CLAUSULA_CAMPOS
  // con claves viejas que ningún input permite corregir). Todo onChange pasa por aquí, también la casilla.
  const remapear = (lista: FormPaso4['elegidas']) =>
    lista.map((e) => {
      const c = porId.get(e.clausulaId)
      return c ? { ...e, valores: Object.fromEntries(c.campos.map((k) => [k, e.valores[k] ?? ''])) } : e
    })
  // Cualquier cambio en la lista (o en sus datos) exige aceptar de nuevo el aviso.
  const cambiar = (lista: FormPaso4['elegidas']) => onChange({ elegidas: remapear(lista), acepto: false })

  const agregar = (c: ClausulaCatalogo) => {
    if (elegidas.some((e) => e.clausulaId === c.id)) return
    if (n >= MAX_LISTA) {
      toast.error(`Un contrato admite máximo ${MAX_LISTA} cláusulas adicionales.`)
      return
    }
    // Las claves de `valores` son los [[campo]]: así el paso sabe qué datos exigir.
    cambiar([...elegidas, { clausulaId: c.id, valores: Object.fromEntries(c.campos.map((k) => [k, ''])) }])
  }
  // Lo último que se pintó: "Deshacer" repone la cláusula en la lista de ESE momento, no en la de cuando se quitó.
  const actual = useRef(value)
  useEffect(() => {
    actual.current = value
  })
  const quitar = (id: string) => {
    const i = elegidas.findIndex((e) => e.clausulaId === id)
    if (i < 0) return
    const quitada = elegidas[i]
    cambiar(elegidas.filter((e) => e.clausulaId !== id))
    // Quitar borra lo escrito en sus datos: se puede deshacer unos segundos.
    toast('Cláusula quitada del contrato.', {
      action: {
        label: 'Deshacer',
        onClick: () => {
          const lista = actual.current.elegidas
          if (lista.some((e) => e.clausulaId === id)) return
          cambiar([...lista.slice(0, i), quitada, ...lista.slice(i)])
        },
      },
    })
  }
  const mover = (i: number, d: -1 | 1) => {
    const l = [...elegidas]
    ;[l[i], l[i + d]] = [l[i + d], l[i]]
    cambiar(l)
  }
  const ponerValor = (i: number, campo: string, v: string) =>
    cambiar(elegidas.map((e, j) => (j === i ? { ...e, valores: { ...e.valores, [campo]: v } } : e)))

  // Hallazgos del último 422: los de una fila van bajo ella; CLAUSULA_NO_DISPONIBLE solo trae `indice`.
  const err = p.errorPaso?.paso === 4 ? p.errorPaso : null
  const filaDe = (h: { indice?: number }) => h.indice ?? err?.indice ?? null
  const sueltos = err?.hallazgos.filter((h) => filaDe(h) === null) ?? []

  const solicitarRevision = async () => {
    setSolicitando(true)
    try {
      await soporteService.createTicket({
        tipo: 'clausulas_adicionales',
        asunto: `Revisión de ${n} cláusulas adicionales — contrato ${p.contratoNumero}`,
        descripcion: `${p.expedienteNumero ? `Estudio ${p.expedienteNumero}. ` : ''}${window.location.origin}/expedientes/${p.expedienteId}/contrato`,
        prioridad: 'media',
      })
      setSolicitada(true)
      toast.success('Solicitud enviada a Cofianza. Te avisaremos en tus notificaciones cuando la revisemos.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No pudimos enviar la solicitud.')
    } finally {
      setSolicitando(false)
    }
  }

  const autorizado =
    sinCambios && guardado && adicionales.excesoAutorizado?.huella === guardado.huella
      ? adicionales.excesoAutorizado
      : null

  return (
    <div className="space-y-6">
      <EncabezadoPaso
        titulo="Cláusulas adicionales"
        subtitulo="Opcional. Se imprimen al final del contrato, bajo «CLÁUSULAS ADICIONALES DEL ARRENDADOR»."
      />
      <Aviso>{adicionales.prevalencia}</Aviso>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-900">Así quedarán en el contrato</h3>
          <span className={`text-xs tabular-nums ${excede ? 'font-semibold text-amber-700' : 'text-gray-500'}`}>
            {n} de {adicionales.maximo}
          </span>
        </div>
        {errores.elegidas && <p className="text-xs text-red-600">{errores.elegidas}</p>}
        <ListaHallazgos hallazgos={sueltos} titulo="Revisa las cláusulas:" />

        {n === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            {incorpora
              ? 'Este contrato no lleva cláusulas adicionales. Agrégalas desde la biblioteca o desde tus cláusulas, o continúa sin ellas.'
              : 'Este contrato no lleva cláusulas adicionales. Solo la inmobiliaria del contrato puede incorporarlas.'}
          </p>
        ) : (
          <ol className="space-y-3">
            {elegidas.map((e, i) => {
              const c = porId.get(e.clausulaId)
              const g = guardadas.get(e.clausulaId)
              // Sin cambios, lo que está en el contrato es la copia guardada; con cambios, lo que se guardará.
              const s = sinCambios ? g : undefined
              const titulo = s?.titulo ?? c?.titulo ?? g?.titulo
              const origen = s?.origen ?? c?.origen ?? g?.origen
              const deFila = err?.hallazgos.filter((h) => filaDe(h) === i) ?? []
              return (
                <li key={e.clausulaId} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="break-words text-sm font-semibold text-gray-900">
                          {adicionales.ordinales[i]}:{' '}
                          {titulo
                            ? titulo.toLocaleUpperCase('es-CO')
                            : incorpora && !catalogo
                              ? 'Cargando…'
                              : 'Cláusula no disponible'}
                        </h4>
                        {origen && (
                          <Badge
                            estado={origen}
                            label={origen === 'biblioteca' ? 'Biblioteca' : 'Propia'}
                            className={origen === 'biblioteca' ? 'border-primary-200 bg-primary-50 text-primary-700' : ''}
                          />
                        )}
                        {/* El catálogo solo trae lo activo de la biblioteca y lo no eliminado propio. */}
                        {catalogo && (!c || c.estado !== 'activa') && (
                          <Badge estado="no_disponible" label="No disponible" className="border-red-200 bg-red-50 text-red-700" />
                        )}
                      </div>
                      <TextoClausula texto={s?.texto ?? (c ? llenar(c.texto, e.valores) : (g?.texto ?? ''))} />
                    </div>
                    {incorpora && (
                      <div className="flex shrink-0 gap-1 self-end sm:self-auto">
                        <BotonFila etiqueta="Subir" disabled={i === 0} onClick={() => mover(i, -1)}>
                          <IconChevronUp size={16} />
                        </BotonFila>
                        <BotonFila etiqueta="Bajar" disabled={i === n - 1} onClick={() => mover(i, 1)}>
                          <IconChevronDown size={16} />
                        </BotonFila>
                        <BotonFila etiqueta="Quitar" onClick={() => quitar(e.clausulaId)}>
                          <IconX size={16} />
                        </BotonFila>
                      </div>
                    )}
                  </div>

                  {incorpora && c && c.campos.length > 0 && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {c.campos.map((campo) => (
                        <Campo
                          key={campo}
                          label={campo}
                          requerido
                          maxLength={200}
                          autoComplete="off"
                          value={e.valores[campo] ?? ''}
                          onChange={(ev) => ponerValor(i, campo, ev.target.value)}
                          error={errores[`elegidas.${i}.${campo}`]}
                        />
                      ))}
                    </div>
                  )}

                  {incorpora && sinCambios && c?.estado === 'activa' && g && c.version > g.version && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                      <span>Hay una versión más reciente de esta cláusula.</span>
                      <button
                        type="button"
                        onClick={() => cambiar([...elegidas])}
                        className="font-semibold text-primary-700 hover:underline"
                      >
                        Usar la versión nueva
                      </button>
                    </div>
                  )}

                  <ListaHallazgos hallazgos={deFila} titulo="Esta cláusula no se puede incorporar:" />
                  {err && err.indice === i && deFila.length === 0 && <Aviso tono="error">{err.mensaje}</Aviso>}
                </li>
              )
            })}
          </ol>
        )}

        {incorpora && excede && !sinCambios && (
          <Aviso tono="aviso">
            Superas el máximo de {adicionales.maximo} cláusulas adicionales. Puedes guardar, pero el contrato quedará
            bloqueado hasta que Cofianza revise y autorice este conjunto.
          </Aviso>
        )}

        {sinCambios && guardado && p.excedeLimite && (incorpora || p.esAdmin) && (
          <div className="flex flex-wrap gap-2">
            {incorpora && (
              <Button variante="secondary" onClick={solicitarRevision} disabled={solicitando || solicitada}>
                <IconMail size={16} />
                {solicitada ? 'Solicitud enviada' : solicitando ? 'Enviando…' : 'Solicitar revisión a Cofianza'}
              </Button>
            )}
            {p.esAdmin && (
              <Button onClick={() => setAAutorizar(guardado)} disabled={p.autorizando}>
                <IconShieldCheck size={16} />
                Autorizar estas {n} cláusulas
              </Button>
            )}
          </div>
        )}
        {autorizado && (
          <p className="flex items-center gap-1.5 text-xs text-gray-600">
            <IconShieldCheck size={14} className="text-primary-600" />
            Autorizado por Cofianza el {formatDate(autorizado.en)}
          </p>
        )}
      </section>

      {incorpora && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Agregar cláusulas</h3>
          <CatalogoClausulas
            datos={datos}
            elegidas={elegidas.map((e) => e.clausulaId)}
            onAgregar={agregar}
            onQuitar={quitar}
          />
        </section>
      )}

      {n > 0 &&
        (incorpora ? (
          <section className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2">
              <IconShield size={18} className="text-primary-600" />
              <h3 className="text-sm font-semibold text-gray-900">Aviso de responsabilidad</h3>
            </div>
            <p className="text-sm text-gray-700">{adicionales.aviso.texto}</p>
            {aceptacion ? (
              <Aceptado a={aceptacion} />
            ) : (
              <div>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm font-medium text-gray-900">
                  <input
                    type="checkbox"
                    aria-invalid={!!errores.acepto}
                    checked={value.acepto}
                    onChange={(ev) => onChange({ elegidas: remapear(elegidas), acepto: ev.target.checked })}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary-600"
                  />
                  Acepto, en nombre de la inmobiliaria, este aviso de responsabilidad sobre las cláusulas adicionales
                  de este contrato.
                </label>
                {errores.acepto && <p className="mt-1 text-xs text-red-600">{errores.acepto}</p>}
              </div>
            )}
          </section>
        ) : (
          guardado && <Aceptado a={guardado.aceptacion} />
        ))}

      <ConfirmDialog
        isOpen={!!aAutorizar}
        onClose={() => setAAutorizar(null)}
        onConfirm={async () => {
          if (aAutorizar && (await p.onAutorizar(aAutorizar.huella))) toast.success('Cláusulas adicionales autorizadas.')
        }}
        title={`¿Autorizar ${aAutorizar?.clausulas.length ?? 0} cláusulas adicionales?`}
        message="La autorización vale solo para este conjunto exacto. Si la inmobiliaria cambia la lista, deberá solicitarla de nuevo."
        confirmLabel="Autorizar"
        isLoading={p.autorizando}
      />
    </div>
  )
}

function Aceptado({ a }: { a: Paso4ConClausulas['aceptacion'] }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-gray-600">
      <IconCheckCircle size={14} className="mt-px shrink-0 text-primary-600" />
      <span>
        Aceptado por {a.nombre} ({a.email}) el {formatDateTime(a.en)}
      </span>
    </p>
  )
}

function BotonFila({
  etiqueta,
  children,
  ...props
}: { etiqueta: string; children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
      {...props}
    >
      {children}
    </button>
  )
}
