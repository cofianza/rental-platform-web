/**
 * Adenda 6 §8: «Habitará el inmueble», con tres opciones (Sí, No y No lo indicó). La opción por defecto es
 * «No lo indicó». Se le pregunta a cada persona al autorizar; es informativo (la evaluación no lo usa).
 *
 * La API lo devuelve como booleano: true = Sí, false = No, null = No lo indicó.
 */

export type Habitara = 'si' | 'no' | 'no_indicado'

/** Lo que ve la persona al autorizar. La tercera es la opción por defecto. */
export const HABITARA_OPCIONES: ReadonlyArray<{ valor: Habitara; label: string }> = [
  { valor: 'si', label: 'Sí' },
  { valor: 'no', label: 'No' },
  { valor: 'no_indicado', label: 'Prefiero no indicarlo' },
]

export const HABITARA_POR_DEFECTO: Habitara = 'no_indicado'

/** Lo que ve quien tramita el estudio y Cofianza. Sin respuesta (o una API anterior), «No lo indicó». */
export function textoHabitara(valor: boolean | null | undefined): string {
  if (valor === true) return 'Sí'
  if (valor === false) return 'No'
  return 'No lo indicó'
}
