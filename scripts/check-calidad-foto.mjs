// Chequeo de la revisión previa de las fotos de identidad (lib/biometria/calidadFoto.ts)
// con imágenes sintéticas en memoria. La web no tiene runner: node scripts/check-calidad-foto.mjs
import assert from 'node:assert/strict'
import { luz, nitidez, revisarFoto, pistaSelfie, pistaDocumento, recortar } from '../lib/biometria/calidadFoto.ts'

const W = 384
const H = 512

/** Imagen en grises con textura (tablero fino) y un brillo base: «nítida». */
function textura(base, amplitud = 40, ancho = W, alto = H) {
  const pixeles = new Uint8Array(ancho * alto)
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const v = base + (((x >> 1) + (y >> 1)) % 2 ? amplitud : -amplitud)
      pixeles[y * ancho + x] = Math.max(0, Math.min(255, v))
    }
  }
  return { pixeles, ancho, alto }
}
const lisa = (v, ancho = W, alto = H) => ({ pixeles: new Uint8Array(ancho * alto).fill(v), ancho, alto })
const cara = (x, y, ancho, alto = ancho, score = 0.9) => ({ x, y, ancho, alto, score })
const docBuena0 = () => textura(150)
const centrada = cara(0.2, 0.2, 0.6, 0.45)
const codigo = (entrada) => revisarFoto(entrada)?.codigo ?? null

// Medidas básicas
assert.equal(luz(lisa(10)).media, 10)
assert.equal(luz(lisa(255)).quemados, 1)
assert.equal(nitidez(lisa(128)), 0)
assert.ok(nitidez(textura(128)) > 100)
assert.deepEqual([recortar(lisa(1), 0.5, 0.5, 0.5, 0.5).ancho, recortar(lisa(1), 0.5, 0.5, 0.5, 0.5).alto], [W / 2, H / 2])

// Selfie
assert.equal(codigo({ tipo: 'selfie', gris: textura(130), caras: [centrada] }), null, 'selfie buena')
assert.equal(codigo({ tipo: 'selfie', gris: textura(130), caras: [] }), 'sin_cara')
assert.match(revisarFoto({ tipo: 'selfie', gris: textura(15, 10), caras: [] }).texto, /oscura/, 'sin cara y oscura lo dice')
assert.equal(codigo({ tipo: 'selfie', gris: textura(130), caras: [centrada, cara(0.05, 0.05, 0.5)] }), 'varias_caras')
assert.equal(codigo({ tipo: 'selfie', gris: textura(130), caras: [centrada, cara(0.8, 0.1, 0.1)] }), null, 'una cara lejana al fondo no cuenta')
assert.equal(codigo({ tipo: 'selfie', gris: textura(130), caras: [centrada, cara(0.0, 0.0, 0.5, 0.5, 0.3)] }), null, 'una detección dudosa no cuenta')
assert.equal(codigo({ tipo: 'selfie', gris: textura(20, 10), caras: [centrada] }), 'oscura')
assert.equal(codigo({ tipo: 'selfie', gris: lisa(130), caras: [centrada] }), 'borrosa')
assert.equal(codigo({ tipo: 'selfie', gris: textura(130), caras: [cara(0.45, 0.45, 0.1, 0.08)] }), 'lejos')
assert.equal(codigo({ tipo: 'selfie', gris: textura(130), caras: [cara(0.0, 0.1, 0.99, 0.8)] }), 'cerca')
assert.equal(codigo({ tipo: 'selfie', gris: textura(130), caras: [cara(0.0, 0.0, 0.25, 0.2)] }), 'descentrada')
// Piel oscura con luz normal (cara ~90 de 255): nunca «busque más luz».
assert.equal(codigo({ tipo: 'selfie', gris: textura(90, 30), caras: [centrada] }), null)
// Foto de la cámara del celular (sin óvalo ni marco): los avisos no los nombran.
assert.doesNotMatch(revisarFoto({ tipo: 'selfie', gris: textura(130), caras: [], guia: false }).texto, /óvalo/)
assert.doesNotMatch(revisarFoto({ tipo: 'documento', gris: docBuena0(), caras: [], guia: false }).texto, /marco/)
// Sin detector (no cargó o la persona ahorra datos): solo luz y nitidez.
assert.equal(codigo({ tipo: 'selfie', gris: textura(130), caras: null }), null)
assert.equal(codigo({ tipo: 'selfie', gris: textura(15, 10), caras: null }), 'oscura')

// Documento
const docBuena = textura(150)
assert.equal(codigo({ tipo: 'documento', gris: docBuena, caras: [cara(0.1, 0.3, 0.15)] }), null, 'cédula buena')
assert.equal(codigo({ tipo: 'documento', gris: docBuena, caras: [] }), 'doc_sin_cara')
assert.equal(codigo({ tipo: 'documento', gris: docBuena, caras: null }), null, 'sin detector no se afirma que falte la cara')
assert.equal(codigo({ tipo: 'documento', gris: textura(20, 10), caras: [] }), 'oscura', 'oscura gana: es lo que hay que corregir primero')
const reflejo = textura(150)
for (let y = 200; y < 330; y++) for (let x = 130; x < 260; x++) reflejo.pixeles[y * W + x] = 255
assert.equal(codigo({ tipo: 'documento', gris: reflejo, caras: [cara(0.1, 0.3, 0.15)] }), 'reflejo')
assert.equal(codigo({ tipo: 'documento', gris: lisa(150), caras: [cara(0.1, 0.3, 0.15)] }), 'borrosa')
assert.equal(codigo({ tipo: 'documento', gris: textura(245, 8), caras: [cara(0.1, 0.3, 0.15)] }), null, 'cédula muy clara: no es reflejo')
assert.equal(luz(textura(100, 20)).mediana, 80)
assert.match(revisarFoto({ tipo: 'documento', gris: docBuena, caras: [], documentoNombre: 'cédula de ciudadanía' }).titulo, /su cédula$/)
assert.match(revisarFoto({ tipo: 'documento', gris: docBuena, caras: [], documentoNombre: 'pasaporte' }).texto, /página/)

// Ningún texto lleva cifras ni palabras internas.
for (const e of [
  { tipo: 'selfie', gris: textura(130), caras: [] },
  { tipo: 'selfie', gris: lisa(130), caras: [centrada] },
  { tipo: 'documento', gris: reflejo, caras: [cara(0.1, 0.3, 0.15)] },
]) {
  const a = revisarFoto(e)
  assert.doesNotMatch(`${a.titulo} ${a.texto}`, /\d|%|score|buró|auco/i)
}

// Avisos en vivo
assert.equal(pistaSelfie({ media: 20, caras: null }).texto, 'Busque más luz')
assert.equal(pistaSelfie({ media: 120, caras: [] }).lista, false)
assert.equal(pistaSelfie({ media: 120, caras: [cara(0.45, 0.45, 0.1)] }).texto, 'Acérquese un poco')
assert.equal(pistaSelfie({ media: 120, caras: [cara(0.0, 0.3, 0.4)] }).texto, 'Centre su cara en el óvalo')
assert.equal(pistaSelfie({ media: 120, caras: [cara(0.3, 0.26, 0.4)], centroY: 0.46 }).lista, true)
assert.equal(pistaDocumento({ media: 140, mediana: 150, quemados: 0.2 }, 'cédula de ciudadanía').texto, 'Incline un poco su cédula: tiene un reflejo')
// En vivo no se detecta la cédula: el marco nunca se pone verde («lista»).
assert.equal(pistaDocumento({ media: 140, mediana: 150, quemados: 0 }).lista, false)
assert.equal(pistaDocumento({ media: 140, mediana: 150, quemados: 0 }).texto, 'Ubique su documento dentro del marco')
// Una cédula clara o sobreexpuesta entera no es un «reflejo».
assert.equal(pistaDocumento({ media: 248, mediana: 251, quemados: 0.6 }).texto, 'Ubique su documento dentro del marco')

console.log('calidadFoto: revisión previa OK')
