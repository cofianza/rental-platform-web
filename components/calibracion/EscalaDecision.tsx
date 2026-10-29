'use client'

/**
 * La escala de decisión dibujada con los valores vigentes: una barra de color
 * por cada umbral, con el número tocable (abre su diálogo de cambio) y debajo
 * qué pasa en cada tramo. Los textos dependen de las reglas encendidas.
 */

import { cn } from '@/lib/utils'
import { fmt, metaDe, type Valores } from './parametros'

type Tono = 'rojo' | 'naranja' | 'ambar' | 'verde' | 'gris'
interface Tramo {
  desde: number
  hasta: number // exclusivo
  /** Clave del umbral que abre el tramo (la que se toca para cambiarlo). */
  clave?: string
  /** El número que se muestra en el corte, si no es `desde` (un «hasta» inclusivo). */
  marca?: number
  titulo: string
  detalle: string
  tono: Tono
}

const COLOR: Record<Tono, { barra: string; punto: string }> = {
  rojo: { barra: 'bg-red-400', punto: 'bg-red-500' },
  naranja: { barra: 'bg-orange-300', punto: 'bg-orange-400' },
  ambar: { barra: 'bg-amber-300', punto: 'bg-amber-400' },
  verde: { barra: 'bg-primary-500', punto: 'bg-primary-600' },
  gris: { barra: 'bg-gray-300', punto: 'bg-gray-400' },
}

/** Umbrales que se dibujan en la escala del puntaje (el diálogo los previsualiza). */
export const ESCALA_CLAVES = [
  'UMBRAL_ZONA_GRIS',
  'UMBRAL_APROBACION_AUTOMATICA',
  'PUNTAJE_PISO_COARRENDATARIO',
  'PUNTAJE_MINIMO_TITULAR_PARA_COARRENDATARIO',
  'UMBRAL_CASCADA_RECHAZO',
  'UMBRAL_CASCADA_APROBACION',
  'UMBRAL_SCORE_RECHAZO',
  'UMBRAL_SCORE_REVISION',
]

function tramosPuntaje(v: Valores): Tramo[] {
  const gris = v.UMBRAL_ZONA_GRIS
  const auto = v.UMBRAL_APROBACION_AUTOMATICA
  const piso = v.ADENDA4 === 1 ? v.PUNTAJE_PISO_COARRENDATARIO : null
  const t: Tramo[] = []
  if (piso !== null && piso < gris) {
    // En 0, todo el que quede bajo la zona gris solo por el endeudamiento puede presentar coarrendatario.
    if (piso > 0) t.push({ desde: 0, hasta: piso, titulo: 'Se rechaza', detalle: 'No alcanza el mínimo.', tono: 'rojo' })
    t.push({
      desde: piso,
      hasta: gris,
      clave: 'PUNTAJE_PISO_COARRENDATARIO',
      titulo: 'Se rechaza, salvo un caso',
      detalle: 'Con inmobiliaria, si solo lo baja el endeudamiento sin ingreso comprobado, se le exige un coarrendatario y decide un analista.',
      tono: 'naranja',
    })
  } else {
    t.push({ desde: 0, hasta: gris, titulo: 'Se rechaza', detalle: 'No alcanza el mínimo.', tono: 'rojo' })
  }
  // Entre la zona gris y el mínimo para ofrecer coarrendatario: con los valores
  // iniciales (70 y 70) este tramo no existe; aparece si Gerencia sube el segundo.
  const minTitular = v.ADENDA3_V2 === 1 ? Math.min(Math.max(v.PUNTAJE_MINIMO_TITULAR_PARA_COARRENDATARIO, gris), auto) : gris
  if (minTitular > gris) {
    t.push({
      desde: gris,
      hasta: minTitular,
      clave: 'UMBRAL_ZONA_GRIS',
      titulo: 'Decide un analista',
      detalle: 'No se aprueba solo y no se le ofrece coarrendatario.',
      tono: 'ambar',
    })
  }
  t.push({
    desde: minTitular,
    hasta: auto,
    clave: minTitular > gris ? 'PUNTAJE_MINIMO_TITULAR_PARA_COARRENDATARIO' : 'UMBRAL_ZONA_GRIS',
    titulo: 'Zona gris',
    detalle:
      v.ADENDA3_V2 === 1
        ? 'No se aprueba solo: con inmobiliaria se le pide un coarrendatario («Está cerca»); sin inmobiliaria, decide un analista.'
        : 'No se aprueba solo: lo decide un analista.',
    tono: 'ambar',
  })
  t.push({
    desde: auto,
    hasta: 101,
    clave: 'UMBRAL_APROBACION_AUTOMATICA',
    titulo: 'Se aprueba solo',
    detalle: 'Sin analista, si el ingreso alcanza y no hay alertas.',
    tono: 'verde',
  })
  return t
}

function tramosCentrales(v: Valores): Tramo[] {
  return [
    {
      desde: 0,
      hasta: v.UMBRAL_CASCADA_RECHAZO,
      titulo: 'Basta una central',
      detalle: 'Se rechaza sin consultar la segunda, salvo que la central dé un puntaje de la franja del analista.',
      tono: 'rojo',
    },
    {
      desde: v.UMBRAL_CASCADA_RECHAZO,
      hasta: v.UMBRAL_CASCADA_APROBACION,
      clave: 'UMBRAL_CASCADA_RECHAZO',
      titulo: 'Se consultan las dos',
      detalle: 'Se consulta también la segunda central antes de decidir.',
      tono: 'gris',
    },
    {
      desde: v.UMBRAL_CASCADA_APROBACION,
      hasta: 101,
      clave: 'UMBRAL_CASCADA_APROBACION',
      titulo: 'Basta una central',
      detalle: 'No se consulta la segunda: se aprueba si el ingreso alcanza y nada pide revisión.',
      tono: 'verde',
    },
  ]
}

const SCORE_MIN = 150
const SCORE_MAX = 950

function tramosScore(v: Valores): Tramo[] {
  const rojo: Tramo = {
    desde: SCORE_MIN,
    hasta: v.UMBRAL_SCORE_RECHAZO,
    titulo: 'Se rechaza',
    detalle: 'Sin importar el resto. Si se consultaron las dos centrales, cuenta el promedio.',
    tono: 'rojo',
  }
  // El API admite el de revisión por debajo del mínimo: entonces no hay franja del analista.
  if (v.UMBRAL_SCORE_REVISION < v.UMBRAL_SCORE_RECHAZO) {
    return [
      rojo,
      {
        desde: v.UMBRAL_SCORE_RECHAZO,
        hasta: SCORE_MAX + 1,
        clave: 'UMBRAL_SCORE_RECHAZO',
        titulo: 'Sigue la evaluación',
        detalle: 'Decide el puntaje del solicitante (barra 1).',
        tono: 'verde',
      },
    ]
  }
  return [
    rojo,
    {
      desde: v.UMBRAL_SCORE_RECHAZO,
      hasta: v.UMBRAL_SCORE_REVISION + 1,
      clave: 'UMBRAL_SCORE_RECHAZO',
      titulo: 'Decide un analista',
      detalle: 'Se consulta la otra central; si el promedio sigue en esta franja, no se aprueba ni se rechaza por puntaje.',
      tono: 'ambar',
    },
    {
      desde: v.UMBRAL_SCORE_REVISION + 1,
      hasta: SCORE_MAX + 1,
      clave: 'UMBRAL_SCORE_REVISION',
      marca: v.UMBRAL_SCORE_REVISION,
      titulo: 'Sigue la evaluación',
      detalle: 'Decide el puntaje del solicitante (barra 1).',
      tono: 'verde',
    },
  ]
}

interface BarraProps {
  titulo: string
  tramos: Tramo[]
  min: number
  max: number
  resaltar?: string
  onAbrir?: (clave: string) => void
  /** El puntaje de 0 a 100 trae decimales: el tramo se escribe «70 a 84,9». */
  decimales?: boolean
}

function Barra({ titulo, tramos, min, max, resaltar, onAbrir, decimales }: BarraProps) {
  const total = max + 1 - min
  const ancho = (t: Tramo) => `${(Math.max(0, Math.min(t.hasta, max + 1) - Math.max(t.desde, min)) / total) * 100}%`
  const pos = (n: number) => ((n - min) / total) * 100
  const texto = (t: Tramo) =>
    t.hasta > max ? `${t.desde} o más` : t.desde <= min ? `Menos de ${t.hasta}` : `${t.desde} a ${decimales ? fmt(t.hasta - 0.1) : t.hasta - 1}`
  // Dos cortes muy juntos (p. ej. 65 y 70) se tapaban: el segundo baja a otra fila.
  const cortes = tramos.filter((t) => t.clave && t.desde > min)
  const filas = cortes.reduce<number[]>((acc, t, i) => {
    const cerca = i > 0 && pos(t.desde) - pos(cortes[i - 1].desde) < 7 && acc[i - 1] === 0
    return [...acc, cerca ? 1 : 0]
  }, [])

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-gray-800">{titulo}</p>
      <div className="flex h-3 overflow-hidden rounded-full" aria-hidden>
        {tramos.map((t, i) => (
          <div key={i} className={COLOR[t.tono].barra} style={{ width: ancho(t) }} />
        ))}
      </div>
      {/* Los umbrales, debajo de cada corte. */}
      <div className={cn('relative mt-1', filas.includes(1) ? 'h-14' : 'h-7')}>
        {cortes.map((t, i) => {
            const meta = metaDe(t.clave!)
            const contenido = <span className="font-mono">{t.marca ?? t.desde}</span>
            return (
              <span key={t.clave} className="absolute -translate-x-1/2" style={{ left: `${pos(t.desde)}%`, top: filas[i] ? '1.75rem' : 0 }}>
                {onAbrir ? (
                  <button
                    type="button"
                    onClick={() => onAbrir(t.clave!)}
                    aria-label={`Cambiar: ${meta.nombre} (${t.marca ?? t.desde})`}
                    className="rounded-md border border-gray-300 bg-white px-1.5 py-0.5 text-xs font-bold text-gray-800 shadow-sm hover:border-primary-400 hover:text-primary-800"
                  >
                    {contenido}
                  </button>
                ) : (
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-xs font-bold',
                      resaltar === t.clave ? 'bg-primary-700 text-white' : 'text-gray-700',
                    )}
                  >
                    {contenido}
                  </span>
                )}
              </span>
            )
          })}
      </div>
      <ul className="mt-1 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {tramos.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', COLOR[t.tono].punto)} />
            <span>
              <span className="font-semibold text-gray-900">
                {texto(t)}: {t.titulo}.
              </span>{' '}
              <span className="text-gray-600">{t.detalle}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Solo la escala del umbral que se está cambiando (para previsualizar el cambio). */
export function EscalaPuntaje({ valores, resaltar }: { valores: Valores; resaltar: string }) {
  if (resaltar.startsWith('UMBRAL_CASCADA_'))
    return <Barra titulo="Consulta a la segunda central" tramos={tramosCentrales(valores)} min={0} max={100} resaltar={resaltar} decimales />
  if (resaltar.startsWith('UMBRAL_SCORE_'))
    return <Barra titulo="Puntaje de la central" tramos={tramosScore(valores)} min={SCORE_MIN} max={SCORE_MAX} resaltar={resaltar} />
  return <Barra titulo="Puntaje del solicitante" tramos={tramosPuntaje(valores)} min={0} max={100} resaltar={resaltar} decimales />
}

export function EscalaDecision({ valores, onAbrir }: { valores: Valores; onAbrir: (clave: string) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <Barra titulo="1. Puntaje del solicitante (0 a 100)" tramos={tramosPuntaje(valores)} min={0} max={100} onAbrir={onAbrir} decimales />
        <p className="mt-2 text-xs text-gray-500">
          Antes que este puntaje mandan las reglas que rechazan siempre (por ejemplo, una mora actual) y el puntaje que reporta la
          central (barra 3).
        </p>
      </div>
      <Barra
        titulo="2. ¿Hace falta consultar la segunda central? (mismo puntaje, con la primera central)"
        tramos={tramosCentrales(valores)}
        min={0}
        max={100}
        onAbrir={onAbrir}
        decimales
      />
      <Barra
        titulo="3. Puntaje que reporta la central (DataCrédito o TransUnion)"
        tramos={tramosScore(valores)}
        min={SCORE_MIN}
        max={SCORE_MAX}
        onAbrir={onAbrir}
      />
    </div>
  )
}
