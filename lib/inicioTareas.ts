/**
 * Inicio de la inmobiliaria como lista de tareas (reporte de la Oficina Virtual del 25-nov, puntos 10 y 11): una línea
 * por grupo con su total real (GET /oficina-virtual/conteos, sección «acciones») y su frase en singular o plural.
 * Cada estudio está en UN grupo: «Requieren su acción» va sin los que ya tienen el suyo (requieren_accion_otros de la
 * API). Los grupos en 0 no salen; sin ninguno, la lista queda vacía (la pantalla dice que no hay pendientes). Pura.
 */

import type { IAccionesOficina } from '@/types/oficinaVirtual'

export type ClaveTarea =
  | 'contratos_por_generar'
  | 'aprobados_canon_excede'
  | 'aprobados_segundo_firmante'
  | 'evaluaciones_por_habilitar'
  | 'citas_por_confirmar'
  | 'citas_por_realizar'
  | 'requieren_accion_otros'
  | 'esperando_autorizacion'
  | 'aprobados_en_verificacion'

export interface LineaTarea {
  clave: ClaveTarea
  total: number
  /** La frase de la línea: «Tiene 11 contratos por generar». */
  texto: string
  /** accion = le toca a quien gestiona; espera = espera a otra persona (el prospecto o Cofianza). */
  tono: 'accion' | 'espera'
  /** Donde está la lista completa, con su filtro. */
  destino: { href: string; seccion: string }
}

/** Lo que el Inicio lee de la sección «acciones» (los campos nuevos pueden faltar con una API anterior). */
export type AccionesInicio = Pick<
  IAccionesOficina,
  | 'requieren_accion'
  | 'requieren_accion_otros'
  | 'esperando_autorizacion'
  | 'citas_por_confirmar'
  | 'citas_por_realizar'
  | 'evaluaciones_por_habilitar'
  | 'contratos_por_generar'
  | 'aprobados_canon_excede'
  | 'aprobados_segundo_firmante'
  | 'aprobados_en_verificacion'
>

const miles = (n: number) => n.toLocaleString('es-CO')
/** «1 estudio aprobado necesita» / «4 estudios aprobados necesitan». */
const segun = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios.replace('{n}', miles(n)))

const ESTUDIOS = { href: '/expedientes?estudio_filtro=requiere_accion', seccion: 'Estudios' }
const CONTRATOS = { href: '/contratos', seccion: 'Contratos' }
const VISITAS = { href: '/citas', seccion: 'Visitas' }

/** Los grupos de estudios que no son «otros»: si alguno sale, «otros» se dice «Otros N estudios…». */
const GRUPOS_DE_ESTUDIOS: ClaveTarea[] = [
  'contratos_por_generar',
  'aprobados_canon_excede',
  'aprobados_segundo_firmante',
  'evaluaciones_por_habilitar',
  'aprobados_en_verificacion',
]

/**
 * La frase de «Requieren su acción». Con el total sin repetidos (`exacto`): «Otros 3 estudios requieren su acción» si
 * hay otros grupos de estudios en la lista, o «3 estudios requieren su acción» si no. Sin él (una API anterior), el
 * total del filtro incluye a los de los demás grupos: «En total, 3 estudios requieren su acción».
 */
export function textoRequierenAccion(n: number, { exacto, hayOtrosGrupos }: { exacto: boolean; hayOtrosGrupos: boolean }): string {
  if (!exacto && hayOtrosGrupos) return segun(n, 'En total, 1 estudio requiere su acción', 'En total, {n} estudios requieren su acción')
  if (hayOtrosGrupos) return segun(n, 'Otro estudio requiere su acción', 'Otros {n} estudios requieren su acción')
  return segun(n, '1 estudio requiere su acción', '{n} estudios requieren su acción')
}

/** Las líneas del Inicio, en orden de prioridad, sin los grupos en 0. Pura. */
export function lineasDeInicio(a: AccionesInicio): LineaTarea[] {
  const lineas: LineaTarea[] = []
  const agregar = (clave: ClaveTarea, total: number | null | undefined, texto: (n: number) => string, tono: LineaTarea['tono'], destino: LineaTarea['destino']) => {
    if (typeof total === 'number' && total > 0) lineas.push({ clave, total, texto: texto(total), tono, destino })
  }

  agregar('contratos_por_generar', a.contratos_por_generar, (n) => segun(n, 'Tiene 1 contrato por generar', 'Tiene {n} contratos por generar'), 'accion', CONTRATOS)
  agregar(
    'aprobados_canon_excede',
    a.aprobados_canon_excede,
    (n) => segun(n, '1 estudio aprobado necesita otro inmueble', '{n} estudios aprobados necesitan otro inmueble'),
    'accion',
    CONTRATOS,
  )
  agregar(
    'aprobados_segundo_firmante',
    a.aprobados_segundo_firmante,
    // Incluye al segundo firmante invitado, evaluándose o en verificación de Cofianza: un texto que vale para los tres.
    (n) => segun(n, '1 estudio aprobado tiene pendiente al segundo firmante', '{n} estudios aprobados tienen pendiente al segundo firmante'),
    'accion',
    CONTRATOS,
  )
  agregar(
    'evaluaciones_por_habilitar',
    a.evaluaciones_por_habilitar,
    (n) => segun(n, 'Tiene 1 evaluación por habilitar', 'Tiene {n} evaluaciones por habilitar'),
    'accion',
    VISITAS,
  )
  agregar('citas_por_confirmar', a.citas_por_confirmar, (n) => segun(n, 'Tiene 1 visita por confirmar', 'Tiene {n} visitas por confirmar'), 'accion', VISITAS)
  agregar('citas_por_realizar', a.citas_por_realizar, (n) => segun(n, 'Tiene 1 visita por realizar', 'Tiene {n} visitas por realizar'), 'accion', VISITAS)

  const hayOtrosGrupos = GRUPOS_DE_ESTUDIOS.some((c) => {
    const v = a[c as keyof AccionesInicio]
    return typeof v === 'number' && v > 0
  })
  const exacto = typeof a.requieren_accion_otros === 'number'
  agregar(
    'requieren_accion_otros',
    exacto ? a.requieren_accion_otros : a.requieren_accion,
    (n) => textoRequierenAccion(n, { exacto, hayOtrosGrupos }),
    'accion',
    ESTUDIOS,
  )
  agregar(
    'esperando_autorizacion',
    a.esperando_autorizacion,
    (n) => segun(n, '1 estudio espera autorización', '{n} estudios esperan autorización'),
    'espera',
    { href: '/expedientes?estudio_filtro=espera_autorizacion', seccion: 'Estudios' },
  )
  agregar(
    'aprobados_en_verificacion',
    a.aprobados_en_verificacion,
    (n) => segun(n, '1 estudio aprobado está en verificación de Cofianza', '{n} estudios aprobados están en verificación de Cofianza'),
    'espera',
    CONTRATOS,
  )
  return lineas
}

/**
 * Con una API sin la sección «acciones» (versión anterior), las líneas salen de las filas que se ven (como antes:
 * hasta 5 por grupo) y del total del filtro «Requieren su acción»; sin «espera autorización» (no se sabe). Pura.
 */
export function accionesDesdeFilas(f: {
  porConfirmar: number
  porRealizar: number
  porHabilitar: number
  porGenerarContrato: number
  canonExcede: number
  segundoFirmante: number
  enVerificacion: number
  requierenAccion: number
}): AccionesInicio {
  return {
    requieren_accion: f.requierenAccion,
    requieren_accion_otros: null,
    esperando_autorizacion: null,
    citas_por_confirmar: f.porConfirmar,
    citas_por_realizar: f.porRealizar,
    evaluaciones_por_habilitar: f.porHabilitar,
    contratos_por_generar: f.porGenerarContrato,
    aprobados_canon_excede: f.canonExcede,
    aprobados_segundo_firmante: f.segundoFirmante,
    aprobados_en_verificacion: f.enVerificacion,
  }
}

/** Los tres grupos de aprobados con algo por resolver: en Contratos van juntos en un solo panel. */
const APROBADOS_CON_TRABA: ClaveTarea[] = ['aprobados_canon_excede', 'aprobados_segundo_firmante', 'aprobados_en_verificacion']

/**
 * «Ver los 11 en Contratos» / «Ver las 3 en Visitas» (citas y evaluaciones en femenino). Los aprobados con algo por
 * resolver están en Contratos en un panel que junta los tres grupos: se nombra el panel, sin un número que allí no
 * cuadra.
 */
export function textoVerTodos(linea: Pick<LineaTarea, 'clave' | 'total' | 'destino'>): string {
  const femenino = linea.clave === 'citas_por_confirmar' || linea.clave === 'citas_por_realizar' || linea.clave === 'evaluaciones_por_habilitar'
  if (linea.clave === 'requieren_accion_otros') return 'Ver todos los que requieren su acción en Estudios'
  if (APROBADOS_CON_TRABA.includes(linea.clave)) return 'Ver en Contratos, «Aprobados con algo por resolver»'
  return `Ver ${femenino ? 'las' : 'los'} ${miles(linea.total)} en ${linea.destino.seccion}`
}
