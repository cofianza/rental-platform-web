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
  /**
   * Adenda 1 del módulo de contratos, respuesta 17: los de riesgo solo los
   * cambia la Gerencia General; los operativos, cualquier administrador.
   * `editable` ya dice si ESTE usuario puede (el API rechaza con 403 si no).
   */
  nivel?: 'riesgo' | 'operativo'
  editable?: boolean
  /** El PATCH responde 400 MOTIVO_REQUERIDO si el cambio llega sin motivo. Opcional: un API anterior no lo manda. */
  exige_motivo?: boolean
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
  /** Revisión de antecedentes y listas restrictivas en Auco. Opcional: un API anterior no lo manda. */
  auco?: {
    consultas: number
    verificadas: number
    lista_caida: number
    sin_respuesta: number
    otras: number
    tasa_falla_pct: number | null
    ultima_falla: { en: string; motivo: string } | null
  }
}

/** Fila de una tabla de puntos: `corte` es la cota inferior (V1, V8) o la superior inclusiva (V2, V3). */
export interface IFilaTabla {
  corte: number
  puntos: number
}

/**
 * Las tablas de puntos del motor (M-3). Viven solo en el API: la web las pide
 * aquí y las pinta, sin copias escritas a mano.
 */
export interface ITablasPuntaje {
  maximos: Record<'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6' | 'V7' | 'V8' | 'V9', number>
  divisor: number
  fuera_de_alcance: string[]
  v1: IFilaTabla[]
  v2: IFilaTabla[]
  v2_maximo: number
  v3: IFilaTabla[]
  v3_maximo: number
  v5: { financiero: number; real_o_cooperativo: number }
  v6: { sin_mora: number; sin_historial: number; mora_mayor_30d: number; ventana_meses: number }
  v8: IFilaTabla[]
  a5d: { mora_en_banda: number }
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
  async getTablas(): Promise<ITablasPuntaje> {
    const res = await apiClient.get<ITablasPuntaje>('/admin/calibracion/tablas')
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
