/**
 * ReintentarEstudioForm — reintento de un estudio 'fallido' con el documento
 * verificable/corregible en el lugar (la causa típica del fallo es una cédula
 * mal escrita o un tipo de documento no soportado).
 *
 * Compartido por EstudioEstadoCard (resumen) y EstudiosSection (tab Estudios).
 * El documento va como override a POST /estudios/:id/ejecutar: se consulta ese,
 * se persiste en datos_formulario y (solo titular) se sincroniza en el
 * solicitante.
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

interface ReintentarEstudioFormProps {
  estudioId: string
  /** Documento actual del evaluado — prellenado para verificar/corregir. */
  persona?: {
    tipo_documento?: string | null
    numero_documento?: string | null
  } | null
  /** true = titular (el documento corregido se sincroniza en el solicitante). */
  esTitular?: boolean
  /** Refresca la lista/card padre tras disparar el reintento. */
  onRetried?: () => void
}

export function ReintentarEstudioForm({
  estudioId,
  persona,
  esTitular = true,
  onRetried,
}: ReintentarEstudioFormProps) {
  // Init lazy: no se pisa con los re-render del polling del padre.
  const [tipoDoc, setTipoDoc] = useState<TipoDocEstudio>(() =>
    normalizeTipoDocEstudio(persona?.tipo_documento),
  )
  const [numeroDoc, setNumeroDoc] = useState(() => persona?.numero_documento?.trim() ?? '')
  const [reintentando, setReintentando] = useState(false)

  const handleReintentar = async () => {
    const numero = numeroDoc.trim()
    if (!numero) {
      toast.error('Ingresa el número de documento para reintentar')
      return
    }
    setReintentando(true)
    try {
      await estudioService.ejecutarEstudio(estudioId, {
        tipo_documento: tipoDoc,
        numero_documento: numero,
      })
      toast.success('Reintentando la consulta a TransUnion…')
      onRetried?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo reintentar la consulta.')
    } finally {
      setReintentando(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-xs font-semibold text-gray-700 mb-2">
        Verifica o corrige el documento antes de reintentar
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
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
        {esTitular
          ? ' Al reintentar, el documento se actualiza también en los datos del solicitante.'
          : ''}
      </p>
    </div>
  )
}
