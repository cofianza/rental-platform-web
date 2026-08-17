/**
 * ReintentarEstudioForm — reintento de un estudio 'fallido' con el documento
 * verificable/corregible en el lugar (la causa típica del fallo es una cédula
 * mal escrita o un tipo de documento no soportado) y con el BURÓ elegible:
 * si TransUnion falla, el gestor puede relanzar por DataCrédito o viceversa.
 * El cambio es manual a propósito — cada consulta se factura, así que la
 * decisión de gastar en el otro buró es del gestor, no automática.
 *
 * Compartido por EstudioEstadoCard (resumen) y EstudiosSection (tab Estudios).
 * Documento y proveedor van como override a POST /estudios/:id/ejecutar: se
 * consulta eso, se persiste en el estudio y (solo titular) el documento se
 * sincroniza en el solicitante.
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { IconLoader, IconRefresh } from '@/components/icons'
import { estudioService } from '@/services/estudioService'

// Tipos soportados por TransUnion Colombia (mismo set que el backend acepta
// en ejecutarEstudioBodySchema). Pasaporte se excluye a propósito: falla con
// 'tercero no existe' en las centrales locales.
export type TipoDocEstudio = 'cc' | 'nit' | 'ce' | 'ti'

export function normalizeTipoDocEstudio(t?: string | null): TipoDocEstudio {
  const v = (t || '').toLowerCase()
  return v === 'cc' || v === 'nit' || v === 'ce' || v === 'ti' ? v : 'cc'
}

// Burós ejecutables por reintento (mismo enum que ejecutarEstudioBodySchema).
type ProveedorReintento = 'transunion' | 'datacredito'

const PROVEEDOR_REINTENTO_LABELS: Record<ProveedorReintento, string> = {
  transunion: 'TransUnion',
  datacredito: 'DataCrédito',
}

function normalizeProveedorReintento(p?: string | null): ProveedorReintento {
  return p === 'datacredito' ? 'datacredito' : 'transunion'
}

/**
 * Propone el primer apellido a partir del nombre completo. En Colombia el
 * orden habitual es `Nombre1 [Nombre2] Apellido1 [Apellido2]`, así que con 4+
 * palabras el primer apellido es la antepenúltima y con 3 la penúltima.
 * Es solo una propuesta editable: DataCrédito lo contrasta contra la
 * Registraduría y basta un error para que la consulta falle con código 10.
 */
function proponerPrimerApellido(nombreCompleto?: string | null): string {
  const partes = (nombreCompleto || '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return ''
  if (partes.length <= 2) return partes[partes.length - 1]
  if (partes.length === 3) return partes[1]
  return partes[partes.length - 2]
}

interface ReintentarEstudioFormProps {
  estudioId: string
  /** Buró con el que falló — preseleccionado; el gestor puede cambiarlo. */
  proveedorActual?: string | null
  /** Documento actual del evaluado — prellenado para verificar/corregir. */
  persona?: {
    tipo_documento?: string | null
    numero_documento?: string | null
    /** Nombre completo — solo se usa para PROPONER el apellido si no viene. */
    nombre?: string | null
    /** Apellido ya separado. Si existe se usa tal cual (más fiable que derivarlo). */
    apellido?: string | null
  } | null
  /** true = titular (el documento corregido se sincroniza en el solicitante). */
  esTitular?: boolean
  /** Refresca la lista/card padre tras disparar el reintento. */
  onRetried?: () => void
}

export function ReintentarEstudioForm({
  estudioId,
  proveedorActual,
  persona,
  esTitular = true,
  onRetried,
}: ReintentarEstudioFormProps) {
  // Init lazy: no se pisa con los re-render del polling del padre.
  const [tipoDoc, setTipoDoc] = useState<TipoDocEstudio>(() =>
    normalizeTipoDocEstudio(persona?.tipo_documento),
  )
  const [numeroDoc, setNumeroDoc] = useState(() => persona?.numero_documento?.trim() ?? '')
  const [proveedor, setProveedor] = useState<ProveedorReintento>(() =>
    normalizeProveedorReintento(proveedorActual),
  )
  // Si el apellido viene separado se usa tal cual; solo si no, se propone a
  // partir del nombre completo. En ambos casos queda editable: es lo que el
  // buró contrasta contra la Registraduría.
  const [primerApellido, setPrimerApellido] = useState(() => {
    const separado = persona?.apellido?.trim()
    if (separado) return separado.split(/\s+/)[0]
    return proponerPrimerApellido(persona?.nombre)
  })
  const [reintentando, setReintentando] = useState(false)

  // Solo DataCrédito valida el apellido (contra Registraduría, y únicamente
  // cuando el documento es CC). Con TransUnion el campo sobra y solo distrae.
  const requiereApellido = proveedor === 'datacredito' && tipoDoc === 'cc'

  const handleReintentar = async () => {
    const numero = numeroDoc.trim()
    if (!numero) {
      toast.error('Ingresa el número de documento para reintentar')
      return
    }
    const apellido = primerApellido.trim()
    if (requiereApellido && apellido.length < 2) {
      toast.error('DataCrédito requiere el primer apellido para validar la identidad')
      return
    }
    setReintentando(true)
    try {
      await estudioService.ejecutarEstudio(estudioId, {
        tipo_documento: tipoDoc,
        numero_documento: numero,
        proveedor,
        ...(apellido ? { primer_apellido: apellido } : {}),
      })
      toast.success(`Reintentando la consulta a ${PROVEEDOR_REINTENTO_LABELS[proveedor]}…`)
      onRetried?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo reintentar la consulta.')
      // Refrescar también al fallar: el backend pudo haber tomado el lock y
      // persistido el cambio de buró antes de romperse, así que sin esto la
      // card seguiría mostrando el proveedor viejo y el estado anterior.
      onRetried?.()
    } finally {
      setReintentando(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-xs font-semibold text-gray-700 mb-2">
        Verifica el documento y el buró antes de reintentar
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="sm:w-40">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">
            Buró de crédito
          </label>
          <select
            value={proveedor}
            onChange={(e) => setProveedor(e.target.value as ProveedorReintento)}
            disabled={reintentando}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <option value="transunion">TransUnion</option>
            <option value="datacredito">DataCrédito</option>
          </select>
        </div>
        <div className="sm:w-44">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">
            Tipo de documento
          </label>
          <select
            value={tipoDoc}
            onChange={(e) => setTipoDoc(e.target.value as TipoDocEstudio)}
            disabled={reintentando}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <option value="cc">Cédula de ciudadanía (CC)</option>
            <option value="ce">Cédula de extranjería (CE)</option>
            <option value="ti">Tarjeta de identidad (TI)</option>
            <option value="nit">NIT</option>
          </select>
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">
            Número de documento
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={numeroDoc}
            onChange={(e) => setNumeroDoc(e.target.value.replace(/[^\w]/g, ''))}
            placeholder="Número de cédula"
            disabled={reintentando}
            maxLength={20}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          />
        </div>
        {/* Solo DataCrédito + CC: es el único caso en que el buró contrasta el
            apellido contra Registraduría (código 10 si no coincide). */}
        {requiereApellido && (
          <div className="sm:w-52">
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              Primer apellido
            </label>
            <input
              type="text"
              value={primerApellido}
              onChange={(e) => setPrimerApellido(e.target.value)}
              placeholder="Como en la Registraduría"
              disabled={reintentando}
              maxLength={80}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            />
          </div>
        )}
        <button
          type="button"
          onClick={handleReintentar}
          disabled={reintentando || numeroDoc.trim().length < 5}
          className="inline-flex shrink-0 items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {reintentando ? <IconLoader size={14} className="animate-spin" /> : <IconRefresh size={14} />}
          {reintentando ? 'Reintentando…' : 'Reintentar consulta'}
        </button>
      </div>
      <p className="text-[11px] text-gray-500 mt-2">
        Solo se consultan documentos colombianos (CC, CE, TI, NIT).
        {requiereApellido
          ? ' DataCrédito valida el primer apellido contra la Registraduría: debe ir solo el primero, sin el segundo.'
          : ''}
        {/* Comparación contra el valor CRUDO, no el normalizado: un estudio
            legacy con proveedor 'sifin'/'manual' se normaliza a 'transunion'
            en el select, y comparar contra el normalizado ocultaría el aviso
            justo cuando el buró sí está cambiando. */}
        {proveedor !== proveedorActual
          ? ' El estudio quedará registrado con el buró seleccionado.'
          : ''}
        {esTitular
          ? ' Al reintentar, el documento se actualiza también en los datos del solicitante.'
          : ''}
      </p>
    </div>
  )
}
