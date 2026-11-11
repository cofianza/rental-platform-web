/**
 * Pruebas de lib/tablasPuntaje (node:test). Las tablas de aquí son inventadas:
 * las reales viven solo en el API (este repo es público).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  conSigno,
  puntosPorCotaInferior,
  puntosPorCotaSuperior,
  textoAntiguedad,
  textoPorcentajes,
  textoPuntajeCentral,
} from './tablasPuntaje'

const CENTRAL = [
  { corte: 900, puntos: 30 },
  { corte: 700, puntos: 20 },
  { corte: 500, puntos: 5 },
]
const PCT = [
  { corte: 20, puntos: 9 },
  { corte: 50, puntos: 3 },
  { corte: 70, puntos: 1 },
]
const ANTIGUEDAD = [
  { corte: 121, puntos: 4 },
  { corte: 36, puntos: 2 },
  { corte: 3, puntos: 1 },
  { corte: 0, puntos: 0 },
]

test('puntaje de la central: de mayor a menor, el último desde el mínimo', () => {
  assert.equal(textoPuntajeCentral(CENTRAL), '900 o más: 30 · 700-899: 20 · desde el mínimo hasta 699: 5')
})

test('porcentajes: la tabla termina en el máximo', () => {
  assert.equal(textoPorcentajes(PCT, 70), 'Hasta 20 %: 9 · más de 20 y hasta 50 %: 3 · más de 50 y hasta 70 %: 1')
  assert.equal(textoPorcentajes(PCT, 40), 'Hasta 20 %: 9 · más de 20 y hasta 40 %: 3')
})

test('antigüedad en meses dicha en años cuando se puede', () => {
  assert.equal(
    textoAntiguedad(ANTIGUEDAD),
    'Más de 10 años: 4 · de 3 años a 10 años: 2 · de 3 meses a menos de 3 años: 1 · menos de 3 meses: 0',
  )
})

test('búsqueda por cota inferior y superior', () => {
  assert.equal(puntosPorCotaInferior(CENTRAL, 950), 30)
  assert.equal(puntosPorCotaInferior(CENTRAL, 700), 20)
  assert.equal(puntosPorCotaInferior(CENTRAL, 499), 0)
  assert.equal(puntosPorCotaSuperior(PCT, 20), 9)
  assert.equal(puntosPorCotaSuperior(PCT, 20.5), 3)
  assert.equal(puntosPorCotaSuperior(PCT, 71), 0)
})

test('signo', () => {
  assert.equal(conSigno(10), '+10')
  assert.equal(conSigno(-15), '−15')
  assert.equal(conSigno(0), '0')
})
