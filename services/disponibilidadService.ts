/**
 * Disponibilidad Service — slots de cita para el solicitante (vitrina) +
 * gestión de disponibilidad del propietario/inmobiliaria.
 *
 *   getSlots                — público al rol solicitante (GET /slots).
 *   getMiDisponibilidad     — propietario/inmobiliaria lee su config.
 *   updateMiDisponibilidad  — PUT atómico (backend hace DELETE+INSERT).
 *
 * Backend devuelve timestamps con offset -05:00 (Bogotá). Frontend los consume
 * tal cual; no se re-parsean en la capa de red.
 */

import { apiClient } from '@/lib/api'

// ── Tipos compartidos ──────────────────────────

export interface ISlot {
  inicio: string // ISO 8601 con offset -05:00 (Bogotá)
  fin: string
}

export interface IDiaDisponibilidad {
  fecha: string // YYYY-MM-DD (fecha civil Bogotá)
  slots: ISlot[]
}

/** Horario recurrente para un día de la semana (0=Domingo … 6=Sábado). */
export interface IHorarioDia {
  dia_semana: number
  hora_inicio: string // "HH:MM" local Bogotá
  hora_fin: string
  activo: boolean
}

export interface IConfiguracionDisponibilidad {
  slot_duracion_minutos: 30 | 60 | 120
  antelacion_minima_horas: number
  /** Tope de citas por día civil Bogotá. 0 = sin límite. */
  max_citas_por_dia: number
  activa?: boolean
}

/** Fecha puntual bloqueada (feriado/vacaciones). */
export interface IFechaBloqueada {
  fecha: string // YYYY-MM-DD
  motivo?: string | null
}

export interface IMiDisponibilidad {
  horarios: IHorarioDia[]
  configuracion: IConfiguracionDisponibilidad | null
  fechas_bloqueadas: IFechaBloqueada[]
  /** Flag backend: `true` si el propietario tiene al menos 1 fila persistida. */
  tiene_config_explicita?: boolean
}

// ── Endpoints ──────────────────────────────────

async function getSlots(params: {
  inmuebleId: string
  desde: string // YYYY-MM-DD
  hasta: string // YYYY-MM-DD
}): Promise<IDiaDisponibilidad[]> {
  const { inmuebleId, desde, hasta } = params
  const qs = new URLSearchParams({ inmueble_id: inmuebleId, desde, hasta }).toString()
  const res = await apiClient.get<IDiaDisponibilidad[]>(`/disponibilidad/slots?${qs}`)
  return res.data
}

async function getMiDisponibilidad(): Promise<IMiDisponibilidad> {
  const res = await apiClient.get<IMiDisponibilidad>('/disponibilidad/mi-disponibilidad')
  return res.data
}

async function updateMiDisponibilidad(payload: {
  slot_duracion_minutos: 30 | 60 | 120
  antelacion_minima_horas?: number
  max_citas_por_dia?: number
  horarios: IHorarioDia[]
  fechas_bloqueadas?: IFechaBloqueada[]
}): Promise<IMiDisponibilidad> {
  // Backend espera `antelacion_minima_horas` en el body; si el caller no lo pasa
  // forzamos 24h (default del proyecto) para que Zod no rechace por campo faltante.
  const body = {
    slot_duracion_minutos: payload.slot_duracion_minutos,
    antelacion_minima_horas: payload.antelacion_minima_horas ?? 24,
    max_citas_por_dia: payload.max_citas_por_dia ?? 0,
    horarios: payload.horarios,
    fechas_bloqueadas: payload.fechas_bloqueadas ?? [],
  }
  const res = await apiClient.put<IMiDisponibilidad>('/disponibilidad/mi-disponibilidad', body)
  return res.data
}

export const disponibilidadService = {
  getSlots,
  getMiDisponibilidad,
  updateMiDisponibilidad,
}
