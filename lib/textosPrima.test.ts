/**
 * Pruebas de lib/textosPrima (la web no tiene vitest; se usa node:test).
 * Correr con: npx tsx --test lib/textosPrima.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { textoCoarrendatarioFuera, textoEvaluacionTerminadaSobreAprobado, textoEvaluandoSobreAprobado } from './textosPrima'

// Un beneficio cualquiera, como lo mandaría la API (la web no conoce la cifra).
const b = { completo: 'FRASE COMPLETA DE LA API', corto: 'FRASE CORTA DE LA API' }

test('con beneficio: la frase es la de la API, tal cual', () => {
  assert.equal(textoEvaluandoSobreAprobado(b), 'Estamos procesando su evaluación crediticia. Si queda vinculado, FRASE CORTA DE LA API; le avisamos por correo.')
  assert.equal(
    textoEvaluacionTerminadaSobreAprobado(b),
    'La evaluación de su coarrendatario terminó y su estudio sigue aprobado. Le contamos por correo si quedó vinculado y qué prima paga.',
  )
  assert.equal(textoCoarrendatarioFuera(b, false), 'Con este resultado no entra al contrato ni al certificado: la prima es la de firma sin coarrendatario.')
  assert.equal(
    textoCoarrendatarioFuera(b, true),
    'No aporta puntos ni ingreso, y el estudio sigue con el titular. No entra al contrato ni al certificado: la prima es la de firma sin coarrendatario.',
  )
})

test('sin beneficio (null): ningún texto menciona la prima', () => {
  const textos = [
    textoEvaluandoSobreAprobado(null),
    textoEvaluacionTerminadaSobreAprobado(null),
    textoCoarrendatarioFuera(null, false),
    textoCoarrendatarioFuera(null, true),
  ]
  for (const t of textos) assert.doesNotMatch(t, /prima|%/i)
  assert.equal(textos[1], 'La evaluación de su coarrendatario terminó y su estudio sigue aprobado. Le contamos por correo si quedó vinculado.')
  assert.equal(textos[3], 'No aporta puntos ni ingreso, y el estudio sigue con el titular. No entra al contrato ni al certificado.')
})

test('sin respuesta de la API (undefined): no se inventa la frase de la cifra y el resto queda como siempre', () => {
  assert.equal(textoEvaluandoSobreAprobado(undefined), 'Estamos procesando su evaluación crediticia. Le avisamos por correo si queda vinculado.')
  assert.equal(textoEvaluacionTerminadaSobreAprobado(undefined), textoEvaluacionTerminadaSobreAprobado(b))
  assert.equal(textoCoarrendatarioFuera(undefined, false), textoCoarrendatarioFuera(b, false))
  assert.equal(textoCoarrendatarioFuera(undefined, true), textoCoarrendatarioFuera(b, true))
})

test('ningún texto de este archivo trae cifras propias', async () => {
  const { readFileSync } = await import('node:fs')
  const fuente = readFileSync(new URL('./textosPrima.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(fuente, /\d+\s?%/)
})
