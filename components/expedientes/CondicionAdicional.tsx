'use client'

/**
 * Adenda 4 §9: el analista que aprueba exigiendo algo más paga la tarifa de la
 * aprobación no automática; sin marcarla, la revisión que abrieron solo las
 * reglas de capacidad de pago paga la automática.
 */
export function CondicionAdicional({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
      />
      <span>
        Exigí una condición adicional para aprobarlo, además de los soportes de ingreso (por ejemplo, un
        coarrendatario, un depósito o un plazo menor). Con una condición adicional se cobra la tarifa de la
        aprobación no automática.
      </span>
    </label>
  )
}
