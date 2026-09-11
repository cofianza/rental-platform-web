/**
 * Panel de calibración del modelo — Adenda 1 §11. Solo administrador.
 */

import { apiClient } from '@/lib/api'

export interface IParametroCalibracion {
  clave: string
  valor: number
  valorDefault: number
  min: number
  max: number
  entero: boolean
  seccion: string
  descripcion: string
  advertencia?: string
  actualizado_en: string | null
  actualizado_por: string | null
}

export interface IHistorialCalibracion {
  id: string
  clave: string
  valor_anterior: number | null
  valor_nuevo: number
  usuario_id: string | null
  usuario_nombre: string | null
  motivo: string | null
  created_at: string
}

/**
 * Cascada de centrales: cuántos estudios se resolvieron con una sola consulta
 * y cuántos necesitaron la segunda. `sin_dato` = el motor decisor estaba
 * apagado (MOTOR_DECIDE_ENABLED) y el estudio no dejó rastro de la cascada.
 */
export interface ICascadaCentrales {
  desde: string
  total: number
  una_central: number
  dos_centrales: number
  sin_dato: number
}

/**
 * Adenda 2 §5.1 y §8: revisión manual (volumen y tiempo frente al SLA de 2
 * horas hábiles), escalados por falta de ingreso y caídas de DataCrédito.
 */
export interface IRevisionManual {
  desde: string
  sla_horas_habiles: number
  en_revision_ahora: number
  resueltas: number
  promedio_horas_habiles: number | null
  dentro_del_sla: number
  escaladas_sin_ingreso: number
  datacredito: { consultas: number; caidas: number; errores_de_dato: number; tasa_caida_pct: number | null }
}

export const calibracionService = {
  async listar(): Promise<IParametroCalibracion[]> {
    const res = await apiClient.get<IParametroCalibracion[]>('/admin/calibracion')
    return res.data
  },
  async historial(): Promise<IHistorialCalibracion[]> {
    const res = await apiClient.get<IHistorialCalibracion[]>('/admin/calibracion/historial')
    return res.data
  },
  async actualizar(clave: string, valor: number, motivo?: string): Promise<IParametroCalibracion> {
    const res = await apiClient.patch<IParametroCalibracion>(`/admin/calibracion/${clave}`, { valor, motivo })
    return res.data
  },
  async getCascada(dias = 30): Promise<ICascadaCentrales> {
    const res = await apiClient.get<ICascadaCentrales>(`/admin/calibracion/cascada?dias=${dias}`)
    return res.data
  },
  async getRevisionManual(dias = 30): Promise<IRevisionManual> {
    const res = await apiClient.get<IRevisionManual>(`/admin/calibracion/revision-manual?dias=${dias}`)
    return res.data
  },
}
