/**
 * Estudio sin propiedad (pedido de Gerencia, oct-2026): Cofianza estudia a la
 * persona antes de tener el inmueble. En lugar de la propiedad se piden el
 * canon objetivo y la destinación, que son lo que necesita la evaluación
 * (regla canon/ingreso y tope). El inmueble se vincula después desde el estudio.
 */

'use client'

import { useEffect } from 'react'
import { IconAlertTriangle, IconBuilding2, IconHome } from '@/components/icons'
import { CampoPesos, OpcionTarjeta } from '@/components/contratos/v3/campos'
import { formatCurrency } from '@/lib/constants'
import type { WizardStep1Data } from '@/hooks/useExpedienteWizard'
import { USOS_NO_AFIANZABLES } from './constants'

interface Props {
  data: WizardStep1Data
  errors: Record<string, string>
  onUpdate: (data: Partial<WizardStep1Data>) => void
  /** Tope de canon vigente; null si no se pudo leer (el API valida igual). */
  topeCanon: number | null
  /** TOLERANCIA_CANON del panel (%); null si no se pudo leer. */
  toleranciaCanon?: number | null
}

const COMERCIAL_NO_DISPONIBLE = USOS_NO_AFIANZABLES.includes('comercial')

export function SinInmuebleStep1({ data, errors, onUpdate, topeCanon, toleranciaCanon = null }: Props) {
  const canon = data.canonObjetivo
  // Mientras comercial no esté disponible, vivienda es la única opción: va marcada.
  const faltaDestinacion = !data.destinacion
  useEffect(() => {
    if (COMERCIAL_NO_DISPONIBLE && faltaDestinacion) onUpdate({ destinacion: 'vivienda' })
  }, [faltaDestinacion, onUpdate])
  const excede = topeCanon !== null && canon !== undefined && canon > topeCanon
  // Mismo canon + tolerancia que canonAprobadoCop en la API; el tope de la
  // destinación y el ingreso pueden bajarlo, y eso solo lo sabe el certificado.
  const ayudaCanon =
    canon && toleranciaCanon !== null
      ? `Es el canon con el que se evalúa a la persona. Con ${formatCurrency(canon)}, el inmueble que elija después podrá costar hasta ${formatCurrency(Math.floor((canon * (100 + toleranciaCanon)) / 100))} (${toleranciaCanon.toLocaleString('es-CO')} % más), salvo que el tope de su destinación o sus ingresos fijen un máximo menor; el certificado dirá el máximo exacto.`
      : 'Es el canon con el que se evalúa a la persona.'

  return (
    <div className="space-y-5">
      <CampoPesos
        label="Canon objetivo (sin administración)"
        requerido
        value={canon}
        onChange={(v) => onUpdate({ canonObjetivo: v, excedeTope: topeCanon !== null && v !== undefined && v > topeCanon })}
        placeholder="1.500.000"
        error={errors.canonObjetivo}
        help={ayudaCanon}
      />

      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-gray-700">
          Destinación<span className="text-coral-700"> *</span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <OpcionTarjeta
            name="destinacion-objetivo"
            checked={data.destinacion === 'vivienda'}
            onSelect={() => onUpdate({ destinacion: 'vivienda' })}
            titulo="Vivienda"
            icono={IconHome}
            invalido={!!errors.destinacion}
          />
          <OpcionTarjeta
            name="destinacion-objetivo"
            checked={data.destinacion === 'comercial'}
            disabled={COMERCIAL_NO_DISPONIBLE}
            onSelect={() => onUpdate({ destinacion: 'comercial' })}
            titulo="Comercial"
            descripcion={COMERCIAL_NO_DISPONIBLE ? 'Todavía no disponible en la plataforma.' : undefined}
            icono={IconBuilding2}
          />
        </div>
        {errors.destinacion && <p className="mt-1 text-xs text-red-600">{errors.destinacion}</p>}
      </fieldset>

      {excede && (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <IconAlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            El canon supera el máximo sin coafianzamiento ({formatCurrency(topeCanon!)}). El estudio sigue, pero pasará a
            revisión y solo la Gerencia General puede aprobarlo.
          </p>
        </div>
      )}

      <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
        Sin propiedad, el estudio solo lo ven Cofianza y la persona evaluada, y lo paga ella con el enlace de pago. Cuando
        esté aprobado y la persona elija el inmueble, vincúlelo desde el estudio: debe ser de la misma destinación y su
        canon no puede pasar del máximo del certificado.
      </p>
    </div>
  )
}
