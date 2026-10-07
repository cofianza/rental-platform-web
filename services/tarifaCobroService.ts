/**
 * Cobro de la tarifa mensual — /api/v1/tarifa-cobro (plan cobro-tarifa-mensual).
 * Cofianza (administrador u operador) opera todo; de la inmobiliaria, solo los
 * titulares ven sus cuentas. La API valida rol, organización y Gerencia General.
 */

import { apiClient } from '@/lib/api'
import { descargar, guardarArchivo } from '@/services/migracionService'
import type { ICuentaCobro, ICuentaCobroDetalle, IDatosPagoTarifa, SituacionCuenta } from '@/types/tarifaCobro'

const BASE = '/tarifa-cobro'

export const tarifaCobroService = {
  async listarCuentas(filtro: { periodo?: string; situacion?: SituacionCuenta } = {}): Promise<ICuentaCobro[]> {
    const q = new URLSearchParams(Object.entries(filtro).filter((e): e is [string, string] => !!e[1])).toString()
    const res = await apiClient.get<ICuentaCobro[]>(`${BASE}/cuentas${q ? `?${q}` : ''}`)
    return res.data ?? []
  },

  async obtenerCuenta(id: string): Promise<ICuentaCobroDetalle> {
    return (await apiClient.get<ICuentaCobroDetalle>(`${BASE}/cuentas/${id}`)).data
  },

  /** También reintenta la factura de una cuenta que quedó en «emitiendo». */
  async emitir(id: string): Promise<void> {
    await apiClient.post(`${BASE}/cuentas/${id}/emitir`)
  },

  async pagarCuenta(id: string, pago: IDatosPagoTarifa): Promise<{ lineas_pagadas: number }> {
    return (await apiClient.post<{ lineas_pagadas: number }>(`${BASE}/cuentas/${id}/pagar`, pago)).data
  },

  async pagarLinea(id: string, pago: IDatosPagoTarifa): Promise<void> {
    await apiClient.post(`${BASE}/lineas/${id}/pagar`, pago)
  },

  async anularLinea(id: string, motivo: string): Promise<void> {
    await apiClient.post(`${BASE}/lineas/${id}/anular`, { motivo })
  },

  /** El titular informa que el arrendatario de una Trasladada no pagó la tarifa (D11). */
  async marcarNoRecaudada(lineaId: string): Promise<void> {
    await apiClient.patch(`${BASE}/lineas/${lineaId}/no-recaudada`)
  },

  /** B9: canon reajustado desde `fecha` (AAAA-MM-DD; a mitad de mes rige desde el siguiente). */
  async registrarCanon(contratoId: string, fecha: string, canon_cop: number): Promise<void> {
    await apiClient.post(`${BASE}/contratos/${contratoId}/condiciones-cobro`, { fecha, canon_cop })
  },

  /** Excel con las líneas de las cuentas de un mes (AAAA-MM-01). */
  async descargarLiquidacion(periodo: string): Promise<void> {
    guardarArchivo(await descargar(`${BASE}/reportes/liquidacion.xlsx?periodo=${periodo}`, `tarifa-mensual-${periodo.slice(0, 7)}.xlsx`))
  },
}
