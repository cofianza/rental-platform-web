/**
 * EstudiosPropietarioView — "Evaluar candidato" del propietario (mockup 14).
 * Reutiliza EstudiosInmobiliariaView (mismo historial de estudios re-skineado),
 * pero sin el badge de saldo ni la compra de paquetes (eso es de inmobiliaria),
 * y con la intro del mockup del propietario. "Nuevo estudio" lleva al flujo real
 * desde un expediente. No se construye el asistente del mockup (funcionalidad
 * nueva); solo el re-skin visual de lo que ya existe.
 */

'use client'

import { EstudiosInmobiliariaView } from '@/components/estudios/EstudiosInmobiliariaView'

export function EstudiosPropietarioView() {
  return (
    <EstudiosInmobiliariaView
      intro="Las evaluaciones crediticias de sus prospectos. Para evaluar a uno nuevo, cree un estudio."
      showSaldo={false}
      showPaquetes={false}
    />
  )
}
