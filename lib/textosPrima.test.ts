/**
 * Pruebas de lib/textosPrima (la web no tiene vitest; se usa node:test).
 * Correr con: npx tsx --test lib/textosPrima.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { textoEvaluacionTerminadaSobreAprobado, textoEvaluandoSobreAprobado } from './textosPrima'

// Un beneficio cualquiera, como lo mandaría la API (la web no conoce la cifra).
const b = { completo: 'FRASE COMPLETA DE LA API', corto: 'FRASE CORTA DE LA API' }

test('con beneficio: la frase es la de la API, tal cual', () => {
  assert.equal(textoEvaluandoSobreAprobado(b), 'Estamos procesando su evaluación crediticia. Si queda vinculado, FRASE CORTA DE LA API; le avisamos por correo.')
  assert.equal(
    textoEvaluacionTerminadaSobreAprobado(b),
    'La evaluación de su coarrendatario terminó y su estudio sigue aprobado. Le contamos por correo si quedó vinculado y qué prima paga.',
  )
})

test('sin beneficio (null): ningún texto menciona la prima', () => {
  const textos = [
    textoEvaluandoSobreAprobado(null),
    textoEvaluacionTerminadaSobreAprobado(null),
  ]
  for (const t of textos) assert.doesNotMatch(t, /prima|%/i)
  assert.equal(textos[1], 'La evaluación de su coarrendatario terminó y su estudio sigue aprobado. Le contamos por correo si quedó vinculado.')
})

test('sin respuesta de la API (undefined): no se inventa la frase de la cifra y el resto queda como siempre', () => {
  assert.equal(textoEvaluandoSobreAprobado(undefined), 'Estamos procesando su evaluación crediticia. Le avisamos por correo si queda vinculado.')
  assert.equal(textoEvaluacionTerminadaSobreAprobado(undefined), textoEvaluacionTerminadaSobreAprobado(b))
})

test('ningún texto de este archivo trae cifras propias', async () => {
  const { readFileSync } = await import('node:fs')
  const fuente = readFileSync(new URL('./textosPrima.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(fuente, /\d+\s?%/)
})
