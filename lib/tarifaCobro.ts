/**
 * Reglas de pantalla del cobro de la tarifa mensual: textos de cada situación,
 * contadores y qué acción se ofrece en cada cuenta y línea. La API es la que
 * decide (estas reglas solo evitan ofrecer botones que siempre fallarían).
 */

import type { ICuentaCobro, ILineaCobro, SituacionCuenta } from '@/types/tarifaCobro'

export const SITUACION_LABELS: Record<SituacionCuenta, string> = {
  borrador: 'Borrador',
  bloqueada_fiscal: 'Bloqueada (datos fiscales)',
  emitiendo: 'Emitiendo',
  emitida: 'Emitida',
  pagada: 'Pagada',
  parcial: 'Pago parcial',
  vencida: 'Vencida',
  anulada: 'Anulada',
}

/** Las situaciones del filtro del plan (§4), en ese orden. */
export const SITUACIONES_FILTRO: SituacionCuenta[] = ['borrador', 'bloqueada_fiscal', 'emitida', 'pagada', 'parcial', 'vencida']

export function contarCuentas(cuentas: Pick<ICuentaCobro, 'situacion' | 'nota_credito_pendiente'>[]) {
  const porSituacion = {} as Record<SituacionCuenta, number>
  for (const s of Object.keys(SITUACION_LABELS) as SituacionCuenta[]) porSituacion[s] = 0
  for (const c of cuentas) porSituacion[c.situacion]++
  return { porSituacion, notaCredito: cuentas.filter((c) => c.nota_credito_pendiente).length }
}

type Rol = string | undefined

/**
 * Emitir: solo el administrador, desde borrador. Reintentar la factura es volver
 * a emitir una cuenta que quedó en «emitiendo» (la API la retoma pasados 10 min
 * y recupera la factura por la referencia). Pagar: administrador u operador,
 * con saldo pendiente.
 */
export function accionesDeCuenta(c: Pick<ICuentaCobro, 'estado' | 'saldo_cop'>, rol: Rol) {
  const admin = rol === 'administrador'
  const cofianza = admin || rol === 'operador_analista'
  return {
    emitir: admin && c.estado === 'borrador',
    reintentar: admin && c.estado === 'emitiendo',
    pagar: cofianza && c.estado === 'emitida' && Number(c.saldo_cop) > 0,
  }
}

/**
 * Pagar una línea: pendiente o no recaudada (el arrendatario de una Trasladada
 * pagó tarde), en una cuenta emitida. Anular: el botón es del administrador; la
 * API solo deja a la Gerencia General y con la cuenta fuera de «emitiendo»; una
 * pagada no se anula. No recaudada (D11): el titular de la inmobiliaria, solo en
 * Trasladada, desde pendiente y con la cuenta emitida.
 */
export function accionesDeLinea(l: Pick<ILineaCobro, 'estado' | 'modalidad'>, estadoCuenta: string, rol: Rol) {
  const viva = l.estado === 'pendiente' || l.estado === 'no_recaudada'
  return {
    pagar: viva && estadoCuenta === 'emitida' && (rol === 'administrador' || rol === 'operador_analista'),
    anular: viva && estadoCuenta !== 'emitiendo' && rol === 'administrador',
    noRecaudada: l.estado === 'pendiente' && l.modalidad === 'trasladada' && estadoCuenta === 'emitida' && rol === 'inmobiliaria',
  }
}

/** Días antes del aniversario en que se pide el canon reajustado (DIAS_AVISO_ANIVERSARIO de la API). */
const DIAS_AVISO_ANIVERSARIO = 30

/** Primer día del mes siguiente a una fecha AAAA-MM-DD. */
function primerDiaMesSiguiente(f: string): string {
  const [a, m] = f.split('-').map(Number)
  return new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 10)
}

/**
 * B9: el aniversario de fecha_inicio (cada 12 meses) en que se reajusta el canon,
 * si cae entre hoy y los próximos 30 días; si no, null. Mismo cálculo que
 * proximoAniversario de la API (el 29-feb cae el 28 en año no bisiesto).
 * También null si el mes desde el que rige ya está cortado: la API rechaza a la
 * inmobiliaria con CONDICION_RETROACTIVA (periodoDesde <= mesCortado de
 * tarifa-cobro.reglas.ts).
 */
export function aniversarioPorConfirmar(fechaInicio: string, hoy: string): string | null {
  const [a, m, d] = fechaInicio.slice(0, 10).split('-').map(Number)
  for (let anio = Math.max(a + 1, Number(hoy.slice(0, 4))); ; anio++) {
    const dia = Math.min(d, new Date(Date.UTC(anio, m, 0)).getUTCDate())
    const f = `${anio}-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    if (f < hoy) continue
    if ((Date.parse(f) - Date.parse(hoy)) / 86_400_000 > DIAS_AVISO_ANIVERSARIO) return null
    const desde = f.slice(8) === '01' ? f : primerDiaMesSiguiente(f)
    const siguiente = primerDiaMesSiguiente(hoy)
    const cortado = Date.parse(siguiente) - Date.parse(hoy) === 86_400_000 ? siguiente : `${hoy.slice(0, 7)}-01`
    return desde > cortado ? f : null
  }
}
