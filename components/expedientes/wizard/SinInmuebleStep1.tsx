/**
 * Estudio sin propiedad (pedido de Gerencia, oct-2026): Cofianza estudia a la
 * persona antes de tener el inmueble. En lugar de la propiedad se piden el
 * canon objetivo y la destinación, que son lo que necesita la evaluación
 * (regla canon/ingreso y tope). El inmueble se vincula después desde el estudio.
 */

'use client'

import { IconAlertTriangle, IconBuilding2, IconHome } from '@/components/icons'
import { CampoPesos, OpcionTarjeta } from '@/components/contratos/v3/campos'
import { formatCurrency } from '@/lib/constants'
import type { WizardStep1Data } from '@/hooks/useExpedienteWizard'
import { USOS_NO_AFIANZABLES, MSG_USO_NO_AFIANZABLE } from './constants'

interface Props {
  data: WizardStep1Data
  errors: Record<string, string>
  onUpdate: (data: Partial<WizardStep1Data>) => void
  /** Tope de canon vigente; null si no se pudo leer (el API valida igual). */
  topeCanon: number | null
}

const COMERCIAL_NO_DISPONIBLE = USOS_NO_AFIANZABLES.includes('comercial')

export function SinInmuebleStep1({ data, errors, onUpdate, topeCanon }: Props) {
  const canon = data.canonObjetivo
  const excede = topeCanon !== null && canon !== undefined && canon > topeCanon

  return (
    <div className="space-y-5">
      <CampoPesos
        label="Canon objetivo (sin administración)"
        requerido
        value={canon}
        onChange={(v) => onUpdate({ canonObjetivo: v, excedeTope: topeCanon !== null && v !== undefined && v > topeCanon })}
        placeholder="1.500.000"
        error={errors.canonObjetivo}
        help="El canon con el que se evalúa a la persona. El resultado queda «aprobado hasta» este canon, con la tolerancia de la política."
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
        {COMERCIAL_NO_DISPONIBLE && <p className="mt-2 text-xs text-gray-500">{MSG_USO_NO_AFIANZABLE}</p>}
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
        Sin propiedad, el estudio solo lo ven Cofianza y la persona estudiada. Lo paga la persona con el enlace o Cofianza
        por la pasarela (no se usan cupos de paquete). Cuando tenga el inmueble, vincúlelo desde el estudio: su canon debe
        caber en el canon aprobado y debe ser de la misma destinación.
      </p>
    </div>
  )
}
