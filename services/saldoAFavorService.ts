/**
 * Saldo a favor (Adenda 6 §6 y Adenda 6.1 §6): lo que se pagó por anticipado
 * (un estudio o una consulta adicional) y no se llegó a consultar queda a
 * favor de quien pagó y se descuenta solo de su siguiente pago (la inmobiliaria:
 * también la compra de un paquete de cupos). La API calcula todo; aquí solo se
 * lee y, para Cofianza, se registra la solicitud de devolución de una persona
 * natural (las inmobiliarias y los propietarios que son empresa no reciben dinero).
 * Con el interruptor de la API apagado, `habilitado` llega en false.
 */

import { apiClient } from '@/lib/api'

export type TipoMovimientoSaldo = 'abono' | 'aplicacion' | 'reverso' | 'devolucion'

export interface IMovimientoSaldo {
  id: string
  tipo: TipoMovimientoSaldo
  monto_cop: number
  saldo_despues_cop: number
  /** Ya redactada por la API. */
  descripcion: string
  expediente: { id: string; numero: string } | null
  /** AAAA-MM-DD: solo en una devolución (15 días hábiles desde la solicitud). */
  fecha_limite: string | null
  created_at: string
}

export interface ISaldoAFavorPropio {
  habilitado: boolean
  tipo_dueno: 'inmobiliaria' | 'propietario' | null
  saldo_cop: number
  /** Persona natural (propietario directo que no es empresa): puede pedir que se le devuelva. */
  puede_pedir_devolucion: boolean
  /** Los más nuevos primero (máx. 50). */
  movimientos: IMovimientoSaldo[]
}

export type TipoDuenoSaldo = 'inmobiliaria' | 'propietario' | 'persona'

export interface ISaldoAFavorAdmin {
  id: string
  tipo_dueno: TipoDuenoSaldo
  dueno: { nombre: string; detalle: string | null }
  saldo_cop: number
  puede_devolver: boolean
  /**
   * Por qué no se devuelve en dinero (Adenda 6.1 §6: solo a la persona natural): una inmobiliaria o un propietario que
   * es empresa (NIT o razón social). null = se puede devolver. Ausente con una API anterior.
   */
  sin_devolucion?: 'inmobiliaria' | 'empresa' | null
  updated_at: string
  /** Los últimos 20. */
  movimientos: IMovimientoSaldo[]
}

export interface ISaldosAFavorAdmin {
  habilitado: boolean
  saldos: ISaldoAFavorAdmin[]
}

export type CanalSolicitudDevolucion = 'correo' | 'whatsapp' | 'otro'

export interface IDevolucionSaldoInput {
  canal: CanalSolicitudDevolucion
  /** El día en que la persona la pidió (AAAA-MM-DD): los 15 días hábiles corren desde ahí. */
  fecha_solicitud: string
  nota: string
}

export interface IDevolucionSaldoResultado {
  devuelto_cop: number
  /** AAAA-MM-DD. */
  fecha_limite: string
  saldo_restante_cop: number
  filas: Array<{ id: string | null; monto_cop: number; modo: 'mercadopago' | 'manual' }>
}

/** Abono y reverso suman al saldo; aplicación y devolución restan. */
export function movimientoSuma(tipo: TipoMovimientoSaldo): boolean {
  return tipo === 'abono' || tipo === 'reverso'
}

class SaldoAFavorService {
  async getMio(): Promise<ISaldoAFavorPropio> {
    const response = await apiClient.get<ISaldoAFavorPropio>('/saldos-a-favor/mio')
    return response.data
  }

  async listAdmin(): Promise<ISaldosAFavorAdmin> {
    const response = await apiClient.get<ISaldosAFavorAdmin>('/admin/saldos-a-favor')
    return response.data
  }

  async registrarDevolucion(saldoId: string, input: IDevolucionSaldoInput): Promise<IDevolucionSaldoResultado> {
    const response = await apiClient.post<IDevolucionSaldoResultado>(`/admin/saldos-a-favor/${saldoId}/devolucion`, input)
    return response.data
  }
}

export const saldoAFavorService = new SaldoAFavorService()
