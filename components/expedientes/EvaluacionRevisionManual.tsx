'use client'

/**
 * Adenda 2 §4.3: "En revisión manual el denominador es mayor, porque el
 * analista sí puede puntuar estabilidad laboral e historial de arrendamiento.
 * El puntaje debe recalcularse al momento de la revisión manual".
 *
 * Espejo de OPCIONES_V7 / OPCIONES_V9 (rental-platform-api,
 * src/modules/estudios/motor/scorecard.ts), que son las filas de la Política
 * §4.7 y §4.9. El API valida los códigos: si cambian allá, cambiarlos aquí.
 */

import type { IEvaluacionRevisionManual } from '@/types/expediente'

const OPCIONES_V7: Array<[string, number, string]> = [
  ['empleado_mas_12m', 10, 'Empleado formal con más de 12 meses en el cargo actual'],
  ['pensionado', 10, 'Pensionado (ingreso fijo garantizado)'],
  ['independiente_mas_24m', 8, 'Independiente formal: RUT activo y más de 24 meses de actividad verificable'],
  ['empleado_6_12m', 7, 'Empleado formal con 6 a 12 meses en el cargo actual'],
  ['rentista', 7, 'Rentista de capital con soporte documentado'],
  ['independiente_12_24m', 5, 'Independiente formal: RUT activo y 12 a 24 meses de actividad'],
  ['empleado_menos_6m', 4, 'Empleado formal con menos de 6 meses en el cargo actual'],
  ['informal_con_extractos', 3, 'Independiente informal: extractos con ingresos recurrentes de 3 veces el canon por 6 meses'],
  ['informal_sin_soporte', 1, 'Independiente informal sin soporte verificable'],
]

const OPCIONES_V9: Array<[string, number, string]> = [
  ['referencia_positiva', 5, 'Referencia positiva verificada del arrendador anterior (últimos 3 años)'],
  ['sin_historial', 0, 'Sin historial de arrendamiento previo'],
  ['no_verificable', 0, 'Referencia no verificable (no suma ni resta)'],
  ['reporte_negativo', -10, 'Reporte negativo verificable: mora, daños o proceso judicial (últimos 3 años)'],
]

export type EvaluacionParcial = Partial<IEvaluacionRevisionManual>

export const evaluacionCompleta = (e: EvaluacionParcial): e is IEvaluacionRevisionManual =>
  !!e.estabilidad_laboral && !!e.arrendamiento_previo

const puntos = (n: number) => (n > 0 ? `+${n}` : `${n}`)

export function EvaluacionRevisionManual({
  value,
  onChange,
  disabled,
}: {
  value: EvaluacionParcial
  onChange: (v: EvaluacionParcial) => void
  disabled?: boolean
}) {
  const select = (
    id: string,
    label: string,
    campo: keyof IEvaluacionRevisionManual,
    opciones: Array<[string, number, string]>,
  ) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label} <span className="text-red-500">*</span>
      </label>
      <select
        id={id}
        value={value[campo] ?? ''}
        onChange={(e) => onChange({ ...value, [campo]: e.target.value || undefined })}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
      >
        <option value="">Elige una opción</option>
        {opciones.map(([codigo, pts, etiqueta]) => (
          <option key={codigo} value={codigo}>
            {etiqueta} ({puntos(pts)} pts)
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Con estas dos variables el puntaje se recalcula sobre un denominador mayor (Adenda 2 §4.3).
      </p>
      {select('v7-estabilidad', 'Estabilidad laboral', 'estabilidad_laboral', OPCIONES_V7)}
      {select('v9-arrendamiento', 'Historial de arrendamiento previo', 'arrendamiento_previo', OPCIONES_V9)}
    </div>
  )
}
