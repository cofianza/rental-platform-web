'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'
import { MunicipioCombobox, type EstadoBusquedaMunicipio } from '@/components/registro/MunicipioCombobox'

export interface MunicipioFactura {
  codigo: string
  nombre: string
}

/** Lo mismo que acepta la API (firmarSchema): dirección de 5 a 200 caracteres. */
export function direccionFacturaValida(v: string): boolean {
  const t = v.trim()
  return t.length >= 5 && t.length <= 200
}

/**
 * Sin cómo elegirlo (la búsqueda falló o su municipio no aparece), el municipio
 * deja de ser obligatorio: la autorización nunca se queda sin salida por un
 * catálogo de terceros (la factura queda pendiente, como antes). Pura.
 */
export function municipioSinSalida(estado: EstadoBusquedaMunicipio | null): boolean {
  return estado === 'fallo' || estado === 'sin_resultados'
}

/** ¿Está lo que la pantalla pide? Pura. */
export function datosFacturaCompletos(
  pide: { pide_direccion: boolean; pide_municipio: boolean },
  direccion: string,
  municipio: MunicipioFactura | null,
  estadoBusqueda: EstadoBusquedaMunicipio | null,
): boolean {
  return (
    (!pide.pide_direccion || direccionFacturaValida(direccion)) &&
    (!pide.pide_municipio || !!municipio || municipioSinSalida(estadoBusqueda))
  )
}

/**
 * Dirección y municipio para la factura electrónica del pago del estudio. Solo
 * se muestra cuando la API lo pide (al prospecto le toca pagar y con estos
 * datos su ficha queda lista para facturar) y solo pide lo que falta.
 */
export function CampoDatosFactura({
  pide,
  direccion,
  onDireccion,
  municipio,
  onMunicipio,
  estadoBusqueda,
  onEstadoBusqueda,
  mostrarError,
}: {
  pide: { pide_direccion: boolean; pide_municipio: boolean }
  direccion: string
  onDireccion: (v: string) => void
  municipio: MunicipioFactura | null
  onMunicipio: (v: MunicipioFactura | null) => void
  estadoBusqueda: EstadoBusquedaMunicipio | null
  onEstadoBusqueda: (e: EstadoBusquedaMunicipio) => void
  /** Mostrar los errores (después de que la persona intentó confirmar). */
  mostrarError: boolean
}) {
  const id = useId()
  const direccionInvalida = mostrarError && pide.pide_direccion && !direccionFacturaValida(direccion)
  const municipioInvalido = mostrarError && pide.pide_municipio && !municipio && !municipioSinSalida(estadoBusqueda)
  const que = pide.pide_direccion && pide.pide_municipio ? 'su dirección y su municipio' : pide.pide_direccion ? 'su dirección' : 'su municipio'
  return (
    <div
      id="datos-factura"
      role="group"
      aria-labelledby={`${id}-titulo`}
      aria-describedby={`${id}-ayuda`}
      className="space-y-3 rounded-xl border border-gray-200 bg-white p-3.5"
    >
      <div>
        <p id={`${id}-titulo`} className="text-sm font-bold text-gray-900">Datos para su factura electrónica</p>
        <p id={`${id}-ayuda`} className="mt-0.5 text-xs text-gray-500">Para emitir la factura electrónica de su pago necesitamos {que}.</p>
      </div>
      {pide.pide_direccion && (
        <div>
          <label htmlFor={`${id}-direccion`} className="mb-1 block text-sm font-medium text-gray-700">
            Dirección donde vive
          </label>
          <input
            id={`${id}-direccion`}
            type="text"
            autoComplete="street-address"
            required
            maxLength={200}
            value={direccion}
            onChange={(e) => onDireccion(e.target.value)}
            aria-invalid={direccionInvalida}
            aria-describedby={direccionInvalida ? `${id}-direccion-error` : undefined}
            placeholder="Ej.: Calle 10 # 20-30, apto 401"
            className={cn(
              'w-full min-h-11 rounded-lg border bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500',
              direccionInvalida ? 'border-red-400' : 'border-gray-200',
            )}
          />
          <p id={`${id}-direccion-error`} aria-live="polite" className={direccionInvalida ? 'mt-1 text-xs text-red-600' : 'sr-only'}>
            {direccionInvalida ? 'Escriba su dirección completa.' : ''}
          </p>
        </div>
      )}
      {pide.pide_municipio && (
        <div>
          <MunicipioCombobox
            value={municipio}
            onChange={onMunicipio}
            error={municipioInvalido ? 'Escriba su municipio y elíjalo de la lista.' : undefined}
            variante="publica"
            requerido={!municipioSinSalida(estadoBusqueda)}
            onEstadoBusqueda={onEstadoBusqueda}
          />
          {!municipio && municipioSinSalida(estadoBusqueda) && (
            <p className="mt-1 text-xs text-gray-500">Si su municipio no aparece, puede confirmar sin él.</p>
          )}
        </div>
      )}
    </div>
  )
}
