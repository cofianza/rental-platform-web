/**
 * Pruebas de lib/municipios (node:test). Correr con: npx tsx --test lib/municipios.test.ts
 * Reporte de la Oficina Virtual (25-nov), punto 4. Datos inventados.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { claveDepartamento, claveLugar, departamentoSiDistinto, esElMunicipio, etiquetaMunicipio } from './municipios'

test('claves sin tildes, mayúsculas, puntuación ni «D.C.» (las mismas de la API)', () => {
  assert.equal(claveLugar('Bogotá, D.C.'), 'bogota')
  assert.equal(claveLugar('BOGOTA DC'), 'bogota')
  assert.equal(claveLugar('  San José de Cúcuta '), 'san jose de cucuta')
  assert.equal(claveLugar('Piendamó - Tunía'), 'piendamo tunia')
  assert.equal(claveLugar(null), '')
  assert.equal(claveDepartamento('San Andrés y Providencia'), 'san andres')
  assert.equal(claveDepartamento('Archipiélago de San Andrés, Providencia y Santa Catalina'), 'san andres')
  assert.equal(claveDepartamento('Nariño'), claveDepartamento('Narino'))
})

test('etiqueta «Municipio, Departamento», sin repetir Bogotá', () => {
  assert.equal(etiquetaMunicipio('Caldas', 'Antioquia'), 'Caldas, Antioquia')
  assert.equal(etiquetaMunicipio('Bogotá, D.C.', 'Bogotá, D.C.'), 'Bogotá, D.C.')
  assert.equal(etiquetaMunicipio('Bogotá', 'Bogotá D.C.'), 'Bogotá')
  assert.equal(etiquetaMunicipio('Caldas', null), 'Caldas')
  assert.equal(etiquetaMunicipio(null, null), '')
  assert.equal(departamentoSiDistinto('Medellín', 'Antioquia'), 'Antioquia')
  assert.equal(departamentoSiDistinto('Bogotá, D.C.', 'Bogotá, D.C.'), null)
})

test('esElMunicipio: mismo nombre y mismo departamento; los homónimos no se confunden', () => {
  const caldasAntioquia = { code: '05129', name: 'Caldas', department: { name: 'Antioquia' } }
  const caldasBoyaca = { code: '15176', name: 'Caldas', department: { name: 'Boyacá' } }
  const bogota = { code: '11001', name: 'Bogotá, D.C.', department: { name: 'Bogotá, D.C.' } }
  assert.equal(esElMunicipio(caldasAntioquia, 'CALDAS', 'Antioquia'), true)
  assert.equal(esElMunicipio(caldasBoyaca, 'CALDAS', 'Antioquia'), false)
  assert.equal(esElMunicipio(caldasBoyaca, 'caldas', 'Boyaca'), true)
  assert.equal(esElMunicipio(caldasAntioquia, 'Caldas', ''), false)
  assert.equal(esElMunicipio(bogota, 'Bogotá', 'Bogotá D.C.'), true)
  assert.equal(esElMunicipio(bogota, 'Bogota', 'Cundinamarca'), true)
  assert.equal(esElMunicipio(caldasAntioquia, 'Ciudad Inventada', 'Antioquia'), false)
})
