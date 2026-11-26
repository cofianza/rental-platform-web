/**
 * Pruebas de lib/turnoEstudio (la web no tiene vitest; se usa node:test). Correr con:
 * node --import <hook que resuelve imports relativos sin extensión a .ts> --test lib/turnoEstudio.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ACCION_CARGA_NOTARIA, analistaAjeno, textoTurno, turnoPropio } from './turnoEstudio'

test('turno de quien gestiona: «Su turno», «Turno del gestor» o «Turno de su equipo», con la acción', () => {
  assert.equal(textoTurno('gestor', 'gestor', { accion: 'crear el contrato' }), 'Su turno: crear el contrato')
  assert.equal(textoTurno('gestor', 'cofianza', { accion: 'crear el contrato' }), 'Turno del gestor: crear el contrato')
  assert.equal(textoTurno('gestor', 'equipo'), 'Turno de su equipo')
  assert.equal(turnoPropio('gestor', 'gestor'), true)
  assert.equal(turnoPropio('gestor', 'equipo'), false)
  assert.equal(turnoPropio('gestor', 'cofianza', { analista: true }), false)
  // U2: el analista también puede ejecutar la consulta que no arrancó.
  assert.equal(textoTurno('gestor', 'cofianza', { analista: true, sinEjecutar: true }), 'Arranque fallido: ejecute la consulta')
  assert.equal(turnoPropio('gestor', 'cofianza', { analista: true, sinEjecutar: true }), true)
})

test('bloque 4: las acciones van en infinitivo tras «Su turno:» y «Turno del gestor:»', () => {
  assert.equal(textoTurno('gestor', 'gestor', { accion: 'invitar al segundo firmante' }), 'Su turno: invitar al segundo firmante')
  assert.equal(textoTurno('gestor', 'cofianza', { accion: 'invitar al segundo firmante' }), 'Turno del gestor: invitar al segundo firmante')
  assert.equal(textoTurno('gestor', 'gestor', { accion: 'reemplazar al segundo firmante' }), 'Su turno: reemplazar al segundo firmante')
})

test('revisión de Cofianza: al analista le toca decidir; a los demás, que la revisa Cofianza', () => {
  assert.equal(textoTurno('cofianza', 'cofianza', { revision: true, analista: true }), 'Su turno: decidir el estudio')
  assert.equal(textoTurno('cofianza', 'cofianza', { revision: true }), 'En revisión de un analista')
  assert.equal(textoTurno('cofianza', 'gestor', { revision: true }), 'En revisión de Cofianza')
  assert.equal(textoTurno('cofianza', 'cofianza', { revision: true, analista: true, tomadoPor: 'Ana Prueba' }), 'En revisión de Ana Prueba')
  assert.equal(turnoPropio('cofianza', 'cofianza', { revision: true, analista: true }), true)
  assert.equal(turnoPropio('cofianza', 'cofianza', { revision: true, analista: true, tomadoPor: 'Ana Prueba' }), false)
  assert.equal(textoTurno('cofianza', 'gestor'), 'Cofianza procesando')
})

test('bloque 4: segundo firmante en verificación: turno de Cofianza, nunca «invite al segundo firmante»', () => {
  // «Aprobado con segundo firmante» con el segundo ya evaluado y en verificación.
  assert.equal(textoTurno('cofianza', 'cofianza', { verificacion: true, analista: true }), 'Su turno: verificar al segundo firmante')
  assert.equal(turnoPropio('cofianza', 'cofianza', { verificacion: true, analista: true }), true)
  // Nunca «decidir el estudio» ni «Turno del gestor».
  assert.doesNotMatch(textoTurno('cofianza', 'cofianza', { verificacion: true, analista: true, revision: true }), /decidir|gestor/)
  // A quien gestiona, a su equipo y a Gerencia: lo hace Cofianza (sin coral: no les toca).
  for (const vista of ['gestor', 'equipo'] as const) {
    assert.equal(textoTurno('cofianza', vista, { verificacion: true }), 'Cofianza verifica al segundo firmante')
    assert.equal(turnoPropio('cofianza', vista, { verificacion: true }), false)
  }
  assert.equal(textoTurno('cofianza', 'cofianza', { verificacion: true }), 'Cofianza verifica al segundo firmante')
  assert.equal(turnoPropio('cofianza', 'cofianza', { verificacion: true }), false)
  // Si otro analista ya la tomó, se dice quién, sin coral.
  assert.equal(textoTurno('cofianza', 'cofianza', { verificacion: true, analista: true, tomadoPor: 'Ana Prueba' }), 'Lo verifica Ana Prueba')
  assert.equal(turnoPropio('cofianza', 'cofianza', { verificacion: true, analista: true, tomadoPor: 'Ana Prueba' }), false)
})

test('bloque 4: ya aprobado con el segundo firmante en verificación: cada quien ve lo suyo', () => {
  const accion = 'esperar la verificación del segundo firmante o seguir sin él'
  // Quien gestiona decide si lo espera o sigue sin él.
  assert.equal(textoTurno('gestor', 'gestor', { verificacion: true, accion }), `Su turno: ${accion}`)
  assert.equal(turnoPropio('gestor', 'gestor', { verificacion: true, accion }), true)
  // Al analista le toca verificarlo (no «Turno del gestor»).
  assert.equal(textoTurno('gestor', 'cofianza', { verificacion: true, analista: true, accion }), 'Su turno: verificar al segundo firmante')
  assert.equal(turnoPropio('gestor', 'cofianza', { verificacion: true, analista: true, accion }), true)
  // Gerencia (sin edición) ve de quién es la decisión de esperar.
  assert.equal(textoTurno('gestor', 'cofianza', { verificacion: true, accion }), `Turno del gestor: ${accion}`)
  assert.equal(textoTurno('gestor', 'equipo', { verificacion: true, accion }), `Turno de su equipo: ${accion}`)
})

test('bloque 4: «segundo firmante» en la Adenda 5 y «coarrendatario» solo en la condición de la Adenda 3', () => {
  assert.equal(textoTurno('prospecto', 'gestor', { condicion: true }), 'Esperando al segundo firmante')
  assert.equal(
    textoTurno('prospecto', 'gestor', { condicion: true, invitado: true }),
    'Esperando al segundo firmante: reenvíele la invitación o invite a otra persona',
  )
  assert.equal(textoTurno('prospecto', 'gestor', { condicion: true, adenda3: true }), 'Esperando al coarrendatario')
  assert.equal(
    textoTurno('prospecto', 'gestor', { condicion: true, adenda3: true, invitado: true }),
    'Esperando al coarrendatario: reenvíele la invitación o invite a otra persona',
  )
  // Solo lectura no puede reenviar: sin la sugerencia.
  assert.equal(textoTurno('prospecto', 'equipo', { condicion: true, invitado: true }), 'Esperando al segundo firmante')
  assert.equal(textoTurno('prospecto', 'cofianza', { condicion: true }), 'Esperando al prospecto')
  assert.equal(textoTurno('prospecto', 'gestor'), 'Esperando al prospecto')
  assert.equal(textoTurno('firmas', 'gestor'), 'Esperando las firmas')
})

test('analista ajeno: el nombre de quien la tomó, si no es quien mira', () => {
  // Nombres ficticios.
  assert.equal(analistaAjeno({ id: 'a1', nombre: 'Ana', apellido: 'Prueba' }, 'a2'), 'Ana Prueba')
  assert.equal(analistaAjeno({ id: 'a1', nombre: 'Ana', apellido: 'Prueba' }, 'a1'), null)
  assert.equal(analistaAjeno(null, 'a1'), null)
  assert.equal(analistaAjeno({ id: 'a1', nombre: '', apellido: null }, 'a2'), 'otro analista')
})

test('Adenda 6 §4: Cofianza verifica las listas del solicitante en un estudio aprobado', () => {
  const o = { verificacion: true, verificacionDe: 'solicitante' as const }
  assert.equal(textoTurno('cofianza', 'cofianza', { ...o, analista: true }), 'Su turno: registrar la verificación de listas')
  assert.equal(textoTurno('cofianza', 'gestor', o), 'Cofianza verifica al solicitante')
  assert.equal(textoTurno('cofianza', 'cofianza', { ...o, analista: true, tomadoPor: 'Ana Analista' }), 'Lo verifica Ana Analista')
  assert.equal(turnoPropio('cofianza', 'cofianza', { ...o, analista: true }), true)
  assert.equal(turnoPropio('cofianza', 'gestor', o), false)
})

test('Adenda 6.1 §4: en notaría no se esperan firmas: «Su turno: registrar el contrato firmado en notaría»', () => {
  assert.equal(ACCION_CARGA_NOTARIA, 'registrar el contrato firmado en notaría')
  assert.equal(textoTurno('gestor', 'gestor', { accion: ACCION_CARGA_NOTARIA }), 'Su turno: registrar el contrato firmado en notaría')
  assert.equal(textoTurno('gestor', 'cofianza', { accion: ACCION_CARGA_NOTARIA }), 'Turno del gestor: registrar el contrato firmado en notaría')
  // Si llega como 'firmas' con la marca, tampoco dice «Esperando las firmas».
  assert.equal(textoTurno('firmas', 'gestor', { firmaNotaria: true }), 'Su turno: registrar el contrato firmado en notaría')
  assert.equal(textoTurno('firmas', 'equipo', { firmaNotaria: true }), 'Turno de su equipo: registrar el contrato firmado en notaría')
  assert.equal(textoTurno('firmas', 'gestor'), 'Esperando las firmas')
})
