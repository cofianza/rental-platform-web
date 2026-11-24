/**
 * Integración nuby: reglas de pantalla (lógica pura, probada con node:test).
 * Limpieza de la dirección que pega el titular, validación del formulario,
 * textos de los pendientes y lectura de los errores de la API. La API es la
 * que decide; esto solo evita enviar algo que siempre fallaría y pone los
 * textos en claro.
 */

import type {
  CampoDiferenciaNuby,
  CredencialesNuby,
  EstadoConexionNuby,
  EstadoIntegracionNuby,
  ModoIntegracionNuby,
  MotivoNoTraidoNuby,
  ResumenCopiaNuby,
} from '@/types/integracionNuby'
import { ERROR_MESSAGES, formatCurrency } from './constants'

/** Ruta base de la API según quién opera (relativa a NEXT_PUBLIC_API_URL). */
export function baseIntegracionNuby(modo: ModoIntegracionNuby): string {
  return modo.tipo === 'admin'
    ? `/admin/inmobiliarias/${encodeURIComponent(modo.orgId)}/integraciones/nuby`
    : '/inmobiliaria/integraciones/nuby'
}

// ── Dirección de nuby ──────────────────────────────────────────

/** Espacios que no se ven y llegan al copiar y pegar (de ancho cero, BOM…). */
const INVISIBLES = /[\u200B-\u200D\u2060\uFEFF]/g

/**
 * Deja solo el dominio de lo que se pegó: «https://Mi-Inmobiliaria.nuby.app/login»
 * → «mi-inmobiliaria.nuby.app». Quita los espacios de los extremos y los
 * invisibles, el protocolo, el usuario, el puerto y todo lo que venga después
 * del dominio. Un espacio en medio NO se quita: «mi inmobiliaria.nuby.app» no
 * se convierte en silencio en otra dirección; la validación lo señala.
 */
export function limpiarInstanciaNuby(texto: string): string {
  // El protocolo solo cuenta con «://»: «mi-inmobiliaria.nuby.app:443» no es uno.
  const sinProtocolo = texto
    .replace(INVISIBLES, '')
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .replace(/^\/+/, '')
  const dominio = sinProtocolo.split(/[/?#]/)[0] ?? ''
  return dominio.replace(/^.*@/, '').replace(/:\d*$/, '').replace(/\.+$/, '').trim()
}

// La misma regla de la API: etiquetas de dominio (hasta 63 caracteres, sin guion
// en los extremos) bajo nuby.app o arrendasoft.co, y 200 caracteres en total.
const INSTANCIA_NUBY = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.(nuby\.app|arrendasoft\.co)$/
const LARGO_MAXIMO_INSTANCIA = 200
const DOMINIO_NUBY = /\.(nuby\.app|arrendasoft\.co)$/

/** La dirección (ya limpia) es de nuby: un subdominio de nuby.app o arrendasoft.co. */
export function instanciaNubyValida(instancia: string): boolean {
  return instancia.length <= LARGO_MAXIMO_INSTANCIA && INSTANCIA_NUBY.test(instancia)
}

/** Qué corregir en la dirección (ya limpia), o null si es válida. */
function problemaInstanciaNuby(instancia: string): string | null {
  if (!instancia) return 'Escriba la dirección de nuby.'
  if (instanciaNubyValida(instancia)) return null
  if (!DOMINIO_NUBY.test(instancia)) {
    return 'La dirección debe terminar en .nuby.app o .arrendasoft.co (por ejemplo, mi-inmobiliaria.nuby.app).'
  }
  if (/[^a-z0-9.-]/.test(instancia)) return 'La dirección solo puede llevar letras, números, guiones y puntos.'
  // Termina bien y no tiene caracteres raros: sobra o falta algo (demasiado larga, un punto o un guion de más).
  return 'La dirección no es válida. Revise que esté completa, como mi-inmobiliaria.nuby.app.'
}

/** Lo que se envía: la dirección limpia y sin los espacios que deja el copiar y pegar. */
export function prepararCredencialesNuby(c: CredencialesNuby): CredencialesNuby {
  return {
    instancia: limpiarInstanciaNuby(c.instancia),
    client_id: c.client_id.trim(),
    client_secret: c.client_secret.trim(),
  }
}

export type ErroresCredencialesNuby = Partial<Record<keyof CredencialesNuby, string>>

/** Errores por campo del formulario (vacío = se puede enviar). */
export function validarCredencialesNuby(c: CredencialesNuby): ErroresCredencialesNuby {
  const limpio = prepararCredencialesNuby(c)
  const errores: ErroresCredencialesNuby = {}
  const problema = problemaInstanciaNuby(limpio.instancia)
  if (problema) errores.instancia = problema
  if (!limpio.client_id) errores.client_id = 'Escriba el ID de cliente.'
  if (!limpio.client_secret) errores.client_secret = 'Escriba la clave secreta.'
  return errores
}

/** El ID de cliente nunca vuelve completo: solo sus últimos caracteres. */
export function idClienteOculto(final: string | null | undefined): string {
  return `••••${(final ?? '').trim()}`
}

// ── Estado de la conexión y resumen de la copia ────────────────

const ESTADOS_CONEXION: Record<EstadoConexionNuby, string> = {
  activa: 'Activa',
  error: 'Con error',
  pausada: 'Pausada',
}

export function etiquetaEstadoNuby(estado: string): string {
  return ESTADOS_CONEXION[estado as EstadoConexionNuby] ?? estado
}

/**
 * La API manda siempre los totales y las tres listas. Si algo faltara (la API y
 * la web se publican por separado), se completa con vacíos para que la
 * pantalla no se caiga; lo que sí llega no se toca.
 */
export function normalizarEstadoNuby(estado: EstadoIntegracionNuby): EstadoIntegracionNuby {
  const totales: Partial<EstadoIntegracionNuby['totales']> = estado.totales ?? {}
  const pendientes: Partial<EstadoIntegracionNuby['pendientes']> = estado.pendientes ?? {}
  const numero = (v: unknown) => Number(v) || 0
  return {
    ...estado,
    integracion: estado.integracion
      ? { ...estado.integracion, resumen: estado.integracion.resumen ? normalizarResumen(estado.integracion.resumen) : null }
      : null,
    totales: {
      vinculados: numero(totales.vinculados),
      codigo_repetido: numero(totales.codigo_repetido),
      no_traidos: numero(totales.no_traidos),
      con_diferencias: numero(totales.con_diferencias),
      ausentes: numero(totales.ausentes),
    },
    pendientes: {
      codigo_repetido: (pendientes.codigo_repetido ?? []).map((c) => ({ ...c, candidatos: c.candidatos ?? [] })),
      no_traidos: pendientes.no_traidos ?? [],
      con_diferencias: (pendientes.con_diferencias ?? []).map((c) => ({ ...c, diferencias: c.diferencias ?? [] })),
    },
  }
}

/** ¿Hay una copia corriendo? Mientras sea así, la pantalla vuelve a pedir el estado. */
export function sigueSincronizando(estado: EstadoIntegracionNuby | null | undefined): boolean {
  return !!estado?.conectada && !!estado.integracion?.sincronizando
}

/** Marca la copia como en curso apenas la API la acepta (el siguiente sondeo trae el dato real). */
export function marcarSincronizando(estado: EstadoIntegracionNuby | null): EstadoIntegracionNuby | null {
  if (!estado?.integracion) return estado
  return { ...estado, integracion: { ...estado.integracion, sincronizando: true } }
}

export type DesenlaceCopia = 'bien' | 'error' | 'interrumpida'

/**
 * Cómo acabó la copia que la pantalla venía siguiendo. Una copia que termina
 * bien SIEMPRE cambia `ultima_sincronizacion_en`. Si no cambió, o falló (quedó
 * `ultimo_error`) o se cortó a medias (un despliegue de la API, el proceso
 * murió y el candado venció): en ese caso no se puede decir que terminó.
 */
export function desenlaceDeCopia(copia: {
  /** `ultima_sincronizacion_en` que había cuando se empezó a seguir la copia. */
  ultimaCopiaAlEmpezar: string | null
  ultimaCopiaAhora: string | null
  ultimoError: string | null
}): DesenlaceCopia {
  if (copia.ultimaCopiaAhora && copia.ultimaCopiaAhora !== copia.ultimaCopiaAlEmpezar) return 'bien'
  return copia.ultimoError ? 'error' : 'interrumpida'
}

/** Estado tras desconectar: sin conexión ni pendientes (los inmuebles se quedan en Cofianza). */
export function estadoDesconectado(estado: EstadoIntegracionNuby): EstadoIntegracionNuby {
  return {
    ...estado,
    conectada: false,
    integracion: null,
    totales: { vinculados: 0, codigo_repetido: 0, no_traidos: 0, con_diferencias: 0, ausentes: 0 },
    pendientes: { codigo_repetido: [], no_traidos: [], con_diferencias: [] },
  }
}

export function etiquetaModoCopia(modo: ResumenCopiaNuby['modo']): string {
  return modo === 'completa' ? 'Revisión completa del inventario' : 'Copia de lo modificado'
}

// `estados_en_duda` no va en la tabla de cifras: tiene su propio aviso en la tarjeta.
type CifraResumen = Exclude<keyof ResumenCopiaNuby, 'modo' | 'terminado_en' | 'estados_en_duda'>

const CIFRAS_RESUMEN: Array<[CifraResumen, string]> = [
  ['leidos', 'Leídos en nuby'],
  ['en_arriendo', 'En arriendo'],
  ['creados', 'Nuevos en Cofianza'],
  ['actualizados', 'Actualizados'],
  ['vinculados', 'Vinculados con uno que ya existía'],
  ['sin_cambios', 'Sin cambios'],
  ['protegidos', 'Sin tocar (con estudio o contrato)'],
  ['no_activas', 'No se crearon (no están «Activa» en nuby)'],
  ['codigo_repetido', 'Con código repetido'],
  ['no_traidos', 'No se trajeron'],
  ['ausentes', 'Ya no aparecen en nuby'],
  ['fotos_copiadas', 'Fotos copiadas'],
]

/** Las cifras del resumen siempre son números: una API anterior puede no traer las más nuevas. */
function normalizarResumen(resumen: ResumenCopiaNuby): ResumenCopiaNuby {
  const cifras = Object.fromEntries(CIFRAS_RESUMEN.map(([clave]) => [clave, Number(resumen[clave]) || 0])) as Record<CifraResumen, number>
  return { ...resumen, ...cifras, estados_en_duda: Number(resumen.estados_en_duda) || 0 }
}

/** El resumen de la última copia como filas «etiqueta: cifra», en orden de lectura. */
export function cifrasDeResumen(resumen: ResumenCopiaNuby): Array<{ clave: CifraResumen; etiqueta: string; valor: number }> {
  return CIFRAS_RESUMEN.map(([clave, etiqueta]) => ({ clave, etiqueta, valor: Number(resumen[clave]) || 0 }))
}

// ── Pendientes ─────────────────────────────────────────────────

type MotivoFijoNuby = Exclude<MotivoNoTraidoNuby, 'clase_sin_equivalente'>

const MOTIVOS_NO_TRAIDO: Record<MotivoFijoNuby, string> = {
  sin_canon: 'No tiene canon de arriendo.',
  sin_direccion: 'No tiene dirección.',
  sin_municipio: 'No tiene municipio.',
  codigo_invalido: 'Su código tiene caracteres que Cofianza no admite (solo letras, números, espacios y guiones; máximo 30).',
  datos_no_validos: 'Cofianza no pudo guardar este inmueble con los datos que tiene en nuby.',
}

/** Por qué un inmueble en arriendo de nuby no entró, en lenguaje claro. */
export function textoMotivoNoTraido(motivo: string, detalle?: string | null): string {
  const extra = detalle?.trim()
  // El tipo sin equivalente no lo arregla la inmobiliaria en nuby: lo agrega Cofianza. `detalle` es el tipo.
  if (motivo === 'clase_sin_equivalente') {
    return `Su tipo de inmueble en nuby${extra ? ` («${extra}»)` : ''} no tiene equivalente en Cofianza. Avísele a Cofianza para agregarlo.`
  }
  // Datos que Cofianza no pudo guardar: si la API explica cuál, se muestra su explicación.
  if (motivo === 'datos_no_validos' && extra) return extra
  // Un motivo que la web todavía no conoce: lo que explique la API, o un texto neutro.
  return MOTIVOS_NO_TRAIDO[motivo as MotivoFijoNuby] ?? (extra || 'No se pudo traer.')
}

/** Estado en Cofianza de un inmueble candidato (códigos repetidos), como se le dice a la inmobiliaria. */
const ESTADOS_CANDIDATO: Record<string, string> = {
  disponible: 'Disponible',
  en_estudio: 'En estudio',
  ocupado: 'Arrendada o reservada',
  inactivo: 'Inactiva',
}

/** undefined = un estado que la web no conoce (se muestra el valor tal como llega). */
export function etiquetaEstadoCandidato(estado: string): string | undefined {
  return ESTADOS_CANDIDATO[estado]
}

/** Cuántos quedaron fuera de una lista que llegó recortada (0 si llegó completa). */
export function cuantosMas(total: number | null | undefined, mostrados: number): number {
  const t = Math.floor(Number(total))
  return Number.isFinite(t) && t > mostrados ? t - mostrados : 0
}

export function textoYMas(n: number): string {
  return `y ${n} más`
}

const CAMPOS_DIFERENCIA: Record<CampoDiferenciaNuby, string> = {
  canon: 'Canon',
  estado: 'Estado',
}

export function etiquetaCampoDiferencia(campo: string): string {
  return CAMPOS_DIFERENCIA[campo as CampoDiferenciaNuby] ?? campo
}

/**
 * Valor de una diferencia para mostrar: un canon numérico sale como pesos. El
 * estado llega de la API ya con su etiqueta («Arrendada o reservada», «Ya no
 * está en arriendo»…) y se muestra tal cual.
 */
export function valorDiferencia(campo: string, valor: string | null | undefined): string {
  const v = (valor ?? '').trim()
  if (!v) return '—'
  if (campo === 'canon' && /^\d+(\.\d+)?$/.test(v)) return formatCurrency(Number(v))
  return v
}

// ── Errores de la API ──────────────────────────────────────────

export interface ErrorNuby {
  mensaje: string
  code?: string
  statusCode?: number
}

/** Miembro que no es titular: la API responde 403 en todo. */
export const CODIGO_SOLO_TITULAR = 'SOLO_TITULAR'
/** Hay una copia en curso: 409 al pedir otra, al vincular un código o al cambiar las credenciales. */
export const CODIGO_YA_SINCRONIZANDO = 'NUBY_SINCRONIZANDO'

/**
 * Lee el error que lanza apiClient (ApiClientError: `message`, `code`,
 * `statusCode`). Se muestra el mensaje de la API, que ya viene listo; también
 * en el 429, que dice cuánto esperar («…en una hora», «Espere un minuto…»).
 * Cualquier otro error (uno de programación, en inglés) no se le muestra a la
 * persona: va el texto por defecto.
 */
export function leerErrorNuby(err: unknown, porDefecto: string): ErrorNuby {
  const e = (err ?? {}) as { message?: unknown; code?: unknown; statusCode?: unknown }
  const code = typeof e.code === 'string' ? e.code : undefined
  const statusCode = typeof e.statusCode === 'number' ? e.statusCode : undefined
  const deLaApi = statusCode !== undefined && typeof e.message === 'string' ? e.message.trim() : ''
  if (statusCode === 429) {
    // Un 429 sin mensaje propio llega con el genérico de apiClient («Error en el servidor…»), que aquí confunde.
    const propio = deLaApi === ERROR_MESSAGES.SERVER_ERROR ? '' : deLaApi
    return { mensaje: propio || 'Hizo muchos intentos seguidos. Espere unos minutos y vuelva a intentarlo.', code, statusCode }
  }
  return { mensaje: deLaApi || porDefecto, code, statusCode }
}
