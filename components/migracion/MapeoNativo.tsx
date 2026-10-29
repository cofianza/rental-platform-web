/**
 * Mapeador de columnas del archivo que exporta el sistema de la inmobiliaria
 * (Adenda 1 §5.1-§5.6): de qué columna sale cada dato de Cofianza, separando
 * una celda en varios datos (§5.2) y con equivalencias de valores (§5.3); la
 * vista previa de las filas transformadas (§5.4) y el resumen del mapeo
 * aplicado a un lote (§5.6). Solo backoffice de Cofianza.
 */

'use client'

import { useState } from 'react'
import { Button, Modal } from '@/components/ui'
import { IconCheck, IconPlus, IconTrash } from '@/components/icons'
import { Chip, Tabla, Td, money, type ChipTone } from '@/components/dashboard/secciones/_shared'
import { TIPO_OPTIONS } from '@/components/inmuebles/constants'
import type { CampoMapeo, MapeoColumnas, ReglaMapeo, ResultadoValidacion, VistaPreviaNativa } from '@/types/migracion'

const INPUT =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'

const TIPOS_DOCUMENTO = ['CC', 'CE', 'PPT', 'PEP', 'Pasaporte', 'NIT'] as const
const TIPOS_INMUEBLE = TIPO_OPTIONS.filter((o) => o.value).map((o) => o.label)

/** obligatorio: 'si' = columna requerida; 'lote' = puede salir de los datos del lote; 'no' = opcional. */
export const CAMPOS_MAPEO_UI: {
  clave: CampoMapeo
  etiqueta: string
  corta: string
  obligatorio: 'si' | 'lote' | 'no'
  lista?: readonly string[]
}[] = [
  { clave: 'codigo_interno', etiqueta: 'Código interno del inmueble', corta: 'Código interno', obligatorio: 'si' },
  { clave: 'direccion', etiqueta: 'Dirección del inmueble', corta: 'Dirección', obligatorio: 'si' },
  { clave: 'municipio', etiqueta: 'Municipio', corta: 'Municipio', obligatorio: 'lote' },
  { clave: 'destinacion', etiqueta: 'Destinación', corta: 'Destinación', obligatorio: 'si', lista: ['Vivienda', 'Comercial'] },
  { clave: 'canon', etiqueta: 'Canon mensual sin IVA (COP)', corta: 'Canon sin IVA', obligatorio: 'si' },
  { clave: 'fecha_inicio', etiqueta: 'Fecha de inicio', corta: 'Inicio', obligatorio: 'si' },
  { clave: 'fecha_vencimiento', etiqueta: 'Fecha de vencimiento', corta: 'Vencimiento', obligatorio: 'si' },
  { clave: 'arrendatario_nombre', etiqueta: 'Arrendatario: nombre completo', corta: 'Arrendatario', obligatorio: 'si' },
  {
    clave: 'arrendatario_tipo_documento',
    etiqueta: 'Arrendatario: tipo de documento',
    corta: 'Tipo de documento',
    obligatorio: 'lote',
    lista: TIPOS_DOCUMENTO,
  },
  { clave: 'arrendatario_numero_documento', etiqueta: 'Arrendatario: número de documento', corta: 'Número de documento', obligatorio: 'no' },
  {
    clave: 'autoriza_reporte',
    etiqueta: '¿El contrato autoriza reportar a centrales de riesgo?',
    corta: 'Autoriza reporte',
    obligatorio: 'lote',
    lista: ['Sí', 'No'],
  },
  { clave: 'observaciones', etiqueta: 'Observaciones', corta: 'Observaciones', obligatorio: 'no' },
  { clave: 'estrato', etiqueta: 'Estrato', corta: 'Estrato', obligatorio: 'no' },
  { clave: 'tipo_inmueble', etiqueta: 'Tipo de inmueble', corta: 'Tipo de inmueble', obligatorio: 'no', lista: TIPOS_INMUEBLE },
]

export const campoUI = (c: CampoMapeo) => CAMPOS_MAPEO_UI.find((x) => x.clave === c)!

export const MAPEO_VACIO: MapeoColumnas = {
  hoja: null,
  fila_encabezados: 1,
  campos: {},
  lote: { municipio: null, arrendatario_tipo_documento: 'CC', autoriza_reporte: null },
}

const separacion = (r: ReglaMapeo) => (r.separador ? `por «${r.separador}», parte ${r.parte}` : '—')
const equivalenciasTxt = (r: ReglaMapeo) =>
  Object.entries(r.equivalencias ?? {})
    .map(([a, b]) => `${a} → ${b}`)
    .join(', ') || '—'

// ── Editor ──

export function EditorMapeo({
  mapeo,
  hojas,
  encabezados,
  disabled,
  onChange,
  onEstructura,
  onEquivalencias,
}: {
  mapeo: MapeoColumnas
  hojas: string[]
  encabezados: string[]
  disabled: boolean
  onChange: (m: MapeoColumnas) => void
  /** Hoja o fila de títulos: cambian las columnas, la página genera otra vista previa. */
  onEstructura: (m: MapeoColumnas) => void
  onEquivalencias: (campo: CampoMapeo) => void
}) {
  const setRegla = (campo: CampoMapeo, r: ReglaMapeo | null) => {
    const campos = { ...mapeo.campos }
    if (r) campos[campo] = r
    else delete campos[campo]
    onChange({ ...mapeo, campos })
  }
  const setLote = (lote: Partial<MapeoColumnas['lote']>) => onChange({ ...mapeo, lote: { ...mapeo.lote, ...lote } })

  return (
    <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
      <div className="grid gap-4 md:grid-cols-2">
        {hojas.length > 1 && (
          <div>
            <label htmlFor="mapeo-hoja" className="block text-sm font-medium text-gray-900">
              Hoja con los contratos
            </label>
            <select
              id="mapeo-hoja"
              value={mapeo.hoja ?? hojas[0]}
              disabled={disabled}
              onChange={(e) => onEstructura({ ...mapeo, hoja: e.target.value })}
              className={`${INPUT} mt-1`}
            >
              {hojas.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="mapeo-fila" className="block text-sm font-medium text-gray-900">
            Fila de los títulos
          </label>
          <input
            id="mapeo-fila"
            type="number"
            min={1}
            max={50}
            value={mapeo.fila_encabezados}
            disabled={disabled}
            onChange={(e) => onChange({ ...mapeo, fila_encabezados: Math.min(50, Math.max(1, Number(e.target.value) || 1)) })}
            onBlur={() => onEstructura(mapeo)}
            className={`${INPUT} mt-1`}
          />
          <p className="mt-1 text-xs text-gray-500">La fila donde están los nombres de las columnas (normalmente la 1).</p>
        </div>
      </div>

      <fieldset className="rounded-lg border border-gray-200 p-4">
        <legend className="px-1 text-sm font-semibold text-gray-900">Datos del lote (una sola vez para todo el archivo)</legend>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="lote-municipio" className="block text-sm font-medium text-gray-900">
              Municipio de la mayoría de los inmuebles
            </label>
            <input
              id="lote-municipio"
              value={mapeo.lote.municipio ?? ''}
              disabled={disabled}
              placeholder="Medellín"
              onChange={(e) => setLote({ municipio: e.target.value || null })}
              className={`${INPUT} mt-1`}
            />
          </div>
          <div>
            <label htmlFor="lote-tipo-doc" className="block text-sm font-medium text-gray-900">
              Tipo de documento de la mayoría de los arrendatarios
            </label>
            <select
              id="lote-tipo-doc"
              value={mapeo.lote.arrendatario_tipo_documento ?? 'CC'}
              disabled={disabled}
              onChange={(e) => setLote({ arrendatario_tipo_documento: e.target.value as (typeof TIPOS_DOCUMENTO)[number] })}
              className={`${INPUT} mt-1`}
            >
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lote-autoriza" className="block text-sm font-medium text-gray-900">
              ¿La mayoría de los contratos autoriza reportar a centrales de riesgo?
            </label>
            <select
              id="lote-autoriza"
              value={mapeo.lote.autoriza_reporte ?? ''}
              disabled={disabled}
              onChange={(e) => setLote({ autoriza_reporte: (e.target.value || null) as 'Sí' | 'No' | null })}
              className={`${INPUT} mt-1`}
            >
              <option value="Sí">Sí</option>
              <option value="No">No</option>
              <option value="">Sin respuesta común: cada contrato trae la suya</option>
            </select>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Si una columna del archivo trae el dato, manda el de la fila; si la celda está vacía, se usa el del lote. Confirme estos datos con la
          inmobiliaria en cada carga: el representante legal los declara al firmar el acta.
        </p>
      </fieldset>

      <div>
        <Tabla head={['Dato de Cofianza', 'Columna del archivo', 'Separar la celda', 'Equivalencias']} density="compact">
          {CAMPOS_MAPEO_UI.map((c) => {
            const r = mapeo.campos[c.clave]
            const id = `mapeo-${c.clave}`
            const separa = r?.separador != null
            return (
              <tr key={c.clave}>
                <Td className="min-w-48">
                  <label htmlFor={id} className="font-medium text-ink-900">
                    {c.etiqueta}
                    {c.obligatorio === 'si' && <span className="text-red-700"> *</span>}
                  </label>
                  {c.obligatorio === 'lote' && <span className="block text-ink-500">o el dato del lote</span>}
                </Td>
                <Td className="min-w-48">
                  <select
                    id={id}
                    value={r?.columna ?? ''}
                    disabled={disabled}
                    onChange={(e) => setRegla(c.clave, e.target.value ? { ...r, columna: e.target.value } : null)}
                    className={INPUT}
                  >
                    <option value="">— Sin columna —</option>
                    {/* Un mapeo guardado con una columna que este archivo no trae: se ve y el error lo explica. */}
                    {r && !encabezados.includes(r.columna) && <option value={r.columna}>{r.columna} (no está en el archivo)</option>}
                    {encabezados.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </Td>
                <Td className="min-w-56">
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={separa}
                      disabled={disabled || !r}
                      onChange={(e) =>
                        r && setRegla(c.clave, { ...r, separador: e.target.checked ? ' - ' : null, parte: e.target.checked ? 1 : null })
                      }
                    />
                    Separar
                  </label>
                  {r && separa && (
                    <div className="mt-1 flex gap-2">
                      <input
                        aria-label={`Separador de ${c.corta}`}
                        value={r.separador ?? ''}
                        placeholder=" - "
                        disabled={disabled}
                        onChange={(e) => setRegla(c.clave, { ...r, separador: e.target.value })}
                        className={`${INPUT} w-20`}
                      />
                      <input
                        aria-label={`Parte de ${c.corta}`}
                        type="number"
                        min={1}
                        max={10}
                        value={r.parte ?? 1}
                        disabled={disabled}
                        onChange={(e) => setRegla(c.clave, { ...r, parte: Math.min(10, Math.max(1, Number(e.target.value) || 1)) })}
                        className={`${INPUT} w-20`}
                      />
                    </div>
                  )}
                </Td>
                <Td>
                  <Button variante="secondary" tamano="sm" disabled={disabled || !r} onClick={() => onEquivalencias(c.clave)}>
                    Equivalencias ({Object.keys(r?.equivalencias ?? {}).length})
                  </Button>
                </Td>
              </tr>
            )
          })}
        </Tabla>
        <p className="mt-2 text-xs text-gray-500">
          Separar: cuando una celda trae dos datos juntos (por ejemplo «1020304050 - Ana Pérez»), elija la misma columna en los dos campos, escriba
          el mismo separador y la parte que toma cada uno. La última parte se queda con el resto del texto. Si una celda no se puede separar, esa
          fila se rechaza: nunca se carga un dato a medias.
        </p>
      </div>
    </div>
  )
}

// ── Equivalencias (§5.3) ──

export function DialogoEquivalencias({
  campo,
  regla,
  precargar = [],
  onAplicar,
  onClose,
}: {
  campo: CampoMapeo
  regla: ReglaMapeo
  /** Valores del archivo sin equivalencia: entran como filas nuevas para completar el destino. */
  precargar?: string[]
  onAplicar: (equivalencias: Record<string, string> | null) => void
  onClose: () => void
}) {
  const c = campoUI(campo)
  const [filas, setFilas] = useState(() => {
    const actuales = Object.entries(regla.equivalencias ?? {}).map(([origen, destino]) => ({ origen, destino }))
    const nuevos = precargar.filter((v) => !actuales.some((a) => a.origen === v)).map((origen) => ({ origen, destino: '' }))
    return actuales.length + nuevos.length ? [...actuales, ...nuevos] : [{ origen: '', destino: '' }]
  })
  const set = (i: number, cambio: Partial<{ origen: string; destino: string }>) =>
    setFilas((fs) => fs.map((f, j) => (j === i ? { ...f, ...cambio } : f)))

  const aplicar = () => {
    const completas = filas.filter((f) => f.origen.trim() && f.destino.trim())
    onAplicar(completas.length ? Object.fromEntries(completas.map((f) => [f.origen.trim(), f.destino.trim()])) : null)
  }

  return (
    <Modal isOpen onClose={onClose} title={`Equivalencias de «${c.corta}»`} size="lg">
      <p className="text-sm text-gray-600">
        Use equivalencias cuando el archivo trae palabras en lugar de los valores de Cofianza, por ejemplo «Habitacional» → Vivienda o «Cédula» →
        CC. Mayúsculas y tildes no importan.
      </p>
      <div className="mt-4 space-y-2">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
          <span>Valor en el archivo</span>
          <span>Valor para Cofianza</span>
          <span className="sr-only">Quitar</span>
        </div>
        {filas.map((f, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
            <input aria-label="Valor en el archivo" value={f.origen} onChange={(e) => set(i, { origen: e.target.value })} className={INPUT} />
            {c.lista ? (
              <select aria-label="Valor para Cofianza" value={f.destino} onChange={(e) => set(i, { destino: e.target.value })} className={INPUT}>
                <option value="">Elija…</option>
                {c.lista.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            ) : (
              <input aria-label="Valor para Cofianza" value={f.destino} onChange={(e) => set(i, { destino: e.target.value })} className={INPUT} />
            )}
            <button
              type="button"
              aria-label="Quitar equivalencia"
              onClick={() => setFilas((fs) => fs.filter((_, j) => j !== i))}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-red-700"
            >
              <IconTrash size={16} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <Button variante="secondary" onClick={() => setFilas((fs) => [...fs, { origen: '', destino: '' }])}>
          <IconPlus size={16} /> Agregar equivalencia
        </Button>
        <Button onClick={aplicar}>
          <IconCheck size={16} /> Aplicar
        </Button>
      </div>
    </Modal>
  )
}

// ── Vista previa (§5.4) ──

const RESULTADO: Record<ResultadoValidacion, { label: string; tone: ChipTone }> = {
  aceptada: { label: 'Aceptada', tone: 'green' },
  advertencia: { label: 'Con advertencia', tone: 'yellow' },
  rechazada: { label: 'Rechazada', tone: 'red' },
}

const OPCIONALES: CampoMapeo[] = ['estrato', 'tipo_inmueble', 'observaciones']

/** Las fechas con el mes en letras: así se nota si el día y el mes quedaron cruzados. */
function formato(campo: CampoMapeo, v: string | number | boolean | null | undefined): string | null {
  if (v == null || v === '') return null
  switch (campo) {
    case 'canon':
      return money(Number(v))
    case 'fecha_inicio':
    case 'fecha_vencimiento':
      return new Date(`${v}T00:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
    case 'autoriza_reporte':
      return v ? 'Sí' : 'No'
    case 'destinacion':
      return v === 'comercial' ? 'Comercial' : 'Vivienda'
    case 'arrendatario_tipo_documento':
      return TIPOS_DOCUMENTO.find((t) => t.toLowerCase() === String(v)) ?? String(v)
    case 'tipo_inmueble':
      return TIPO_OPTIONS.find((o) => o.value === v)?.label ?? String(v)
    default:
      return String(v)
  }
}

export function TablaVistaPrevia({ vista }: { vista: VistaPreviaNativa }) {
  const campos = CAMPOS_MAPEO_UI.filter((c) => !OPCIONALES.includes(c.clave) || vista.mapeo.campos[c.clave])
  return (
    <Tabla head={['Fila', 'Resultado', ...campos.map((c) => c.corta), 'Motivos y advertencias']} zebra>
      {vista.filas.map((f) => (
        <tr key={f.n_fila}>
          <Td className="font-semibold">{f.n_fila}</Td>
          <Td>
            <Chip tone={RESULTADO[f.resultado].tone}>{RESULTADO[f.resultado].label}</Chip>
          </Td>
          {campos.map(({ clave }) => {
            const valor = formato(clave, f.valores[clave])
            const celda = f.celdas[clave]
            return (
              <Td key={clave} className={clave === 'direccion' || clave === 'arrendatario_nombre' ? 'min-w-40' : 'whitespace-nowrap'}>
                {valor ? (
                  <>
                    {valor}
                    {f.del_lote.includes(clave) && <span className="block text-ink-500">(del lote)</span>}
                  </>
                ) : celda ? (
                  <span className="text-red-700">{celda}</span>
                ) : (
                  '—'
                )}
              </Td>
            )
          })}
          <Td className="min-w-64">
            {f.motivos.length === 0 && f.advertencias.length === 0 && '—'}
            <ul className="space-y-0.5">
              {f.motivos.map((m, i) => (
                <li key={`m${i}`} className="text-red-700">
                  {m}
                </li>
              ))}
              {f.advertencias.map((a, i) => (
                <li key={`a${i}`} className="text-coral-700">
                  {a}
                </li>
              ))}
            </ul>
          </Td>
        </tr>
      ))}
    </Tabla>
  )
}

// ── Resumen de solo lectura (§5.6) ──

export function ResumenMapeo({ mapeo }: { mapeo: MapeoColumnas }) {
  const lote = mapeo.lote
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-700">
        Hoja «{mapeo.hoja ?? 'la primera'}», títulos en la fila {mapeo.fila_encabezados}. Datos del lote: municipio {lote.municipio || 'sin indicar'} ·
        tipo de documento {lote.arrendatario_tipo_documento ?? 'CC'} · autoriza el reporte a centrales:{' '}
        {lote.autoriza_reporte ?? 'sin respuesta común'}.
      </p>
      <Tabla head={['Dato de Cofianza', 'Columna', 'Separación', 'Equivalencias']} density="compact">
        {CAMPOS_MAPEO_UI.filter((c) => mapeo.campos[c.clave]).map((c) => {
          const r = mapeo.campos[c.clave]!
          return (
            <tr key={c.clave}>
              <Td className="font-medium">{c.etiqueta}</Td>
              <Td>{r.columna}</Td>
              <Td>{separacion(r)}</Td>
              <Td>{equivalenciasTxt(r)}</Td>
            </tr>
          )
        })}
      </Tabla>
    </div>
  )
}
