'use client'

/**
 * Descarta respuestas viejas: `const iniciar = useUltimaPeticion()` y en cada
 * carga `const vigente = iniciar()`; tras cada await, `if (!vigente()) return`.
 * Al desmontar se invalidan todas, así una respuesta tardía no toca el estado.
 * La función devuelta es estable (sirve como dependencia de useCallback).
 */
import { useEffect, useState } from 'react'
import { crearContadorPeticiones } from '@/lib/ultimaPeticion'

export function useUltimaPeticion(): () => () => boolean {
  const [contador] = useState(crearContadorPeticiones)
  useEffect(() => () => contador.invalidar(), [contador])
  return contador.iniciar
}
