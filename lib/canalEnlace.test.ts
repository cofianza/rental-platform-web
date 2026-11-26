/**
 * Pruebas de lib/canalEnlace (node:test). Correr con: npx tsx --test lib/canalEnlace.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { leerEnlace, canalDeEstaPagina } from './canalEnlace'

const TOKEN = 'ab12'.repeat(16)

test('la marca de la URL (?c=w / ?c=c) da el canal y deja la ficha igual', () => {
  assert.deepEqual(leerEnlace(TOKEN, '?c=w'), { token: TOKEN, canal: 'whatsapp' })
  assert.deepEqual(leerEnlace(TOKEN, '?c=c'), { token: TOKEN, canal: 'correo' })
  assert.deepEqual(leerEnlace(TOKEN, '?x=1&c=c'), { token: TOKEN, canal: 'correo' })
})

test('la marca al final de la ficha (botón de WhatsApp) se quita y da el canal', () => {
  assert.deepEqual(leerEnlace(`${TOKEN}-w`), { token: TOKEN, canal: 'whatsapp' })
  assert.deepEqual(leerEnlace(`${TOKEN}-c`, '?c=w'), { token: TOKEN, canal: 'correo' })
})

test('sin marca, o con una que no es de canal: la ficha tal cual y sin canal (enlaces de antes)', () => {
  assert.deepEqual(leerEnlace(TOKEN), { token: TOKEN, canal: null })
  assert.deepEqual(leerEnlace(TOKEN, '?c=sms'), { token: TOKEN, canal: null })
  assert.deepEqual(leerEnlace(`${TOKEN}-x`), { token: `${TOKEN}-x`, canal: null })
})

test('en el servidor no hay canal', () => {
  assert.equal(canalDeEstaPagina(TOKEN), null)
})
