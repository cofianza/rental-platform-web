/**
 * Tipos para Citas (visitas previas al estudio)
 */

export type EstadoCita = 'solicitada' | 'confirmada' | 'realizada' | 'cancelada' | 'no_asistio'

export interface ICita {
  id: string
  expediente_id: string
  fecha_propuesta: string | null
  fecha_confirmada: string | null
  estado: EstadoCita
  notas_solicitante: string | null
  notas_propietario: string | null
  motivo_cancelacion: string | null
  creado_por: string | null
  confirmado_por: string | null
  created_at: string
  updated_at: string
  // Relaciones opcionales
  creador?: { id: string; nombre: string; apellido: string } | null
  confirmador?: { id: string; nombre: string; apellido: string } | null
  // Embed del expediente (viene de GET /citas y /citas/:id desde el backend).
  // Opcional porque callers legacy de ICita no esperaban el embed.
  expediente?: {
    id: string
    numero: string
    estudio_habilitado: boolean
    inmueble: { id: string; direccion: string; ciudad: string } | null
    solicitante: { nombre: string; apellido: string; telefono: string | null } | null
  } | null
}

export interface ICitaFilters {
  estado?: EstadoCita | ''
  fecha_desde?: string
  fecha_hasta?: string
  inmueble_id?: string
  page: number
  limit: number
}

export interface ICitasMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ICrearCita {
  expediente_id: string
  fecha_propuesta: string
  notas_solicitante?: string
  /** Solo aplicable para propietario/inmobiliaria/admin: crea la cita ya en estado 'confirmada' */
  confirmar_inmediatamente?: boolean
}

export interface IConfirmarCita {
  fecha_confirmada?: string
  notas_propietario?: string
}

export interface ICancelarCita {
  motivo_cancelacion: string
}

export const ESTADO_CITA_CONFIG: Record<EstadoCita, { label: string; color: string; bgColor: string }> = {
  solicitada: { label: 'Solicitada', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  confirmada: { label: 'Confirmada', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
  realizada: { label: 'Realizada', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
  cancelada: { label: 'Cancelada', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
  no_asistio: { label: 'No asistio', color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200' },
}
