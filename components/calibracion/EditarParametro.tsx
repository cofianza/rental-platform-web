'use client'

/**
 * Cambiar un valor en un solo diálogo: qué hace, valor actual → nuevo, la
 * advertencia, el motivo y los cambios anteriores. Guardar aplica de una vez a
 * todo lo que se procese después, por eso el diálogo muestra «pasa de X a Y»
 * antes del botón (es la confirmación). El API valida rango, coherencia
 * entre valores y permiso; su mensaje se muestra aquí mismo.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { calibracionService, type IHistorialCalibracion, type IParametroCalibracion } from '@/services/calibracionService'
import { IconAlertTriangle, IconCheck, IconLoader, IconLock } from '@/components/icons'
import { cn } from '@/lib/utils'
import { CambioItem } from './Historial'
import { EscalaPuntaje, ESCALA_CLAVES } from './EscalaDecision'
import { conUnidad, fmt, humanizar, MES_APAGADO, metaDe, rigeHoy, textoCompleto, type Valores } from './parametros'

interface Props {
  p: IParametroCalibracion
  valores: Valores
  params: IParametroCalibracion[]
  historial: IHistorialCalibracion[]
  onClose: () => void
  /** Recarga los valores; el diálogo espera a que termine para cerrar con la fila ya al día. */
  onGuardado: () => Promise<void>
}

export function EditarParametro({ p, valores, params, historial, onClose, onGuardado }: Props) {
  const meta = metaDe(p.clave)
  const { unidad } = meta
  const binario = unidad === 'onoff' || unidad === 'criterio'
  // Un interruptor llega ya con el valor contrario: abrirlo es pedir el cambio.
  const [valor, setValor] = useState(binario ? String(p.valor === 1 ? 0 : 1) : String(p.valor))
  // Safari y Firefox de escritorio muestran type="month" como texto: lo escrito
  // vive aparte para no borrarlo a medias; `valor` solo toma un mes completo.
  const [mesTxt, setMesTxt] = useState(
    unidad === 'mes' && p.valor < MES_APAGADO ? `${String(p.valor).slice(0, 4)}-${String(p.valor).slice(4)}` : '',
  )
  const [motivo, setMotivo] = useState('')
  // «Es igual al actual» solo después de que la persona toque el valor, no al abrir.
  const [tocado, setTocado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const fijo = p.min === p.max
  const soloLectura = fijo || p.editable === false
  const exigeMotivo = !!meta.motivo
  const nuevo = Number(valor)
  const valido = valor.trim() !== '' && Number.isFinite(nuevo)
  const cambiado = valido && nuevo !== p.valor
  const anteriores = historial.filter((h) => h.clave === p.clave).slice(0, 5)
  const aplicaHoy = rigeHoy(meta.rige, valores)

  function validar(): string | null {
    if (!valido)
      return unidad === 'mes' ? 'Elija un mes, o «Dejar sin activar».' : 'Escriba solo el número, sin puntos de miles (por ejemplo 3500000).'
    // La fracción del canon se escribe como fracción (0,15), aunque se lea «15 % del canon»:
    // quien escribe el porcentaje (15) no debe leer que 15 está dentro del rango.
    if (unidad === 'fraccion_canon' && (nuevo < p.min || nuevo > p.max))
      return nuevo > p.max && nuevo <= 100
        ? `Escríbalo como fracción: ${fmt(nuevo / 100)} = ${fmt(nuevo)} % del canon.`
        : `Escríbalo como fracción, de ${fmt(p.min)} a ${fmt(p.max)} (0,15 = 15 % del canon).`
    if (nuevo < p.min || nuevo > p.max) return `Debe estar entre ${conUnidad(p.min, p)} y ${conUnidad(p.max, p)}.`
    if (p.entero && !Number.isInteger(nuevo)) return 'Debe ser un número entero.'
    if (unidad === 'mes' && nuevo < MES_APAGADO && (nuevo % 100 < 1 || nuevo % 100 > 12)) return 'Elija un mes válido.'
    if (meta.opciones && !meta.opciones.includes(nuevo)) return `Elija ${meta.opciones.map((o) => conUnidad(o, p)).join(', ')}.`
    if (exigeMotivo && !motivo.trim()) return 'Escriba el motivo: este cambio lo exige.'
    return null
  }

  async function guardar() {
    const e = validar()
    if (e) return setError(e)
    setError(null)
    setGuardando(true)
    try {
      await calibracionService.actualizar(p.clave, nuevo, motivo.trim() || undefined)
      toast.success(`${meta.nombre}: ${conUnidad(nuevo, p)}`)
      await onGuardado()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  const accion = unidad === 'onoff' ? (nuevo === 1 ? 'Encender' : 'Apagar') : 'Guardar cambio'

  return (
    <Modal isOpen onClose={guardando ? () => {} : onClose} title={meta.nombre} size="lg">
      <div className="space-y-4 text-sm">
        <p className="text-gray-700">{textoCompleto(meta) || humanizar(p.descripcion)}</p>
        {meta.ejemplo?.(valores) && <p className="text-gray-600">{meta.ejemplo(valores)}</p>}
        {meta.nota && <p className="text-gray-600">{meta.nota}</p>}
        {aplicaHoy && meta.notaRige && (
          <p className="text-gray-600">
            <span className="font-semibold">Cuándo aplica:</span> {meta.notaRige}.
          </p>
        )}
        {!aplicaHoy && !fijo && (
          <p className="rounded-lg bg-gray-100 p-3 text-xs text-gray-700">
            Hoy no cambia ningún resultado{meta.notaRige ? `: ${meta.notaRige}` : ''}.
            {!soloLectura && ' Se puede dejar listo para cuando aplique.'}
          </p>
        )}

        {/* Antes → después: es lo que se confirma al guardar. */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-600">Valor actual</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{conUnidad(p.valor, p)}</p>
            {p.valor !== p.valorDefault && <p className="text-xs text-gray-600">Valor inicial: {conUnidad(p.valorDefault, p)}</p>}
          </div>
          {!soloLectura && (
            <div className={cn('rounded-lg border p-3', cambiado ? 'border-primary-300 bg-primary-50' : 'border-gray-200')}>
              <p className="text-xs font-semibold text-gray-600">{binario ? 'Quedará' : 'Nuevo valor'}</p>
              {binario ? (
                unidad === 'criterio' ? (
                  <div role="group" aria-label="Nuevo valor" className="mt-1 flex gap-2">
                    {[1, 0].map((o) => (
                      <button
                        key={o}
                        type="button"
                        aria-pressed={nuevo === o}
                        onClick={() => {
                          setTocado(true)
                          setValor(String(o))
                        }}
                        className={cn(
                          'min-h-10 flex-1 rounded-lg border px-3 py-2 font-semibold',
                          nuevo === o ? 'border-primary-600 bg-white text-primary-800' : 'border-gray-300 text-gray-600',
                        )}
                      >
                        {conUnidad(o, p)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-2xl font-bold tabular-nums text-primary-800">{conUnidad(nuevo, p)}</p>
                )
              ) : meta.opciones ? (
                <div role="group" aria-label="Nuevo valor" className="mt-1 flex flex-wrap gap-2">
                  {meta.opciones.map((o) => (
                    <button
                      key={o}
                      type="button"
                      aria-pressed={nuevo === o}
                      onClick={() => {
                        setTocado(true)
                        setValor(String(o))
                        setError(null)
                      }}
                      className={cn(
                        'min-h-10 rounded-lg border px-3 py-2 font-semibold tabular-nums',
                        nuevo === o ? 'border-primary-600 bg-white text-primary-800' : 'border-gray-300 text-gray-600',
                      )}
                    >
                      {conUnidad(o, p)}
                    </button>
                  ))}
                </div>
              ) : unidad === 'mes' ? (
                <div className="mt-1 flex flex-col gap-1.5">
                  <input
                    type="month"
                    aria-label="Nuevo mes"
                    placeholder="AAAA-MM"
                    value={mesTxt}
                    autoFocus
                    onChange={(e) => {
                      setMesTxt(e.target.value)
                      const m = /^(\d{4})-?(\d{2})$/.exec(e.target.value.trim())
                      setTocado(true)
                      setValor(m ? `${m[1]}${m[2]}` : '')
                      setError(null)
                    }}
                    className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMesTxt('')
                      setTocado(true)
                      setValor(String(MES_APAGADO))
                      setError(null)
                    }}
                    className="inline-flex min-h-10 items-center self-start text-sm font-medium text-primary-700 hover:underline"
                  >
                    Dejar sin activar
                  </button>
                </div>
              ) : (
                <label className="mt-1 flex items-center gap-2">
                  <span className="sr-only">Nuevo valor</span>
                  {(unidad === 'cop' || unidad === 'factor') && (
                    <span className="text-lg font-semibold text-gray-500">{unidad === 'cop' ? '$' : '×'}</span>
                  )}
                  <input
                    type="number"
                    inputMode="decimal"
                    step={p.entero ? 1 : 0.01}
                    min={p.min}
                    max={p.max}
                    value={valor}
                    autoFocus
                    onChange={(e) => {
                      setTocado(true)
                      setValor(e.target.value)
                      setError(null)
                    }}
                    aria-invalid={!!error}
                    aria-describedby={`rango-${p.clave}`}
                    className="min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-right text-lg font-semibold tabular-nums text-gray-900"
                  />
                  <span className="shrink-0 text-gray-500">{sufijo(unidad, nuevo)}</span>
                </label>
              )}
              {!binario && !meta.opciones && (
                <p id={`rango-${p.clave}`} className="mt-1 text-xs text-gray-600">
                  {unidad === 'mes'
                    ? 'Primer mes que cobra la plataforma (AAAA-MM, por ejemplo 2026-11).'
                    : unidad === 'fraccion_canon'
                      ? `Escríbalo como fracción, de ${fmt(p.min)} a ${fmt(p.max)} (0,15 = 15 % del canon).`
                      : `Permitido: de ${conUnidad(p.min, p)} a ${conUnidad(p.max, p)}.`}
                  {unidad === 'cop' && valido && <span className="font-semibold text-gray-700"> Quedaría en {conUnidad(nuevo, p)}.</span>}
                </p>
              )}
            </div>
          )}
        </div>

        {!soloLectura && cambiado && ESCALA_CLAVES.includes(p.clave) && (
          <div>
            <p className="mb-1 text-xs font-semibold text-gray-600">Así quedaría la escala</p>
            <EscalaPuntaje valores={{ ...valores, [p.clave]: nuevo }} resaltar={p.clave} />
          </div>
        )}

        {p.advertencia && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <IconAlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              <strong>Tenga en cuenta:</strong> {humanizar(p.advertencia)}
            </span>
          </p>
        )}
        {!soloLectura && meta.matriz && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <IconAlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              Este valor cambia resultados de la plataforma (qué se aprueba o se rechaza, o hasta qué canon llega la cobertura): antes de
              guardarlo, pida a Tecnología que valide la matriz de casos de prueba y confirme que ningún caso crítico cambia de resultado.
            </span>
          </p>
        )}

        {soloLectura ? (
          <p className="flex items-center gap-2 rounded-lg bg-gray-100 p-3 text-xs text-gray-700">
            <IconLock size={14} className="shrink-0" />
            {fijo ? 'Este valor está fijo: ya no se usa y no se puede cambiar.' : 'Solo la Gerencia General puede cambiar este valor.'}
          </p>
        ) : (
          <>
            <label className="block text-sm font-medium text-gray-800">
              Motivo {exigeMotivo ? '(obligatorio)' : '(opcional)'} — queda en el historial
              <textarea
                aria-required={exigeMotivo || undefined}
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value)
                  setError(null)
                }}
                maxLength={500}
                rows={2}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal text-gray-900"
              />
            </label>
            {cambiado ? (
              <p className="rounded-lg border border-primary-200 bg-primary-50 p-3 font-medium text-gray-900">
                Pasa de <span className="tabular-nums">{conUnidad(p.valor, p)}</span> a{' '}
                <span className="font-bold tabular-nums text-primary-800">{conUnidad(nuevo, p)}</span>. Aplica desde ya a lo que se procese de aquí en
                adelante.
              </p>
            ) : (
              valido && tocado && <p className="text-xs text-gray-600">El valor nuevo es igual al actual: no hay nada que guardar.</p>
            )}
            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={guardando}
                className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardar}
                disabled={guardando || (valido && nuevo === p.valor)}
                className={cn(
                  'flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50',
                  unidad === 'onoff' && nuevo === 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-700 hover:bg-primary-800',
                )}
              >
                {guardando ? <IconLoader size={16} className="animate-spin" /> : <IconCheck size={16} />}
                {accion}
              </button>
            </div>
          </>
        )}

        {anteriores.length > 0 && (
          <details className="rounded-lg border border-gray-200">
            <summary className="flex min-h-10 cursor-pointer items-center px-4 py-2 text-sm font-semibold text-gray-700">Cambios anteriores de este valor ({anteriores.length})</summary>
            <ul className="divide-y divide-gray-100 border-t border-gray-100">
              {anteriores.map((h) => (
                <CambioItem key={h.id} h={h} params={params} conNombre={false} />
              ))}
            </ul>
          </details>
        )}
      </div>
    </Modal>
  )
}

/** La unidad al lado del campo: «pts», «%», «días»… ($ va antes). */
function sufijo(unidad: string, n: number): string {
  const uno = n === 1
  // La fracción se escribe como tal (0,15) y al lado se lee en porcentaje del canon.
  if (unidad === 'fraccion_canon') return Number.isFinite(n) ? `= ${fmt(n * 100)} % del canon` : '% del canon'
  return (
    {
      pct: '%',
      puntos: 'pts',
      horas: uno ? 'hora' : 'horas',
      dias: uno ? 'día' : 'días',
      dias_habiles: uno ? 'día hábil' : 'días hábiles',
      meses: uno ? 'mes' : 'meses',
      veces: 'veces',
      consultas: uno ? 'consulta' : 'consultas',
    } as Record<string, string>
  )[unidad] ?? ''
}

