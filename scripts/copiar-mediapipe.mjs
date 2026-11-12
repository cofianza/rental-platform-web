// Copia el wasm de MediaPipe (detector de caras de la verificación de
// identidad, lib/biometria/detectorCaras.ts) de node_modules a public/, para
// servirlo desde el propio sitio sin CDN de terceros. Corre antes de `dev` y
// de `build` (predev/prebuild); la carpeta destino está en .gitignore porque
// son ~26 MB que ya vienen en el paquete. El modelo (BlazeFace de rango corto,
// Apache-2.0) sí está versionado en public/mediapipe/.
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const origen = join(raiz, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const destino = join(raiz, 'public', 'mediapipe', 'wasm')

// Solo los que pide FilesetResolver.forVisionTasks: con SIMD y sin SIMD (Safari < 16.4).
const archivos = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
]

if (!existsSync(origen)) {
  // Sin el paquete la revisión de caras queda apagada (el detector no carga y
  // la pantalla sigue solo con luz y nitidez); no es motivo para romper el build.
  console.warn(`copiar-mediapipe: no existe ${origen}; la revisión de caras queda sin detector`)
  process.exit(0)
}
mkdirSync(destino, { recursive: true })
for (const a of archivos) cpSync(join(origen, a), join(destino, a))
console.log(`copiar-mediapipe: ${archivos.length} archivos en public/mediapipe/wasm`)
