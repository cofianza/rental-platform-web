/**
 * Contador de "última petición" (lógica pura, probada con node:test).
 *
 * Cada `iniciar()` invalida las anteriores y devuelve `esVigente()`: una
 * respuesta vieja (búsqueda o filtro anterior que tardó más) se descarta en
 * vez de pisar la vigente. `invalidar()` descarta todas (p. ej. al desmontar).
 */
export interface ContadorPeticiones {
  iniciar: () => () => boolean
  invalidar: () => void
}

export function crearContadorPeticiones(): ContadorPeticiones {
  let actual = 0
  return {
    iniciar() {
      const n = ++actual
      return () => n === actual
    },
    invalidar() {
      actual++
    },
  }
}
