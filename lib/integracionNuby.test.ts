/**
 * Pruebas de lib/integracionNuby (node:test). Correr con: npx tsx --test lib/integracionNuby.test.ts
 * Datos ficticios: la dirección de ejemplo es mi-inmobiliaria.nuby.app.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  baseIntegracionNuby,
  cifrasDeResumen,
  cuantosMas,
  estadoDesconectado,
  etiquetaCampoDiferencia,
  etiquetaEstadoNuby,
  idClienteOculto,
  instanciaNubyValida,
  leerErrorNuby,
  limpiarInstanciaNuby,
  marcarSincronizando,
  normalizarEstadoNuby,
  prepararCredencialesNuby,
  sigueSincronizando,
  textoMotivoNoTraido,
  textoPruebaCorrecta,
  textoYMas,
  validarCredencialesNuby,
  valorDiferencia,
} from './integracionNuby'
import type { EstadoIntegracionNuby } from '@/types/integracionNuby'

const estadoConectado = (sincronizando = false): EstadoIntegracionNuby => ({
  habilitada: true,
  sincronizacion_automatica: true,
  conectada: true,
  integracion: {
    instancia: 'mi-inmobiliaria.nuby.app',
    client_id_final: 'a1b2',
    estado: 'activa',
    conectada_en: '2026-01-15T15:00:00.000Z',
    conectada_por_nombre: null,
    ultima_sincronizacion_en: '2026-01-16T15:00:00.000Z',
    ultima_revision_completa_en: null,
    ultimo_intento_en: '2026-01-16T15:00:00.000Z',
    ultimo_error: null,
    sincronizando,
    resumen: {
      modo: 'incremental',
      terminado_en: '2026-01-16T15:00:00.000Z',
      leidos: 40,
      en_arriendo: 12,
      creados: 3,
      actualizados: 2,
      vinculados: 1,
      sin_cambios: 5,
      protegidos: 1,
      no_traidos: 0,
      fotos_copiadas: 18,
      ausentes: 0,
    },
  },
  totales: { vinculados: 11, codigo_repetido: 1, no_traidos: 2, con_diferencias: 1, ausentes: 0 },
  pendientes: {
    codigo_repetido: [{ codigo: 'A-01', titulo: null, direccion: null, candidatos: [] }],
    no_traidos: [{ codigo: 'A-02', titulo: null, motivo: 'sin_canon', detalle: null }],
    con_diferencias: [],
  },
})

test('la ruta base depende de quién opera', () => {
  assert.equal(baseIntegracionNuby({ tipo: 'titular' }), '/inmobiliaria/integraciones/nuby')
  assert.equal(
    baseIntegracionNuby({ tipo: 'admin', orgId: '00000000-0000-4000-8000-000000000001' }),
    '/admin/inmobiliarias/00000000-0000-4000-8000-000000000001/integraciones/nuby',
  )
})

test('la dirección pegada queda en el dominio solo', () => {
  const casos: Array<[string, string]> = [
    ['mi-inmobiliaria.nuby.app', 'mi-inmobiliaria.nuby.app'],
    ['https://mi-inmobiliaria.nuby.app/', 'mi-inmobiliaria.nuby.app'],
    ['  HTTPS://Mi-Inmobiliaria.Nuby.App/login?next=/inicio#arriba  ', 'mi-inmobiliaria.nuby.app'],
    ['http://mi-inmobiliaria.arrendasoft.co:443/admin/', 'mi-inmobiliaria.arrendasoft.co'],
    ['mi-inmobiliaria.nuby.app:443', 'mi-inmobiliaria.nuby.app'],
    ['//mi-inmobiliaria.nuby.app///', 'mi-inmobiliaria.nuby.app'],
    ['mi-inmobiliaria .nuby.app\n', 'mi-inmobiliaria.nuby.app'],
    ['mi-inmobiliaria.nuby.app.', 'mi-inmobiliaria.nuby.app'],
    ['https://usuario@mi-inmobiliaria.nuby.app', 'mi-inmobiliaria.nuby.app'],
    ['', ''],
    ['   ', ''],
    ['https://', ''],
  ]
  for (const [entrada, esperado] of casos) assert.equal(limpiarInstanciaNuby(entrada), esperado, JSON.stringify(entrada))
})

test('limpiar una dirección ya limpia no la cambia', () => {
  const limpia = limpiarInstanciaNuby('https://mi-inmobiliaria.nuby.app/')
  assert.equal(limpiarInstanciaNuby(limpia), limpia)
})

test('solo valen subdominios de nuby.app y arrendasoft.co', () => {
  for (const ok of ['mi-inmobiliaria.nuby.app', 'mi-inmobiliaria.arrendasoft.co', 'sede2.mi-inmobiliaria.nuby.app', 'a.nuby.app']) {
    assert.equal(instanciaNubyValida(ok), true, ok)
  }
  for (const mal of [
    '',
    'nuby.app',
    '.nuby.app',
    'mi-inmobiliaria',
    'mi-inmobiliaria.com',
    'mi-inmobiliaria-nuby.app',
    'mi-inmobiliaria.nuby.app.ejemplo.com',
    'mi_inmobiliaria.nuby.app',
    '-mi.nuby.app',
    'https://mi-inmobiliaria.nuby.app',
    'mi-inmobiliaria.nuby.app/login',
  ]) {
    assert.equal(instanciaNubyValida(mal), false, mal)
  }
})

test('las credenciales se envían limpias', () => {
  assert.deepEqual(
    prepararCredencialesNuby({ instancia: ' https://Mi-Inmobiliaria.nuby.app/ ', client_id: ' cliente-de-prueba \n', client_secret: '\tclave-de-prueba ' }),
    { instancia: 'mi-inmobiliaria.nuby.app', client_id: 'cliente-de-prueba', client_secret: 'clave-de-prueba' },
  )
})

test('el formulario pide los tres datos y una dirección de nuby', () => {
  assert.deepEqual(validarCredencialesNuby({ instancia: 'https://mi-inmobiliaria.nuby.app/', client_id: 'cliente', client_secret: 'clave' }), {})

  const vacio = validarCredencialesNuby({ instancia: ' ', client_id: '', client_secret: '  ' })
  assert.deepEqual(Object.keys(vacio).sort(), ['client_id', 'client_secret', 'instancia'])

  const otraDireccion = validarCredencialesNuby({ instancia: 'mi-inmobiliaria.com', client_id: 'cliente', client_secret: 'clave' })
  assert.deepEqual(Object.keys(otraDireccion), ['instancia'])
  assert.match(otraDireccion.instancia ?? '', /\.nuby\.app/)
  assert.match(otraDireccion.instancia ?? '', /\.arrendasoft\.co/)
})

test('el ID de cliente se muestra oculto salvo el final', () => {
  assert.equal(idClienteOculto('a1b2'), '••••a1b2')
  assert.equal(idClienteOculto(null), '••••')
})

test('etiquetas del estado de la conexión', () => {
  assert.equal(etiquetaEstadoNuby('activa'), 'Activa')
  assert.equal(etiquetaEstadoNuby('error'), 'Con error')
  assert.equal(etiquetaEstadoNuby('pausada'), 'Pausada')
  assert.equal(etiquetaEstadoNuby('otro'), 'otro')
})

test('un estado completo pasa igual por la normalización', () => {
  const completo = estadoConectado(true)
  assert.deepEqual(normalizarEstadoNuby(completo), completo)
})

test('si la API omite totales o listas, la pantalla recibe vacíos', () => {
  const incompleto = { habilitada: true, sincronizacion_automatica: false, conectada: false } as unknown as EstadoIntegracionNuby
  assert.deepEqual(normalizarEstadoNuby(incompleto), {
    habilitada: true,
    sincronizacion_automatica: false,
    conectada: false,
    integracion: null,
    totales: { vinculados: 0, codigo_repetido: 0, no_traidos: 0, con_diferencias: 0, ausentes: 0 },
    pendientes: { codigo_repetido: [], no_traidos: [], con_diferencias: [] },
  })

  const sinCandidatos = {
    ...estadoConectado(),
    pendientes: {
      codigo_repetido: [{ codigo: 'A-01', titulo: null, direccion: null }],
      con_diferencias: [{ codigo: 'A-03', inmueble_id: '00000000-0000-4000-8000-000000000002', direccion: null }],
    },
  } as unknown as EstadoIntegracionNuby
  const n = normalizarEstadoNuby(sinCandidatos)
  assert.deepEqual(n.pendientes.codigo_repetido[0].candidatos, [])
  assert.deepEqual(n.pendientes.con_diferencias[0].diferencias, [])
  assert.deepEqual(n.pendientes.no_traidos, [])
})

test('sigue sincronizando solo si está conectada y la API lo dice', () => {
  assert.equal(sigueSincronizando(null), false)
  assert.equal(sigueSincronizando(estadoConectado(false)), false)
  assert.equal(sigueSincronizando(estadoConectado(true)), true)
  assert.equal(sigueSincronizando({ ...estadoConectado(true), conectada: false }), false)
  assert.equal(sigueSincronizando({ ...estadoConectado(), integracion: null }), false)
})

test('al lanzar la copia se marca en curso sin tocar el estado original', () => {
  const antes = estadoConectado(false)
  const despues = marcarSincronizando(antes)
  assert.equal(despues?.integracion?.sincronizando, true)
  assert.equal(antes.integracion?.sincronizando, false)
  assert.equal(marcarSincronizando(null), null)
  const sinConexion = { ...estadoConectado(), conectada: false, integracion: null }
  assert.equal(marcarSincronizando(sinConexion), sinConexion)
})

test('al desconectar no quedan conexión ni pendientes, y se conserva lo de la plataforma', () => {
  const d = estadoDesconectado({ ...estadoConectado(true), sincronizacion_automatica: false })
  assert.equal(d.conectada, false)
  assert.equal(d.integracion, null)
  assert.equal(d.habilitada, true)
  assert.equal(d.sincronizacion_automatica, false)
  assert.deepEqual(d.totales, { vinculados: 0, codigo_repetido: 0, no_traidos: 0, con_diferencias: 0, ausentes: 0 })
  assert.deepEqual(d.pendientes, { codigo_repetido: [], no_traidos: [], con_diferencias: [] })
  assert.equal(sigueSincronizando(d), false)
})

test('el resumen de la copia sale completo, en orden y con cifras', () => {
  const resumen = estadoConectado().integracion!.resumen!
  const cifras = cifrasDeResumen(resumen)
  assert.deepEqual(
    cifras.map((c) => c.clave),
    ['leidos', 'en_arriendo', 'creados', 'actualizados', 'vinculados', 'sin_cambios', 'protegidos', 'no_traidos', 'ausentes', 'fotos_copiadas'],
  )
  assert.equal(cifras.find((c) => c.clave === 'fotos_copiadas')?.valor, 18)
  assert.ok(cifras.every((c) => c.etiqueta.length > 0 && Number.isFinite(c.valor)))
  // Una cifra que no llegó cuenta como 0, no como «NaN».
  const incompleto = { ...resumen, creados: undefined as unknown as number }
  assert.equal(cifrasDeResumen(incompleto).find((c) => c.clave === 'creados')?.valor, 0)
})

test('la prueba correcta dice cuántos inmuebles de muestra respondió nuby', () => {
  assert.equal(textoPruebaCorrecta(0), 'La conexión con nuby funciona.')
  assert.equal(textoPruebaCorrecta(undefined), 'La conexión con nuby funciona.')
  assert.match(textoPruebaCorrecta(1), /1 inmueble de muestra/)
  assert.match(textoPruebaCorrecta(5), /5 inmuebles de muestra/)
})

test('cada motivo de «no se trajo» tiene su texto', () => {
  assert.equal(textoMotivoNoTraido('sin_canon'), 'No tiene canon de arriendo')
  assert.equal(textoMotivoNoTraido('sin_direccion', null), 'No tiene dirección')
  assert.equal(textoMotivoNoTraido('sin_municipio'), 'No tiene municipio')
  assert.equal(textoMotivoNoTraido('codigo_invalido'), 'Su código no es válido')
})

test('el tipo sin equivalente muestra el detalle; los demás motivos no', () => {
  assert.equal(textoMotivoNoTraido('clase_sin_equivalente', 'Parqueadero'), 'Su tipo de inmueble no tiene equivalente en Cofianza: Parqueadero')
  assert.equal(textoMotivoNoTraido('clase_sin_equivalente', '  '), 'Su tipo de inmueble no tiene equivalente en Cofianza')
  assert.equal(textoMotivoNoTraido('sin_canon', 'dato interno'), 'No tiene canon de arriendo')
})

test('un motivo que la web no conoce no rompe la lista', () => {
  assert.equal(textoMotivoNoTraido('motivo_nuevo', 'Explicación de la API'), 'Explicación de la API')
  assert.equal(textoMotivoNoTraido('motivo_nuevo', null), 'No se pudo traer')
})

test('«y N más» sale solo cuando la lista llegó recortada', () => {
  assert.equal(cuantosMas(25, 20), 5)
  assert.equal(cuantosMas(20, 20), 0)
  assert.equal(cuantosMas(3, 20), 0)
  assert.equal(cuantosMas(undefined, 2), 0)
  assert.equal(cuantosMas(null, 0), 0)
  assert.equal(textoYMas(5), 'y 5 más')
})

test('las diferencias se muestran con etiqueta y valor legibles', () => {
  assert.equal(etiquetaCampoDiferencia('canon'), 'Canon')
  assert.equal(etiquetaCampoDiferencia('estado'), 'Estado')
  assert.equal(etiquetaCampoDiferencia('otro'), 'otro')

  assert.equal(valorDiferencia('canon', '1500000'), '$1.500.000')
  assert.equal(valorDiferencia('canon', '1500000.00'), '$1.500.000')
  // Si la API ya lo manda con formato, no se toca.
  assert.equal(valorDiferencia('canon', '$1.500.000'), '$1.500.000')
  assert.equal(valorDiferencia('estado', 'arrendado'), 'Arrendado')
  assert.equal(valorDiferencia('estado', 'Retirado'), 'Retirado')
  assert.equal(valorDiferencia('estado', ''), '—')
  assert.equal(valorDiferencia('canon', null), '—')
})

test('se muestra el mensaje de la API y se conserva el código', () => {
  const e = leerErrorNuby(
    { message: 'nuby rechazó el ID de cliente o la clave secreta.', code: 'NUBY_CREDENCIALES_RECHAZADAS', statusCode: 422 },
    'No pudimos conectar.',
  )
  assert.deepEqual(e, { mensaje: 'nuby rechazó el ID de cliente o la clave secreta.', code: 'NUBY_CREDENCIALES_RECHAZADAS', statusCode: 422 })
})

test('sin mensaje de la API se usa el texto por defecto', () => {
  assert.equal(leerErrorNuby({ message: '  ', statusCode: 502 }, 'No pudimos conectar.').mensaje, 'No pudimos conectar.')
  assert.equal(leerErrorNuby(null, 'No pudimos conectar.').mensaje, 'No pudimos conectar.')
})

test('el error de red de apiClient (statusCode 0) conserva su mensaje', () => {
  const e = leerErrorNuby({ message: 'Error de conexión.', code: 'NETWORK_ERROR', statusCode: 0 }, 'No pudimos conectar.')
  assert.deepEqual(e, { mensaje: 'Error de conexión.', code: 'NETWORK_ERROR', statusCode: 0 })
})

test('un error que no viene de la API no se muestra tal cual', () => {
  const e = leerErrorNuby(new TypeError("Cannot read properties of undefined (reading 'totales')"), 'No pudimos cargar la conexión con nuby.')
  assert.equal(e.mensaje, 'No pudimos cargar la conexión con nuby.')
})

test('el 429 siempre pide esperar unos minutos', () => {
  const e = leerErrorNuby({ message: 'Error en el servidor.', statusCode: 429 }, 'No pudimos iniciar la copia.')
  assert.match(e.mensaje, /Espere unos minutos/)
  assert.equal(e.statusCode, 429)
})
