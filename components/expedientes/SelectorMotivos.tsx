/**
 * SelectorMotivos — H58/H103 (decisión 2026-09-28): el motivo de aprobar,
 * rechazar o condicionar se elige de una lista (uno o varios) y se puede sumar
 * un texto. «Otro» exige el texto. Cada motivo muestra el texto interno y,
 * debajo, lo que verán la inmobiliaria o el propietario.
 */

'use client'

import type { ICatalogoMotivos, IMotivosElegidos, TipoDecision } from '@/types/estudio'
import { textoVisible } from './textoVisible'
import { REPORTE_CENTRALES } from './DocumentosConsultados'
import { Skeleton } from '@/components/ui/Skeleton'

const OTRO: Record<TipoDecision, string> = { aprobar: 'A9', rechazar: 'R9', condicionar: 'C6' }
const MIN_DETALLE = 10

/**
 * M2/M3 (revisión 2026-09-28): solo cuentan los códigos de ESTA decisión. Si el
 * analista marcó motivos en otra (p. ej. Aprobar) y cambió a Rechazar, esos
 * códigos no se ven en pantalla y el API los rechazaría con un 400.
 */
function delTipo(tipo: TipoDecision, v: IMotivosElegidos, catalogo: ICatalogoMotivos): string[] {
  const validos = catalogo[tipo] ?? {}
  return v.motivos.filter((c) => c in validos)
}

/** null si está completo; si no, qué falta. */
/** Lo que impide aprobar con estos motivos: la API rechaza lo mismo. */
export function errorMotivosAprobacion(
  motivos: string[],
  noAplican: Record<string, string>,
  documentos: string[],
  arrendamientoPrevio: string | undefined,
): string | null {
  const invalido = motivos.find((c) => noAplican[c])
  if (invalido) return `Desmarque el motivo que no aplica. ${noAplican[invalido]}`
  if (motivos.includes('A1') && !documentos.some((d) => d !== REPORTE_CENTRALES))
    return 'Con «Documentos de ingreso verificados», indique al menos un documento de ingreso que revisó, además del reporte de las centrales.'
  if (motivos.includes('A3') && arrendamientoPrevio !== 'referencia_positiva')
    return 'Para «Referencia de arrendamiento», elija una referencia positiva verificada en el historial de arrendamiento.'
  return null
}

/**
 * El primer motivo de ESTA decisión que el estudio no admite (la API responde
 * 400 MOTIVO_NO_APLICA), o null. Adenda 5 §7: al rechazar, R10 solo aplica en el
 * tramo de revisión; un código que no está en el catálogo (ADENDA5=0) no cuenta.
 */
export function errorMotivoNoAplica(
  tipo: TipoDecision,
  v: IMotivosElegidos,
  catalogo: ICatalogoMotivos,
  noAplican: Record<string, string>,
): string | null {
  const invalido = delTipo(tipo, v, catalogo).find((c) => noAplican[c])
  return invalido ? `Desmarque el motivo que no aplica. ${noAplican[invalido]}` : null
}

export function errorMotivos(tipo: TipoDecision, v: IMotivosElegidos, catalogo: ICatalogoMotivos): string | null {
  const motivos = delTipo(tipo, v, catalogo)
  if (motivos.length === 0) return 'Elija al menos un motivo.'
  if (motivos.includes(OTRO[tipo]) && (v.motivo_detalle ?? '').trim().length < MIN_DETALLE) {
    return `Con «Otro», escriba el motivo (mínimo ${MIN_DETALLE} caracteres).`
  }
  return null
}

/** Para enviar al API: solo los códigos de esta decisión y sin detalle vacío. */
export function motivosParaEnviar(tipo: TipoDecision, v: IMotivosElegidos, catalogo: ICatalogoMotivos): IMotivosElegidos {
  const detalle = (v.motivo_detalle ?? '').trim()
  return { motivos: delTipo(tipo, v, catalogo), ...(detalle ? { motivo_detalle: detalle } : {}) }
}

/** Arriba de todo texto libre que llega a la inmobiliaria o al propietario (decisión 2026-09-28). */
export function LoVeLaInmobiliaria() {
  return <p className="mb-1 text-xs font-semibold text-amber-700">Este texto lo ve la inmobiliaria o el propietario</p>
}

/**
 * B14: mientras llega el catálogo no se pintan los campos de texto (lo escrito
 * ahí se ocultaba y no viajaba al llegar la lista).
 */
export function CargandoMotivos() {
  return (
    <div role="status" className="space-y-2 rounded-lg border border-gray-200 px-3 py-3">
      <span className="sr-only">Cargando los motivos…</span>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-5 w-full" />
      ))}
    </div>
  )
}

const TITULO: Record<TipoDecision, string> = {
  aprobar: 'Motivo de la aprobación',
  rechazar: 'Motivo por el que no es aprobable',
  condicionar: 'Condiciones',
}

const AYUDA_DETALLE: Record<TipoDecision, string> = {
  aprobar: 'Queda en el fundamento interno de la decisión.',
  rechazar: 'Solo lo ve Cofianza: queda en el fundamento interno.',
  condicionar: 'La inmobiliaria o el propietario lo ven junto a las condiciones: escriba qué deben aportar.',
}

export function SelectorMotivos({
  tipo,
  catalogo,
  value,
  onChange,
  disabled,
  noAplican = {},
  errorLectura,
  onReintentar,
}: {
  tipo: TipoDecision
  catalogo: ICatalogoMotivos
  value: IMotivosElegidos
  onChange: (v: IMotivosElegidos) => void
  disabled?: boolean
  /** Código → por qué este estudio no lo admite. */
  noAplican?: Record<string, string>
  errorLectura?: boolean
  onReintentar?: () => void
}) {
  // Los que no aplican a este estudio (y no están marcados) se guardan en un
  // desplegable aparte: arriba quedan solo los que se pueden elegir. Uno marcado
  // que deja de aplicar se queda arriba, con su aviso, para poder desmarcarlo.
  const todas = Object.entries(catalogo[tipo] ?? {})
  const esBloqueado = (codigo: string) => !!noAplican[codigo] && !value.motivos.includes(codigo)
  const opciones = todas.filter(([codigo]) => !esBloqueado(codigo))
  const bloqueadas = todas.filter(([codigo]) => esBloqueado(codigo))
  const idBase = `motivos-${tipo}`
  const conOtro = value.motivos.includes(OTRO[tipo])

  const alternar = (codigo: string) =>
    onChange({
      ...value,
      motivos: value.motivos.includes(codigo) ? value.motivos.filter((c) => c !== codigo) : [...value.motivos, codigo],
    })

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="mb-1 block text-sm font-medium text-gray-700">
        {TITULO[tipo]} <span className="text-red-500">*</span>
        <span className="ml-1 font-normal text-gray-500">(uno o varios)</span>
      </legend>
      {errorLectura && (
        <p role="status" className="text-sm text-amber-800">
          No pudimos comprobar qué motivos aplican a este estudio.{' '}
          <button type="button" onClick={onReintentar} className="font-medium underline">
            Reintentar
          </button>
        </p>
      )}
      <ul className="space-y-1.5">
        {opciones.map(([codigo, m]) => (
          <FilaMotivo
            key={codigo}
            texto={textoVisible(m.interno)}
            visible={loVeLaInmobiliaria(tipo, m)}
            marcado={value.motivos.includes(codigo)}
            noAplica={noAplican[codigo]}
            onAlternar={() => alternar(codigo)}
          />
        ))}
      </ul>
      {bloqueadas.length > 0 && (
        <details className="rounded-lg border border-dashed border-gray-300">
          <summary className="block cursor-pointer px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900">
            {bloqueadas.length === 1 ? 'Un motivo no aplica' : `${bloqueadas.length} motivos no aplican`} a este estudio (ver por qué)
          </summary>
          <ul className="space-y-1.5 px-3 pb-3">
            {bloqueadas.map(([codigo, m]) => (
              <FilaMotivo
                key={codigo}
                texto={textoVisible(m.interno)}
                visible={null}
                marcado={false}
                noAplica={noAplican[codigo]}
                onAlternar={() => {}}
              />
            ))}
          </ul>
        </details>
      )}
      <div>
        {tipo === 'condicionar' && <LoVeLaInmobiliaria />}
        <label htmlFor={`${idBase}-detalle`} className="mb-1 block text-sm font-medium text-gray-700">
          {conOtro ? (
            <>
              Escriba el motivo <span className="text-red-500">*</span>
            </>
          ) : (
            'Comentario adicional (opcional)'
          )}
        </label>
        <textarea
          id={`${idBase}-detalle`}
          value={value.motivo_detalle ?? ''}
          onChange={(e) => onChange({ ...value, motivo_detalle: e.target.value })}
          rows={2}
          maxLength={1000}
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
        />
        <p className="mt-1 text-xs text-gray-500">{AYUDA_DETALLE[tipo]}</p>
      </div>
    </fieldset>
  )
}

/**
 * Un motivo de la lista. Arriba el motivo específico (lo que decide el analista);
 * abajo lo que verá la inmobiliaria, que puede repetirse entre motivos, o por qué
 * no aplica a este estudio. El catálogo lo escribe la API: llega ya limpio de
 * «(§14)» o «Anexo A» (textoVisible).
 */
/**
 * Lo que verá la inmobiliaria o el propietario de este motivo, o null. Al aprobar
 * la API guarda solo el texto interno (el aviso dice que se aprobó, sin motivo):
 * ahí no se promete nada. Si el texto visible repite el interno, tampoco.
 */
function loVeLaInmobiliaria(tipo: TipoDecision, m: { interno: string; visible: string }): string | null {
  if (tipo === 'aprobar') return null
  const visible = textoVisible(m.visible, { externo: true })
  return visible && visible !== textoVisible(m.interno) ? visible : null
}

function FilaMotivo({
  texto,
  visible,
  marcado,
  noAplica,
  onAlternar,
}: {
  texto: string
  visible: string | null
  marcado: boolean
  noAplica?: string
  onAlternar: () => void
}) {
  const bloqueado = !!noAplica && !marcado
  return (
    <li>
      <label
        className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
          bloqueado
            ? 'cursor-not-allowed border-gray-200 bg-gray-50'
            : marcado && noAplica
              ? 'cursor-pointer border-amber-300 bg-amber-50/60'
              : marcado
              ? 'cursor-pointer border-primary-300 bg-primary-50/60'
              : 'cursor-pointer border-gray-200 hover:bg-gray-50'
        }`}
      >
        <input
          type="checkbox"
          checked={marcado}
          disabled={bloqueado}
          onChange={onAlternar}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="min-w-0 text-sm">
          <span className={`block ${bloqueado ? 'text-gray-500' : 'text-gray-900'}`}>{texto}</span>
          {noAplica ? (
            <span className="block text-xs text-amber-800">No aplica. {noAplica}</span>
          ) : visible && (
            <span className="block text-xs text-gray-500">La inmobiliaria ve: «{visible}»</span>
          )}
        </span>
      </label>
    </li>
  )
}
