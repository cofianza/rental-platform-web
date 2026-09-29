/**
 * SelectorMotivos — H58/H103 (decisión 2026-09-28): el motivo de aprobar,
 * rechazar o condicionar se elige de una lista (uno o varios) y se puede sumar
 * un texto. «Otro» exige el texto. Cada motivo muestra el texto interno y,
 * debajo, lo que verán la inmobiliaria o el propietario.
 */

'use client'

import { IconLoader } from '@/components/icons'
import type { ICatalogoMotivos, IMotivosElegidos, TipoDecision } from '@/types/estudio'

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
export function errorMotivos(tipo: TipoDecision, v: IMotivosElegidos, catalogo: ICatalogoMotivos): string | null {
  const motivos = delTipo(tipo, v, catalogo)
  if (motivos.length === 0) return 'Elige al menos un motivo.'
  if (motivos.includes(OTRO[tipo]) && (v.motivo_detalle ?? '').trim().length < MIN_DETALLE) {
    return `Con «Otro», escribe el motivo (mínimo ${MIN_DETALLE} caracteres).`
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
    <p role="status" className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-500">
      <IconLoader size={16} className="animate-spin" aria-hidden /> Cargando los motivos…
    </p>
  )
}

const TITULO: Record<TipoDecision, string> = {
  aprobar: 'Motivo de la aprobación',
  rechazar: 'Motivo del rechazo',
  condicionar: 'Condiciones',
}

const AYUDA_DETALLE: Record<TipoDecision, string> = {
  aprobar: 'Queda en el fundamento interno de la decisión.',
  rechazar: 'Solo lo ve Cofianza: queda en el fundamento interno.',
  condicionar: 'La inmobiliaria o el propietario lo ven junto a las condiciones: escribe qué deben aportar.',
}

export function SelectorMotivos({
  tipo,
  catalogo,
  value,
  onChange,
  disabled,
}: {
  tipo: TipoDecision
  catalogo: ICatalogoMotivos
  value: IMotivosElegidos
  onChange: (v: IMotivosElegidos) => void
  disabled?: boolean
}) {
  const opciones = Object.entries(catalogo[tipo] ?? {})
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
      <ul className="space-y-1.5">
        {opciones.map(([codigo, m]) => (
          <li key={codigo}>
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={value.motivos.includes(codigo)}
                onChange={() => alternar(codigo)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              {/* Arriba el motivo específico (lo que decide el analista); abajo lo que
                  verá la inmobiliaria, que puede repetirse entre motivos. */}
              <span className="min-w-0 text-sm">
                <span className="block text-gray-900">{m.interno}</span>
                {m.interno !== m.visible && (
                  <span className="block text-xs text-gray-500">La inmobiliaria ve: «{m.visible}»</span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div>
        {tipo === 'condicionar' && <LoVeLaInmobiliaria />}
        <label htmlFor={`${idBase}-detalle`} className="mb-1 block text-sm font-medium text-gray-700">
          {conOtro ? (
            <>
              Escribe el motivo <span className="text-red-500">*</span>
            </>
          ) : (
            'Detalle (opcional)'
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
